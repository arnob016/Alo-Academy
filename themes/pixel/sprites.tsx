/*
 * Original pixel art, drawn from character maps (one letter = one pixel).
 * Nothing here is taken from an existing game.
 */

import type { CourseArt } from "@/content/courses";
import type { Look } from "@/content/types";
import { lookColors } from "@/components/portrait/parts";

type Palette = Record<string, string>;

function Pixels({ rows, palette, className }: { rows: readonly string[]; palette: Palette; className?: string }) {
  const width = rows[0].length;
  return (
    <svg viewBox={`0 0 ${width} ${rows.length}`} shapeRendering="crispEdges" className={className} aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} /> : null,
        ),
      )}
    </svg>
  );
}

// The hero: a student with a green backpack carrying a lamp ("alo" = light).
const HERO_TOP = [
  "....kkkk....",
  "...khhhhk...",
  "..khhhhhhk..",
  "..kskssksk..",
  "..kssssssk..",
  "...kssssk...",
  "..kgrrrrk.yk",
  ".kggrrrrkkyk",
  ".kggrrrrswk.",
  ".kggrrrrk...",
  "..kkrrrrk...",
  "...kbbbbk...",
  "...kbkkbk...",
];
const HERO_STRIDE = [...HERO_TOP, "...kbk.kbk..", "..kkk..kkk..", "............"];
const HERO_STAND = [...HERO_TOP, "....kbbk....", "....kkkk....", "............"];

const HERO_PALETTE: Palette = {
  k: "#1a1c2c",
  h: "#333c57",
  s: "#ffcd75",
  r: "#b13e53",
  g: "#38b764",
  b: "#3b5dc9",
  y: "#ffcd75",
  w: "#f4f4f4",
};

export function Hero({ frame = 0, className }: { frame?: 0 | 1; className?: string }) {
  return <Pixels rows={frame ? HERO_STRIDE : HERO_STAND} palette={HERO_PALETTE} className={className} />;
}

/** Both walk frames in one SVG wrapper; CSS shows one via data-step. */
export function HeroFrames() {
  return (
    <>
      <span data-frame="0">
        <Hero frame={0} />
      </span>
      <span data-frame="1">
        <Hero frame={1} />
      </span>
    </>
  );
}

