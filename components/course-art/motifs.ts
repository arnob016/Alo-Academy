import type { CourseArt } from "@/content/courses";
import { site } from "@/config/site";

/*
 * Course illustrations on a 120×120 canvas, drawn back to front. Like the
 * portraits, parts name a colour role, so each theme can render the same
 * subject in its own style (flat, poster silhouette, hologram, print, sketch).
 * Pixel Quest uses its own hand-drawn sprites instead (themes/pixel/sprites.tsx).
 */

export type ArtRole =
  | "ground"
  | "primary"
  | "secondary"
  | "dark"
  | "paper"
  | "glass"
  | "liquid"
  | "metal"
  | "accent"
  | "ink";

/** `line` = stroke only, with this width. Otherwise the shape is filled. */
type Base = { role: ArtRole; line?: number };
export type ArtPart =
  | (Base & { shape: "path"; d: string })
  | (Base & { shape: "circle"; cx: number; cy: number; r: number })
  | (Base & { shape: "ellipse"; cx: number; cy: number; rx: number; ry: number });

export const ART_SIZE = 120;

/** Natural colours (Classic, Sketchbook). Brand colours follow config/site.ts. */
const BASE_COLORS: Record<ArtRole, string> = {
  ground: "#d9dee0",
  primary: site.colors.brand,
  secondary: "#5b6673",
  dark: site.colors.ink,
  paper: "#fffdf6",
  glass: "#dff1f5",
  liquid: "#3fb58a",
  metal: "#c6ccd3",
  accent: site.colors.accent,
  ink: site.colors.ink,
};

const MOTIF_COLORS: Partial<Record<CourseArt, Partial<Record<ArtRole, string>>>> = {
  ledger: { secondary: "#4f5b69", glass: "#cfe8d6" },
  microscope: { secondary: "#8a96a3", glass: "#cde9f0" },
  growth: { secondary: "#e4572e" },
  graduation: { secondary: "#d9653b" },
  medical: { secondary: "#b9844f", accent: "#e4572e" },
};

export function artColors(art: CourseArt): Record<ArtRole, string> {
  return { ...BASE_COLORS, ...MOTIF_COLORS[art] };
}

const path = (role: ArtRole, d: string, line?: number): ArtPart => ({ shape: "path", role, d, line });
const circle = (role: ArtRole, cx: number, cy: number, r: number, line?: number): ArtPart => ({ shape: "circle", role, cx, cy, r, line });
const ellipse = (role: ArtRole, cx: number, cy: number, rx: number, ry: number): ArtPart => ({ shape: "ellipse", role, cx, cy, rx, ry });

/** A rotated ellipse as a closed path (Rough.js can't rotate ellipses). */
function orbit(cx: number, cy: number, rx: number, ry: number, degrees: number) {
  const a = (degrees * Math.PI) / 180;
  const points = Array.from({ length: 36 }, (_, i) => {
    const t = (i / 36) * Math.PI * 2;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    return `${(cx + x * Math.cos(a) - y * Math.sin(a)).toFixed(1)} ${(cy + x * Math.sin(a) + y * Math.cos(a)).toFixed(1)}`;
  });
  return `M${points.join(" L")} Z`;
}

