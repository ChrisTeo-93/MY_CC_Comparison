# Store listing copy

Draft copy for the App Store and Google Play. Character limits are noted where
the stores enforce them. Nothing here is submitted automatically — it needs an
Apple Developer account (USD99/yr) and a Google Play developer account (USD25
one-off), both of which have to be yours.

---

## App name

**KadCompare** (10 chars — both stores allow 30)

## Subtitle — App Store (30 char limit)

`The card that fits your spend` (29)

## Short description — Google Play (80 char limit)

`Find the Malaysian credit card that earns you the most for how you actually spend.` (80)

---

## Full description

> Works for both stores. Play allows 4,000 characters; this is well under.

Most credit card comparisons show you the headline rate. KadCompare shows you
what you would actually earn.

Answer a few questions about what you value and roughly what you spend each
month, and KadCompare ranks Malaysian credit cards by the real ringgit value
they return to you — cashback, points and air miles all converted to the same
scale so they can be compared honestly.

**It counts the things comparisons usually skip**

• The mandatory RM25/year government service tax every Malaysian card carries,
  on top of the bank's own annual fee
• Monthly caps — including caps shared across several categories, so a
  "RM50 a month" cap is not quietly counted several times over
• Minimum monthly spend thresholds you have to hit before a bonus rate unlocks
• Rates that only apply at weekends, which are worth far less if you spend
  mostly on weekdays — so we ask when you spend
• Categories a card excludes, like e-wallet reloads and bill payments

**One card or several**

See the best single card, or the best combination of two to three cards with
each category routed to whichever card earns most on it. A card only makes the
combination if it earns back its own annual fee and its own government service
tax on the spending actually routed to it.

**Already have cards?**

Tell KadCompare which cards you hold and it will show what you currently earn,
how much you are leaving on the table, and which card would be worth taking on —
saying plainly when a suggestion would replace one of your cards rather than
join it.

**Honest about what it does not know**

Every card shows when its terms were last checked and how confident we are in
the figures. Where a rate depends on an assumption, the app tells you the
assumption. Where no card is worth holding at your spending level, it says so
instead of recommending one anyway.

No account. No ads. No tracking. Your spending never leaves your phone.

KadCompare gives estimates, not financial advice. Confirm current terms with the
bank before you apply.

---

## Keywords — App Store (100 char limit, comma-separated)

`credit card,cashback,malaysia,ringgit,rewards,points,air miles,compare,annual fee,spending` (90)

## Category

- **Primary:** Finance
- **Secondary:** Utilities

## Content rating

Suitable for all ages. The app collects no data, has no user content, no ads, no
purchases, and no external social features. Play's questionnaire should return
"Everyone"; App Store should return 4+.

---

## Data safety / privacy declarations

Both stores ask what data you collect. The answer is **none**, which is unusual
enough that it is worth filling in carefully rather than guessing.

**Apple — App Privacy:** select "Data Not Collected".

**Google Play — Data safety:**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | No |
| Is all user data encrypted in transit? | N/A — no user data is transmitted |
| Do you provide a way for users to request data deletion? | N/A — no data is retained |

Note for both forms: the app does make network requests for over-the-air
updates, which involves Expo's servers seeing an IP address and app version.
That is infrastructure, not user data collection, and neither store's data
declaration covers it — but the privacy policy discloses it anyway.

**Privacy policy URL:** required by both stores. Published at `/privacy` on the
web app (`app/privacy/page.tsx`), which is the single copy — submit
`https://<your-domain>/privacy`.

---

## Screenshots needed

Not yet produced — these must come from a real device or simulator, which this
environment cannot run.

- **iPhone 6.7"** (1290×2796) — 3 to 10 shots
- **iPhone 6.5"** (1242×2688) — required if supporting older devices
- **iPad 12.9"** (2048×2732) — required because `supportsTablet: true`
- **Android phone** (min 1080px on the short side) — 2 to 8 shots
- **Play feature graphic** (1024×500) — required

Suggested sequence, which mirrors the actual journey: the persona questions →
the spending step → the ranked results → the combo view with per-card routing →
the "how you earn this" panel expanded, since that conditions detail is the
thing competitors do not show.

---

## Pre-submission checklist

- [x] Real app icon at every required size (no template artwork)
- [x] Splash screen
- [x] Bundle identifier / package name — `com.kadcompare.app`
- [x] Version and build numbers
- [x] Privacy policy written and published at `/privacy`
- [ ] Screenshots from a real device
- [ ] Play feature graphic
- [ ] Apple Developer account
- [ ] Google Play developer account
- [ ] `eas build --profile production` run and the binary tested on a real device
- [ ] Card data verified against primary sources — 18 of 23 cards are still
      flagged `needsReview`, and shipping unverified financial figures to a store
      is a materially different risk from showing them on a web page you control
