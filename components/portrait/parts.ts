import type { Look } from "@/content/types";

/*
 * Cartoon portrait geometry on a 120×120 canvas: head and shoulders, drawn back
 * to front. Each part names a colour role, not a colour, so every theme can
 * paint (or sketch) the same character in its own style.
 */

export type Role =
  | "skin"
  | "neck"
  | "skinShade"
  | "hair"
  | "cloth"
  | "clothShade"
  | "outfit"
  | "outfitLight"
  | "coat"
  | "ink"
  | "mouth"
  | "blush"
  | "shine"
  | "metal";

/** `line` = stroke only, with this width. Otherwise the shape is filled. */
type Base = { role: Role; line?: number };
export type Part =
  | (Base & { shape: "path"; d: string })
  | (Base & { shape: "circle"; cx: number; cy: number; r: number })
  | (Base & { shape: "ellipse"; cx: number; cy: number; rx: number; ry: number });

export const PORTRAIT_SIZE = 120;

const SKIN: Record<Look["skin"], string> = {
  light: "#f1c9a5",
  medium: "#e0ac83",
  tan: "#c98e64",
  deep: "#a3694a",
};

const HAIR: Record<NonNullable<Look["hairColor"]>, string> = {
  black: "#231f20",
  brown: "#4a3222",
  salt: "#6e6a66",
};