const MOTIFS: Record<CourseArt, () => ArtPart[]> = {
  // SSC Science: an Erlenmeyer flask in front of an atom.
  flask: () => [
    ellipse("ground", 60, 106, 36, 5),
    path("secondary", orbit(80, 38, 27, 9, 30), 2.4),
    path("secondary", orbit(80, 38, 27, 9, -30), 2.4),
    path("secondary", orbit(80, 38, 27, 9, 90), 2.4),
    circle("accent", 80, 38, 5),
    path("glass", "M41 25 L63 25 L63 31 L41 31 Z"),
    path("glass", "M44 31 L60 31 L60 52 L78 92 Q81 100 72 100 L32 100 Q23 100 26 92 L44 52 Z"),
    path("liquid", "M34.1 74 L69.9 74 L78 92 Q81 100 72 100 L32 100 Q23 100 26 92 Z"),
    circle("paper", 46, 86, 2.4),
    circle("paper", 56, 91, 1.7),
    circle("paper", 61, 81, 1.4),
    path("paper", "M37 79 L32 89", 2.2),
    path("ink", "M47 58 L53 58 M45 64 L51 64", 1.4),
  ],

  // SSC Business: an open ledger, a calculator and a stack of coins.
  ledger: () => [
    ellipse("ground", 60, 107, 48, 4.5),
    path("primary", "M10 48 Q36 42 60 50 Q84 42 110 48 L110 100 Q84 94 60 102 Q36 94 10 100 Z"),
    path("paper", "M14 44 Q36 38 60 46 L60 98 Q36 90 14 96 Z"),
    path("paper", "M60 46 Q84 38 106 44 L106 96 Q84 90 60 98 Z"),
    path("ink", "M20 54 Q36 50 54 55 M20 62 Q36 58 54 63", 1.2),
    path("ink", "M66 55 Q84 50 100 53 M66 63 Q84 58 100 61 M66 71 Q84 66 100 69 M88 51 L88 90", 1.2),
    path("secondary", "M21 70 H43 Q46 70 46 73 V101 Q46 104 43 104 H21 Q18 104 18 101 V73 Q18 70 21 70 Z"),
    path("glass", "M22 74 H42 V82 H22 Z"),
    circle("paper", 25, 89, 2.2),
    circle("paper", 32, 89, 2.2),
    circle("paper", 39, 89, 2.2),
    circle("paper", 25, 97, 2.2),
    circle("paper", 32, 97, 2.2),
    circle("accent", 39, 97, 2.2),
    ellipse("accent", 92, 100, 12, 4),
    ellipse("accent", 92, 95, 12, 4),
    ellipse("accent", 92, 90, 12, 4),
    path("ink", "M88 89 L96 89", 1.4),
  ],

  // HSC Science: a microscope.
  microscope: () => [
    ellipse("ground", 60, 106, 38, 4.5),
    path("primary", "M30 96 H90 Q94 96 94 100 V104 H26 V100 Q26 96 30 96 Z"),
    path("primary", "M80 96 L80 62 Q80 40 62 32 L58 40 Q70 46 70 62 L70 96 Z"),
    path("metal", "M38 76 H82 V81 H38 Z"),
    path("glass", "M46 73 H70 V76 H46 Z"),
    path("secondary", "M44 22 L57 17 L68 58 L55 62 Z"),
    path("dark", "M41 12 L54 7 L57 18 L44 23 Z"),
    path("metal", "M55 62 L66 58 L69 67 L59 70 Z"),
    circle("metal", 76, 66, 5.5),
    circle("accent", 60, 89, 3.5),
  ],

  // HSC Business: a growth chart on an easel.
  growth: () => [
    ellipse("ground", 60, 108, 40, 4),
    path("ink", "M36 88 L28 106 M84 88 L92 106 M60 88 L60 102", 3),
    path("paper", "M16 20 H104 V88 H16 Z"),
    path("ink", "M24 80 H98", 1.6),
    path("primary", "M28 66 H40 V80 H28 Z"),
    path("primary", "M46 56 H58 V80 H46 Z"),
    path("primary", "M64 44 H76 V80 H64 Z"),
    path("accent", "M82 30 H94 V80 H82 Z"),
    path("secondary", "M26 60 L44 48 L60 52 L90 24", 3),
    path("secondary", "M95 19 L82 21 L92 32 Z"),
  ],

  // University admission: a graduation cap on a stack of books, with a diploma.
  graduation: () => [
    ellipse("ground", 60, 106, 44, 4.5),
    path("primary", "M22 84 H98 V98 H22 Z"),
    path("paper", "M92 86 H97 V96 H92 Z"),
    path("secondary", "M30 70 H90 V84 H30 Z"),
    path("paper", "M84 72 H89 V82 H84 Z"),
    path("dark", "M40 47 L40 60 Q60 70 80 60 L80 47 L60 54 Z"),
    path("dark", "M60 26 L100 40 L60 54 L20 40 Z"),
    path("accent", "M60 40 L92 44 L92 60", 2.2),
    circle("accent", 92, 62, 3.2),
    path("paper", "M60 101 L100 89 L103 96 L63 108 Z"),
    circle("accent", 81, 98, 3.4),
  ],

  // Medical admission: a clipboard with a red cross and ECG, and a stethoscope.
  medical: () => [
    ellipse("ground", 60, 108, 44, 4),
    path("secondary", "M22 22 H76 V104 H22 Z"),
    path("paper", "M28 30 H70 V98 H28 Z"),
    path("metal", "M39 17 H59 V28 H39 Z"),
    path("accent", "M44 40 H54 V48 H62 V58 H54 V66 H44 V58 H36 V48 H44 Z"),
    path("ink", "M32 82 H40 L44 74 L49 90 L53 80 H66", 1.8),
    path("dark", "M86 26 C82 42 84 52 92 58 M104 26 C108 42 106 52 98 58 M92 58 Q95 62 98 58", 3),
    path("dark", "M95 60 C96 76 84 84 90 95", 3),
    circle("dark", 86, 24, 2.6),
    circle("dark", 104, 24, 2.6),
    circle("metal", 91, 100, 7),
    circle("ink", 91, 100, 3, 1.4),
  ],
};

export function artParts(art: CourseArt): ArtPart[] {
  return MOTIFS[art]();
}
