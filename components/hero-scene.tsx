import { site } from "@/config/site";
import type { Look } from "@/content/types";
import { PortraitShapes } from "./portrait/cartoon-portrait";

/** The student at the desk (same character style as the portraits). */
const student: Look = { skin: "light", hair: "long", hairColor: "brown", wear: "tshirt", outfit: "#3aa17e" };

/** Four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

/**
 * Classic hero illustration: a student studying under a desk lamp — "alo" means
 * light. Flat colours from config/site.ts, so a rebrand recolours it.
 */
export function HeroScene({ className }: { className?: string }) {
  const { brand, brandDark, accent, ink } = site.colors;
  const outline = { stroke: ink, strokeWidth: 2.5, strokeLinejoin: "round" as const };

  return (
    // Cropped at the desk top: on the home page the "why parents choose us" card sits just below.
    <svg viewBox="0 0 480 275" className={className} aria-hidden="true" focusable="false">
      {/* Backdrop and lamp glow */}
      <path
        d="M60 70 C110 10 260 0 350 30 C440 60 480 150 450 230 C420 310 300 350 190 335 C80 320 10 260 20 180 C28 120 30 100 60 70 Z"
        fill={brand}
        fillOpacity={0.08}
      />
      <circle cx={300} cy={200} r={130} fill={accent} fillOpacity={0.14} />
      <circle cx={300} cy={210} r={78} fill={accent} fillOpacity={0.16} />

      {/* Doodles: an atom and sparkles */}
      <g fill="none" stroke={brand} strokeWidth={2.5} strokeOpacity={0.55}>
        <ellipse cx={92} cy={86} rx={30} ry={10} transform="rotate(30 92 86)" />
        <ellipse cx={92} cy={86} rx={30} ry={10} transform="rotate(-30 92 86)" />
        <ellipse cx={92} cy={86} rx={30} ry={10} transform="rotate(90 92 86)" />
      </g>
      <circle cx={92} cy={86} r={5} fill={accent} />
      <path d={sparkle(300, 70, 12)} fill={accent} />
      <path d={sparkle(430, 92, 8)} fill={accent} />
      <path d={sparkle(58, 170, 9)} fill={brand} fillOpacity={0.5} />

      {/* Student */}
      <g transform="translate(150 70) scale(1.75)">
        <PortraitShapes look={student} />
      </g>

      {/* Lamp */}
      <path d="M410 258 L392 196 L364 152" fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={392} cy={196} r={6} fill={ink} />
      <path d="M318 150 L352 186 L190 262 L322 262 Z" fill={accent} fillOpacity={0.28} />
      <path d="M360 128 L380 148 L352 186 L318 150 Z" fill={accent} {...outline} />
      <circle cx={334} cy={170} r={7} fill="#fff7d6" />
      <ellipse cx={410} cy={260} rx={28} ry={7} fill={ink} />

      {/* Desk */}
      <rect x={24} y={258} width={432} height={16} rx={4} fill={brandDark} />

      {/* Open book under the lamp */}
      <path d="M178 246 Q215 236 250 248 L250 266 Q215 256 178 264 Z" fill="#ffffff" {...outline} />
      <path d="M250 248 Q285 236 322 246 L322 264 Q285 256 250 266 Z" fill="#ffffff" {...outline} />
      <path d="M190 250 Q214 244 238 251 M266 251 Q288 244 310 250" fill="none" stroke={ink} strokeOpacity={0.4} strokeWidth={1.5} />

      {/* Stack of books with an apple */}
      <rect x={50} y={238} width={92} height={20} rx={2} fill={accent} {...outline} />
      <rect x={58} y={220} width={80} height={18} rx={2} fill="#e4572e" {...outline} />
      <rect x={54} y={204} width={84} height={16} rx={2} fill="#3aa17e" {...outline} />
      <path d="M128 242 V254 M126 224 V234 M128 207 V217" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
      <circle cx={96} cy={190} r={13} fill="#e4572e" {...outline} />
      <path d="M96 177 Q98 168 104 165" fill="none" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M99 172 Q108 166 112 172 Q104 177 99 172 Z" fill="#3aa17e" />
    </svg>
  );
}
