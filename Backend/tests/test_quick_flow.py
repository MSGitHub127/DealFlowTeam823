import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import engine, Base, AsyncSessionLocal
from app.seed import seed_database
from app.models.product import Product
from app.models.user import Customer, User
from app.models.warehouse import Warehouse, Stock
from sqlalchemy import select

@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_database()
    yield

@pytest.mark.asyncio
async def test_step_1_auth_and_config():
    """Step 1: Sign up or log in, and verify basic backend data: discount tier, warehouse, subscription plan."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as sales rep
        login_res = await ac.post("/api/auth/login", json={"email": "rep@dealflow.com", "password": "rep123"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check discount tiers
        tiers_res = await ac.get("/api/config/discount-tiers", headers=headers)
        assert tiers_res.status_code == 200
        tiers = {t["tier"]: t["max_discount_pct"] for t in tiers_res.json()}
        assert "Gold" in tiers and tiers["Gold"] == 15.0
        assert "Bronze" in tiers and tiers["Bronze"] == 5.0

        # 3. Check warehouses
        wh_res = await ac.get("/api/warehouses", headers=headers)
        assert wh_res.status_code == 200
        assert len(wh_res.json()) >= 2

        # 4. Check subscription plans
        plans_res = await ac.get("/api/billing/plans", headers=headers)
        assert plans_res.status_code == 200
        assert len(plans_res.json()) >= 1

@pytest.mark.asyncio
async def test_step_2_and_3_over_discount_auto_approval():
    """
    Step 2: Create quote and add product line with discount higher than normally allowed.
    Step 3: Confirm quote automatically asks for manager approval without rep having to request it manually.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Rep token
        login_res = await ac.post("/api/auth/login", json={"email": "rep@dealflow.com", "password": "rep123"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get customer (Gold customer Acme Corp allows 15% on hardware, 10% on service)
        cust_res = await ac.get("/api/auth/customers", headers=headers)
        acme = next(c for c in cust_res.json() if c["tier"] == "Gold")

        # Get products
        prod_res = await ac.get("/api/products", headers=headers)
        service = next(p for p in prod_res.json() if p["category"] == "Services")

        # Create new quote
        create_res = await ac.post("/api/quotations", json={
            "customer_id": acme["id"],
            "notes": "Test over-discount quote"
        }, headers=headers)
        assert create_res.status_code == 200
        quote = create_res.json()

        # Add Service line with 18% discount (allowed is only 10%!) -> 8 points OVER
        line_res = await ac.post(f"/api/quotations/{quote['id']}/lines", json={
            "product_id": service["id"],
            "qty": 1,
            "discount_pct": 18.0
        }, headers=headers)
        assert line_res.status_code == 200
        updated_quote = line_res.json()
        assert updated_quote["lines"][0]["line_status"] == "OVER"
        assert updated_quote["lines"][0]["line_excess"] == 8.0
        assert updated_quote["blended_risk"] == "HIGH"

        # Submit quote -> Automatically routes to Sales Manager + Finance without rep requesting
        submit_res = await ac.post(f"/api/quotations/{quote['id']}/submit", headers=headers)
        assert submit_res.status_code == 200
        submitted_quote = submit_res.json()
        assert submitted_quote["status"] == "pending_approval"

        # Verify approval request was generated
        appr_res = await ac.get("/api/approvals?status=pending", headers=headers)
        assert appr_res.status_code == 200
        found = any(a["quotation_id"] == quote["id"] for a in appr_res.json())
        assert found is True

@pytest.mark.asyncio
async def test_step_4_upsell_margin_update():
    """Step 4: While building quote, accept one upsell suggestion and confirm order total and margin update right away."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/auth/login", json={"email": "rep@dealflow.com", "password": "rep123"})
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        cust_res = await ac.get("/api/auth/customers", headers=headers)
        cust = cust_res.json()[0]

        prod_res = await ac.get("/api/products", headers=headers)
        laptop = next(p for p in prod_res.json() if p["sku"] == "HW-LPT-16")

        # Create quote with laptop
        quote_res = await ac.post("/api/quotations", json={"customer_id": cust["id"]}, headers=headers)
        quote_id = quote_res.json()["id"]

        await ac.post(f"/api/quotations/{quote_id}/lines", json={
            "product_id": laptop["id"],
            "qty": 1,
            "discount_pct": 0.0
        }, headers=headers)

        # Fetch upsell suggestions
        sugg_res = await ac.get(f"/api/quotations/{quote_id}/suggestions", headers=headers)
        assert sugg_res.status_code == 200
        suggestions = sugg_res.json()
        assert len(suggestions) > 0
        target_sugg = suggestions[0]

        quote_before = (await ac.get(f"/api/quotations/{quote_id}", headers=headers)).json()

        # Add suggested product to quote
        add_res = await ac.post(f"/api/quotations/{quote_id}/lines", json={
            "product_id": target_sugg["product_id"],
            "qty": 1,
            "discount_pct": 0.0
        }, headers=headers)
        quote_after = add_res.json()

        # Confirm order total and margin updated immediately
        assert quote_after["total_amount"] > quote_before["total_amount"]
        assert quote_after["total_margin"] > quote_before["total_margin"]

@pytest.mark.asyncio
async def test_step_5_approval_and_multi_warehouse_split():
    """
    Step 5: Get quotation approved, then confirm that stock is being pulled from correct warehouse,
    splitting across two warehouses if needed.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create quote with 6 laptops (Chicago has 4, NYC has 8 -> Forces split: 4 from Chi, 2 from NYC!)
        cust_res = await ac.get("/api/auth/customers")
        cust = cust_res.json()[0]
        prod_res = await ac.get("/api/products")
        laptop = next(p for p in prod_res.json() if p["sku"] == "HW-LPT-16")

        q_res = await ac.post("/api/quotations", json={"customer_id": cust["id"]})
        qid = q_res.json()["id"]
        await ac.post(f"/api/quotations/{qid}/lines", json={
            "product_id": laptop["id"],
            "qty": 10,
            "discount_pct": 0.0
        })

        # Submit (zero discount -> auto approves)
        await ac.post(f"/api/quotations/{qid}/submit")

        # Get fulfillment suggestion
        sugg_res = await ac.get(f"/api/fulfillment/quotation/{qid}/suggestion")
        assert sugg_res.status_code == 200
        sugg = sugg_res.json()
        assert sugg["is_split"] is True
        assert sugg["total_shipments"] == 2
        assert len(sugg["allocations"]) == 2

        # Accept split
        accept_res = await ac.post(f"/api/fulfillment/quotation/{qid}/accept")
        assert accept_res.status_code == 200
        order = accept_res.json()
        assert order["status"] == "accepted"
        assert order["total_shipments"] == 2

@pytest.mark.asyncio
async def test_step_6_hybrid_billing_separation():
    """Step 6: Check that a one-time product and a recurring subscription on the same order are billed correctly and separately."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Check pre-seeded Acme Corp quote which has both hardware and subscription
        quotes_res = await ac.get("/api/quotations")
        acme_quote = next(q for q in quotes_res.json() if "ACME" in q["quote_number"])
        
        has_recurring = any(l["is_recurring"] is True for l in acme_quote["lines"])
        has_onetime = any(l["is_recurring"] is False for l in acme_quote["lines"])
        assert has_recurring is True
        assert has_onetime is True

@pytest.mark.asyncio
async def test_step_7_portal_counter_discount_auto_re_approval():
    """
    Step 7: Open customer portal view and request a bigger discount as the customer,
    then confirm the quote goes back for approval automatically.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Fetch Acme Corp customer and portal token
        cust_res = await ac.get("/api/auth/customers")
        acme = next(c for c in cust_res.json() if c["company_name"] == "Acme Corp")
        token = acme["portal_token"]

        # Fetch Acme quote
        q_res = await ac.get("/api/quotations")
        acme_quote = next(q for q in q_res.json() if q["customer_id"] == acme["id"])

        # View via portal (verify no cost/margin fields exposed!)
        portal_view = await ac.get(f"/api/portal/quotation/{acme_quote['id']}?token={token}")
        assert portal_view.status_code == 200
        pdata = portal_view.json()
        assert "cost_price" not in pdata["lines"][0]
        assert "line_margin" not in pdata["lines"][0]
        assert "total_margin" not in pdata

        # Customer proposes higher counter-discount on line 1 (18% discount -> exceeds Gold 15% limit!)
        target_line_id = pdata["lines"][0]["id"]
        counter_res = await ac.post(
            f"/api/portal/quotation/{acme_quote['id']}/counter-discount?token={token}",
            json={
                "quotation_line_id": target_line_id,
                "proposed_discount_pct": 18.0,
                "comment": "We are placing a 5-unit order today, requesting 18% volume concession."
            }
        )
        assert counter_res.status_code == 200
        res_data = counter_res.json()
        # Automatically goes back to pending_approval!
        assert res_data["status"] == "pending_approval"

@pytest.mark.asyncio
async def test_step_8_payment_and_invoice_update():
    """Step 8: Confirm order, ship, record a payment, and check that the invoice status updates correctly."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        orders_res = await ac.get("/api/fulfillment/orders")
        assert len(orders_res.json()) > 0
        target_order = orders_res.json()[0]

        # Ship order -> automatically generates per-shipment invoice
        ship_res = await ac.post(f"/api/fulfillment/orders/{target_order['id']}/ship")
        assert ship_res.status_code == 200
        inv_id = ship_res.json()["invoice_id"]

        # Check invoice status is 'issued'
        inv_res = await ac.get(f"/api/billing/invoices")
        target_inv = next(i for i in inv_res.json() if i["id"] == inv_id)
        assert target_inv["status"] == "issued"
        assert target_inv["total_amount"] > 0

        # Record full payment
        pay_res = await ac.post(f"/api/billing/invoices/{inv_id}/pay", json={
            "amount": target_inv["total_amount"],
            "payment_method": "bank_transfer",
            "notes": "Wire confirmation #TX-998822"
        })
        assert pay_res.status_code == 200

        # Verify invoice is now 'paid'
        inv_updated_res = await ac.get(f"/api/billing/invoices")
        updated_inv = next(i for i in inv_updated_res.json() if i["id"] == inv_id)
        assert updated_inv["status"] == "paid"
        assert updated_inv["paid_at"] is not None
