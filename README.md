# House OS

A share-house operations app for four housemates: assignable/recurring
chores on a calendar, a bill due-date and payment tracker, and a
furniture/move-in status board — all pointing at one daily dashboard.

**Status:** Phase 0 (foundation) complete — auth, database schema, and the
app shell exist. Chores, bills, furniture, the dashboard, and settlement are
still being built; see `CLAUDE.md` for the phase plan.

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind v4 + shadcn/ui, Drizzle ORM
over Postgres (Supabase), Auth.js v5, `rrule` for recurrence, Vitest +
Playwright for tests. Deployed on Vercel.

## Getting started

```sh
npm install
cp .env.example .env.local   # fill in a real Supabase DATABASE_URL + AUTH_SECRET
npm run db:migrate           # once schema.ts has an actual migration generated
npm run db:seed              # edit the household/member list in src/db/seed.ts first
npm run dev
```

Generate `AUTH_SECRET` with `npx auth secret`. `.env.local` is gitignored —
never commit real credentials.

## Commands

See the Commands table in `CLAUDE.md` for the full list (lint, typecheck,
unit tests, E2E, Drizzle Studio, etc).

## Layout

```
.
├── CLAUDE.md            Guidance and conventions for AI coding sessions
├── proxy.ts              Route-gating (formerly "middleware") — session check only
├── drizzle.config.ts     Drizzle Kit config (migrations)
├── playwright.config.ts  E2E test config
├── vitest.config.ts      Unit test config
├── src/
│   ├── app/
│   │   ├── (app)/         Authenticated routes — dashboard, chores, bills, furniture
│   │   ├── login/         Public sign-in page
│   │   └── api/auth/      Auth.js route handler
│   ├── components/       Shared UI (nav, module cards) and components/ui (shadcn)
│   ├── db/               Drizzle schema, client, and seed script
│   ├── lib/               auth.ts / auth.config.ts, money.ts, recurrence.ts, split.ts
│   └── types/             Type augmentations (Auth.js session shape)
└── e2e/                  Playwright specs
```