// Portraits: a 12×12 bust built from the person's look (the same character the
// other themes draw), painted in layers from back to front.
function bust(look: Look) {
  const grid = Array.from({ length: 12 }, () => Array<string>(12).fill("."));
  const row = (y: number, from: number, to: number, ch: string) => {
    for (let x = from; x <= to; x++) grid[y][x] = ch;
  };
  const dot = (y: number, x: number, ch: string) => (grid[y][x] = ch);
  const hijab = look.hair === "hijab";
  const hair = look.hair;

  // Hair behind the head.
  if (hair === "long") {
    row(1, 3, 8, "h");
    for (let y = 2; y <= 9; y++) row(y, 1, 10, "h");
  }
  if (hair === "bun") row(0, 5, 6, "h");

  // Shoulders and clothes.
  const body = look.wear === "coat" ? "w" : "c";
  row(9, 3, 8, body);
  row(10, 1, 10, body);
  row(11, 0, 11, body);
  if (look.wear === "coat") {
    row(9, 5, 6, "c");
    row(10, 5, 6, "c");
    // Stethoscope.
    dot(10, 4, "k");
    dot(10, 7, "k");
    dot(11, 4, "k");
    dot(11, 7, "k");
  } else if (look.wear === "shirt") {
    row(9, 5, 6, "w");
  } else {
    row(9, 5, 6, "s");
  }

  if (hijab) {
    row(0, 4, 7, "j");
    row(1, 3, 8, "j");
    for (let y = 2; y <= 9; y++) row(y, 2, 9, "j");
    row(10, 4, 7, "j");
    for (let y = 3; y <= 7; y++) row(y, 3, 8, "s");
    row(8, 4, 7, "s");
  } else {
    row(8, 5, 6, "s");
    row(2, 3, 8, "s");
    for (let y = 3; y <= 6; y++) row(y, 2, 9, "s");
    row(7, 3, 8, "s");
  }

  // Hair in front.
  if (hair === "short" || hair === "bun") {
    row(1, 3, 8, "h");
    row(2, 2, 9, "h");
    dot(3, 2, "h");
    dot(3, 9, "h");
    if (hair === "short") row(0, 4, 7, "h");
  } else if (hair === "side") {
    row(0, 4, 7, "h");
    row(1, 2, 9, "h");
    row(2, 2, 6, "h");
    dot(2, 9, "h");
    dot(3, 2, "h");
    dot(3, 9, "h");
  } else if (hair === "receding") {
    row(1, 4, 7, "s");
    dot(1, 3, "h");
    dot(1, 8, "h");
    for (let y = 2; y <= 3; y++) {
      dot(y, 2, "h");
      dot(y, 9, "h");
    }
  } else if (hair === "long") {
    row(0, 4, 7, "h");
    row(1, 2, 9, "h");
    row(2, 2, 5, "h");
    for (let y = 2; y <= 6; y++) {
      dot(y, 2, "h");
      dot(y, 9, "h");
    }
  }

  // Face: eyes, glasses, facial hair, mouth.
  const eyes = hijab ? 5 : 4;
  dot(eyes, 4, "k");
  dot(eyes, 7, "k");
  if (look.glasses) for (const x of [3, 5, 6, 8]) dot(eyes, x, "g");
  if (look.facial === "beard") {
    for (let y = eyes + 1; y <= eyes + 3; y++) {
      dot(y, 2, "h");
      dot(y, 9, "h");
    }
    row(eyes + 3, 3, 8, "h");
    for (const x of [3, 4, 7, 8]) dot(eyes + 2, x, "h");
  }
  if (look.facial) row(eyes + 1, 4, 7, "h");
  row(eyes + 2, 5, 6, "m");

  return grid.map((cells) => cells.join(""));
}

export function Portrait({ look, className }: { look: Look; className?: string }) {
  const colors = lookColors(look);
  const palette: Palette = {
    h: colors.hair,
    s: colors.skin,
    k: "#1a1c2c",
    m: "#b13e53",
    c: colors.outfit,
    w: "#f4f4f4",
    j: colors.cloth,
    g: "#566c86",
  };
  return <Pixels rows={bust(look)} palette={palette} className={className} />;
}

