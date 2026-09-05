# DealFlow360

Quote-to-cash SaaS platform — quotations, discount approvals, fulfillment, subscriptions and invoicing in one workspace, for internal teams and customers.

Stack: **React (Vite) + Express + PostgreSQL**, as requested (the original design docs mention Angular/Spring Boot — this build uses the MERN-style stack instead).

## What's included

- **backend/** — Express REST API, JWT auth, role-based access, PostgreSQL via `pg`. Covers: auth, products/catalog, discount tiers, quotations (with live discount validation), approvals, fulfillment, subscriptions, invoices, and a deal-health/reporting analytics endpoint.
- **frontend/** — React app (Vite) covering the core flow from the spec: Login → Sales Dashboard → Quotations (list/grid + detail with live discount validation) → Approvals (list + decision) → Fulfillment → Subscriptions & Billing → Deal Health Cockpit → Admin Reporting → Customer Portal.
- **docker-compose.yml** — spins up Postgres only (bring your own Node runtime).

See `status.md` for exactly what's finished vs. what's stubbed/remaining.

## Quick start

### 1. Database
```bash
docker compose up -d postgres
```
(Or point `DATABASE_URL` in `backend/.env` at any Postgres 14+ instance.)

### 2. Backend
```bash
cd backend
cp .env.example .env      # edit DATABASE_URL / JWT_SECRET if needed
npm install
npm run migrate           # creates tables
npm run seed               # demo customers, products, discount tiers, users
npm run dev                # starts on http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173, proxies /api to :4000
```

### 4. Log in
Any of these (password for all: `password123`):
- `rep@dealflow360.com` — Sales Rep
- `manager@dealflow360.com` — Sales Manager (approver)
- `finance@dealflow360.com` — Finance (approver)
- `vp@dealflow360.com` — VP (approver, high-risk deals)
- `admin@dealflow360.com` — Admin
- `customer@dealflow360.com` — Customer Portal view

## Creating your first quotation (demo flow)

1. Log in as `rep@dealflow360.com`.
2. Get a customer id: `GET http://localhost:4000/api/deal-health/overview` (with your token) → `customers[].id`. (A "pick customer from dropdown" UI is on the remaining list — see status.md.)
3. Go to **Quotations → + New Quotation**, paste the customer id, add product lines, watch the discount **OK/OVER** badge update live as you type a discount %.
4. Save Draft → open the quotation → **Submit for Approval**.
5. Log out, log in as `manager@dealflow360.com` (or `finance@dealflow360.com` / `vp@dealflow360.com` depending on the risk bucket) → **Approvals** → Approve/Reject.
6. Approved quotations auto-create a Fulfillment record — check **Fulfillment**.

## Key design decisions carried over from the spec

- **Live discount validation**: `POST /api/quotations/validate-line` checks a product's category discount limit as the user types — this is the core differentiator vs. traditional CPQ tools that only validate at submit-time.
- **Risk-based routing**: `approval_chains` table maps a discount % range to LOW/MEDIUM/HIGH risk and the responsible approver role (Sales Manager / Finance / VP).
- **Deal Health Cockpit**: composite Health/Churn/Expansion/SLA scores, a segment × pipeline-status heatmap, and an at-risk-value breakdown by reason.
