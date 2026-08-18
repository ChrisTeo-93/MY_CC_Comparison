import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — KadCompare",
  description:
    "KadCompare has no accounts, no analytics and no server that receives your data. Your spending never leaves your device.",
};

/**
 * The canonical, publicly-hosted privacy policy. Both app stores require a
 * reachable URL for this, so it lives here rather than only in the repo — and
 * only here, so there is one copy to keep true.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-brand-dark hover:underline">
        ← KadCompare
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: 18 August 2026</p>

      <p className="mt-6 text-slate-700">
        KadCompare helps you work out which Malaysian credit card, or combination of cards,
        earns you the most for the way you spend. This policy explains what the app does and
        does not do with information about you.
      </p>
      <p className="mt-4 rounded-xl bg-brand/5 p-4 font-medium text-slate-900">
        The short version: your answers never leave your device.
      </p>

      <Section title="What we collect">
        <p>
          <strong>Nothing.</strong> KadCompare has no accounts, no sign-in, and no server that
          receives your data.
        </p>
        <p>
          The persona questions you answer and the monthly spending figures you enter are held
          in memory on your device for as long as the app is open, and are used only to
          calculate your recommendation. They are not transmitted anywhere, not written to any
          server, and not retained after you close the app.
        </p>
        <p>
          The card catalogue is bundled with the app, and the entire recommendation calculation
          runs on your device. We never see your spending because it is never sent to us.
        </p>
      </Section>

      <Section title="What we do not do">
        <ul className="list-disc space-y-1 pl-5">
          <li>No user accounts or sign-in</li>
          <li>No analytics, telemetry, crash reporting, or usage tracking</li>
          <li>No advertising, and no advertising identifiers</li>
          <li>No cookies or device fingerprinting</li>
          <li>No selling, sharing, or disclosure of personal information — we hold none to sell</li>
          <li>No location, contacts, camera, microphone, photo, or file access</li>
        </ul>
      </Section>

      <Section title="Network connections the app does make">
        <p>For completeness, these are the only times KadCompare touches the network:</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>App updates.</strong> The mobile app delivers improvements without a full
            store release. When it checks for an update, the update service receives the
            ordinary technical information any download involves, such as your IP address and
            app version. It receives nothing about your spending or your answers.
          </li>
          <li>
            <strong>Links you tap.</strong> Each card shows a source link to the issuing bank&apos;s
            own page. If you tap it, that page opens in your browser and the bank&apos;s website
            sees you as an ordinary visitor. What happens then is covered by that bank&apos;s
            privacy policy, not this one.
          </li>
        </ol>
      </Section>

      <Section title="Children">
        <p>
          KadCompare is intended for adults who are eligible to hold a Malaysian credit card. It
          is not directed at children and collects no information from anyone.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Malaysia&apos;s Personal Data Protection Act 2010 gives you rights over personal data
          that organisations hold about you — access, correction, and withdrawal of consent.
          Because KadCompare stores no personal data about you on any system we control, there
          is nothing for us to hand over, correct, or delete. Removing the app removes
          everything it held.
        </p>
      </Section>

      <Section title="Not financial advice">
        <p>
          KadCompare gives estimates based on published card terms and the figures you enter.
          Card terms change often, and our data carries a confidence rating and a
          &ldquo;last verified&rdquo; date precisely because of that. Always confirm current
          terms with the issuing bank before applying. Nothing in the app is financial advice.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, the date at the top changes with it, and the current version
          always ships with the app.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy:{" "}
          <a className="text-brand-dark underline" href="mailto:chrisjie1993@gmail.com">
            chrisjie1993@gmail.com
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-slate-700">{children}</div>
    </section>
  );
}
