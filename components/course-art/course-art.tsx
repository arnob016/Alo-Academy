import type { CourseArt as Art } from "@/content/courses";
import { mix } from "@/components/portrait/parts";
import { ART_SIZE, artColors, artParts, type ArtPart, type ArtRole } from "./motifs";

/*
 * Course illustration as inline SVG (server- and client-safe, no ids).
 *
 *   flat      — friendly full colour with an ink outline (Classic)
 *   poster    — black silhouette with a coloured rim light (Cinematic)
 *   hologram  — cyan wireframe with amber highlights (Command Deck)
 *   print     — two inks plus paper, matched to the plate it sits on (Editorial)
 *
 * The background is left to the container, so each theme frames it its own way.
 */
export type ArtStyle =
  | { kind: "flat" }
  | { kind: "poster"; glow: string }
  | { kind: "hologram" }
  | { kind: "print"; tone: "paper" | "ink" | "accent" };

type Paint = { fill: string; stroke: string; strokeWidth: number; line: string } | null;

const PRINT_INK = "#111111";
const PRINT_PAPER = "#fafaf7";
const PRINT_ACCENT = "#ff4f00";

function painter(art: Art, style: ArtStyle): (role: ArtRole) => Paint {
  const natural = artColors(art);

  switch (style.kind) {
    case "poster": {
      // Everything falls into shadow; edges and the accent catch the light.
      const { glow } = style;
      return (role) => {
        if (role === "ground") return { fill: mix("#000000", glow, 0.18), stroke: "none", strokeWidth: 0, line: glow };
        const fill = role === "accent" ? glow : role === "paper" || role === "glass" ? "#1d1813" : "#0d0b09";
        return { fill, stroke: glow, strokeWidth: 1.6, line: glow };
      };
    }
    case "hologram": {
      const cyan = "#00e5ff";
      const amber = "#ffb300";
      const base = "#05080f";
      return (role) => {
        if (role === "ground") return { fill: "none", stroke: cyan, strokeWidth: 0.8, line: cyan };
        const edge = role === "accent" ? amber : cyan;
        const fill = mix(base, edge, role === "primary" || role === "accent" ? 0.24 : 0.08);
        return { fill, stroke: edge, strokeWidth: 1.1, line: edge };
      };
    }
    case "print": {
      const onDark = style.tone === "ink";
      const onAccent = style.tone === "accent";
      const outline = onDark ? PRINT_PAPER : PRINT_INK;
      const solid = onDark ? PRINT_PAPER : PRINT_INK;
      const blank = onDark ? PRINT_INK : PRINT_PAPER;
      const hot = onAccent ? PRINT_INK : PRINT_ACCENT;
      const map: Record<ArtRole, string> = {
        ground: onDark ? "#2a2a2a" : onAccent ? "#d94300" : "#d8d6cd",
        primary: hot,
        secondary: solid,
        dark: solid,
        paper: blank,
        glass: blank,
        liquid: hot,
        metal: blank,
        accent: onAccent ? PRINT_PAPER : PRINT_ACCENT,
        ink: solid,
      };
      return (role) => ({
        fill: map[role],
        stroke: role === "ground" ? "none" : outline,
        strokeWidth: role === "ground" ? 0 : 1.8,
        line: role === "paper" ? blank : map[role],
      });
    }
    default:
      return (role) => ({
        fill: natural[role],
        stroke: role === "ground" ? "none" : natural.ink,
        strokeWidth: role === "ground" ? 0 : 1.5,
        line: natural[role],
      });
  }
}

function shapeProps(part: ArtPart, paint: NonNullable<Paint>) {
  if (part.line) {
    return { fill: "none", stroke: paint.line, strokeWidth: part.line, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  }
  return { fill: paint.fill, stroke: paint.stroke, strokeWidth: paint.strokeWidth, strokeLinejoin: "round" as const };
}

export function CourseArt({
  art,
  style = { kind: "flat" },
  className,
}: {
  art: Art;
  style?: ArtStyle;
  className?: string;
}) {
  const paintFor = painter(art, style);
  return (
    <svg viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`} className={className} aria-hidden="true" focusable="false">
      {artParts(art).map((part, i) => {
        const paint = paintFor(part.role);
        if (!paint) return null;
        const props = shapeProps(part, paint);
        if (part.shape === "path") return <path key={i} d={part.d} {...props} />;
        if (part.shape === "circle") return <circle key={i} cx={part.cx} cy={part.cy} r={part.r} {...props} />;
        return <ellipse key={i} cx={part.cx} cy={part.cy} rx={part.rx} ry={part.ry} {...props} />;
      })}
    </svg>
  );
}
