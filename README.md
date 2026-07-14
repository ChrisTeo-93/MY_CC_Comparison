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
   (`percent` as-is; `points × pointValueRM`; `miles × mileValueRM`). Also resolves
   each card's mandatory govt Service Tax (see below).
2. **score** — per category: apply the best applicable rule, honour monthly caps
   (overflow falls back to the base rate) and min-spend unlocks, sum × 12, subtract
   the effective annual fee (after waiver logic) *and* the govt Service Tax. A
   small, transparent persona multiplier breaks ties toward the user's stated
   preference — it only sees the bank's own fee, not the govt tax, since that
   tax is uniform and doesn't differentiate a "fee-averse" card from any other.
3. **combo** — greedy portfolio builder: seed with the best single card, then add a
   card only if its *marginal* value covers its own bank fee **and** its own govt
   tax (max 3 cards); each category is routed to its best earner in the set.
4. **recommend** — filters by income eligibility, returns the ranked single list,
   the combo, and the list of cards hidden for income reasons.

**Holding cost — govt Service Tax (SST):** Malaysia charges a mandatory RM25/year
Service Tax on credit/charge cards, separate from and in addition to the bank's own
annual fee, and not waivable by the bank's own fee-waiver programs. Every card
carries this by default (`Card.govtTaxRM`, unset = the standard RM25 —
`STANDARD_GOVT_SERVICE_TAX_RM` in `engine/normalize.ts`); it's shown as its own
line item everywhere a fee appears, distinct from the bank's fee, so the product
stays honest about who's charging what. It especially matters for combos: each
extra card held adds another RM25/year its earnings must clear before it's worth
adding.

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
earn rules, confidence, freshness, status) and delete cards. Validation
(`lib/data/cardStore.ts`) is storage-agnostic — actual reads/writes go through
`lib/data/cardsRepository.ts`, which picks a backend automatically:

- **`REDIS_URL` set → `RedisCardsRepository`.** The whole catalogue is stored as one
  JSON blob under a single key, so edits **persist across serverless invocations** —
  this is the production-ready path. Works with any Redis-compatible connection
  string, including **Vercel's own KV/Upstash integration** (add it from your Vercel
  project's Storage tab — no separate account needed — then copy the connection
  string it gives you into `REDIS_URL`).
- **`REDIS_URL` unset → `FilesystemCardsRepository`** (the original behaviour): writes
  go straight to `packages/core/src/data/cards.json`, which is fine for local dev and
  any Node host with a writable filesystem, but **won't persist across requests on
  Vercel** without `REDIS_URL` configured — the public site would just reflect
  whatever `cards.json` was at build time.

Either way, the file lives inside `@kadcompare/core`, so edits (once persisted) are
available to the mobile app on its next build/OTA update too.

- **Password:** set `ADMIN_PASSWORD` (defaults to `admin123` for local dev only).
- **Not yet verified against a live Redis instance** — this environment has no
  network access to provision or connect to one. `RedisCardsRepository`'s logic is
  fully unit-tested against an injected in-memory fake client
  (`tests/cardsRepository.test.ts`), and its client is a direct (uncast) assignment
  from the real `redis` package, proving structural compatibility — but the actual
  network round-trip should be sanity-checked once `REDIS_URL` is set.

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
