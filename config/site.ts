import type { CSSProperties } from "react";

/**
 * Single source of truth for everything client-specific.
 * Rebranding the site for a new coaching center = editing this file
 * plus the content in /content and the copy in /messages.
 */
export const site = {
  name: { bn: "আলো একাডেমি", en: "Alo Academy" },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  contact: {
    phone: "01XXX-XXXXXX",
    email: "info@aloacademy.example",
    address: {
      bn: "বাড়ি ১২, রোড ৫, সেকশন ২, মিরপুর, ঢাকা ১২১৬",
      en: "House 12, Road 5, Section 2, Mirpur, Dhaka 1216",
    },
    /** Structured address for search engines (JSON-LD). */
    postal: {
      streetAddress: "House 12, Road 5, Section 2",
      addressLocality: "Mirpur, Dhaka",
      postalCode: "1216",
      addressCountry: "BD",
    },
    /** What the contact-page map searches for. */
    mapQuery: "Mirpur 2, Dhaka 1216",
  },

  /** Numbers shown in the home page highlights. */
  stats: { years: 12, students: 1500, gpa5: 320, batchMax: 25 },

  payments: {
    bkashNumber: process.env.NEXT_PUBLIC_BKASH_NUMBER ?? "01XXXXXXXXX",
    // "personal" → Send Money, "merchant" → Payment
    bkashAccountType: "personal" as "personal" | "merchant",
    methods: { bkash: true, nagad: false, rocket: false },
  },

  colors: {
    brand: "#0f4c5c",
    brandDark: "#0a3642",
    accent: "#f2a93b",
    surface: "#fffbf3",
    ink: "#1c2530",
    muted: "#5b6673",
  },

  demo: {
    enabled: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
    hireUrl: process.env.NEXT_PUBLIC_HIRE_URL ?? "",
    publicSheetUrl: process.env.NEXT_PUBLIC_PUBLIC_SHEET_URL ?? "",
  },
};

export const navItems = [
  { href: "/", key: "home" },
  { href: "/courses", key: "courses" },
  { href: "/teachers", key: "teachers" },
  { href: "/admission", key: "admission" },
  { href: "/contact", key: "contact" },
] as const;

/** Brand colors exposed as CSS variables; Tailwind maps them in globals.css. */
export const themeStyle = {
  "--brand": site.colors.brand,
  "--brand-dark": site.colors.brandDark,
  "--accent": site.colors.accent,
  "--surface": site.colors.surface,
  "--ink": site.colors.ink,
  "--muted": site.colors.muted,
} as CSSProperties;
