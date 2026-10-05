# Masarif (مصاريف)

A bilingual (Arabic / English) income-and-expense ledger for small businesses in Saudi Arabia: deposits, expenses, automatic VAT, attachments, reminders, archive with an audit trail, and Excel export.

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, wouter, TanStack Query, tRPC client
- **Backend:** Node 20+, Express 4, tRPC 11, Drizzle ORM
- **Database:** PostgreSQL (attachments are stored in the database, so no file storage service is needed)
- **Auth:** email + password (scrypt), signed session cookie

## Run it locally

```bash
pnpm install
cp .env.example .env            # then edit DATABASE_URL and SESSION_SECRET
pnpm dev                        # http://localhost:3000
```

Migrations in `drizzle/` run automatically when the server starts, so a fresh database is ready after the first boot.

Other scripts:

| Script             | What it does                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `pnpm check`       | TypeScript type check                                                    |
| `pnpm test`        | Unit tests (vitest)                                                      |
| `pnpm build`       | Builds the client into `dist/public` and the server into `dist/index.js` |
| `pnpm start`       | Runs the production build                                                |
| `pnpm db:generate` | Generates a new migration after editing `drizzle/schema.ts`              |

## Environment variables

| Variable         | Required          | Notes                                                                               |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`   | yes               | PostgreSQL connection string, e.g. `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | yes in production | At least 16 random characters; signs the session cookie                             |
| `PORT`           | no                | Defaults to `3000`                                                                  |
| `NODE_ENV`       | no                | `production` enables secure cookies and the content security policy                 |
| `RUN_MIGRATIONS` | no                | Set to `false` to skip running migrations on boot                                   |

## Deploy for free (Render + Neon)

1. **Database:** create a free project at [neon.tech](https://neon.tech) and copy its connection string (the pooled one is fine).
2. **App:** push this repository to GitHub, then on [render.com](https://render.com) choose **New → Blueprint** and point it at the repo. `render.yaml` describes a free web service that builds the `Dockerfile`.
3. In the Render service's environment, set `DATABASE_URL` to the Neon string. `SESSION_SECRET` is generated automatically by the blueprint.
4. Deploy. The service serves both the API and the built frontend from one URL; `/api/health` answers `{"status":"ok"}` when it is up.

Free Render services sleep after 15 minutes without traffic and take a few seconds to wake on the next visit. A free uptime pinger (for example a cron-job.org job hitting `/api/health` every 10 minutes) keeps it warm if that matters.

## Project layout

```
client/            React app (pages, components, contexts, i18n, formatters)
server/            Express + tRPC API, auth, attachment serving, migrations
shared/            Code used by both sides (error codes, money maths)
drizzle/           Database schema and generated SQL migrations
```
