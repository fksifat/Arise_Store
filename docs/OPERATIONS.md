# Operations

## Local configuration

Run `bash scripts/setup-local.sh --env-only` to create `.env` without starting services. Existing `.env` files are preserved. The setup creates random signing/database secrets and a new `.data` directory; no old databases are modified.

Compose uses PostgreSQL and Redis regardless of the standalone SQLite defaults. The API hostname `api` and localhost are explicitly trusted. PostgreSQL credentials must be URL-safe; the setup script generates hexadecimal passwords. A change to `.env` does not rotate a password in an already initialized PostgreSQL volume: rotate it in PostgreSQL and then update configuration.

Never use `docker compose down -v` to stop the app: that deletes named data volumes. Use `docker compose stop`.

## Local PostgreSQL connection

This workspace's `.env` connects host Python tools to the existing Docker PostgreSQL database. Its data stays in the `postgres_data` named volume. PostgreSQL is published on loopback only; ports 5432 and 5433 were already occupied on this machine, so this project uses **5434**.

| Setting | Local value |
|---|---|
| Host | `127.0.0.1` |
| Port | `5434` (`POSTGRES_PORT` in `.env`) |
| Database | `arise` (`POSTGRES_DB`) |
| Username | `arise` (`POSTGRES_USER`) |
| Password | `POSTGRES_PASSWORD` in the private `.env` file |
| Driver | PostgreSQL / psycopg 3 |

Host `DATABASE_URL` has the form `postgresql+psycopg://<user>:<encoded-password>@127.0.0.1:5434/<database>`. Use a standard `postgresql://` URL for clients that do not accept SQLAlchemy's `+psycopg` driver suffix, or enter the fields above separately. The Docker API/migration services keep their internal `postgres:5432` connection automatically. If changing `POSTGRES_PORT`, update the host URL's port too.

Start only the database:

```bash
docker compose up -d --wait postgres
```

Open a database shell without copying the password:

