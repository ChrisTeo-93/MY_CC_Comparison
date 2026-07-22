import type { Card, CardNetwork, MobileWallet } from "./types";

/** Display metadata for each mobile wallet, in canonical display order. */
export const WALLET_META: Record<MobileWallet, { label: string; short: string }> = {
  applePay: { label: "Apple Pay", short: "Apple" },
  googlePay: { label: "Google Pay", short: "Google" },
  samsungPay: { label: "Samsung Pay", short: "Samsung" },
  huaweiPay: { label: "Huawei Pay", short: "Huawei" },
};

export const WALLET_ORDER: MobileWallet[] = ["applePay", "googlePay", "samsungPay", "huaweiPay"];

/**
 * Best-effort default mobile-wallet support by card network in Malaysia.
 *
 * This is a deliberately transparent heuristic, not per-card verified data:
 * in Malaysia, wallet acceptance tracks the network far more than the specific
 * card. Apple Pay, Google Pay and Samsung Wallet broadly support Visa and
 * Mastercard from the major local banks; Amex support is thinner (Google Pay
 * for Amex in particular is inconsistent locally); and Huawei Pay has minimal
 * Malaysian presence outside UnionPay. A specific card whose real support is
 * known to differ can override this via `Card.wallets`.
 */
export function defaultWalletsForNetwork(network: CardNetwork): MobileWallet[] {
  switch (network) {
    case "Visa":
    case "Mastercard":
      return ["applePay", "googlePay", "samsungPay"];
    case "Amex":
      return ["applePay", "samsungPay"];
    case "UnionPay":
      return ["applePay", "samsungPay", "huaweiPay"];
  }
}

/** The mobile wallets a card supports — explicit override, else the network default. */
export function walletsForCard(card: Card): MobileWallet[] {
  const wallets = card.wallets ?? defaultWalletsForNetwork(card.network);
  // Keep canonical order regardless of how the list was authored.
  return WALLET_ORDER.filter((w) => wallets.includes(w));
}
