/** Format a RM amount with no decimals (e.g. 1234.5 => "RM1,235"). */
export function rm(amount: number): string {
  return `RM${Math.round(amount).toLocaleString("en-MY")}`;
}

/** Format a RM amount with two decimals (e.g. 12.5 => "RM12.50"). */
export function rm2(amount: number): string {
  return `RM${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Human-readable "how fresh is this data" string. */
export function freshness(isoDate: string, today = new Date()): string {
  const then = new Date(isoDate).getTime();
  const days = Math.floor((today.getTime() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Verified today";
  if (days < 30) return `Verified ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `Verified ${months} month${months === 1 ? "" : "s"} ago`;
}
