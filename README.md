# Wrapped Media Marketing

**Campaign operations platform for vehicle-wrap advertising** — the command center marketing teams use to launch campaigns, coordinate drivers, track fleet GPS in real time, and deliver client-ready reports.

Built as a production-grade admin dashboard, not a prototype. Every module maps to a real operational workflow: from assigning drivers to a campaign to exporting payroll CSVs and PDF performance reports.

---

## Why this project matters

Vehicle-wrap marketing involves moving parts — clients, drivers, routes, proof-of-performance, and payouts. This platform consolidates those workflows into a single authenticated dashboard backed by Supabase, so ops teams spend less time in spreadsheets and more time running campaigns.

| Module | What it solves |
|--------|----------------|
| **Dashboard** | At-a-glance KPIs, charts, and campaign health |
| **Campaigns** | Full CRUD, driver assignment, report generation |
| **Drivers** | Pool management, approval workflow, detail views |
| **Live Map** | Real-time GPS tracking + heatmap (Mapbox GL) |
| **Clients** | Lightweight CRM for account management |
| **Payroll** | Driver payout calculator with CSV export |

---

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Routing:** React Router v7
- **State & data:** TanStack Query (React Query)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, RLS)
- **Maps:** Mapbox GL JS via react-map-gl
- **Charts:** Recharts
- **Reports:** jsPDF + jspdf-autotable
- **Forms:** React Hook Form + Zod validation

---

## Architecture highlights

- **Role-based auth** — Supabase Auth with protected routes and session persistence
- **Realtime-ready** — Built on Supabase for live data where campaigns need it
- **Typed end-to-end** — Strict TypeScript across pages, hooks, and Supabase client
- **Component system** — Reusable UI primitives (Radix + custom design tokens)
- **Production deploy** — Vite build pipeline, Vercel-ready

---

## Getting started

```bash
npm install
```

Create a `.env` file with:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token
```

```bash
npm run dev      # http://localhost:5173
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
```

---

## What this demonstrates

- Designing **multi-module business dashboards** with clear domain separation
- Integrating **third-party APIs** (Mapbox) alongside a **BaaS backend** (Supabase)
- Building **reporting pipelines** (PDF generation, CSV export) for non-technical stakeholders
- Shipping **form-heavy CRUD flows** with validation, modals, and optimistic UX patterns

---

Built by [aristi1215](https://github.com/aristi1215) · Wrapped Media campaign operations
