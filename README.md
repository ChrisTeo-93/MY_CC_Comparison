# KadCompare — Malaysian Credit Card Recommender

Pick the Malaysian credit card (or 2–3 card combo) that earns you the most for how
*you* spend. Built because comparison sites are hard to use and forum advice goes
stale as banks change card policies. Ships as a **web app** (live) and a **native
iOS/Android app** (built, not yet store-published — see `mobile/README.md`), sharing
one recommendation engine.

The user goes through three steps:

1. **Persona** — what they value (cashback / points / miles), income bracket, fee
   tolerance, travel frequency, single-vs-multi-card willingness.
2. **Spending** — rough monthly spend per category (all optional; sensible defaults).
3. **Results** — the best single card *and* the best combo, toggleable, ranked by
   real ringgit value net of annual fees.

There's also an **"I already have cards"** flow: pick the cards you own and see what
you currently earn, whether you're leaving value on the table, and which card would
add the most.

The key idea: **cashback, points and miles are all normalised to ringgit value**, so
different reward types are judged on the same scale.

## Stack

This is an **npm-workspaces monorepo** so the web and mobile apps share one engine:

```
packages/core/     @kadcompare/core — pure TypeScript, zero framework dependencies.
                    Domain model, recommendation engine, persona logic, card data.
                    Consumed identically by the web app and the Expo app.
(repo root)         The Next.js 14 web app — unchanged location/config so the
                    existing Vercel deployment needs no changes.
mobile/             Expo (React Native) app for iOS + Android. Both main journeys
                    (find my card / evaluate my cards) are built; not yet
                    verified on a real device or published to the app stores.
```

Vercel deploys only the web app, so `vercel.json` scopes its install to skip the
`mobile` workspace (`npm install --workspace=my_cc_comparison
--workspace=@kadcompare/core --include-workspace-root`) — otherwise every web
deploy would needlessly install the entire React Native/Expo toolchain.

- **Web:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Mobile:** Expo + React Native + TypeScript (Expo Router)
- **Core:** pure-TypeScript recommendation engine (no DB, no network) — fully
  unit-tested, importable from both apps as `@kadcompare/core`
- **Vitest** for engine + web tests, run from the repo root (`npm test` picks up
  both `tests/` and `packages/*/tests/`)

## Project layout

```
packages/core/
  package.json              "@kadcompare/core" — main/types point at src/index.ts
  src/
    domain/                 types, categories, card loader (reads data/cards.json)
    engine/                 normalize · score · combo · conditions · tips ·
                             evaluate · recommend
    persona/                persona quiz definition
    format.ts               RM/date formatting shared by both apps
    data/cards.json         Card catalogue — the source of truth (edited via /admin)
    index.ts                barrel export — the package's public surface
  tests/                    engine/conditions/tips/evaluate unit tests

app/                        Next.js routes (web)
  page.tsx                  Landing
  recommend/page.tsx        Persona → spending → results wizard
  evaluate/page.tsx         Persona → spending → owned cards → evaluation
  admin/                    Card-data editor (password-gated) + login
  api/admin/                Auth + CRUD route handlers (login/logout/cards)
lib/                        Web-only (Next.js/Node-coupled) code
  data/cardStore.ts         Server-side read/write + validation for cards.json
  auth.ts                   Minimal admin password gate
components/                 Web UI (wizard steps, result cards, admin editor)
tests/
  cardStore.test.ts         validation + seed-data integrity tests (web-only)

mobile/                     Expo app (iOS + Android) — see mobile/README.md
```

## How the engine works

1. **normalize** — converts each earn rule into RM value per RM spent
   (`percent` as-is; `points × pointValueRM`; `miles × mileValueRM`).
2. **score** — per category: apply the best applicable rule, honour monthly caps
   (overflow falls back to the base rate) and min-spend unlocks, sum × 12, subtract
   the effective annual fee (after waiver logic). A small, transparent persona
   multiplier breaks ties toward the user's stated preference.
3. **combo** — greedy portfolio builder: seed with the best single card, then add a
   card only if its *marginal* value covers its own fee (max 3 cards); each category
   is routed to its best earner in the set.
4. **recommend** — filters by income eligibility, returns the ranked single list,
   the combo, and the list of cards hidden for income reasons.

## Data freshness & confidence

Card reward rates change often, so trust signals are first-class. Every card in
`packages/core/src/data/cards.json` carries:

- `lastVerified` (ISO date) + `sourceUrl` → a colour-coded **freshness badge**
  (fresh / aging / stale).
- `confidence` (`high` / `medium` / `low`) + optional `dataNote` → a **confidence
  chip** and inline caveat on each result.
- optional `status` (`active` / `discontinued`) → discontinued cards are kept for
  the record but excluded from recommendations.

The catalogue was re-verified against mid-2026 bank terms; most figures are **medium
confidence** (sourced from credible public pages, not primary T&C). Confirm with the
issuing bank before applying. For comparison only, not financial advice.

## Managing card data (`/admin`)

`/admin` is a password-gated editor for the catalogue: list, add, edit (fees, income,
earn rules, confidence, freshness, status) and delete cards. It writes to
`packages/core/src/data/cards.json` via `lib/data/cardStore.ts`, which validates
every card before saving — since that file lives inside `@kadcompare/core`, edits
are immediately available to the mobile app on its next build too.

- **Password:** set `ADMIN_PASSWORD` (defaults to `admin123` for local dev only).
- **Persistence caveat:** writes use the filesystem, so they persist in local dev and
  on any Node host. On a **read-only serverless platform (e.g. Vercel) edits will not
  persist** across requests — the public site reflects `cards.json` as built. The
  intended workflow for now is: edit locally → commit the updated `cards.json` →
  redeploy. A future phase swaps `cardStore.ts` for a real database (Postgres/D1).

## Develop

```bash
npm install             # links @kadcompare/core via npm workspaces
npm run dev              # http://localhost:3000
npm run test              # all tests: web + packages/core
npm run typecheck          # web app only
npm run typecheck:all       # web app + @kadcompare/core
npm run build                # production build (web)

# Admin editor: set a password (defaults to admin123 locally)
ADMIN_PASSWORD=your-secret npm run dev   # then visit /admin

# Mobile app (once scaffolded — see mobile/README.md)
cd mobile && npm start
```
