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
   card only when doing so lifts the *whole portfolio's* net value (max 3 cards),
   which implicitly requires it to cover its own bank fee **and** its own govt tax.
   Crucially, each card is scored on **only the spend routed to it** — min-spend
   unlocks, monthly caps and spend-based fee waivers are evaluated against that
   card's own routed total, never the user's whole profile. Scoring every card as
   if all spend sat on it (the original approach) credited bonus rates the user
   could never trigger once spend was split, and could recommend a card that
   actually loses money after its RM25 govt tax. Routing is found by hill-climbing
   from two starting points (all-on-lead, and an optimistic per-category best),
   because single-category moves alone can't discover a card that needs two or
   three categories together to cover its fee.
4. **recommend** — filters by income eligibility and (when the persona names a
   wallet) mobile-wallet support, then returns the ranked single list, the combo,
   the cards hidden for each of those two reasons, and any worthwhile *additions*
   beyond the combo (below).

**Holding cost — govt Service Tax (SST):** Malaysia charges a mandatory RM25/year
Service Tax on credit/charge cards, separate from and in addition to the bank's own
annual fee, and not waivable by the bank's own fee-waiver programs. Every card
carries this by default (`Card.govtTaxRM`, unset = the standard RM25 —
`STANDARD_GOVT_SERVICE_TAX_RM` in `engine/normalize.ts`); it's shown as its own
line item everywhere a fee appears, distinct from the bank's fee, so the product
stays honest about who's charging what. It especially matters for combos: each
extra card held adds another RM25/year its earnings must clear before it's worth
adding.