/* ---------- Colour helpers ---------- */

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Blends `a` toward `b` by `t` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/** Relative brightness, 0–1. */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** The closest colour in `palette` (for pixel art). */
export function nearest(hex: string, palette: readonly string[]) {
  const [r, g, b] = rgb(hex);
  let best = palette[0];
  let bestDistance = Infinity;
  for (const candidate of palette) {
    const [cr, cg, cb] = rgb(candidate);
    const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/** Natural colours for a look, keyed by role. */
export function lookColors(look: Look): Record<Role, string> {
  const skin = SKIN[look.skin];
  const hair = HAIR[look.hairColor ?? "black"];
  const cloth = look.hijab ?? "#5a6fb0";
  return {
    skin,
    neck: mix(skin, "#000000", 0.12),
    skinShade: mix(skin, "#5a2e1a", 0.45),
    hair,
    cloth,
    clothShade: mix(cloth, "#000000", 0.3),
    outfit: look.outfit,
    outfitLight: mix(look.outfit, "#ffffff", 0.75),
    coat: "#f7f6f1",
    ink: "#1c2530",
    mouth: "#8c3a2f",
    blush: "#e57364",
    shine: "#ffffff",
    metal: "#3a3f47",
  };
}

/* ---------- Geometry ---------- */

const BODY = "M14 120 C16 102 33 94 52 91 L68 91 C87 94 104 102 106 120 Z";
const NECK = "M52 72 L68 72 L68 93 Q60 97 52 93 Z";

const HAIR_FRONT: Partial<Record<Look["hair"], string[]>> = {
  short: ["M39 55 C37 37 47 29 60 29 C73 29 83 37 81 55 C78 46 71 41 60 41 C49 41 42 46 39 55 Z"],
  side: ["M39 56 C36 37 47 28 61 28 C75 28 84 37 81 56 C79 47 75 42 68 39 C60 44 49 45 41 49 C40 51 39.5 53 39 56 Z"],
  receding: [
    "M39 60 C37.5 49 40 42 46 39 C45 45 44.5 50 45 53 C42.5 55 40.5 57 39 60 Z",
    "M81 60 C82.5 49 80 42 74 39 C75 45 75.5 50 75 53 C77.5 55 79.5 57 81 60 Z",
    "M51 35 C55 31 65 31 69 35 C64 34 56 34 51 35 Z",
  ],
  long: ["M39 56 C38 37 48 30 60 30 C72 30 82 37 81 56 C77 45 70 40 63 39 C56 43 47 47 39 56 Z"],
  bun: ["M39 56 C38 38 48 30 60 30 C72 30 82 38 81 56 C79 46 72 40 60 40 C48 40 41 46 39 56 Z"],
};

const LONG_BACK = "M36 58 C33 34 46 25 60 25 C74 25 87 34 84 58 L87 94 C81 99 74 97 71 92 L49 92 C46 97 39 99 33 94 Z";
const HIJAB = "M60 27 C39 27 31 44 33 62 C34 76 38 86 28 100 C40 106 50 108 60 108 C70 108 80 106 92 100 C82 86 86 76 87 62 C89 44 81 27 60 27 Z";
const HIJAB_BAND = "M42 50 C44 38 52 34 60 34 C68 34 76 38 78 50 C72 43 66 41 60 41 C54 41 48 43 42 50 Z";
const BEARD = "M39 58 C39 76 48 84 60 84 C72 84 81 76 81 58 C79 68 73 73 68 71 Q60 68 52 71 C47 73 41 68 39 58 Z";
const MUSTACHE = "M52 67.5 Q56 64.5 60 66.5 Q64 64.5 68 67.5 Q64 69.5 60 68.5 Q56 69.5 52 67.5 Z";

const path = (role: Role, d: string, line?: number): Part => ({ shape: "path", role, d, line });

/** Every shape of the portrait, back to front. */
export function portraitParts(look: Look): Part[] {
  const parts: Part[] = [];
  const hijab = look.hair === "hijab";

  // Hair behind the head.
  if (look.hair === "long") parts.push(path("hair", LONG_BACK));
  if (look.hair === "bun") parts.push({ shape: "circle", role: "hair", cx: 60, cy: 27, r: 9 });

  // Shoulders and clothes.
  parts.push(path(look.wear === "coat" ? "coat" : "outfit", BODY));
  if (look.wear === "coat") {
    parts.push(path("outfit", "M51 91 L60 112 L69 91 Z"));
    parts.push(path("ink", "M84 108 L94 107", 1.4));
  }

  if (!hijab) {
    parts.push(path("neck", NECK));
    if (look.wear === "shirt") {
      parts.push(path("skin", "M53 92 L60 101 L67 92 Z"));
      parts.push(path("outfitLight", "M51 90 L60 101 L54 105 L47 94 Z"));
      parts.push(path("outfitLight", "M69 90 L60 101 L66 105 L73 94 Z"));
    } else if (look.wear === "kameez") {
      parts.push(path("skin", "M52 92 Q60 102 68 92 Z"));
      parts.push(path("outfitLight", "M51 92 Q60 104 69 92", 2));
    } else if (look.wear === "tshirt") {
      parts.push(path("skin", "M53 92 Q60 98 67 92 Z"));
      parts.push(path("outfitLight", "M52 92 Q60 99 68 92", 2));
    } else {
      parts.push(path("skin", "M53 92 L60 100 L67 92 Z"));
    }
  }

  if (hijab) {
    parts.push(path("cloth", HIJAB));
    parts.push(path("clothShade", "M41 80 C48 92 72 92 79 80", 1.6));
  }

  if (look.wear === "coat") {
    parts.push(path("metal", hijab ? "M47 96 C44 105 48 113 56 115" : "M51 93 C46 104 49 113 57 115", 2));
    parts.push(path("metal", hijab ? "M73 96 C76 105 72 113 64 115" : "M69 93 C74 104 71 113 63 115", 2));
    parts.push({ shape: "circle", role: "metal", cx: 60, cy: 116, r: 3.2 });
  }

  // Head.
  if (hijab) {
    parts.push({ shape: "ellipse", role: "skin", cx: 60, cy: 58, rx: 18, ry: 22 });
    parts.push(path("cloth", HIJAB_BAND));
  } else {
    parts.push({ shape: "ellipse", role: "skin", cx: 39.5, cy: 58, rx: 4, ry: 6 });
    parts.push({ shape: "ellipse", role: "skin", cx: 80.5, cy: 58, rx: 4, ry: 6 });
    parts.push({ shape: "ellipse", role: "skin", cx: 60, cy: 56, rx: 21, ry: 24 });
    for (const d of HAIR_FRONT[look.hair] ?? []) parts.push(path("hair", d));
  }

  if (look.facial === "beard") parts.push(path("hair", BEARD));

  // Face.
  parts.push({ shape: "circle", role: "blush", cx: 47, cy: 66, r: 3.2 });
  parts.push({ shape: "circle", role: "blush", cx: 73, cy: 66, r: 3.2 });
  parts.push(path("hair", "M48 51 Q52 48.5 56 51", 1.8));
  parts.push(path("hair", "M64 51 Q68 48.5 72 51", 1.8));
  parts.push({ shape: "circle", role: "ink", cx: 52, cy: 58, r: 2.4 });
  parts.push({ shape: "circle", role: "ink", cx: 68, cy: 58, r: 2.4 });
  parts.push({ shape: "circle", role: "shine", cx: 52.9, cy: 57.1, r: 0.8 });
  parts.push({ shape: "circle", role: "shine", cx: 68.9, cy: 57.1, r: 0.8 });
  parts.push(path("skinShade", "M60 60 Q58 65 60.5 66.5", 1.5));
  if (look.facial) parts.push(path("hair", MUSTACHE));
  parts.push(path("mouth", "M53 70 Q60 77 67 70 Q60 72.5 53 70 Z"));

  if (look.glasses) {
    parts.push({ shape: "circle", role: "ink", cx: 52, cy: 58, r: 6.2, line: 1.6 });
    parts.push({ shape: "circle", role: "ink", cx: 68, cy: 58, r: 6.2, line: 1.6 });
    parts.push(path("ink", "M58.2 57.5 Q60 56 61.8 57.5 M45.8 57 L40.5 55.5 M74.2 57 L79.5 55.5", 1.6));
  }

  return parts;
}
