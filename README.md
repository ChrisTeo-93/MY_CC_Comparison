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
app/
  page.tsx                 Landing
  recommend/page.tsx       3-step wizard (client)
lib/
  domain/                  types, categories, seed card catalogue
  engine/                  normalize · score · combo · recommend
  persona/                 persona quiz definition
components/
  wizard/                  ProgressBar, StepPersona, StepSpending, StepResults
  results/                 CardResultCard
tests/
  engine.test.ts           19 unit tests for the engine
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

## Data freshness

Card reward rates change often. Every card in `lib/domain/cards.ts` carries a
`lastVerified` date and a `sourceUrl`, surfaced in the UI as a freshness badge. The
seed figures are **representative** — confirm with the issuing bank before applying.
This is for comparison only, not financial advice.

A future phase replaces the seed file with a database + admin editor.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run test       # engine unit tests
npm run typecheck  # tsc --noEmit
npm run build      # production build
```