```bash
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Use the installed host Python tools against this same database:

```bash
venv/bin/alembic -c services/api/alembic.ini current
venv/bin/alembic -c services/api/alembic.ini check
```

For host API/frontend development, first free their ports with `docker compose stop api web`, leave PostgreSQL running, then use `bash scripts/run-local.sh`. To return to the Docker app, stop those host processes and run `docker compose up -d --wait web`.

Existing SQLite files are untouched; they are not automatically imported into PostgreSQL. Before hosting, remove this optional host database port publication if direct local database access is unnecessary.

## Billing

A merchant requests a plan on the Subscription page. This creates a pending payment with a server-selected amount and leaves the subscription unchanged. The administrator checks an external receipt against actual money received, then confirms it in `/admin`. A unique transaction reference and explanation are mandatory. Repeating the same verification does not extend the subscription twice. Rejecting a request allows the merchant to submit another one.

Current-plan renewal extends the remaining active period. Switching plans starts a new 30-day/365-day period without automated proration or refunds. Expired merchants retain dashboard access for renewal and existing order management; new products and public commerce require an active subscription. Historical tracking remains available while the shop is published. No card, bKash or Nagad gateway is connected.

## Domains

Paid plans with domain entitlement can register an external hostname. Add the exact `_arise-verification.<hostname>` TXT record and its random `arise=...` token shown in the dashboard. Verification checks real DNS and never bypasses ownership checks in local mode.

Verified custom domains remain inactive. Local shopping uses `/store/<slug>`. Before enabling hostname routing during hosting, implement and verify an ingress mapping for each domain and its TLS certificate, include the hostname in API `ALLOWED_HOSTS`, and prevent forwarded-host spoofing. The current local release deliberately has no endpoint that pretends DNS verification provisioned hosting. Platform subdomain records likewise do not provision DNS/TLS automatically.

## Migrations and existing databases

Fresh databases:

```bash
venv/bin/alembic -c services/api/alembic.ini upgrade head
PYTHONPATH=services/api venv/bin/python -m app.manage seed
```

Compose executes these once through its `migrate` service before the API starts. API startup itself neither creates schema nor seeds data. For upgrades, stop application writers, take a backup, then run the migration job once before restarting replicas.

The repository contains a frozen initial schema (`0001`), hardening metadata (`0002`) and database amount constraints (`0003`). For an existing database created by the old application, **work on a backup copy first**:

1. Verify its schema matches `0001`; inspect all tables, columns, types, indexes and constraints. Do not stamp an unknown schema.
2. Point `DATABASE_URL` to the copy, stamp `0001`, then upgrade to head.
3. Validate row counts, totals, order snapshots and inventory against the original. Invalid negative amounts/stocks intentionally make constraint installation fail; investigate the data rather than silently rewriting it.
4. Repeat the tested procedure against the intended database during a maintenance window, with a restorable backup.

```bash
DATABASE_URL=sqlite:////absolute/path/to/copy.db venv/bin/alembic -c services/api/alembic.ini stamp 0001
DATABASE_URL=sqlite:////absolute/path/to/copy.db venv/bin/alembic -c services/api/alembic.ini upgrade head
```

Migration `0002` resets old simulated custom-domain verification. Its inventory backfill uses current product inventory settings; audit historical orders if tracking settings changed after purchase. Old billing records cannot prove money was received and must be reconciled separately. Schema downgrades are disabled to prevent accidental loss of commerce data; rollback uses a backup and the matching application image.

## Backup and restore

```bash
bash scripts/backup.sh
```

This writes a private PostgreSQL custom-format dump under `backups/`. Copy encrypted backups to independent storage and set a retention schedule before hosting. Uploaded files need their own volume backup if files are added directly to the upload directory; no image-upload API is currently provided.

Validate a dump and restore it into a **new** database first (replace the filename):

```bash
docker compose exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" arise_restore'
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d arise_restore --no-owner --no-acl' < backups/your-backup.dump
```

Verify counts, totals and order lookup against the source. Do not overwrite the running database. Use the restored database only after validation and an intentional maintenance cutover.

## Before hosting

Use PostgreSQL/Redis, a TLS reverse proxy, private database/cache networking, off-host backups and monitored health endpoints. Change the following settings together:

- `APP_ENV=production`, `APP_DEBUG=false`, `COOKIE_SECURE=true`.
- Random `SECRET_KEY` of at least 32 characters; `SEED_DEMO_DATA=false`, `AUTO_CREATE_TABLES=false`.
- Explicit HTTPS `ALLOWED_ORIGINS` and trusted `ALLOWED_HOSTS`; configure the actual `PLATFORM_BASE_DOMAIN`.
- `DATABASE_URL=postgresql+psycopg://...` and a private `REDIS_URL`. The local Compose Redis is intended for an isolated network; add authentication/TLS if it crosses that boundary.

The browser uses an HttpOnly, same-site session cookie and validates mutation origins. API clients may use bearer tokens. Sessions last one hour by default; logout revokes the session in Redis and clears the browser cookie. Standalone development uses process-local revocations, which reset on restart; hosted production requires Redis. Deactivate a user to block all their sessions, or rotate the signing key to invalidate every session. No self-service password-reset/email-verification flow is supplied in this release; provide an operator identity-verification procedure until a mail provider and recovery flow are implemented.

Set the web image `API_INTERNAL_URL` build argument correctly: Next rewrites are embedded at build time. For the supplied Compose topology the default `http://api:8000` is correct. Expose only the web proxy publicly, restrict direct API access, and trust forwarding headers only from that proxy. Terminate TLS and apply HSTS at that edge. Configure the proxy's request-body and connection timeouts to complement the API's 1 MiB body cap.

Request logs omit query strings and bodies. Legacy GET tracking is deprecated; the UI sends phone verification in POST bodies. Redis throttling fails closed if Redis is unavailable. Keep logs private and monitor 5xx, latency, readiness and failed authentication. No uptime, throughput or load-test guarantees are claimed by this local release. Checkout locks are scoped to one shop, prioritizing inventory correctness over maximum throughput; measure under your intended load before scaling.
