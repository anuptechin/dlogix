# LPRMS — Logistics Procurement & Rate Management System

Centralized portal for freight procurement, vendor quotations, courier rate management and reporting.

- **Backend:** NestJS (TypeScript) + Prisma + PostgreSQL
- **Frontend:** React + Vite (TypeScript)
- **Queue:** BullMQ + Redis
- **Auth:** Microsoft 365 / Entra ID SSO (dev-mode login available)
- **Deploy:** Develop on Windows → Production on Ubuntu via Docker

See the planning docs one level up:
- `LPRMS_Technical_Architecture_and_Roadmap.md`
- `LPRMS_Phase1_Detailed_Plan.md`

## One-click (Windows)

Double-click these in Explorer (they handle the corporate-proxy cert, free the
ports, and open the app):

- **`start.cmd`** — starts the API (:3093) and web (:5103) in minimized windows, then opens http://localhost:5103
- **`stop.cmd`** — stops both (PostgreSQL is left running)

Requires dependencies installed once (`npm install`) and PostgreSQL running.

## Quick start (Docker — mirrors production)

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Web (dev):  http://localhost:5103
- Web (prod build): http://localhost:8080
- API:        http://localhost:3093/health
- Postgres:   localhost:5432   ·   Redis: localhost:6379

## Quick start (native — fastest inner loop)

Requires Node 20+, and a local or Dockerized PostgreSQL + Redis.

```bash
npm install
cp .env.example .env          # point DATABASE_URL/REDIS_URL at localhost
npm run db:migrate
npm run db:seed
npm run dev                   # api + web with hot reload
```

## Layout

```
packages/shared   shared TS enums & DTO contracts
apps/api          NestJS API (Prisma, auth, modules)
apps/web          React + Vite SPA (internal app + vendor portal)
```

## Environments

| Stage       | Where                       |
|-------------|-----------------------------|
| Development | Windows workstations        |
| Staging     | Ubuntu + Docker (prod mirror)|
| Production  | Ubuntu + Docker             |

The same images built in CI are deployed unchanged to Ubuntu — build once, run anywhere.
