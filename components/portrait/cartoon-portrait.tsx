import type { Look } from "@/content/types";
import { lookColors, luminance, mix, portraitParts, PORTRAIT_SIZE, type Part, type Role } from "./parts";

/*
 * Cartoon head-and-shoulders portrait as inline SVG. Works in server and client
 * components (no hooks, no ids), so it can appear any number of times per page.
 *
 *   flat     — full colour with an ink outline (Classic)
 *   poster   — sepia film still under a spotlight (Cinematic)
 *   duotone  — black, paper and one accent, like a print (Editorial)
 *   hologram — cyan wireframe (Command Deck)
 */
export type PortraitStyle = "flat" | "poster" | "duotone" | "hologram";

/** `line` is the colour for stroke-only parts (brows, nose, collar trim…). */
type Paint = { fill: string; stroke: string; strokeWidth: number; line: string };

/** Small features that look heavy with an outline. */
const UNOUTLINED: readonly Role[] = ["ink", "shine", "blush", "mouth"];

function painter(style: PortraitStyle, look: Look) {
  const natural = lookColors(look);

  if (style === "hologram") {
    const cyan = "#00e5ff";
    // Opaque tints of the HUD background, so shapes behind (neck, hair) don't show through the face.
    const base = "#05080f";
    return (role: Role): Paint | null => {
      if (role === "blush" || role === "shine") return null;
      const fill = role === "ink" ? cyan : mix(base, cyan, role === "hair" || role === "cloth" ? 0.24 : 0.08);
      return { fill, stroke: cyan, strokeWidth: 1.1, line: cyan };
    };
  }

  if (style === "poster") {
    const dark = "#120e0a";
    const light = "#efe4cc";
    return (role: Role): Paint | null => {
      if (role === "blush") return null;
      // Map each colour's brightness onto a warm sepia ramp, with extra contrast
      // so faces catch the light and clothes fall into shadow.
      const t = Math.min(1, Math.max(0, (luminance(natural[role]) - 0.25) * 1.6 + 0.25));
      const fill = mix(dark, light, t);
      return { fill, stroke: "#0b0806", strokeWidth: 1.4, line: fill };
    };
  }

  if (style === "duotone") {
    const ink = "#111111";
    const paper = "#fafaf7";
    const accent = "#ff4f00";
    const map: Record<Role, string> = {
      skin: paper,
      neck: paper,
      skinShade: ink,
      hair: ink,
      cloth: ink,
      clothShade: paper,
      outfit: accent,
      outfitLight: paper,
      coat: paper,
      ink,
      mouth: ink,
      blush: paper,
      shine: paper,
      metal: ink,
    };
    return (role: Role): Paint | null => (role === "blush" ? null : { fill: map[role], stroke: ink, strokeWidth: 1.8, line: map[role] });
  }

  return (role: Role): Paint | null => ({
    fill: role === "blush" ? "rgb(229 115 100 / 0.35)" : natural[role],
    stroke: natural.ink,
    strokeWidth: 1.4,
    line: natural[role],
  });
}

/** Background behind the figure, per style. */
function backdrop(style: PortraitStyle, look: Look) {
  if (style === "flat") {
    return <rect width={PORTRAIT_SIZE} height={PORTRAIT_SIZE} fill={mix(look.outfit, "#ffffff", 0.8)} />;
  }
  if (style === "duotone") return <rect width={PORTRAIT_SIZE} height={PORTRAIT_SIZE} fill="#e9e5dc" />;
  if (style === "poster") return <circle cx={60} cy={54} r={50} fill="#d9c9a3" opacity={0.12} />;
  return <circle cx={60} cy={58} r={52} fill="none" stroke="#00e5ff" strokeOpacity={0.35} strokeDasharray="3 5" />;
}

function shapeProps(part: Part, paint: Paint) {
  if (part.line) {
    return { fill: "none", stroke: paint.line, strokeWidth: part.line, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  }
  const outlined = !UNOUTLINED.includes(part.role);
  return {
    fill: paint.fill,
    stroke: outlined ? paint.stroke : "none",
    strokeWidth: outlined ? paint.strokeWidth : 0,
    strokeLinejoin: "round" as const,
  };
}

export function CartoonPortrait({
  look,
  style = "flat",
  className,
  label,
}: {
  look: Look;
  style?: PortraitStyle;
  className?: string;
  /** Accessible name. Omit when the person's name is already next to the portrait. */
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${PORTRAIT_SIZE} ${PORTRAIT_SIZE}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {backdrop(style, look)}
      <PortraitShapes look={look} style={style} />
    </svg>
  );
}

/** The figure alone (no backdrop), on the 120×120 grid — for placing a person inside a larger scene. */
export function PortraitShapes({ look, style = "flat" }: { look: Look; style?: PortraitStyle }) {
  const paintFor = painter(style, look);
  return portraitParts(look).map((part, i) => {
    const paint = paintFor(part.role);
    if (!paint) return null;
    const props = shapeProps(part, paint);
    if (part.shape === "path") return <path key={i} d={part.d} {...props} />;
    if (part.shape === "circle") return <circle key={i} cx={part.cx} cy={part.cy} r={part.r} {...props} />;
    return <ellipse key={i} cx={part.cx} cy={part.cy} rx={part.rx} ry={part.ry} {...props} />;
  });
}