**Conditional (restricted) rates:** a headline rate often applies to only part of
your spend. The most common Malaysian case is weekend-only cashback — Maybank 2
Gold's "5%" lands on Saturdays and Sundays alone. Modelling that as an
unconditional 5% inflated the card enough to put it in 13 of 18 cohort
recommendations. An earn rule can now declare `eligibleShare` (0–1, the fraction
of category spend the rate actually reaches) and `conditionLabel` (what restricts
it). The eligible portion earns the bonus and is what the monthly cap is measured
against; the rest falls to the base rate. Weekend rules use **0.3** — Sat+Sun is
2/7 of days, nudged up because retail and dining skew to the weekend — and the UI
states the assumption rather than hiding it ("⏱ Only weekends (Sat/Sun) — we
estimate about 30% of your spend here qualifies"). It also propagates into
"spend RMx/mo to max this out", which correctly triples when only a third of
spend qualifies.

The two fields are independent on purpose. Where a restriction is real but its
impact can't be estimated honestly — Public Bank Visa Signature's RM100
per-transaction minimum, when we don't model transaction sizes — set
`conditionLabel` alone: the user is told about it and the engine invents nothing.

**Category exclusions:** banks often advertise a broad "earn on everything" rate
(modelled as `category: "general"`, an omni-boost applied to every spending
category) but carve out specific transaction types — e-wallet reloads, bills/
utilities and government payments are the most common. An earn rule can declare
`excludedCategories: CategoryKey[]`; those categories fall back to the card's base
rate instead of the bonus, and the UI says so explicitly ("⊘ Excludes E-Wallet
Reloads, Bills & Utilities…") rather than silently under-counting. A general rule
with no exclusions is shown just as plainly ("✓ Applies to any transaction — no
exclusions"), so the product surfaces both which cards restrict transactions *and*
which are genuinely unrestricted. Government payments don't have their own
spending category today, so they're modelled under Bills & Utilities (JomPAY-style
routing) — documented per-card via `notes` where it applies.

**Mobile-wallet support:** each result card shows which wallets it works with —
Apple Pay, Google Pay, Samsung Pay, Huawei Pay. In Malaysia this tracks the card
*network* far more than the specific card, so support is derived by a transparent
heuristic (`domain/wallets.ts`): Visa/Mastercard → Apple/Google/Samsung; Amex → a
narrower set; Huawei Pay is effectively UnionPay-only locally. A card can override
the heuristic with an explicit `wallets: MobileWallet[]` (editable in `/admin`)
when its real support is known to differ. This is indicative, network-derived
data — not per-card verified — and is documented as such.

The persona quiz also asks **which wallet you pay with**. Pick a specific wallet
(Apple / Google / Samsung / Huawei Pay) and cards that don't support it are pulled
out of the ranking and combo into `RecommendationResult.walletFiltered`, surfaced
as a collapsible "N cards hidden (no <wallet> support)" disclosure — separate from
the income-eligibility hide. Choosing "Doesn't matter" (the default) applies no
wallet filtering. Because Huawei Pay is effectively UnionPay-only locally, picking
it can empty the ranking entirely; the results step then shows a wallet-aware empty
state pointing back at the wallet question rather than a generic "no cards" message.

**Maximization tips:** a "Maximize your gains" panel surfaces value the combo's
per-category assignment can't capture on its own, since that assignment moves whole
categories at a time — chiefly cap overflow (spend beyond a card's monthly cap
silently drops to its base rate, so it's worth putting the excess on another card)
and fee-waiver near-misses. Tips are scoped **strictly to the cards in the
recommended combo**: the panel exists to explain how to work the portfolio we just
recommended, so advice built around a card the user was never told to get is advice
they can't act on. Rates and waiver shortfalls are measured against the spend the
combo actually routes to each card, matching how the optimiser scores — a tip must
never promise a bonus rate or a waiver the card can't reach on what it receives.

**"Consider adding a card":** the combo is capped at 3 cards, so value beyond that
cap would otherwise be invisible. `additionsTo` measures it directly — best routing
over `combo + candidate` versus the combo alone, scored on routed spend throughout,
so the figure shown is already net of that card's own annual fee and its RM25 govt
tax. A candidate is only reported when it earns a place in the routing *and* every
existing member keeps one: if adding a card would strand an incumbent that's a
swap, not an addition, and labelling it "add this too" would misstate the action.
The section is rendered visibly apart from the combo (dashed border, muted ground)
precisely because these cards are **not** part of the recommendation — this is the
honest home for cross-card value, as opposed to smuggling a non-recommended card
into the tips. It fires rarely by design: with the RM25 tax on every extra card, a
4th only pays for unusually heavy spenders.

**Picking cards you own:** the "I already have cards" step is searchable and
grouped — a free-text search over card/bank names, a row of bank filter chips, and
the results grouped under bank headings — so finding your cards among the full
catalogue is quick on both web and mobile.

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

**Needs-review flag:** cards carry an admin-only `needsReview` boolean — a curation
marker for figures not yet confirmed against primary bank T&C (e.g. rows sourced
from secondary snippets during a data refresh). It's surfaced only in `/admin` (a
per-card toggle, an "⚠ Review" badge in the list, a header count, and a "show only
needs-review" filter, plus a one-click "flag all medium/low confidence" helper) and
deliberately does **not** affect scoring, recommendations, or the public site — the
public trust signals stay the confidence chip + freshness badge. It gives a curator
a worklist to burn down as each card is verified.

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

- **Password:** set `ADMIN_PASSWORD`. Outside production this falls back to
  `admin123` so local dev needs no configuration. **In production the variable is
  mandatory and the gate fails closed** — if it isn't set, every login is refused
  with a 503 explaining why, rather than falling back to a default that is
  documented right here in this README and would leave the editor wide open.
- **Not yet verified against a live Redis instance** — this environment has no
  network access to provision or connect to one. `RedisCardsRepository`'s logic is
  fully unit-tested against an injected in-memory fake client
  (`tests/cardsRepository.test.ts`), and its client is a direct (uncast) assignment
  from the real `redis` package, proving structural compatibility — but the actual
  network round-trip should be sanity-checked once `REDIS_URL` is set.

## Persona cohort smoke test

`npm run cohort` drives **20 simulated Malaysian tester personas** through the real
app in a real browser (Playwright) against a running server — fresh grad, e-hailing
driver, retiree, frequent traveller, Huawei-phone user, someone who enters nothing,
someone who enters zero everywhere, two existing cardholders using the evaluate
flow, and so on. Start the app first, then point the harness at it:

```bash
npm run build && npm run start &          # or: npm run dev
BASE=http://localhost:3000 npm run cohort
```

It exits non-zero on any of: a JS/console error, a persona that never reaches
results, a combo whose headline value doesn't reconcile against what its member
cards are shown to earn, or a "here's that card" message rendering no card. Edit
`scripts/cohort/personas.js` to add segments.

These are **simulated personas, not real users** — the harness finds broken flows,
dead ends and numbers that don't add up, but it is not a substitute for real user
research and should never be reported as such.

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