// Quest items: one hand-drawn 16×16 sprite per course subject.
const ITEMS: Record<CourseArt, readonly string[]> = {
  flask: [
    "................",
    ".....kkkkkk.....",
    "......kggk......",
    "......kggk......",
    "......kggk......",
    ".....kgwggk.....",
    "....kggggggk....",
    "...kllllllllk...",
    "..kllwllllllk...",
    ".kllllllwlllllk.",
    ".kllllllllllllk.",
    ".kllllllllllllk.",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
    "................",
  ],
  ledger: [
    "................",
    "................",
    ".kkkkkk..kkkkkk.",
    "kwwwwwwkkwwwwwwk",
    "kwbbbbwkkwbbbbwk",
    "kwwwwwwkkwwwwwwk",
    "kwbbbbwkkwbbbbwk",
    "kwwwwwwkkwwwwwwk",
    "kwbbbwwkkwbbbwwk",
    "kwwwwwwkkwwwwwwk",
    "kkkkkkkkkkkkkkkk",
    ".pppppppppppppp.",
    "..........kkkk..",
    ".........kyyyyk.",
    "..........kkkk..",
    "................",
  ],
  microscope: [
    "...kkkkk........",
    "...kdddk........",
    "....ktk.........",
    "....ktkkkkkk....",
    "....ktk...kak...",
    "....ktk...kak...",
    "....ktk...kak...",
    "....kmk...kak...",
    ".....k....kak...",
    "..kmmmmmmmkak...",
    "..kkkkkkkkkak...",
    "....yy....kak...",
    "...kkkkkkkkkkkk.",
    "...kaaaaaaaaaak.",
    "...kkkkkkkkkkkk.",
    "................",
  ],
  growth: [
    "................",
    "kkkkkkkkkkkkkkkk",
    "kwwwwwwwwwwllwwk",
    "kwwwwwwwwwllllwk",
    "kwwwwwwwwllllllk",
    "kwwwwwwwwwwllwwk",
    "kwwwwwwwwwwllwwk",
    "kwwwwwwwwwwllwwk",
    "kwwwwwwwwwwyywwk",
    "kwwwwwwwbbwyywwk",
    "kwwwwbbwbbwyywwk",
    "kwbbwbbwbbwyywwk",
    "kkkkkkkkkkkkkkkk",
    ".....k....k.....",
    "....k......k....",
    "................",
  ],
  graduation: [
    "................",
    ".......kk.......",
    ".....kkddkk.....",
    "...kkddddddkk...",
    ".kkddddddddddkk.",
    "...kkddddddkk.y.",
    "....kddddddk..y.",
    "....kddddddk.yyy",
    ".....kkkkkk.....",
    "................",
    "..kkkkkkkkkkkk..",
    "..ksssssssswk...",
    ".kkkkkkkkkkkkkk.",
    ".kpppppppppppwk.",
    ".kkkkkkkkkkkkkk.",
    "................",
  ],
  medical: [
    "................",
    "......kkkk......",
    "..kkkkmmmmkkkk..",
    "..kowwwwwwwwok..",
    "..kowwwrrwwwok..",
    "..kowwwrrwwwok..",
    "..kowrrrrrrwok..",
    "..kowrrrrrrwok..",
    "..kowwwrrwwwok..",
    "..kowwwrrwwwok..",
    "..kowwwwwwwwok..",
    "..kowggggggwok..",
    "..kowggggwwwok..",
    "..kooooooooook..",
    "..kkkkkkkkkkkk..",
    "................",
  ],
};

const ITEM_PALETTE: Palette = {
  k: "#1a1c2c",
  w: "#f4f4f4",
  g: "#73eff7",
  l: "#38b764",
  d: "#333c57",
  y: "#ffcd75",
  r: "#b13e53",
  b: "#3b5dc9",
  s: "#ef7d57",
  p: "#257179",
  m: "#94b0c2",
  t: "#566c86",
  a: "#257179",
  o: "#a0643c",
};

export function Item({ art, className }: { art: CourseArt; className?: string }) {
  return <Pixels rows={ITEMS[art]} palette={ITEM_PALETTE} className={className} />;
}

// Town icons for the overworld map.
const HOUSE = [
  "...rr...",
  "..rrrr..",
  ".rrrrrr.",
  "rrrrrrrr",
  ".wwwwww.",
  ".wbwwdw.",
  ".wwwwdw.",
  ".wwwwdw.",
];
const CASTLE = [
  "r.r..r.r",
  "rrr..rrr",
  "gggggggg",
  "gwggggwg",
  "gggddggg",
  "gggddggg",
  "gggddggg",
  "gggddggg",
];
const TOWERS: Record<string, readonly string[]> = { castle: CASTLE, house: HOUSE };

export function Town({ kind, roof, className }: { kind: "house" | "castle"; roof: string; className?: string }) {
  const palette: Palette = {
    r: roof,
    w: "#f4f4f4",
    b: "#41a6f6",
    d: "#5d275d",
    g: "#94b0c2",
  };
  return <Pixels rows={TOWERS[kind]} palette={palette} className={className} />;
}

const LAMP = [
  "...kk...",
  "..kyyk..",
  ".kyyyyk.",
  ".kywyyk.",
  ".kyyyyk.",
  "..kyyk..",
  "...kk...",
  "..kkkk..",
];

export function Lamp({ className }: { className?: string }) {
  return <Pixels rows={LAMP} palette={{ k: "#1a1c2c", y: "#ffcd75", w: "#f4f4f4" }} className={className} />;
}
