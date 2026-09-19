# Dlogix — Deployment (Ubuntu + Docker, shared nginx + shared Postgres)

Target: **https://dlogix.ddecor.com**. Uses the host's existing **shared nginx**
(wildcard `*.ddecor.com` cert) and **shared Postgres** — this stack builds only
the `api` + `web` containers. Web is published on **7079**.

## 0. One-time prep on the server

1. **Create the Dlogix database + user on the shared Postgres** (psql into it):
   ```sql
   CREATE USER dlogix WITH PASSWORD 'a-strong-password';
   CREATE DATABASE dlogix OWNER dlogix;
   ```
2. **Find the two docker network names** — the shared Postgres and the shared
   nginx may be on *different* networks. dlogix-api joins the DB's network,
   dlogix-web joins the nginx network:
   ```bash
   docker inspect <shared-postgres-container> -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'  # → DB_NETWORK
   docker inspect nginx_proxy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'                  # → PROXY_NETWORK
   ```
   (On this host: DB `ddecor_db` → `crmuat_ddecor_internal`, nginx `nginx_proxy` → `shared_proxy`.)

## 1. Clone

```bash
cd /opt   # or wherever you keep apps
git clone https://github.com/anuptechin/dlogix.git
cd dlogix
```

## 2. Configure

```bash
cp .env.production.example .env.production
nano .env.production
```
Fill in: `DB_NETWORK`, `PROXY_NETWORK`, `DATABASE_URL` (PG container name + the db/user above),
`SESSION_SECRET` (`openssl rand -hex 32`), `SMTP_PASS`. Leave
`CORS_ORIGIN`/`WEB_BASE_URL` = `https://dlogix.ddecor.com`.

## 3. Build & start (migrations run automatically)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml logs -f api   # watch "migrations applied" + "listening on :3093"
```
The api container runs `prisma migrate deploy` on start, then boots.

## 4. Seed reference data + the first users (one time)

```bash
docker compose -f docker-compose.prod.yml exec api npx ts-node prisma/seed.ts
```
This creates masters (charge types, incoterms, lookups, courier rate cards are
uploaded later in-app) and the starter accounts. **Change/rotate these after first login.**
Seed logins (password fallback): `admin@ddecor.com`, `management@ddecor.com`,
`logistics@ddecor.com` — but production sign-in is **email OTP** (a code is mailed each time).

## 5. Wire the shared nginx

Put the wildcard cert in place (per-hostname filenames, `.crt` must be full chain)
and copy the vhost into `nginx_proxy`'s conf.d, then reload:
```bash
cp /data/nginx-proxy/certs/colorstudio.ddecor.com.crt /data/nginx-proxy/certs/dlogix.ddecor.com.crt
cp /data/nginx-proxy/certs/colorstudio.ddecor.com.key /data/nginx-proxy/certs/dlogix.ddecor.com.key
cp deploy/nginx/dlogix.ddecor.com.conf /data/nginx-proxy/conf.d/dlogix.conf
docker exec nginx_proxy nginx -t && docker exec nginx_proxy nginx -s reload
```
`dlogix-web` joins `PROXY_NETWORK` (nginx's network) so the proxy resolves it by
container name (`dlogix-web:80`). If nginx logs `host not found in upstream`, the
web container isn't on that network — check `PROXY_NETWORK`.

## 6. Verify

- `https://dlogix.ddecor.com` → landing page.
- Sign in → OTP email arrives (Office365) → enter code → app.
- `https://dlogix.ddecor.com/api/health` → `{"status":"ok","db":"up"}`.

## Updating a release

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
Migrations apply automatically on the api container restart.

## Notes / hardening
- `.env.production` is gitignored — never commit it.
- The API refuses to boot in prod without `SESSION_SECRET` (≥16) and `CORS_ORIGIN`.
- Auth cookie is signed + `Secure` (HTTPS only) + same-site; single-origin so no CORS.
- Recommended follow-ups: rate-limit `/api/auth/*`, review `npm audit`, disable the
  password `/auth/login` fallback once OTP is standard.
