# Amsiro — Store Analytics Dashboard

Multi-tenant store analytics API + real-time dashboard. Built with **NestJS**, **PostgreSQL**, **Prisma**, and **Next.js**.

[![Video walkthrough](https://img.youtube.com/vi/ZLISPKt3qS0/maxresdefault.jpg)](https://youtu.be/ZLISPKt3qS0)

[Watch the full walkthrough on YouTube](https://youtu.be/ZLISPKt3qS0)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js SPA)                    │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Login   │  │  KPI Bar     │  │  Charts   │  │  Activity  │  │
│  │  Page    │  │  (sticky)    │  │  (bento)  │  │  Feed      │  │
│  └────┬─────┘  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘  │
│       │               │               │               │        │
│       └───────────────┴───────┬───────┴───────────────┘        │
│                               │                                 │
│                     SWR (polling 15-30s)                         │
│                          + JWT auth                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────┐
│                     NestJS API (port 3001)                       │
│                      /api/v1/*                                  │
│                                                                 │
│  ┌────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │  Auth      │  │  Events        │  │  Analytics           │   │
│  │  Module    │  │  Module        │  │  Module              │   │
│  │            │  │                │  │                      │   │
│  │ POST login │  │ POST /events   │  │ GET /overview        │   │
│  │ JWT issue  │  │ idempotent     │  │ GET /top-products    │   │
│  │            │  │ upsert         │  │ GET /recent-activity │   │
│  └──────┬─────┘  └───────┬────────┘  │ GET /live-visitors   │   │
│         │                │           └──────────┬───────────┘   │
│         │                │                      │               │
│         │      ┌─────────▼──────────────────────▼──────┐        │
│         │      │            Prisma ORM                 │        │
│         │      │    aggregate · groupBy · count         │        │
│         └──────┤    scoped by store_id (from JWT)      │        │
│                └─────────────────┬──────────────────────┘        │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│                      PostgreSQL (port 5434)                     │
│                                                                 │
│  ┌────────┐  ┌────────┐  ┌──────────────────────────────────┐   │
│  │ stores │  │ users  │  │ events                           │   │
│  │        │◄─┤        │  │                                  │   │
│  │ id     │  │ id     │  │ event_id (unique)                │   │
│  │ name   │  │ email  │  │ store_id ──► stores.id           │   │
│  └────────┘  │ store_ │  │ event_type (enum)                │   │
│              │   id   │  │ occurred_at                      │   │
│              └────────┘  │ amount · currency                │   │
│                          │ product_id · session_id          │   │
│                          │ payload (JSONB)                  │   │
│                          └──────────────────────────────────┘   │
│                                                                 │
│  Indexes:                                                       │
│    (store_id, occurred_at DESC)                                  │
│    (store_id, event_type, occurred_at)                           │
│    (store_id, product_id, occurred_at)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
                    Event Ingestion                          Dashboard Read
                    ──────────────                          ──────────────

  Client SDK              API                  DB                API              Browser
      │                    │                    │                  │                  │
      │  POST /events      │                    │                  │   GET /overview  │
      │  {event_id,        │                    │                  │◄─────────────────│
      │   event_type,      │                    │                  │                  │
      │   timestamp,       │  Check duplicate   │                  │  12x parallel    │
      │   data: {...}}     │  by event_id       │                  │  queries via     │
      │───────────────────►│───────────────────►│                  │  Promise.all()   │
      │                    │                    │                  │─────────────────►│
      │                    │  INSERT (or skip   │                  │                  │
      │                    │  if idempotent)    │  SUM(amount)     │                  │
      │                    │───────────────────►│  COUNT(*)        │  JSON response   │
      │                    │                    │  GROUP BY type   │◄─────────────────│
      │   201 Created      │                    │─────────────────►│                  │
      │◄───────────────────│                    │                  │  revenue,        │
      │                    │                    │                  │  conversion,     │
      │                    │                    │                  │  events_by_type  │
      │                    │                    │                  │─────────────────►│
```

## Project Structure

```
amsiro/
├── docker-compose.yml              # PostgreSQL container (port 5434)
├── README.md
│
├── backend/                         # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma           # Data model (stores, users, events)
│   │   ├── seed.ts                 # Demo users + 500 seeded events
│   │   └── migrations/
│   │
│   └── src/
│       ├── auth/                   # JWT login, guard, strategy
│       ├── events/                 # POST /events — idempotent ingest
│       ├── analytics/              # GET overview, top-products, recent, live
│       │   ├── analytics.service   # ← core aggregation logic
│       │   └── dto/                # Query param validation
│       ├── prisma/                 # Prisma service + enum types
│       └── common/                 # @CurrentUser() decorator
│
└── frontend/                        # Next.js 15 SPA
    └── src/
        ├── app/
        │   ├── layout.tsx          # Inter font, dark-mode script
        │   ├── globals.css         # CSS vars (light + dark tokens)
        │   ├── login/page.tsx      # Split-panel login
        │   └── dashboard/page.tsx  # ← main dashboard (bento grid)
        ├── lib/
        │   ├── api.ts              # Fetch wrappers + JWT helpers
        │   └── types.ts            # API response types
        └── tailwind.config.ts
```

---

## Quick Start

### Prerequisites

- **Node.js** 20+ (22 recommended)
- **Docker** (for PostgreSQL) or your own Postgres on port 5434

### 1. Database

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed           # creates demo users + 500 events
npm run start:dev             # → http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # → http://localhost:3000
```

### 4. Sign in

| Account | Email | Password |
|---------|-------|----------|
| Store A | `owner@demo.com` | `password123` |
| Store B | `other@demo.com` | `password123` |

Use both accounts to verify tenant isolation — each store sees only its own data.

---

## Features

### Dashboard
- **Sticky KPI bar** — monthly/weekly/daily revenue, conversion rates with progress bars, live visitor count with pulse animation
- **Glassmorphism** — KPI bar gets a frosted-glass backdrop blur on scroll
- **Bento grid layout** — asymmetric card sizes (8/4 col split, tall pie chart, 5/7 bottom row)
- **Revenue area chart**, **event mix donut**, **grouped bar chart** by time period
- **Top products** dark card with relative revenue bar fills
- **Activity feed** as a live timeline with auto-refresh (15s)
- **Date range filter** — floating popover with inline result summary
- **Dark mode** — toggle in nav, persists in localStorage, no flash on reload (blocking `<head>` script)
- **Scroll hint chip** — bouncing "Scroll for more insights" pill that fades out on scroll
- All corners are `rounded-[25px]` for a consistent soft aesthetic

### API
- **Idempotent event ingestion** — client-provided `event_id` prevents duplicates on retries
- **Tenant isolation** — `store_id` derived from JWT on every query, never from request body
- **Parallel aggregation** — `overview` runs 12 queries via `Promise.all` (3 periods × 4 metrics)
- **Live visitors** — distinct `session_id` values in a sliding 5-minute window
- **Date range validation** — `from`/`to` must pair, `from ≤ to`, max 366 days

---

## API Reference

All routes are prefixed with `/api/v1`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/login` | None | Returns JWT `access_token` |
| `POST` | `/events` | Bearer JWT | Ingest a store event (idempotent) |
| `GET` | `/analytics/overview` | Bearer JWT | Revenue, conversion, event counts (today/week/month) |
| `GET` | `/analytics/top-products` | Bearer JWT | Top 10 products by revenue |
| `GET` | `/analytics/recent-activity` | Bearer JWT | Last 20 events |
| `GET` | `/analytics/live-visitors` | Bearer JWT | Distinct sessions in last 5 min |

### Query Parameters

| Route | Param | Description |
|-------|-------|-------------|
| `/analytics/overview` | `from`, `to` | ISO 8601 timestamps — filters and adds a `between` block |
| `/analytics/top-products` | `from`, `to` | Defaults to last 30 days if omitted |
| `/analytics/recent-activity` | `limit` | Number of events (default 20) |
| `/analytics/live-visitors` | `windowMinutes` | Sliding window size (default 5) |

---

## Architecture Decisions

### Aggregation Strategy

Raw events are stored in PostgreSQL. Aggregates (revenue, conversion, event counts) are computed on-the-fly with bounded time-range queries and `GROUP BY`.

**Why:** Simple write path, always-consistent reads, fits the project scope. Composite indexes on `(store_id, occurred_at)`, `(store_id, event_type, occurred_at)`, and `(store_id, product_id, occurred_at)` keep each query as a tight index scan.

**Trade-off:** For millions of events, a daily rollup table or materialized views would reduce read cost from O(events) to O(days).

### Near Real-Time via Polling

The frontend uses SWR with `refreshInterval` (15–30s) instead of WebSockets/SSE.

**Why:** Fewer infrastructure dependencies. Still feels live for a dashboard use case.

**Trade-off:** Not sub-second. Production would benefit from SSE with Redis pub/sub for horizontal scaling.

### Idempotent Ingestion

Events carry a client-generated `event_id`. The API checks for duplicates before inserting — same store returns the existing record, different store rejects with `409 Conflict`.

**Why:** Handles network retries gracefully without a database-level upsert race.

### Dark Mode Without Flicker

A blocking inline `<script>` in the `<head>` reads `localStorage` and sets the `.dark` class before React hydrates. All theming uses CSS custom properties (`--d-*`) that swap values under `.dark`, avoiding Tailwind `dark:` prefix sprawl.

---

## Known Limitations

- JWT in `localStorage` — convenient but vulnerable to XSS. Production should use httpOnly cookies + CSRF tokens.
- Single currency (`USD`) for top products aggregation — multi-currency would need FX normalization.
- Live visitor count depends on clients sending `session_id` on events.
- No rate limiting on the events endpoint.

## What I'd Improve With More Time

| Area | Improvement |
|------|-------------|
| **Caching** | Redis cache for `/analytics/overview` with 10-15s TTL, invalidated on new event ingest |
| **Aggregation** | Daily rollup table for O(1) range merges at scale |
| **Real-time** | Server-Sent Events instead of polling |
| **Auth** | httpOnly cookies + CSRF, refresh token rotation |
| **Observability** | Structured logging, request tracing, error reporting |
| **Testing** | Integration tests for aggregation edge cases (empty stores, timezone boundaries) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, Recharts, SWR |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Infra | Docker Compose |
| Auth | JWT (passport-jwt) |

## Time Spent

- Fill in your honest estimate (e.g. 3–4 hours).
