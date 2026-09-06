import asyncio
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import engine, Base, AsyncSessionLocal
from app.models.user import User, Customer
from app.models.product import Product, ProductVariant, PriceListEntry
from app.models.rules import DiscountTierConfig, CategoryDiscountConfig, ApprovalRule, UpsellRule
from app.models.warehouse import Warehouse, Stock
from app.models.billing import SubscriptionPlan
from app.models.quotation import Quotation, QuotationLine
from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.deal_health import RepMetric
from app.core.security import get_password_hash
from app.core.blended_risk import calculate_blended_risk
from app.core.timeutils import utcnow

async def seed_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(User))
        if res.scalars().first():
            print("Database already seeded. Skipping.")
            return

        print("Seeding DealFlow360 database with production reference dataset...")

        # 1. Users
        rep = User(
            email="rep@dealflow.com",
            hashed_password=get_password_hash("rep123"),
            full_name="Alex Vance",
            role="sales_rep"
        )
        manager = User(
            email="manager@dealflow.com",
            hashed_password=get_password_hash("manager123"),
            full_name="Morgan Drake",
            role="sales_manager"
        )
        finance = User(
            email="finance@dealflow.com",
            hashed_password=get_password_hash("finance123"),
            full_name="Taylor Reed",
            role="finance_ops"
        )
        admin = User(
            email="admin@dealflow.com",
            hashed_password=get_password_hash("admin123"),
            full_name="Admin Chief",
            role="admin"
        )
        db.add_all([rep, manager, finance, admin])
        await db.flush()

        # 2. Customers
        acme = Customer(
            name="Sarah Connor",
            company_name="Acme Corp",
            email="procurement@acme.com",
            phone="+1 (555) 019-2834",
            tier="Gold",
            portal_token="portal-acme-gold-token-12345"
        )
        beta = Customer(
            name="David Bowman",
            company_name="Beta Industries",
            email="orders@betaind.com",
            phone="+1 (555) 024-8891",
            tier="Silver",
            portal_token="portal-beta-silver-token-67890"
        )
        stark = Customer(
            name="James Rhodes",
            company_name="Stark Logistics",
            email="ops@starklog.com",
            phone="+1 (555) 039-9944",
            tier="Bronze",
            portal_token="portal-stark-bronze-token-11223"
        )
        db.add_all([acme, beta, stark])
        await db.flush()

        # 3. Discount Tier Configs
        tier_configs = [
            DiscountTierConfig(tier="Bronze", max_discount_pct=5.0),
            DiscountTierConfig(tier="Silver", max_discount_pct=10.0),
            DiscountTierConfig(tier="Gold", max_discount_pct=15.0),
        ]
        db.add_all(tier_configs)

        # 4. Category Discount Ceilings
        cat_configs = [
            CategoryDiscountConfig(category="Hardware", max_discount_pct=15.0),
            CategoryDiscountConfig(category="Services", max_discount_pct=10.0),
            CategoryDiscountConfig(category="Subscriptions", max_discount_pct=12.0),
        ]
        db.add_all(cat_configs)

        # 5. Approval Rules
        app_rules = [
            ApprovalRule(
                name="Within Limits",
                risk_band="NONE",
                min_excess=0.0,
                max_excess=0.0,
                min_total_excess=0.0,
                approvers=[],
                description="Zero discount excess across all items. Auto-approved."
            ),
            ApprovalRule(
                name="Moderate Excess (Manager Review)",
                risk_band="MEDIUM",
                min_excess=0.01,
                max_excess=5.0,
                min_total_excess=0.0,
                approvers=["sales_manager"],
                description="Excess up to 5% on single line or moderate aggregate discount."
            ),
            ApprovalRule(
                name="High Risk Blended Excess (Manager + Finance)",
                risk_band="HIGH",
                min_excess=5.01,
                max_excess=100.0,
                min_total_excess=8.0,
                approvers=["sales_manager", "finance_ops"],
                description="Single line exceeds limit by >5% or total excess across lines >8%."
            ),
        ]
        db.add_all(app_rules)

        # 6. Warehouses
        wh_chi = Warehouse(
            name="Main Warehouse",
            code="MW-CHI",
            location="Chicago, IL",
            shipping_cost_weight=1.0
        )
        wh_nyc = Warehouse(
            name="East Depot",
            code="ED-NYC",
            location="New York, NY",
            shipping_cost_weight=1.5
        )
        wh_sfo = Warehouse(
            name="West Hub",
            code="WH-SFO",
            location="San Francisco, CA",
            shipping_cost_weight=1.8
        )
        db.add_all([wh_chi, wh_nyc, wh_sfo])
        await db.flush()

        # 7. Products
        laptop = Product(
            name="Enterprise Laptop Pro 16",
            sku="HW-LPT-16",
            category="Hardware",
            base_price=1500.0,
            cost_price=900.0,
            unit="Units",
            tax_rate=0.10,
            description="Intel i9, 32GB RAM, 1TB SSD workhorse laptop",
            is_subscription=False
        )
        service = Product(
            name="Setup & Implementation Service",
            sku="SRV-IMP-01",
            category="Services",
            base_price=2500.0,
            cost_price=1500.0,
            unit="Hours",
            tax_rate=0.10,
            description="White-glove enterprise migration and onboarding",
            is_subscription=False
        )
        saas = Product(
            name="Cloud SaaS Enterprise License",
            sku="SUB-CLD-ENT",
            category="Subscriptions",
            base_price=120.0,
            cost_price=20.0,
            unit="User/Month",
            tax_rate=0.10,
            description="Per-seat cloud collaboration and workflow suite",
            is_subscription=True
        )
        dock = Product(
            name="Pro Ergonomic Docking Station",
            sku="HW-DCK-01",
            category="Hardware",
            base_price=250.0,
            cost_price=110.0,
            unit="Units",
            tax_rate=0.10,
            description="Triple 4K display dock with 100W Power Delivery",
            is_subscription=False
        )
        sla = Product(
            name="24/7 Mission Critical Support SLA",
            sku="SRV-SLA-247",
            category="Services",
            base_price=800.0,
            cost_price=300.0,
            unit="Month",
            tax_rate=0.10,
            description="15-minute response SLA with dedicated TAM",
            is_subscription=False
        )
        db.add_all([laptop, service, saas, dock, sla])
        await db.flush()

        # Variants
        v1 = ProductVariant(product_id=laptop.id, attribute_name="RAM", attribute_value="64GB Upgrade", extra_price=250.0)
        v2 = ProductVariant(product_id=dock.id, attribute_name="Pack", attribute_value="Pack of 5 Cables", extra_price=30.0)
        db.add_all([v1, v2])

        # Tier Price List for Laptop
        db.add_all([
            PriceListEntry(product_id=laptop.id, customer_tier="Gold", custom_price=1400.0, min_qty=1.0),
            PriceListEntry(product_id=laptop.id, customer_tier="Silver", custom_price=1450.0, min_qty=1.0),
            PriceListEntry(product_id=laptop.id, customer_tier="Bronze", custom_price=1500.0, min_qty=1.0)
        ])

        # 8. Stock Allocation (Split scenario testable!)
        # Main Warehouse has 4 Laptops; East Depot has 8 Laptops.
        # An order of 6 laptops WILL force a split between Chicago (takes 4) and NYC (takes 2)!
        stocks = [
            Stock(warehouse_id=wh_chi.id, product_id=laptop.id, qty_available=4, qty_reserved=0, reorder_level=5),
            Stock(warehouse_id=wh_nyc.id, product_id=laptop.id, qty_available=8, qty_reserved=0, reorder_level=5),
            Stock(warehouse_id=wh_chi.id, product_id=dock.id, qty_available=15, qty_reserved=0, reorder_level=5),
            Stock(warehouse_id=wh_nyc.id, product_id=dock.id, qty_available=20, qty_reserved=0, reorder_level=5),
        ]
        db.add_all(stocks)

        # 9. Subscription Plans
        plan_monthly = SubscriptionPlan(
            name="Monthly Business Pro",
            cadence="monthly",
            billing_cycle_days=30,
            price=120.0,
            proration_rule="daily_rate",
            cancellation_refund_rule="prorated_credit_note"
        )
        plan_yearly = SubscriptionPlan(
            name="Annual Enterprise Fleet",
            cadence="yearly",
            billing_cycle_days=365,
            price=1200.0,
            proration_rule="daily_rate",
            cancellation_refund_rule="prorated_credit_note"
        )
        db.add_all([plan_monthly, plan_yearly])
        await db.flush()

        # 10. Upsell Rules
        db.add_all([
            UpsellRule(
                primary_product_id=laptop.id,
                suggested_product_id=dock.id,
                co_purchase_score=0.92,
                is_promoted=True,
                min_margin_pct=20.0,
                reason="88% of laptop fleet orders bundle docking stations"
            ),
            UpsellRule(
                primary_product_id=laptop.id,
                suggested_product_id=sla.id,
                co_purchase_score=0.74,
                is_promoted=False,
                min_margin_pct=25.0,
                reason="Recommended for corporate fleets requiring 24/7 SLA"
            )
        ])

        # 11. Rep Metric
        db.add(RepMetric(
            rep_id=rep.id,
            trailing_avg_discount=6.0,
            total_deals_count=24,
            deals_won_count=18
        ))

        # 12. Pre-seeded Quotation (Exact Acme Corp prompt example)
        # Gold customer (15% allowed for hardware, 10% allowed for service)
        # Line 1: Laptop Pro @ 12% discount (allowed 15% -> excess 0 -> OK)
        # Line 2: Setup Service @ 18% discount (allowed 10% -> excess 8 -> OVER!)
        # Blended Risk: HIGH (routed to Sales Manager, then Finance)
        quote_acme = Quotation(
            quote_number="QT-1001-ACME",
            customer_id=acme.id,
            rep_id=rep.id,
            status="pending_approval",
            blended_risk="HIGH",
            notes="Enterprise rollout quotation with custom migration onboarding.",
            last_activity_at=utcnow() - timedelta(days=2)
        )
        db.add(quote_acme)
        await db.flush()

        line1 = QuotationLine(
            quotation_id=quote_acme.id,
            product_id=laptop.id,
            qty=5,
            unit_price=1500.0,
            cost_price=900.0,
            discount_pct=12.0,
            limit_pct=15.0,
            line_excess=0.0,
            line_status="OK",
            line_total=6600.0,  # 7500 - 900
            line_margin=2100.0,
            line_margin_pct=31.82,
            is_recurring=False
        )
        line2 = QuotationLine(
            quotation_id=quote_acme.id,
            product_id=service.id,
            qty=1,
            unit_price=2500.0,
            cost_price=1500.0,
            discount_pct=18.0,
            limit_pct=10.0,
            line_excess=8.0,
            line_status="OVER",
            line_total=2050.0,  # 2500 - 450
            line_margin=550.0,
            line_margin_pct=26.83,
            is_recurring=False
        )
        line3 = QuotationLine(
            quotation_id=quote_acme.id,
            product_id=saas.id,
            qty=10,
            unit_price=120.0,
            cost_price=20.0,
            discount_pct=5.0,
            limit_pct=12.0,
            line_excess=0.0,
            line_status="OK",
            line_total=1140.0,
            line_margin=940.0,
            line_margin_pct=82.46,
            is_recurring=True,
            subscription_plan_id=plan_monthly.id
        )
        db.add_all([line1, line2, line3])

        quote_acme.total_amount = 9790.0
        quote_acme.total_cost = 6200.0
        quote_acme.total_margin = 3590.0
        quote_acme.total_margin_pct = 36.67
        quote_acme.total_discount_amount = 1410.0

        # Approval Request for Acme
        app_req = ApprovalRequest(
            quotation_id=quote_acme.id,
            status="pending",
            current_step=1,
            blended_risk="HIGH"
        )
        db.add(app_req)
        await db.flush()

        step1 = ApprovalStep(
            approval_request_id=app_req.id,
            step_number=1,
            required_role="sales_manager",
            action="pending"
        )
        step2 = ApprovalStep(
            approval_request_id=app_req.id,
            step_number=2,
            required_role="finance_ops",
            action="pending"
        )
        db.add_all([step1, step2])

        await db.commit()
        print("Database seeded successfully with users, products, stock, rules, and Acme Corp HIGH risk quote!")

if __name__ == "__main__":
    asyncio.run(seed_database())
