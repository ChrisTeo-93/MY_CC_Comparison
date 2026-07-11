/**
 * KadCompare brand tokens — mirrors the web app's tailwind.config.ts palette
 * exactly so the native app looks like the same product. Single (light) theme,
 * matching the web app which has no dark-mode variants today.
 */
export const colors = {
  brand: "#0d9488",
  brandDark: "#0f766e",
  brandLight: "#5eead4",

  bg: "#f8fafc", // slate-50
  white: "#ffffff",

  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate900: "#0f172a",

  emerald50: "#ecfdf5",
  emerald100: "#d1fae5",
  emerald600: "#059669",
  emerald700: "#047857",
  emerald800: "#065f46",

  amber50: "#fffbeb",
  amber100: "#fef3c7",
  amber600: "#d97706",
  amber700: "#b45309",
  amber800: "#92400e",

  red50: "#fef2f2",
  red100: "#fee2e2",
  red500: "#ef4444",
  red600: "#dc2626",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
