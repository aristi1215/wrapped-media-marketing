# AGENTS.md

## Cursor Cloud specific instructions

### Repository state

This is a full-stack **React + Vite + TypeScript + Supabase** Campaign Admin Dashboard for Wrapped Media.

**Tech Stack:**
- Frontend: React 18 + Vite + TypeScript
- Styling: Tailwind CSS + custom component system
- Routing: React Router v7
- State: TanStack Query (React Query)
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- Maps: Mapbox GL JS via react-map-gl
- Charts: Recharts
- PDF: jsPDF + jspdf-autotable
- Forms: React Hook Form + Zod

**Application modules:**
- `/dashboard` — Stats overview, charts
- `/campaigns` — Campaign CRUD, driver assignment, report generation
- `/drivers` — Driver pool management, approval workflow
- `/map` — Live GPS map + heatmap (requires Mapbox token)
- `/clients` — CRM-lite client management
- `/payroll` — Driver payout calculator, CSV export

**Supabase project:** `lqkuzzqtjzuyldityxxw` (wrapped-media-marketing, us-west-2)

### Environment

- Runtime: Node.js (v22.x) with npm
- Setup: `npm install`
- **Required env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_TOKEN`
- Env file `.env` is present with Supabase credentials configured

### Running / testing / building

- `npm run dev` — start Vite dev server (localhost:5173)
- `npm run build` — TypeScript check + Vite production build
- `npm run preview` — preview production build
- **Demo credentials:** email `admin@wrappedmedia.ca`, password `Admin1234!`

### Cursor Cloud specific testing instructions

For UI testing, use the `computerUse` subagent to open Chrome at `http://localhost:5173` after running `npm run dev`. The Mapbox map requires a valid `VITE_MAPBOX_TOKEN` to render; without it, the map page shows a fallback with GPS stats.
