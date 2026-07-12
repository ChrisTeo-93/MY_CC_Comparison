# KadCompare — Mobile (iOS + Android)

Native app built with **Expo + React Native + Expo Router**, sharing 100% of the
recommendation engine with the web app via the `@kadcompare/core` workspace package
(see the repo root README for the overall monorepo layout).

Screens mirror the web app's two journeys:

- `src/app/index.tsx` — landing, links to both flows
- `src/app/recommend.tsx` — persona → spending → results (single card / combo, "How
  you earn this" conditions, "Maximize your gains" tips)
- `src/app/evaluate.tsx` — persona → spending → owned cards → evaluation

All business logic (scoring, combos, conditions, tips, evaluation) is imported from
`@kadcompare/core` — screens only handle layout and navigation.

## Develop

Run these from the **repo root** (npm workspaces):

```bash
npm install                  # links @kadcompare/core, installs mobile's deps
npm run typecheck --workspace=@kadcompare/mobile
cd mobile && npm start        # opens the Expo dev tools / Metro bundler
```

From the Expo dev tools you can run:
- **iOS simulator** — press `i` (requires a Mac with Xcode)
- **Android emulator** — press `a` (requires Android Studio)
- **Physical device** — scan the QR code with the Expo Go app
- **Web** — press `w` (useful for a quick sanity check without a device/simulator)

## What's already verified

This app was built and verified without access to a physical device or simulator, so
verification leaned on what's fully automatable:
- `tsc --noEmit` — clean typecheck across the whole app
- `npx expo export --platform web|ios|android` — all three platforms bundle cleanly;
  the web export additionally **statically renders every route**, which catches
  render-time crashes (not just syntax errors)

**Not yet verified: actual on-device rendering, touch interactions, and native
navigation feel.** Before shipping, run the app on a real device/simulator and check:
layout on small/large screens, keyboard behavior on the spending step, scroll
performance on long results lists, and that the persona/spending/results flow feels
right end-to-end.

## Publishing to the App Store / Play Store

This repo has everything needed except the accounts, which only you can create:

1. **Expo/EAS account** — [expo.dev](https://expo.dev) (free). Then:
   ```bash
   cd mobile
   npx eas login
   npx eas init          # links this project to your Expo account, writes a projectId
   npx eas update:configure   # finalizes the OTA config — see "Keeping it updated" below
   ```
2. **Apple Developer Program** ($99/year) — needed for iOS builds/submission.
3. **Google Play Console** ($25 one-time) — needed for Android builds/submission.
4. **Bundle identifiers** — currently placeholders in `app.json`
   (`com.kadcompare.app` for both `ios.bundleIdentifier` and `android.package`).
   Bundle IDs are **permanent once published** — change these to something you
   actually own (e.g. reverse-DNS of your domain) before your first submission.
5. **App icons** — currently generic Expo placeholders (`assets/images/icon.png`,
   `assets/images/splash-icon.png`, the adaptive icon layers). Replace with real
   KadCompare branding before submitting.
6. **Build & submit** (once the above is done):
   ```bash
   npx eas build --platform ios --profile production
   npx eas build --platform android --profile production
   npx eas submit --platform ios
   npx eas submit --platform android
   ```

`eas.json` already has `development` / `preview` / `production` build profiles
configured — `preview` builds are the fastest way to get a shareable install link
without going through the app stores.

## Keeping it updated — OTA vs. app-store releases

The web app deploys instantly on every push; app stores gate mobile behind review
(hours to days). Since data freshness is the whole point of this product, that gap
matters — so this app is wired for **EAS Update (OTA)**: JS/data-only changes (a
`cards.json` refresh, an engine fix, a copy tweak) can reach installed apps
**without waiting for App Store / Play Store review**. Only genuinely native changes
(new native module, permission, icon) need an actual store submission.

Already configured:
- `expo-updates` is installed and added to `app.json`'s `plugins`.
- `app.json` sets `"runtimeVersion": { "policy": "appVersion" }` — OTA updates are
  compatible with any install sharing the same `version` field, so bumping the
  native version (e.g. for a store release) cleanly separates "needs a new build"
  from "can ship over the air."
- `eas.json`'s build profiles each declare a `channel` (`preview` / `production`),
  which is what OTA updates target.

**Still needed (requires your EAS login — not something I can do from here):**
`updates.url` isn't set yet because it needs your project's real EAS project ID,
which only exists after `eas init`. Run `npx eas update:configure` from `mobile/`
once you've logged in — it writes that URL automatically. After that, publishing an
update is:

```bash
npx eas update --branch production --message "Refresh card data for July"
```

Every install on the `production` channel picks it up on next launch — no store
review, no user action beyond opening the app.

## Project layout

```
src/
  app/                  Expo Router screens (file-based routing)
    _layout.tsx          Root Stack navigator (no tabs — this is a linear wizard)
    index.tsx             Landing
    recommend.tsx          Persona → spending → results
    evaluate.tsx             Persona → spending → owned cards → evaluation
  components/
    ui/                   Button, OptionCard, ScreenContainer — shared primitives
    wizard/                Native ports of the web wizard steps
    results/                Native ports of CardResultCard, FreshnessBadge,
                             ConfidenceChip, CardConditionsPanel, TipsPanel
  constants/theme.ts       Colour/spacing tokens mirroring the web app's Tailwind
                            palette exactly, so both apps look like the same product
metro.config.js           Explicit monorepo resolution for @kadcompare/core
eas.json                  EAS Build/Submit profiles
app.json                  App config — name, icons, bundle identifiers
```
