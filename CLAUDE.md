# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project

`NewHouseNewRepo` — **House OS**, a share-house operations app for four
housemates: assignable/recurring chores on a calendar, a bill due-date and
payment tracker, and a furniture/move-in status board. All three modules
share one household, one member list, and one recurrence engine, meeting in
a single daily dashboard.

Full design and phased build plan: `/root/.claude/plans/ok-thank-you-the-snazzy-peach.md`
(if that path isn't available in your environment, ask the user — the plan
covers the data model, phase breakdown, and the deliberately-excluded
features, e.g. why bank feeds aren't wired up).

**Stack:** Next.js 16 (App Router, Turbopack) + TypeScript (strict) +
Tailwind v4 + shadcn/ui, Drizzle ORM over Postgres (Supabase), Auth.js v5
(Credentials provider, JWT sessions), `rrule` for recurrence, Vitest for
unit tests, Playwright for E2E. Deployed to Vercel.

**Money:** every amount is stored and computed as **integer cents**, never
floats. `src/lib/money.ts` is the only place currency is formatted/parsed;
`src/lib/split.ts` is the only place a bill total is divided across people.
Don't do either conversion inline elsewhere.

**Build status:** Phases 0–2 are done. Phase 0: foundation. Phase 1:
chores — recurring/one-off definitions, month calendar, today's list,
round-robin rotation, fairness ledger, move-in checklist. Phase 2: bills —
fixed and variable-amount bills, a due-date timeline, even-split shares,
mark-as-paid with a ledger audit trail, live-computed overdue/due-today
status, and per-person outstanding balances. All verified end-to-end
against a real local Postgres, not just unit tests. Furniture, dashboard,
and settlement are Phases 3–5 — see the plan file.

## Commands

| Task              | Command                |
| ----------------- | ----------------------- |
| Install            | `npm install`           |
| Dev server         | `npm run dev`            |
| Build               | `npm run build`          |
| Start (prod build) | `npm run start`          |
| Lint                | `npm run lint`           |
| Typecheck           | `npm run typecheck`      |
| Unit tests          | `npm run test`           |
| Unit tests (watch)  | `npm run test:watch`     |
| E2E tests           | `npm run test:e2e`       |
| DB: generate migration | `npm run db:generate`|
| DB: run migrations  | `npm run db:migrate`     |
| DB: browse (Drizzle Studio) | `npm run db:studio` |
| DB: seed household + members | `npm run db:seed` |

Before any of these will run for real, copy `.env.example` to `.env.local`
and fill in a Supabase `DATABASE_URL` (and `AUTH_SECRET` — generate with
`npx auth secret`). `.env.local` is gitignored; never commit real secrets.

To seed your household: edit the household name and member list at the top
of `src/db/seed.ts`, then run `npm run db:seed`. It's idempotent — safe to
re-run after editing.

## Architecture notes

- **`proxy.ts`** (not `middleware.ts` — this Next.js version renamed and
  deprecated that convention) gates every route except `/login`, the Auth.js
  API routes, and `/api/cron/*`. It only decodes the session cookie via
  `src/lib/auth.config.ts` — deliberately no DB import there, since Auth.js
  config is the one thing that must stay light. `src/lib/auth.ts` holds the
  full config (DB-backed Credentials provider) and is only ever imported
  from server components, server actions, and route handlers.
- **`src/db/schema.ts`** is the spine — every module's tables live there,
  keyed by `household_id`. `ledger_entries` is the single source of truth
  for "who owes whom"; module tables (`bill_shares`,
  `furniture_contributions`) never store running balances themselves.
- **`src/lib/recurrence.ts`** expands RFC 5545 RRULE strings (via the
  `rrule` package) into due dates, and holds the round-robin chore
  assignment logic. Shared by chores and bills. Fully unit-tested —
  `src/lib/recurrence.test.ts` covers month/DST/leap-year boundaries and
  100-cycle fairness with a member deactivated mid-run.
- **`src/lib/split.ts`** divides a bill total across members and always
  sums back to the exact total cents (remainder cents go to the largest
  fractional share, never lost or invented). Unit-tested.
- Forms use Next.js Server Actions with native `<form>` elements + Zod
  validation, not `react-hook-form` — simpler and idiomatic for the App
  Router; shadcn's `form` block was deliberately not installed.
- shadcn/ui here is built on `@base-ui/react`, not Radix — two gotchas that
  aren't obvious from shadcn's own docs (which assume Radix): composing
  `Button`/`DialogTrigger`/etc. with a non-button child (e.g. `next/link`)
  uses a `render={<Link>...</Link>}` prop, not `asChild`, and `Button`
  additionally needs `nativeButton={false}` when its `render` target isn't a
  real `<button>` — omitting it throws a console error at runtime that
  `next build` won't catch. `Checkbox`/`Select` do participate in native
  `<form>` submission (a hidden mirrored input), same as Radix.
- **Bills split evenly only, for now.** `bills.splitRule` supports
  `even`/`shares`/`custom` in the schema, but only `even` is wired up (via
  `splitEven()` in `src/lib/split.ts`) — the create/edit bill form doesn't
  expose weighted splits. `splitByShares()` exists and is unit-tested, but a
  weighted split needs somewhere to persist per-member weights per bill
  (no such table exists yet), which was cut from Phase 2's scope. The
  nearest thing to a workaround today is deactivating a bill and manually
  correcting individual `bill_shares.amount_owed_cents` rows.
- **`src/lib/bill-status.ts`**: a bill_period's stored `status` column is
  set once at creation and never kept in sync — the *displayed* status
  (overdue/due today/upcoming/settled) is always computed live from the due
  date and payment state via `computeBillPeriodStatus()`. Don't trust the
  stored column for anything user-facing.
- **`src/lib/materialise-bills.ts`** mirrors `materialise.ts` for bills:
  idempotent, and `src/app/(app)/bills/actions.ts` clears only *future,
  completely unpaid* periods when a bill's schedule/amount changes —
  periods with even one paid share are left alone. `markSharePaidAction`/
  `unmarkSharePaidAction` write (and clean up) a `ledger_entries` row, since
  that table is the intended source of truth for "who owes whom" overall.
- **`src/lib/materialise.ts`** turns chore definitions into `chore_instances`
  — idempotent (safe to re-run), continues round-robin rotation across
  materialise runs by reading the most recent existing instance rather than
  storing rotation state separately. `src/app/(app)/chores/actions.ts`
  calls it after create/update so instances appear immediately instead of
  waiting for the next cron tick. Editing a recurring chore's schedule
  clears *future pending* instances before re-materialising — done/skipped
  history is never touched. `src/db/queries/chores.ts` holds the read-side
  joins (today's list, calendar range, fairness ledger, move-in checklist).

## Verifying against a real database

Sandboxed dev environments often have `postgresql-16` preinstalled but not
running. To get a real local Postgres for verification (migrations,
seeding, actually exercising server actions — not just unit tests):

```sh
service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE houseos_dev;"
# then set DATABASE_URL="postgresql://postgres:postgres@localhost:5432/houseos_dev"
# in .env.local, npm run db:migrate, npm run db:seed, npm run dev
```

`npm run build` alone doesn't need a live connection (the Postgres client is
lazy — it only connects on first query), so a syntactically-valid but
unreachable `DATABASE_URL` is enough for build verification. But anything
that actually queries — server actions, the materialise engine, an E2E
login — needs the real thing above; don't declare a data-touching change
verified from a green build alone.

## Cron

`vercel.json` schedules `/api/cron/materialise` for `0 14 * * *` (14:00 UTC)
as a placeholder — adjust to whenever the house wants its daily rollover to
happen in its own timezone. Vercel automatically attaches
`Authorization: Bearer $CRON_SECRET` to its own cron-triggered requests once
`CRON_SECRET` is set as a project environment variable; the route checks
that header itself, so no extra Vercel config is needed beyond the env var.

## Known non-blocking issue

`drizzle-kit` bundles an old `esbuild` transitively (via `@esbuild-kit/esm-loader`,
now merged into `tsx` upstream but drizzle-kit hasn't picked that up yet).
`npm audit` reports this as moderate. It only affects the local
migration-generation dev server, never anything shipped to production.
Don't "fix" it with `npm audit fix --force` — that downgrades drizzle-kit to
a much older release. Re-check periodically; this is expected to resolve
itself with a drizzle-kit update.

## Conventions

- **Branches:** work on a feature branch, never commit directly to `main`.
- **Commits:** short imperative subject line (`Add user auth`, not
  `Added user auth`). Explain the why in the body when it is not obvious.
- **Scope:** keep changes focused on what was asked. Flag adjacent problems
  rather than silently fixing them in the same commit.
- Run `npm run lint`, `npm run typecheck`, and `npm run test` before
  considering any change done. `npm run build` too if you touched routing,
  auth, or anything server/edge-boundary related.

## Keeping this file current

This file is only useful if it stays true. Update it in the same change that
makes it stale — most importantly the Build status line and Commands table
as each phase lands.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
