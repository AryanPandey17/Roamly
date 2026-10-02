import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { THEME_SCRIPT } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Roamly", template: "%s · Roamly" },
  description:
    "A multi-agent trip planner. Logistics, Recommendations and Budget agents negotiate until the plan fits your budget.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The inline script sets data-theme before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={`${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
