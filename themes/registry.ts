import type { Localized } from "@/content/types";

/*
 * Theme catalogue. "classic" is the server-rendered default; every other theme
 * is a client-side skin loaded on demand, so the default stays fast.
 */

export const themeIds = ["classic", "pixel", "cinema", "hud", "sketch", "editorial"] as const;
export type ThemeId = (typeof themeIds)[number];

export type ThemeMeta = {
  id: ThemeId;
  name: Localized;
  tagline: Localized;
  /** false = listed in the switcher as "coming next", not selectable. */
  ready: boolean;
};

export const themes: ThemeMeta[] = [
  { id: "classic", name: { bn: "ক্লাসিক", en: "Classic" }, tagline: { bn: "পরিচ্ছন্ন ও দ্রুত", en: "Clean & fast" }, ready: true },
  { id: "pixel", name: { bn: "পিক্সেল কোয়েস্ট", en: "Pixel Quest" }, tagline: { bn: "রেট্রো ১৬-বিট গেম", en: "Retro 16-bit RPG" }, ready: true },
  { id: "cinema", name: { bn: "সিনেমাটিক", en: "Cinematic" }, tagline: { bn: "ফিল্ম প্রিমিয়ার", en: "Film premiere" }, ready: true },
  { id: "hud", name: { bn: "কমান্ড ডেক", en: "Command Deck" }, tagline: { bn: "সাই-ফাই HUD", en: "Sci-fi HUD" }, ready: true },
  { id: "sketch", name: { bn: "স্কেচবুক", en: "Sketchbook" }, tagline: { bn: "কাগজ ও কালি", en: "Paper & ink" }, ready: true },
  { id: "editorial", name: { bn: "এডিটোরিয়াল", en: "Editorial" }, tagline: { bn: "সুইস ম্যাগাজিন", en: "Swiss magazine" }, ready: true },
];

export const switcherCopy = {
  open: { bn: "থিম", en: "Themes" },
  title: { bn: "একই সাইট, ছয়টি রূপ", en: "One site, six looks" },
  subtitle: {
    bn: "একই কনটেন্ট ও ভর্তি ফর্ম — শুধু ডিজাইন বদলায়।",
    en: "Same content and admission form — only the design changes.",
  },
  close: { bn: "বন্ধ করুন", en: "Close" },
  active: { bn: "চালু", en: "Active" },
  soon: { bn: "শীঘ্রই", en: "Coming next" },
} satisfies Record<string, Localized>;

export const THEME_STORAGE_KEY = "alo-theme";

const selectable = themes.filter((t) => t.ready && t.id !== "classic").map((t) => t.id);

export function isSelectableTheme(value: unknown): value is ThemeId {
  return typeof value === "string" && (value === "classic" || (selectable as string[]).includes(value));
}

/**
 * Runs in <head> before first paint: applies the saved theme so the classic
 * page never flashes before a chosen theme takes over.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(selectable)}.indexOf(t)>-1)document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
