import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KadCompare — Best Malaysian Credit Card for Your Spending",
  description:
    "Tell us how you spend and what you value. We recommend the Malaysian credit card (or combo) that earns you the most.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
