import { freshnessStatus } from "@kadcompare/core";
import type { DataConfidence } from "@kadcompare/core";

const LEVEL_CLASS: Record<string, string> = {
  fresh: "text-emerald-600 hover:text-emerald-700",
  aging: "text-amber-600 hover:text-amber-700",
  stale: "text-red-500 hover:text-red-600",
};

/**
 * Colour-coded "how fresh is this card's data" badge. Freshness is a feature
 * here, not a footnote — bank terms drift, so stale data is shown in red with a
 * warning glyph so users know to double-check before applying.
 */
export function FreshnessBadge({ date, href }: { date: string; href?: string }) {
  const f = freshnessStatus(date);
  const cls = LEVEL_CLASS[f.level];
  const glyph = f.level === "stale" ? "⚠" : "🕒";
  const content = (
    <>
      {glyph} {f.label}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-medium ${cls}`}
        title={`Source: ${href}`}
      >
        {content}
      </a>
    );
  }
  return <span className={`font-medium ${cls}`}>{content}</span>;
}

const CONFIDENCE_STYLE: Record<DataConfidence, { label: string; cls: string }> = {
  high: { label: "high confidence", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  medium: { label: "medium confidence", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  low: { label: "low confidence", cls: "bg-red-50 text-red-600 ring-red-200" },
};

/**
 * How much to trust this card's figures. Paired with the freshness badge, this
 * is the product's core honesty signal — recommendations are only as good as the
 * data, so we say out loud how solid each card's data is.
 */
export function ConfidenceChip({ level, note }: { level: DataConfidence; note?: string }) {
  const { label, cls } = CONFIDENCE_STYLE[level];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
      title={note}
    >
      {label}
    </span>
  );
}
