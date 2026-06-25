import Link from "next/link";
import { ACTIVE_CARDS } from "@/lib/domain/cards";

const STEPS = [
  {
    icon: "🧭",
    title: "Tell us your persona",
    body: "A few quick questions about what you value — cashback, points, miles, fees and travel.",
  },
  {
    icon: "📊",
    title: "Share your spending",
    body: "Set rough monthly amounts per category. Don't know? We'll use sensible defaults.",
  },
  {
    icon: "🏆",
    title: "Get your best card(s)",
    body: "See the single best card, or the best 2–3 card combo, ranked by real ringgit value.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="text-center">
        <span className="inline-block rounded-full bg-brand/10 px-4 py-1 text-sm font-medium text-brand-dark">
          🇲🇾 Built for Malaysian spenders
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Find the credit card that actually
          <span className="text-brand-dark"> pays you back</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Stop guessing from outdated forum threads. Tell us how you spend and what you
          value, and we&apos;ll recommend the card — or combo of cards — that earns you the
          most, in real ringgit.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/recommend"
            className="rounded-lg bg-brand-dark px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand"
          >
            Find my card →
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Free · No sign-up · {ACTIVE_CARDS.length} cards compared
        </p>
      </div>

      <div className="mt-20 grid gap-6 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="text-3xl">{s.icon}</div>
            <div className="mt-3 text-sm font-semibold text-brand-dark">
              Step {i + 1}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-slate-900 p-8 text-center text-slate-200">
        <h2 className="text-xl font-semibold text-white">
          Cashback, points and miles — compared fairly
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">
          We convert every reward type into ringgit value, subtract annual fees, and
          respect monthly caps — so a 5% cashback card and a 10x points card are judged
          on the same scale: how much they actually put back in your pocket.
        </p>
      </div>

      <p className="mt-10 text-center text-xs text-slate-400">
        Card data is representative and may change. Every recommendation shows when its
        data was last verified. This tool is for comparison only, not financial advice.
      </p>
    </main>
  );
}
