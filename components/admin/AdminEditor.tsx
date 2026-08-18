"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@kadcompare/core";
import type { Card, EarnRule } from "@kadcompare/core";
import { ConfidenceChip, FreshnessBadge } from "@/components/results/FreshnessBadge";

const NETWORKS = ["Visa", "Mastercard", "Amex", "UnionPay"] as const;
const REWARD_TYPES = ["cashback", "points", "miles", "hybrid"] as const;
const UNITS = ["percent", "pointsPerRM", "milesPerRM"] as const;
const WAIVERS = ["always", "none", "spend", "swipes"] as const;
const CONFIDENCES = ["high", "medium", "low"] as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function blankCard(): Card {
  return {
    id: "",
    name: "",
    bank: "",
    network: "Visa",
    rewardType: "cashback",
    color: "#2563eb",
    annualFee: 0,
    feeWaiver: { type: "always" },
    minAnnualIncome: 0,
    baseRule: { category: "general", rate: 0, unit: "percent" },
    earnRules: [],
    perks: [],
    lastVerified: todayISO(),
    sourceUrl: "",
    confidence: "medium",
    status: "active",
  };
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-dark";
const labelCls = "block text-xs font-medium text-slate-500";

export function AdminEditor({ initialCards }: { initialCards: Card[] }) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [draft, setDraft] = useState<Card | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);

  const sorted = useMemo(
    () => [...cards].sort((a, b) => a.bank.localeCompare(b.bank) || a.name.localeCompare(b.name)),
    [cards],
  );
  const needsReviewCount = useMemo(() => cards.filter((c) => c.needsReview).length, [cards]);
  const visible = useMemo(
    () => (reviewOnly ? sorted.filter((c) => c.needsReview) : sorted),
    [sorted, reviewOnly],
  );

  function edit(card: Card) {
    setDraft(JSON.parse(JSON.stringify(card)));
    setIsNew(false);
    setMsg(null);
  }
  function addNew() {
    setDraft(blankCard());
    setIsNew(true);
    setMsg(null);
  }
  function patch(p: Partial<Card>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }
  function patchRule(idx: number, p: Partial<EarnRule>) {
    setDraft((d) => {
      if (!d) return d;
      const earnRules = d.earnRules.map((r, i) => (i === idx ? { ...r, ...p } : r));
      return { ...d, earnRules };
    });
  }
  function addRule() {
    setDraft((d) =>
      d ? { ...d, earnRules: [...d.earnRules, { category: "general", rate: 0, unit: "percent" }] } : d,
    );
  }
  function removeRule(idx: number) {
    setDraft((d) => (d ? { ...d, earnRules: d.earnRules.filter((_, i) => i !== idx) } : d));
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: data.error || "Save failed" });
      return;
    }
    const saved: Card = data.card;
    setCards((cs) => {
      const idx = cs.findIndex((c) => c.id === saved.id);
      if (idx >= 0) return cs.map((c) => (c.id === saved.id ? saved : c));
      return [...cs, saved];
    });
    setIsNew(false);
    setMsg({ kind: "ok", text: `Saved “${saved.name}”. Public site reflects this after redeploy.` });
    router.refresh();
  }

  async function remove() {
    if (!draft || isNew) return;
    if (!confirm(`Delete “${draft.name}”? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/cards/${draft.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: "Delete failed" });
      return;
    }
    setCards((cs) => cs.filter((c) => c.id !== draft.id));
    setDraft(null);
    setMsg({ kind: "ok", text: "Card deleted." });
    router.refresh();
  }

  async function flagMediumLow() {
    const targets = cards.filter(
      (c) => (c.confidence === "medium" || c.confidence === "low") && !c.needsReview,
    );
    if (targets.length === 0) {
      setMsg({ kind: "ok", text: "No unflagged medium/low-confidence cards." });
      return;
    }
    if (!confirm(`Flag ${targets.length} medium/low-confidence card(s) as needing review?`)) return;
    setBusy(true);
    setMsg(null);
    const saved: Card[] = [];
    for (const c of targets) {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...c, needsReview: true }),
      });
      if (!res.ok) {
        setBusy(false);
        setMsg({ kind: "err", text: `Flagged ${saved.length}/${targets.length}; “${c.name}” failed.` });
        if (saved.length) applySaved(saved);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.card) saved.push(data.card as Card);
    }
    setBusy(false);
    applySaved(saved);
    setMsg({ kind: "ok", text: `Flagged ${saved.length} card(s) for review.` });
    router.refresh();
  }

  function applySaved(saved: Card[]) {
    setCards((cs) => {
      const byId = new Map(saved.map((c) => [c.id, c]));
      return cs.map((c) => byId.get(c.id) ?? c);
    });
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm font-semibold text-brand-dark hover:underline">
            ← KadCompare
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Card catalogue admin</h1>
          <p className="text-sm text-slate-500">
            {cards.length} cards · edits save to data/cards.json
            {needsReviewCount > 0 && (
              <>
                {" · "}
                <span className="font-medium text-amber-600">
                  ⚠ {needsReviewCount} need{needsReviewCount === 1 ? "s" : ""} review
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={flagMediumLow}
            disabled={busy}
            title="Set the needs-review flag on every medium- and low-confidence card"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:border-amber-400 disabled:opacity-40"
          >
            Flag medium/low for review
          </button>
          <button
            onClick={addNew}
            className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:bg-brand"
          >
            + Add card
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* List */}
        <div className="space-y-2">
          {needsReviewCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={reviewOnly}
                onChange={(e) => setReviewOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-amber-600"
              />
              Show only cards needing review ({needsReviewCount})
            </label>
          )}
          {visible.length === 0 && (
            <p className="rounded-lg bg-slate-100 p-4 text-center text-sm text-slate-500">
              No cards match this filter.
            </p>
          )}
          {visible.map((c) => (
            <button
              key={c.id}
              onClick={() => edit(c)}
              className={[
                "w-full rounded-xl border bg-white p-3 text-left transition",
                draft?.id === c.id && !isNew ? "border-brand-dark ring-1 ring-brand/30" : "border-slate-200 hover:border-brand",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium text-slate-900">
                  {c.needsReview && (
                    <span
                      title="Flagged as needing review"
                      className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                    >
                      ⚠ Review
                    </span>
                  )}
                  {c.name}
                </span>
                <ConfidenceChip level={c.confidence} note={c.dataNote} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {c.bank} · {c.rewardType}
                  {c.status === "discontinued" && (
                    <span className="ml-1 text-red-500">· discontinued</span>
                  )}
                </span>
                <FreshnessBadge date={c.lastVerified} />
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div>
          {!draft ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Select a card to edit, or add a new one.
            </div>
          ) : (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {isNew ? "New card" : draft.name}
                </h2>
                {msg && (
                  <span className={msg.kind === "ok" ? "text-sm text-emerald-600" : "text-sm text-red-600"}>
                    {msg.text}
                  </span>
                )}
              </div>

              {/* Identity */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ID (slug)">
                  <input
                    className={inputCls}
                    value={draft.id}
                    disabled={!isNew}
                    onChange={(e) => patch({ id: e.target.value })}
                  />
                </Field>
                <Field label="Name">
                  <input className={inputCls} value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
                </Field>
                <Field label="Bank">
                  <input className={inputCls} value={draft.bank} onChange={(e) => patch({ bank: e.target.value })} />
                </Field>
                <Field label="Network">
                  <select className={inputCls} value={draft.network} onChange={(e) => patch({ network: e.target.value as Card["network"] })}>
                    {NETWORKS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Reward type">
                  <select className={inputCls} value={draft.rewardType} onChange={(e) => patch({ rewardType: e.target.value as Card["rewardType"] })}>
                    {REWARD_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Accent colour">
                  <input type="color" className="h-9 w-full rounded-lg border border-slate-300" value={draft.color} onChange={(e) => patch({ color: e.target.value })} />
                </Field>
              </div>

              {/* Money + eligibility */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Annual fee (RM)">
                  <input type="number" className={inputCls} value={draft.annualFee} onChange={(e) => patch({ annualFee: Number(e.target.value) })} />
                </Field>
                <Field label="Min annual income (RM)">
                  <input type="number" className={inputCls} value={draft.minAnnualIncome} onChange={(e) => patch({ minAnnualIncome: Number(e.target.value) })} />
                </Field>
                <Field label="Fee waiver">
                  <select
                    className={inputCls}
                    value={draft.feeWaiver.type}
                    onChange={(e) => {
                      const type = e.target.value as Card["feeWaiver"]["type"];
                      patch({ feeWaiver: type === "spend" || type === "swipes" ? { type, threshold: draft.feeWaiver.threshold ?? 0 } : { type } });
                    }}
                  >
                    {WAIVERS.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </Field>
                {(draft.feeWaiver.type === "spend" || draft.feeWaiver.type === "swipes") && (
                  <Field label={draft.feeWaiver.type === "spend" ? "Waiver: annual spend (RM)" : "Waiver: swipes / year"}>
                    <input type="number" className={inputCls} value={draft.feeWaiver.threshold ?? 0} onChange={(e) => patch({ feeWaiver: { type: draft.feeWaiver.type, threshold: Number(e.target.value) } })} />
                  </Field>
                )}
                {draft.rewardType === "points" && (
                  <Field label="Point value (RM/point)">
                    <input type="number" step="0.0001" className={inputCls} value={draft.pointValueRM ?? ""} onChange={(e) => patch({ pointValueRM: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </Field>
                )}
                {draft.rewardType === "miles" && (
                  <Field label="Mile value (RM/mile)">
                    <input type="number" step="0.0001" className={inputCls} value={draft.mileValueRM ?? ""} onChange={(e) => patch({ mileValueRM: e.target.value === "" ? undefined : Number(e.target.value) })} />
                  </Field>
                )}
              </div>

              {/* Base rule */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Base earn rule</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <CategorySelect value={draft.baseRule.category} onChange={(category) => patch({ baseRule: { ...draft.baseRule, category } })} />
                  <input type="number" step="0.001" className={inputCls} value={draft.baseRule.rate} onChange={(e) => patch({ baseRule: { ...draft.baseRule, rate: Number(e.target.value) } })} />
                  <UnitSelect value={draft.baseRule.unit} onChange={(unit) => patch({ baseRule: { ...draft.baseRule, unit } })} />
                </div>
              </div>

              {/* Earn rules */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Accelerated earn rules</p>
                  <button onClick={addRule} className="text-sm font-medium text-brand-dark hover:underline">+ Add rule</button>
                </div>
                <div className="mt-2 space-y-2">
                  {draft.earnRules.length === 0 && <p className="text-sm text-slate-400">No accelerated rules.</p>}
                  {draft.earnRules.map((r, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-2">
                      <div className="grid gap-2 sm:grid-cols-[1.4fr_0.8fr_1.1fr_0.9fr_0.9fr_auto]">
                        <CategorySelect value={r.category} onChange={(category) => patchRule(i, { category })} />
                        <input type="number" step="0.001" placeholder="rate" className={inputCls} value={r.rate} onChange={(e) => patchRule(i, { rate: Number(e.target.value) })} />
                        <UnitSelect value={r.unit} onChange={(unit) => patchRule(i, { unit })} />
                        <input type="number" placeholder="cap/mo" className={inputCls} value={r.monthlyCap ?? ""} onChange={(e) => patchRule(i, { monthlyCap: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        <input type="number" placeholder="min/mo" className={inputCls} value={r.minMonthlySpend ?? ""} onChange={(e) => patchRule(i, { minMonthlySpend: e.target.value === "" ? undefined : Number(e.target.value) })} />
                        <button onClick={() => removeRule(i)} className="px-2 text-slate-400 hover:text-red-500" title="Remove">✕</button>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-[1.6fr_1fr]">
                        <input
                          placeholder="restriction, e.g. weekends only (Sat/Sun) — blank if unrestricted"
                          className={inputCls}
                          value={r.conditionLabel ?? ""}
                          onChange={(e) => patchRule(i, { conditionLabel: e.target.value || undefined })}
                        />
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          placeholder="qualifying share 0–1"
                          title="Fraction of spend the restricted rate actually reaches (e.g. 0.3 for weekend-only). Leave blank to disclose the restriction without estimating its impact."
                          className={inputCls}
                          value={r.eligibleShare ?? ""}
                          onChange={(e) => patchRule(i, { eligibleShare: e.target.value === "" ? undefined : Number(e.target.value) })}
                        />
                      </div>
                      <input placeholder="notes (shown to users)" className={`${inputCls} mt-2`} value={r.notes ?? ""} onChange={(e) => patchRule(i, { notes: e.target.value || undefined })} />
                      {r.category === "general" && (
                        <input
                          placeholder="excludes categories (comma-separated keys, e.g. ewallet,bills) — leave blank if unrestricted"
                          className={`${inputCls} mt-2`}
                          value={(r.excludedCategories ?? []).join(", ")}
                          onChange={(e) => {
                            const keys = e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean) as EarnRule["excludedCategories"];
                            patchRule(i, { excludedCategories: keys && keys.length > 0 ? keys : undefined });
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Perks */}
              <Field label="Perks (one per line)">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={draft.perks.join("\n")}
                  onChange={(e) => patch({ perks: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>

              {/* Trust metadata */}
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Confidence">
                  <select className={inputCls} value={draft.confidence} onChange={(e) => patch({ confidence: e.target.value as Card["confidence"] })}>
                    {CONFIDENCES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={inputCls} value={draft.status ?? "active"} onChange={(e) => patch({ status: e.target.value as Card["status"] })}>
                    <option value="active">active</option>
                    <option value="discontinued">discontinued</option>
                  </select>
                </Field>
                <Field label="Last verified">
                  <input type="date" className={inputCls} value={draft.lastVerified} onChange={(e) => patch({ lastVerified: e.target.value })} />
                </Field>
                <Field label="Set to today">
                  <button onClick={() => patch({ lastVerified: todayISO() })} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm hover:border-brand-dark">Mark verified today</button>
                </Field>
              </div>
              <label
                className={[
                  "flex items-start gap-3 rounded-lg border p-3",
                  draft.needsReview ? "border-amber-300 bg-amber-50" : "border-slate-200",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={draft.needsReview ?? false}
                  onChange={(e) => patch({ needsReview: e.target.checked || undefined })}
                  className="mt-0.5 h-4 w-4 accent-amber-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    ⚠ Needs review
                  </span>
                  <span className="block text-xs text-slate-500">
                    Mark when figures aren&apos;t yet confirmed against primary bank T&amp;C.
                    Admin-only — does not affect scoring or the public site.
                  </span>
                </span>
              </label>

              <Field label="Source URL">
                <input className={inputCls} value={draft.sourceUrl} onChange={(e) => patch({ sourceUrl: e.target.value })} />
              </Field>
              <Field label="Data note (caveat shown for non-high confidence)">
                <textarea rows={2} className={inputCls} value={draft.dataNote ?? ""} onChange={(e) => patch({ dataNote: e.target.value || undefined })} />
              </Field>
              <Field label="Mobile wallets override (comma-separated: applePay, googlePay, samsungPay, huaweiPay — blank = derive from network)">
                <input
                  className={inputCls}
                  value={(draft.wallets ?? []).join(", ")}
                  onChange={(e) => {
                    const keys = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean) as Card["wallets"];
                    patch({ wallets: keys && keys.length > 0 ? keys : undefined });
                  }}
                />
              </Field>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button onClick={remove} disabled={isNew || busy} className="text-sm font-medium text-red-500 hover:underline disabled:opacity-30">
                  Delete card
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setDraft(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400">
                    Cancel
                  </button>
                  <button onClick={save} disabled={busy} className="rounded-lg bg-brand-dark px-5 py-2 text-sm font-semibold text-white hover:bg-brand disabled:opacity-40">
                    {busy ? "Saving…" : "Save card"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function CategorySelect({ value, onChange }: { value: EarnRule["category"]; onChange: (v: EarnRule["category"]) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as EarnRule["category"])}>
      {CATEGORIES.map((c) => (
        <option key={c.key} value={c.key}>{c.label}</option>
      ))}
    </select>
  );
}

function UnitSelect({ value, onChange }: { value: EarnRule["unit"]; onChange: (v: EarnRule["unit"]) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as EarnRule["unit"])}>
      {UNITS.map((u) => <option key={u}>{u}</option>)}
    </select>
  );
}
