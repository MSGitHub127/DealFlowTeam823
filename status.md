# DealFlow360 — Build Status

Stack used: **React (Vite) + Express + PostgreSQL** (per your request — note the original docx/excalidraw spec assumed Angular + Spring Boot microservices; this build swaps that for the JS/Postgres stack you asked for, same product logic).

## ✅ Done — Backend (Express + PostgreSQL)

- Full Postgres schema, seed script, JWT auth + role middleware, full auth loop (signup/login/me/change-password/forgot-password/reset-password), Quotations/Customers/Approvals/Fulfillment/Billing/Deal Health/Admin Reporting/Product Catalog APIs.
- Real email delivery for password reset (`backend/src/utils/mailer.js`, SMTP-based, falls back to console + `resetUrl` echo if unconfigured).
- Input validation hardening — `zod` schemas + `validate()` middleware guard every POST/PUT/PATCH body.
- "View as Customer" backend support — `backend/src/utils/customerScope.js`, `?as_customer=<id>` on quotations + billing endpoints, CUSTOMER role always locked to their own `customer_id`.
- Testability refactor — `backend/src/app.js` exports the app without `.listen()`, used by `index.js` and by the test suite.
- **NEW: Automated backend tests** (Jest + Supertest, `backend/tests/`):
  - `setup.js` / `jest.config.js` — env bootstrap, no real DB/network needed.
  - `mockPool.js` + `authHelper.js` — shared test doubles (mocked `pg` pool, JWT minting matching the real auth payload shape).
  - `health.test.js` — `/api/health`, 404 handler, auth-guard (401 on missing/garbage token).
  - `customerScope.test.js` — unit tests for `resolveCustomerScope`/`canPreviewAsCustomer`, including the "CUSTOMER role can't be spoofed via `as_customer`" case.
  - `validate.test.js` — zod middleware unit tests (coercion + 400 on bad input).
  - `quotations.test.js` / `billing.test.js` — route-level tests over a mocked pool covering list scoping for internal roles (unscoped vs `?as_customer=`) and locked-down CUSTOMER scoping, plus discount validation on `/validate-line`.
  - Run with `cd backend && npm install && npm test`. **Not yet executed in this sandbox** (no network to `npm install` here) — only syntax-checked with `node --check`. Please run once and report any failures.

## ✅ Done — Frontend (React + Vite)

- Auth context + protected routes, role-aware sidebar, full auth flow, Quotations List/Detail, Approvals, Fulfillment, Subscriptions & Billing, Deal Health Cockpit, Admin Reporting, Customer Portal, Product Catalog & Discount Tiers admin, modern UI pass.
- **NEW: "View as Customer" frontend** (backend support already existed):
  - `pages/ViewAsCustomerPicker.jsx` (route `/view-as-customer`, sidebar link for ADMIN/SALES_MANAGER/SALES_REP/FINANCE/VP) — searchable customer picker, "Start preview" navigates to `/portal?as_customer=<id>&as_customer_name=<name>`.
  - `components/CustomerPicker.jsx` — extracted the inline picker that used to live only in `QuotationDetail.jsx` into a shared component so both screens use the same one.
  - `pages/CustomerPortal.jsx` — now reads `?as_customer=`, shows a "👁️ Previewing as **X** — Exit preview" banner (internal roles only; a real CUSTOMER always sees only their own data regardless of the param), and calls the scoped quotations/invoices endpoints accordingly.
- **NEW: Live dashboard updates (polling, no WebSocket infra needed)**:
  - `hooks/usePolling.js` — refetches on an interval (15–20s), pauses while the browser tab is hidden, refreshes immediately on tab refocus.
  - `components/LiveBadge.jsx` — "Live · updated Ns ago" / "Paused" indicator.
  - Wired into: **Sales Dashboard**, **Deal Health Cockpit**, **Admin Reporting**, **Customer Portal**.
  - **Not yet wired into**: Approvals List, Fulfillment List, Quotations List — still fetch-once on page load. Same hook/badge can be dropped in the same way (see any of the four above as a reference).
- New CSS added to `styles.css`: `.preview-banner`, `.page-header-row`, `.live-badge` / `.live-dot` (+ pulse animation).
- **Not build-tested**: this sandbox has no network access, so `npm install` can't run here. Run `npm install && npm run dev` on your machine to verify — this is now more important than before since several new files/imports were added.

## ⏳ Remaining

1. **Extend live polling** to Approvals List, Fulfillment List, and Quotations List (currently only the 3 dashboards + Customer Portal poll). Mechanical — copy the `usePolling` + `LiveBadge` pattern from `SalesDashboard.jsx`.
2. **Deployment config** — still no Dockerfile for the backend/frontend app services themselves (only Postgres in `docker-compose.yml`); no CI/CD pipeline.
3. **Quotation line editing after APPROVED/SUBMITTED** — intentionally locked to DRAFT only (by design, per your note). A "request revision" flow would need a new status + approval reset — say the word and I'll design it.
4. **3D bar charts / isometric visuals** — still flat SVG bars/gauges for this MVP pass. Swappable later with Chart.js/D3/Three.js.
5. **Nothing in this project has been executed end-to-end** (no network in this sandbox for either `npm install`). Please run, on your machine:
   - `cd backend && npm install && npm test` (verify the new Jest suite actually passes against real `zod`/`jsonwebtoken`/`supertest` installs)
   - `cd frontend && npm install && npm run dev` (verify the View-as-Customer flow and live polling render correctly)
   Report back anything broken and I'll fix immediately.

## How to pick this back up

Say "continue DealFlow360" and paste this file (or just say what's still broken) — pick up from the "Remaining" list above, starting with extending polling to the remaining list pages (quick), then Docker/CI (bigger).
