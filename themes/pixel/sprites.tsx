/*
 * Original pixel art, drawn from character maps (one letter = one pixel).
 * Nothing here is taken from an existing game.
 */

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

// Teacher portraits: one bust template, colours picked from the teacher's id.
const BUST = [
  "..hhhh..",
  ".hhhhhh.",
  ".hssssh.",
  ".skssks.",
  ".ssssss.",
  "..smms..",
  ".cccccc.",
  "cccwwccc",
];
const HAIR = ["#1a1c2c", "#333c57", "#5d275d", "#566c86", "#b13e53"];
const SKIN = ["#ffcd75", "#ef7d57", "#f4c39a"];
const CLOTHES = ["#3b5dc9", "#257179", "#38b764", "#b13e53", "#5d275d", "#41a6f6"];

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function Portrait({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  const palette: Palette = {
    h: HAIR[h % HAIR.length],
    s: SKIN[(h >> 3) % SKIN.length],
    k: "#1a1c2c",
    m: "#b13e53",
    c: CLOTHES[(h >> 6) % CLOTHES.length],
    w: "#f4f4f4",
  };
  return <Pixels rows={BUST} palette={palette} className={className} />;
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
