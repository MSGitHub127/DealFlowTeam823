"""
DealFlow360 English Knowledge Base
Covers 12 essential operational domains derived directly from DealFlow360 source code:
1. Product & Catalog Management
2. Roles & RBAC Permissions
3. Quotation & CPQ Lifecycle
4. Approval Workflows & Risk Engine
5. Fulfillment & Multi-Warehouse Split
6. Hybrid Billing & Invoicing
7. Customer Portal & External Negotiation
8. Analytics, Reports & Exporting
9. Governance & Configuration Rules
10. Warehouses, Stock & Backorders
11. Security, Token Lifecycle & Audit Protocols
12. Frequently Asked Questions (FAQ) & System Glossary
"""

KNOWLEDGE_DOCUMENTS = [
    # 1. Product & Catalog Management
    {
        "id": "kb_product_catalog",
        "title": "Product Catalog & Pricing Architecture",
        "section": "Products, Variants and Multi-Tier Pricelists",
        "category": "product",
        "content": (
            "DealFlow360 manages a tiered product catalog with three standard categories: Hardware, Services, "
            "and Subscriptions (as well as Accessories and Software). Each product defines a SKU, base_price, "
            "unit cost_price, tax_rate, and subscription flag. "
            "Product Variants allow configurable product attributes (e.g. Memory, Storage, Support Tier) with "
            "additional pricing (extra_price). "
            "Tiered Price Lists override standard base prices according to customer relationship tiers: Bronze, "
            "Silver, and Gold, with volume minimum quantities (min_qty) and currency specifications."
        ),
        "keywords": ["product", "sku", "variant", "price", "pricelist", "tier", "hardware", "subscription", "cost", "choot", "bhav", "mal"]
    },
    {
        "id": "kb_product_proration",
        "title": "Subscription Product Billing Rules",
        "section": "Recurring Services and Proration",
        "category": "product",
        "content": (
            "Subscription products in DealFlow360 are billed on monthly or annual billing cycles. When a customer "
            "alters license quantities mid-cycle, the system calculates calendar-day exact proration using "
            "UTC timestamps. The proration formula charges for the unconsumed fraction of the active cycle, "
            "generating either an additive interim invoice or a credit balance on the account."
        ),
        "keywords": ["subscription", "recurring", "proration", "billing cycle", "plan", "monthly", "saas"]
    },

    # 2. Roles & Permissions
    {
        "id": "kb_roles_overview",
        "title": "Role-Based Access Control (RBAC) Framework",
        "section": "Internal Roles and Access Boundaries",
        "category": "roles/permissions",
        "content": (
            "DealFlow360 enforces four internal employee roles plus isolated customer portal access: "
            "1. sales_rep: Creates and modifies own draft quotations, requests discount approvals, views customer records and catalog prices. Cannot view other reps' quotes or approve discounts. "
            "2. sales_manager: Approves Tier 1 discounts (up to 20%), reviews pipeline analytics, monitors deal health anomalies, and oversees team sales reps. "
            "3. finance_ops: Approves Tier 2 / high-risk discounts (over 20%), manages multi-warehouse stock allocations, dispatches fulfillment orders, and generates hybrid invoices and credit notes. "
            "4. admin: Possesses global access to manage all system configuration rules, user credentials, approval chains, category ceilings, and system audit logs."
        ),
        "keywords": ["role", "permission", "rbac", "sales_rep", "sales_manager", "finance_ops", "admin", "adheekar", "access"]
    },
    {
        "id": "kb_roles_security_boundaries",
        "title": "Identity Protection and Privilege Separation",
        "section": "RBAC Data Isolation and Authorization",
        "category": "roles/permissions",
        "content": (
            "All DealFlow360 API endpoints derive user identity strictly from verified server-side JWT tokens. "
            "Frontend claims of role or user_id are ignored. Sales reps cannot inspect profit margins, supplier cost "
            "prices, or peer pipelines. Customer portal users are strictly restricted to non-sensitive line totals "
            "and are prevented from viewing company margins, internal approval notes, or risk scores."
        ),
        "keywords": ["security", "isolation", "authorization", "cost", "margin", "jwt", "chori", "leak"]
    },

    # 3. Quotations & CPQ
    {
        "id": "kb_quotations_lifecycle",
        "title": "Quotation Lifecycle & CPQ Workflow",
        "section": "Quotation State Transitions",
        "category": "quotations",
        "content": (
            "A DealFlow360 quotation traverses a governed lifecycle: "
            "1. DRAFT: Initial assembly of line items, quantities, and requested discounts. "
            "2. INTERNAL_REVIEW / PENDING_APPROVAL: Triggered automatically if requested discounts exceed automated ceilings or if the deal health engine flags elevated risk. "
            "3. APPROVED: Validated and authorized by required management levels. "
            "4. NEGOTIATION / SENT_TO_CUSTOMER: Presented to the customer through the secure portal link. "
            "5. CONFIRMED / ACCEPTED: Approved by the customer. "
            "6. FULFILLED / CONVERTED_TO_ORDER: Passed to fulfillment for warehouse split and billing."
        ),
        "keywords": ["quotation", "quote", "cpq", "draft", "approved", "confirmed", "lifecycle", "bhavpatra", "order"]
    },
    {
        "id": "kb_quotations_discounts",
        "title": "Quotation Discount & Ceiling Calculations",
        "section": "Line-Level and Quote-Level Discounts",
        "category": "quotations",
        "content": (
            "Each quotation line item specifies a discount percentage (discount_pct). The CPQ engine validates "
            "this against the customer tier ceiling and product category discount cap. If the requested discount "
            "exceeds the permitted threshold, the line status is marked as 'OVER' and automatically triggers an "
            "approval request before the quote can be sent to the customer."
        ),
        "keywords": ["discount", "ceiling", "threshold", "line_status", "choot", "discount_pct", "excess"]
    },

    # 4. Approvals & Risk Engine
    {
        "id": "kb_approvals_tiers",
        "title": "Multi-Tier Approval Hierarchy",
        "section": "Approval Routing and Escalation",
        "category": "approvals",
        "content": (
            "DealFlow360 routes approval requests through deterministic policy tiers: "
            "- Tier 1 (Low Excess, <= 15% discount): Approved by Sales Manager. "
            "- Tier 2 (Moderate Excess, 15% - 25% discount): Requires Sales Manager and Finance Ops approval. "
            "- Tier 3 (High Excess > 25% or Negative Margin): Requires Executive / VP Finance and Admin signoff. "
            "Approvers can approve or reject with mandatory audit remarks. Rejection returns the quote to DRAFT."
        ),
        "keywords": ["approval", "tier", "escalation", "sales_manager", "finance_ops", "manzoori", "swikriti"]
    },
    {
        "id": "kb_blended_risk_engine",
        "title": "Deal Health & Blended Risk Engine",
        "section": "Risk Scoring and Anomaly Detection",
        "category": "approvals",
        "content": (
            "The Deal Health Engine computes a Blended Risk Score (NONE, MEDIUM, HIGH) combining: "
            "1. Margin Compression: Significant deviation from the historical product margin. "
            "2. Sales Rep Anomaly: Discount request exceeding 1.4x the representative's trailing average. "
            "3. Stalled Deal Age: Quotation lingering in negotiation or internal review beyond 7 days. "
            "4. Customer Credit / History: Past payment delinquencies or high counter-discount patterns."
        ),
        "keywords": ["risk", "blended_risk", "deal_health", "anomaly", "stalled", "nuksan", "khatra"]
    },

    # 5. Fulfillment & Multi-Warehouse Split
    {
        "id": "kb_fulfillment_split",
        "title": "Multi-Warehouse Split & Allocation Engine",
        "section": "Automated Inventory Routing",
        "category": "fulfillment",
        "content": (
            "Upon quotation confirmation, the Fulfillment Engine analyzes multi-warehouse inventory across "
            "regional distribution centers (e.g. Central-Hub, West-Coast, East-Coast). "
            "The allocation algorithm minimizes shipping distance, split order overhead, and stockouts: "
            "- If a single warehouse has full stock, 100% is allocated there. "
            "- If stock is split, the engine creates sub-allocations per warehouse. "
            "- If insufficient stock exists across all sites, backorder records are created automatically."
        ),
        "keywords": ["fulfillment", "warehouse", "split", "allocation", "stock", "inventory", "godown", "mal"]
    },
    {
        "id": "kb_fulfillment_dispatch",
        "title": "Order Dispatch and Backorder Consolidation",
        "section": "Shipment Tracking and Backorders",
        "category": "fulfillment",
        "content": (
            "Finance Ops dispatches fulfillment orders by assigning carrier tracking numbers and recording "
            "dispatched quantities. When backordered stock arrives through replenishment, the consolidation "
            "routine automatically reconciles outstanding lines and prepares subsequent split shipments."
        ),
        "keywords": ["dispatch", "carrier", "tracking", "shipment", "backorder", "consilidation"]
    },

    # 6. Hybrid Billing & Invoicing
    {
        "id": "kb_billing_hybrid",
        "title": "Hybrid Billing System Architecture",
        "section": "Hardware and SaaS Unified Billing",
        "category": "billing",
        "content": (
            "DealFlow360 unifies one-time physical goods (Hardware) and recurring SaaS (Subscriptions) into a "
            "single hybrid billing structure: "
            "- Milestone-based invoices for hardware fulfillment upon dispatch. "
            "- Automated recurring subscription invoices generated according to billing intervals. "
            "- Integrated payment recording with automatic reconciliation against open invoice balances. "
            "- Credit Notes issuance for customer returns, billing adjustments, or approved renegotiations."
        ),
        "keywords": ["billing", "invoice", "hybrid", "payment", "credit note", "bill", "chalan", "paise"]
    },
    {
        "id": "kb_billing_credit_notes",
        "title": "Invoice Adjustment & Credit Note Protocols",
        "section": "Credit Notes and Balances",
        "category": "billing",
        "content": (
            "Credit notes in DealFlow360 are strictly auditable legal documents linked directly to existing invoices. "
            "They record the reason for deduction, reference invoice ID, allocated tax adjustment, and updated net "
            "receivables. Invoices reflect payment states: DRAFT, ISSUED, PARTIALLY_PAID, PAID, and CANCELLED."
        ),
        "keywords": ["credit_note", "invoice", "receivables", "reconciliation", "payment"]
    },

    # 7. Customer Portal & Negotiation
    {
        "id": "kb_portal_architecture",
        "title": "Customer Portal Isolation Architecture",
        "section": "Zero-Trust Customer Portal",
        "category": "customer portal",
        "content": (
            "The Customer Portal enables self-service quote inspection and interactive counter-negotiation: "
            "- Access is governed by secure, rotating customer portal tokens valid for 7 days. "
            "- Strict Zero-Trust Data Masking: Internal supplier costs, rep commission, company margin percentages, "
            "and internal approval threads are completely stripped before transmission. "
            "- Customers can accept quotations or submit structured counter-discount proposals with comments. "
            "- Submitting a counter-discount re-opens the quotation in NEGOTIATION state for rep review."
        ),
        "keywords": ["portal", "customer", "token", "negotiation", "counter", "magic link", "graahak"]
    },

    # 8. Reports & Analytics
    {
        "id": "kb_reports_analytics",
        "title": "Operations Analytics & Export Engine",
        "section": "Sales Performance, Margin Analytics and Exports",
        "category": "reports",
        "content": (
            "DealFlow360 provides real-time operational reports: "
            "1. Pipeline Summary: Conversion rates, total deal volume, average cycle time by sales stage. "
            "2. Margin Trend Analysis: Category and product margin health over trailing quarters. "
            "3. Rep Performance Matrix: Win rates, discount frequency, and quota attainment. "
            "4. Enterprise Exporting: Asynchronous report generation delivering Excel (.xlsx) workbooks and "
            "formal PDF executive summaries."
        ),
        "keywords": ["report", "analytics", "margin", "trend", "excel", "pdf", "export", "dashboard"]
    },

    # 9. Configuration & Business Rules
    {
        "id": "kb_config_rules",
        "title": "Governance Rules & Discount Policies",
        "section": "Dynamic Rule Engine",
        "category": "configuration",
        "content": (
            "Administrators define dynamic rules governing quotation validation: "
            "- Customer Tier Discount Matrix: Base ceiling discounts allowable per customer tier (Bronze: 10%, Silver: 15%, Gold: 20%). "
            "- Category Discount Ceilings: Upper bounds per product category (e.g. Hardware: 15%, Services: 25%). "
            "- Upsell Suggestions: Automated cross-sell rules suggesting complementary products (e.g., Extended Warranty when Server Hardware is added). "
            "- Stalled Deal Thresholds: Configurable duration (default 7 days) before inactivity alerts are generated."
        ),
        "keywords": ["config", "rules", "tier", "ceiling", "upsell", "threshold", "policy", "niyam"]
    },

    # 10. Warehouses & Stock Management
    {
        "id": "kb_warehouses_inventory",
        "title": "Warehouse Logistics & Stock Management",
        "section": "Inventory Auditing and Stock Replenishment",
        "category": "warehouses",
        "content": (
            "Warehouses maintain localized stock levels, reserved allocation counters, and minimum reorder thresholds. "
            "Stock movements track replenishment from suppliers, transfers between facilities, and customer dispatches. "
            "When stock dips below safety thresholds, DealFlow360 highlights reorder priorities on the inventory dashboard."
        ),
        "keywords": ["warehouse", "stock", "replenishment", "reorder", "inventory", "movement", "godown"]
    },

    # 11. Security, Token & Audit Protocols
    {
        "id": "kb_security_protocols",
        "title": "Security Architecture & Audit Protocols",
        "section": "Authentication, Tokens and Audit Logs",
        "category": "security",
        "content": (
            "Security foundations of DealFlow360: "
            "1. JWT Authentication: HMAC-SHA256 signed access tokens with 24-hour expiration. "
            "2. Bcrypt Password Hashing: High-work-factor salt and hash on user credentials. "
            "3. Server-Side RBAC Enforcement: Strict role check dependencies in FastAPI route handlers. "
            "4. Comprehensive Audit Logging: Every state change, approval decision, price override, and fulfillment "
            "dispatch is logged with timestamp, user ID, IP, and before/after metadata."
        ),
        "keywords": ["security", "jwt", "token", "bcrypt", "audit", "rbac", "suraksha", "login"]
    },

    # 12. FAQ & Glossary
    {
        "id": "kb_faq_glossary",
        "title": "DealFlow360 Glossary & FAQ",
        "section": "Key Terms and Operational Concepts",
        "category": "FAQ/glossary",
        "content": (
            "Frequently Asked Questions and Glossary: "
            "- What is CPQ? Configure, Price, Quote - the automated engine preventing quoting unauthorized pricing. "
            "- What is Blended Risk? An aggregate score evaluating deal size, discount excess, rep anomaly, and stalled days. "
            "- What is Warehouse Split? Dividing an order line across multiple depots when one facility cannot satisfy total quantity. "
            "- What is Proration? Proportionally charging for partial subscription usage during mid-month seat count changes. "
            "- What is the Customer Portal? An isolated, zero-cost-leak view for external buyers to review and counter quotes."
        ),
        "keywords": ["faq", "glossary", "cpq", "blended_risk", "proration", "warehouse_split", "portal", "sawal", "jawab"]
    }
]
