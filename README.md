# KadCompare — Malaysian Credit Card Recommender

Pick the Malaysian credit card (or 2–3 card combo) that earns you the most for how
*you* spend. Built because comparison sites are hard to use and forum advice goes
stale as banks change card policies.

The user goes through three steps:

1. **Persona** — what they value (cashback / points / miles), income bracket, fee
   tolerance, travel frequency, single-vs-multi-card willingness.
2. **Spending** — rough monthly spend per category (all optional; sensible defaults).
3. **Results** — the best single card *and* the best combo, toggleable, ranked by
   real ringgit value net of annual fees.

The key idea: **cashback, points and miles are all normalised to ringgit value**, so
different reward types are judged on the same scale.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- Pure-TypeScript recommendation engine (no DB, no network) — fully unit-tested
- **Vitest** for engine tests

## Project layout

```
data/
  cards.json               Card catalogue — the source of truth (edited via /admin)
app/
  page.tsx                 Landing
  recommend/page.tsx       3-step wizard (client)
  admin/                   Card-data editor (password-gated) + login
  api/admin/               Auth + CRUD route handlers (login/logout/cards)
lib/
  domain/                  types, categories, card loader (reads data/cards.json)
  engine/                  normalize · score · combo · recommend
  persona/                 persona quiz definition
  data/cardStore.ts        Server-side read/write + validation for cards.json
  auth.ts                  Minimal admin password gate
components/
  wizard/                  ProgressBar, StepPersona, StepSpending, StepResults
  results/                 CardResultCard, FreshnessBadge + ConfidenceChip
  admin/AdminEditor.tsx    The card editor UI
tests/
  engine.test.ts           engine unit tests
  cardStore.test.ts        validation + seed-data integrity tests
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
`data/cards.json` carries:

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
`data/cards.json` via `lib/data/cardStore.ts`, which validates every card before
saving.

- **Password:** set `ADMIN_PASSWORD` (defaults to `admin123` for local dev only).
- **Persistence caveat:** writes use the filesystem, so they persist in local dev and
  on any Node host. On a **read-only serverless platform (e.g. Vercel) edits will not
  persist** across requests — the public site reflects `data/cards.json` as built. The
  intended workflow for now is: edit locally → commit the updated `data/cards.json` →
  redeploy. A future phase swaps `cardStore.ts` for a real database (Postgres/D1).

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run test       # engine + data-store unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build

# Admin editor: set a password (defaults to admin123 locally)
ADMIN_PASSWORD=your-secret npm run dev   # then visit /admin
```
