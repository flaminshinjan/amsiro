# Store analytics dashboard

Take-home: multi-tenant store analytics API (NestJS + PostgreSQL + Prisma) and dashboard (Next.js). Demo users and seeded events are included.

## Setup instructions

### Prerequisites

- Node.js 20+ or 22+ recommended (avoid Prisma 7 on unsupported Node builds; this repo pins Prisma 5.x).
- Docker (for PostgreSQL) **or** your own Postgres on port **5434** (see below).

### Database

From the repo root:

```bash
docker compose up -d
```

This starts Postgres on **host port 5434** (avoids clashing with a local Postgres on 5432).

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

API base URL defaults to `http://localhost:3001/api/v1`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`, sign in with:

- Email: `owner@demo.com`
- Password: `password123`

Second store (for tenant isolation checks): `other@demo.com` / `password123`.

## Architecture decisions

### Data aggregation strategy

- **Decision:** Store raw events in PostgreSQL with composite indexes on `(store_id, occurred_at)`, `(store_id, event_type, occurred_at)`, and `(store_id, product_id, occurred_at)`. Aggregates for the dashboard are computed with bounded time-range queries and `GROUP BY`.
- **Why:** Fits the take-home time budget, keeps the write path simple, and stays correct under concurrent inserts. Rollups or materialized views would be the next step for very large history.
- **Trade-offs:** Heavy cold-cache scans are mitigated by indexes and time filters, but unbounded queries are avoided by validation (e.g. custom range capped at 366 days).

### Real-time vs batch processing

- **Decision:** Hybrid — **near real-time** on the client via **SWR polling** (15–30s) for recent activity and live visitors; aggregates refresh on the same cadence or when filters change. No WebSockets in v1.
- **Why:** Fewer moving parts than SSE/WebSockets for a short assignment; still feels live for a demo.
- **Trade-offs:** Not sub-second streaming; for production, SSE or WebSockets with back-pressure and Redis pub/sub would scale better horizontally.

### Frontend data fetching

- **Decision:** Client-side `fetch` wrappers plus **SWR** with `refreshInterval`, `cache: 'no-store'` on the API layer for freshness.
- **Why:** Straightforward loading/error handling for a dashboard that depends on the browser session (JWT in `localStorage`).

### Performance optimizations

- PostgreSQL indexes aligned to query patterns (tenant + time + type).
- Prisma `aggregate`, `groupBy`, and `count` scoped by `store_id` on every analytics query.
- Optional **date range** query params for overview and top products; top products default to the last 30 days when no range is set.
- **Bonus:** `GET /api/v1/analytics/live-visitors` uses distinct `session_id` values in a sliding window (default five minutes).

## Known limitations

- JWT in `localStorage` is convenient for the demo but is not ideal for XSS hardening; httpOnly cookies + CSRF would be better in production.
- Top products use a single display currency (`USD`) when aggregating by `product_id` only; multi-currency reporting would need per-currency buckets or FX normalization.
- Live visitor counts depend on clients sending `session_id` on events; otherwise the count can be low.
- E2E tests expect `DATABASE_URL` if you want them to boot the full app (`backend/test/app.e2e-spec.ts`).

## What I would improve with more time

- Redis cache for `GET /analytics/overview` with short TTL and explicit invalidation on ingest.
- Daily rollup table maintained by a worker for O(1) range merges at huge scale.
- Server-sent events for new events instead of polling.
- Stricter Content Security Policy and cookie-based auth for the SPA.

## Time spent

- Fill in your honest estimate (e.g. 3–4 hours).

## API quick reference

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/login` | No |
| GET | `/analytics/overview` | Bearer JWT |
| GET | `/analytics/top-products` | Bearer JWT |
| GET | `/analytics/recent-activity` | Bearer JWT |
| GET | `/analytics/live-visitors` | Bearer JWT |
| POST | `/events` | Bearer JWT |

All analytics routes infer `store_id` from the JWT — never from the request body.

## Video walkthrough

- Add your Loom or YouTube (unlisted) link here after recording.
