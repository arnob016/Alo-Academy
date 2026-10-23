"use client";

import "@fontsource/caveat/latin-400.css";
import "@fontsource/caveat/latin-700.css";
import "@fontsource/patrick-hand/latin-400.css";
import "@fontsource/atma/bengali-500.css";
import "@fontsource/atma/bengali-600.css";
import "./sketch.css";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { animate, stagger } from "animejs";
import rough from "roughjs";
import { annotate } from "rough-notation";
import type { RoughSVG } from "roughjs/bin/svg";
import type { Locale } from "@/i18n/routing";
import { site } from "@/config/site";
import { courses, levels, type Course } from "@/content/courses";
import { teachers, type Teacher } from "@/content/teachers";
import { testimonials } from "@/content/testimonials";
import { faqs } from "@/content/faq";
import { REF_PATTERN } from "@/lib/ref";
import { MapFacade } from "@/components/map-facade";
import { prepareMessages, ThemeIntl } from "../theme-intl";
import { prefersReducedMotion } from "../store";
import { ThemedAdmissionForm, ThemedContactForm, type FormClasses } from "../shared/forms";
import { useInView, useThemeKit } from "../shared/kit";
import type { ThemeProps, ThemeRoute } from "../types";
import { sketchCopy, type SketchCopy } from "./copy";

export function prepare(locale: string) {
  return prepareMessages(locale as Locale);
}

export default function SketchTheme(props: ThemeProps) {
  return (
    <ThemeIntl locale={props.locale}>
      <SketchApp {...props} />
    </ThemeIntl>
  );
}

type Ctx = { locale: Locale; c: SketchCopy; href: (p: string) => string; nf: (n: number) => string; searchParams: URLSearchParams };

const INK = "#2b2b2b";
const BLUE = "#2f4ea1";
const RED = "#e4572e";
const TILTS = [-2.5, 1.8, -1.2, 2.6, -2, 1.4];
const TAB_COLOURS = ["#fff7c2", "#d7ecff", "#ffd9cf", "#e3f6d5", "#efe0ff"];
const STICKY = ["#fff59d", "#c8e6ff", "#ffd1dc"];

const navItems = [
  ["/", "home"],
  ["/courses", "courses"],
  ["/teachers", "teachers"],
  ["/admission", "admission"],
  ["/contact", "contact"],
] as const;

function SketchApp({ locale, route, path, searchParams }: ThemeProps) {
  const c = sketchCopy(locale);
  const { href, nf, other, otherHref } = useThemeKit(locale, path, searchParams);
  const [doodling, setDoodling] = useState(false);
  const ctx: Ctx = { locale, c, href, nf, searchParams };
  const pages: Record<ThemeRoute, ReactNode> = {
    home: <FrontPage {...ctx} />,
    courses: <CoursesPage {...ctx} />,
    teachers: <TeachersPage {...ctx} />,
    admission: <SignUp {...ctx} />,
    success: <GotIt {...ctx} />,
    contact: <SayHi {...ctx} />,
    notFound: <Torn {...ctx} />,
  };
  const tFooter = useTranslations("footer");

  return (
    <div className="sk-root">
      {/* Turns any straight border into a slightly wobbly, hand-inked one. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="sk-wobble">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="4" />
        </filter>
      </svg>
      <div className="sk-spiral" aria-hidden="true" />

      <header className="sk-wrap sk-head">
        <Link href={href("/")} className="sk-brand sk-hand">
          {c.notebook}
        </Link>
        <nav aria-label={c.notebook}>
          <ul className="sk-tabs">
            {navItems.map(([to, key], i) => (
              <li key={to}>
                <Link
                  href={href(to)}
                  className="sk-tab"
                  style={{ "--tab": TAB_COLOURS[i] } as CSSProperties}
                  aria-current={path === to || (to === "/admission" && route === "success") ? "page" : undefined}
                >
                  {c.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sk-tools">
          <button type="button" className="sk-chip" aria-pressed={doodling} onClick={() => setDoodling((d) => !d)}>
            ✏ {doodling ? c.doodleOn : c.doodle}
          </button>
          <Link href={otherHref} className="sk-chip" lang={other} hrefLang={other}>
            {other === "en" ? "English" : "বাংলা"}
          </Link>
        </div>
      </header>

      <main className="sk-wrap" key={path}>
        {pages[route]}
      </main>

      <footer className="sk-wrap sk-footer">
        <p className="sk-hand sk-h3">{site.name[locale]}</p>
        <p>{site.contact.address[locale]}</p>
        <p>
          <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a> · <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
        </p>
        <p>{tFooter("hours")}</p>
        <p style={{ marginTop: 8 }}>
          © {site.name[locale]} · {tFooter("rights")}
        </p>
      </footer>

      <Doodle active={doodling} onExit={() => setDoodling(false)} />
      <div key={`flip-${path}`} className="sk-flip" aria-hidden="true">
        <div />
      </div>
    </div>
  );
}

/* ---------- Drawing helpers ---------- */

/** Draws with Rough.js once in view, then "inks" every stroke in with a stroke-dash animation. */
function RoughSketch({ viewBox, draw, className, label }: { viewBox: string; draw: (rc: RoughSVG, svg: SVGSVGElement) => void; className?: string; label?: string }) {
  const [ref, inView] = useInView<SVGSVGElement>();
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !inView) return;
    svg.querySelectorAll("g[data-rough]").forEach((g) => g.remove());
    const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    layer.dataset.rough = "";
    svg.prepend(layer);
    const rc = rough.svg(svg);
    const before = svg.children.length;
    draw(rc, svg);
    // Move whatever draw() appended into our layer, keeping <text> on top.
    Array.from(svg.children)
      .slice(before)
      .forEach((node) => layer.appendChild(node));
    if (prefersReducedMotion()) return;
    const paths = Array.from(layer.querySelectorAll<SVGPathElement>("path"));
    paths.forEach((p) => {
      const length = p.getTotalLength();
      p.style.strokeDasharray = `${length}`;
      p.style.strokeDashoffset = `${length}`;
    });
    const animation = animate(paths, { strokeDashoffset: 0, duration: 900, delay: stagger(40), ease: "inOutQuad" });
    return () => {
      animation.pause();
    };
  }, [inView, draw, ref]);
  return <svg ref={ref} viewBox={viewBox} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

/** Rough Notation: highlighter swipe / underline / circle that animates in when visible. */
function Mark({ children, type = "highlight", color }: { children: ReactNode; type?: "highlight" | "underline" | "circle" | "box"; color?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const annotation = annotate(el, {
      type,
      color: color ?? (type === "highlight" ? "rgba(255,235,59,0.65)" : type === "circle" ? RED : BLUE),
      multiline: true,
      padding: type === "circle" ? 8 : 2,
      iterations: type === "highlight" ? 1 : 2,
      animate: !prefersReducedMotion(),
      animationDuration: 900,
    });
    annotation.show();
    return () => annotation.remove();
  }, [inView, type, color, ref]);
  return (
    <span ref={ref} style={{ position: "relative" }}>
      {children}
    </span>
  );
}

function drawLevelIcon(level: Course["level"]) {
  return (rc: RoughSVG, svg: SVGSVGElement) => {
    const add = (node: SVGGElement) => svg.appendChild(node);
    if (level === "ssc") {
      add(rc.rectangle(50, 30, 100, 86, { fill: "rgba(47,78,161,0.35)", fillStyle: "hachure", stroke: INK, strokeWidth: 2, roughness: 1.6 }));
      add(rc.line(62, 30, 62, 116, { stroke: INK, strokeWidth: 2 }));
      add(rc.line(75, 52, 135, 52, { stroke: BLUE }));
      add(rc.line(75, 64, 128, 64, { stroke: BLUE }));
    } else if (level === "hsc") {
      add(rc.polygon([[86, 22], [114, 22], [114, 58], [150, 122], [50, 122], [86, 58]], { fill: "rgba(228,87,46,0.4)", fillStyle: "cross-hatch", stroke: INK, strokeWidth: 2, roughness: 1.4 }));
      add(rc.circle(96, 100, 12, { stroke: BLUE }));
      add(rc.circle(112, 88, 8, { stroke: BLUE }));
    } else {
      add(rc.polygon([[100, 28], [172, 58], [100, 88], [28, 58]], { fill: INK, fillStyle: "zigzag", stroke: INK, strokeWidth: 2, roughness: 1.2 }));
      add(rc.rectangle(66, 72, 68, 36, { stroke: INK, strokeWidth: 2, fill: "rgba(255,235,59,0.6)", fillStyle: "solid" }));
      add(rc.line(172, 58, 172, 104, { stroke: RED, strokeWidth: 2 }));
      add(rc.circle(172, 110, 10, { fill: RED, fillStyle: "solid", stroke: RED }));
    }
  };
}

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function drawFace(seed: string) {
  const h = hash(seed);
  const hair = [INK, "#6b4226", "#3c2a4d", "#8a8a8a"][h % 4];
  const skin = ["#f4d1a6", "#e3b48a", "#c98f62"][(h >> 2) % 3];
  return (rc: RoughSVG, svg: SVGSVGElement) => {
    const add = (node: SVGGElement) => svg.appendChild(node);
    add(rc.circle(100, 84, 92, { fill: skin, fillStyle: "solid", stroke: INK, strokeWidth: 2 }));
    add(rc.arc(100, 70, 96, 72, Math.PI, Math.PI * 2, true, { fill: hair, fillStyle: "hachure", hachureGap: 3, stroke: hair, strokeWidth: 2 }));
    add(rc.circle(84, 86, 8, { fill: INK, fillStyle: "solid" }));
    add(rc.circle(116, 86, 8, { fill: INK, fillStyle: "solid" }));
    add(rc.arc(100, 104, 34, 20, 0, Math.PI, false, { stroke: RED, strokeWidth: 2 }));
    add(rc.line(60, 140, 140, 140, { stroke: BLUE, strokeWidth: 2, roughness: 2 }));
  };
}

/* ---------- Doodle layer: draw in the margins; ink fades after a few seconds ---------- */

function Doodle({ active, onExit }: { active: boolean; onExit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<{ points: [number, number][]; end: number }[]>([]);
  const drawing = useRef(false);
  const frame = useRef(0);
  const paint = useRef<() => void>(() => {});
  // onExit is a new function on every parent render; read it from a ref so the
  // setup effect below runs once instead of tearing down the paint loop.
  const exit = useRef(onExit);
  useEffect(() => {
    exit.current = onExit;
  });

  useEffect(() => {
    paint.current = () => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const now = performance.now();
    g.clearRect(0, 0, canvas.width, canvas.height);
    strokes.current = strokes.current.filter((s) => s.end === 0 || now - s.end < 3500);
    for (const s of strokes.current) {
      const age = s.end === 0 ? 0 : now - s.end;
      g.globalAlpha = age < 2500 ? 1 : 1 - (age - 2500) / 1000;
      g.strokeStyle = BLUE;
      g.lineWidth = 2.5 * window.devicePixelRatio;
      g.lineCap = g.lineJoin = "round";
      g.beginPath();
      s.points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
    frame.current = strokes.current.length ? requestAnimationFrame(paint.current) : 0;
    };
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exit.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, []);

  const point = (e: React.PointerEvent): [number, number] => [e.clientX * window.devicePixelRatio, e.clientY * window.devicePixelRatio];

  return (
    <canvas
      ref={ref}
      className="sk-doodle"
      data-active={active}
      aria-hidden="true"
      onPointerDown={(e) => {
        if (!active) return;
        drawing.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        strokes.current.push({ points: [point(e)], end: 0 });
        if (!frame.current) frame.current = requestAnimationFrame(paint.current);
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        strokes.current[strokes.current.length - 1]?.points.push(point(e));
      }}
      onPointerUp={() => {
        drawing.current = false;
        const last = strokes.current[strokes.current.length - 1];
        if (last) last.end = performance.now();
      }}
    />
  );
}

/** The contact form folds into a paper airplane and flies off the page. */
function flyPaperAirplane(from: HTMLElement | null) {
  if (!from || prefersReducedMotion()) return;
  const box = from.getBoundingClientRect();
  const plane = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  plane.setAttribute("viewBox", "0 0 64 64");
  plane.setAttribute("class", "sk-plane");
  plane.innerHTML = `<path d="M4 30 L60 6 L40 58 L30 36 Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M30 36 L60 6" stroke="${INK}" stroke-width="2"/><path d="M30 36 L28 50 L36 44" fill="#e9e3d2" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  plane.style.left = `${box.left + box.width / 2 - 32}px`;
  plane.style.top = `${box.top + box.height / 2 - 32}px`;
  document.body.appendChild(plane);
  animate(from, { scaleY: [1, 0.92, 1], scaleX: [1, 0.97, 1], duration: 500, ease: "inOutQuad" });
  animate(plane, {
    translateX: [0, 60, window.innerWidth],
    translateY: [0, 30, -window.innerHeight],
    rotate: [0, 12, -24],
    scale: [0.4, 1, 0.6],
    duration: 1800,
    ease: "inQuad",
    onComplete: () => plane.remove(),
  });
}

/* ---------- Pieces ---------- */

function Polaroid({ course, index, ctx, full = false, note }: { course: Course; index: number; ctx: Ctx; full?: boolean; note?: string }) {
  const t = useTranslations("course");
  const tLevels = useTranslations("levels");
  const { locale, c } = ctx;
  const draw = useCallback((rc: RoughSVG, svg: SVGSVGElement) => drawLevelIcon(course.level)(rc, svg), [course.level]);
  return (
    <article className="sk-polaroid" style={{ "--tilt": `${TILTS[index % TILTS.length]}deg`, "--tape": `${index % 2 ? 5 : -5}deg` } as CSSProperties}>
      {note && <span className="sk-note sk-margin-note">{note}</span>}
      <RoughSketch viewBox="0 0 200 150" draw={draw} className="sk-photo" />
      <div className="sk-caption">
        <p className="sk-blue" style={{ fontSize: "0.85em" }}>
          {tLevels(course.level)}
        </p>
        <h3 className="sk-hand sk-h3">{course.name[locale]}</h3>
        <p style={{ lineHeight: 1.5, marginTop: 4 }}>{course.description[locale]}</p>
        <p style={{ marginTop: 10 }}>
          <Mark type="circle">{t("fee", { amount: course.monthlyFee })}</Mark> {c.monthly} · {t("fee", { amount: course.admissionFee })} {c.entry}
        </p>
        <p className="sk-red sk-hand" style={{ fontSize: 22 }}>
          {t("seatsLeft", { count: course.seatsLeft })}
        </p>
        {full && (
          <>
            <p className="sk-blue" style={{ marginTop: 8 }}>
              {c.subjects}: {course.subjects[locale].join(", ")}
            </p>
            <p className="sk-blue">{c.batches}:</p>
            <ul style={{ margin: 0, paddingLeft: 22, lineHeight: 1.5 }}>
              {course.batches.map((b) => (
                <li key={b.id}>
                  {b.label[locale]} — {b.schedule[locale]}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="sk-actions" style={{ marginTop: 14 }}>
          <Link href={ctx.href(`/admission?course=${course.id}`)} className="sk-btn">
            {c.signUp}
          </Link>
        </div>
      </div>
    </article>
  );
}

function Portrait({ teacher, index, ctx, full = false, headingLevel = 3 }: { teacher: Teacher; index: number; ctx: Ctx; full?: boolean; headingLevel?: 2 | 3 }) {
  const t = useTranslations("teachersPage");
  const { locale } = ctx;
  const draw = useCallback((rc: RoughSVG, svg: SVGSVGElement) => drawFace(teacher.id)(rc, svg), [teacher.id]);
  const Heading = `h${headingLevel}` as const;
  return (
    <article className="sk-polaroid" style={{ "--tilt": `${TILTS[(index + 2) % TILTS.length]}deg`, "--tape-a": "rgb(47 78 161 / 0.4)", "--tape-b": "rgb(255 255 255 / 0.6)" } as CSSProperties}>
      <RoughSketch viewBox="0 0 200 160" draw={draw} className="sk-photo" />
      <div className="sk-caption">
        <Heading className="sk-hand sk-h3">{teacher.name[locale]}</Heading>
        <p className="sk-blue">{teacher.subject[locale]}</p>
        <p style={{ lineHeight: 1.45, fontSize: "0.9em" }}>{teacher.qualification[locale]}</p>
        <p className="sk-red sk-hand" style={{ fontSize: 22 }}>
          {t("experience", { years: teacher.experienceYears })}
        </p>
        {full && <p style={{ lineHeight: 1.5, marginTop: 6 }}>“{teacher.bio[locale]}”</p>}
      </div>
    </article>
  );
}

const MINDMAP_POSITIONS: [number, number][] = [
  [180, 70],
  [720, 70],
  [110, 260],
  [790, 260],
  [200, 450],
  [700, 450],
];

function MindMap({ ctx }: { ctx: Ctx }) {
  const { c, nf } = ctx;
  const t = useTranslations("home");
  const nodes = [
    t("cardPoints.batch"),
    t("cardPoints.report"),
    t("cardPoints.tests"),
    t("cardPoints.bkash"),
    c.years(nf(site.stats.years)),
    c.students(nf(site.stats.students)),
  ];
  const nodesKey = nodes.join("|");
  const draw = useCallback(
    (rc: RoughSVG, svg: SVGSVGElement) => {
      const labels = nodesKey.split("|");
      const add = (node: SVGGElement) => svg.appendChild(node);
      add(rc.ellipse(450, 260, 280, 120, { fill: "rgba(255,235,59,0.7)", fillStyle: "solid", stroke: INK, strokeWidth: 2.5 }));
      MINDMAP_POSITIONS.forEach(([x, y], i) => {
        add(rc.curve([[450, 260], [(450 + x) / 2 + (i % 2 ? 30 : -30), (260 + y) / 2], [x, y]], { stroke: i % 2 ? BLUE : RED, strokeWidth: 2 }));
        add(rc.ellipse(x, y, Math.min(300, labels[i].length * 11 + 70), 74, { stroke: INK, fill: "#fffdf6", fillStyle: "solid", strokeWidth: 1.8 }));
      });
    },
    [nodesKey],
  );
  return (
    <div style={{ position: "relative" }}>
      <RoughSketch viewBox="0 0 900 520" draw={draw} className="sk-mindmap" label={[c.centre, ...nodes].join(", ")} />
      <svg viewBox="0 0 900 520" className="sk-mindmap" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <text x={450} y={268} textAnchor="middle" fontSize={40} fontWeight={700}>
          {c.centre}
        </text>
        {MINDMAP_POSITIONS.map(([x, y], i) => (
          <text key={i} x={x} y={y + 8} textAnchor="middle" fontSize={nodes[i].length > 22 ? 20 : 24}>
            {nodes[i]}
          </text>
        ))}
      </svg>
    </div>
  );
}

function DemoNote() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;
  return (
    <div className="sk-demo" role="note">
      <strong>{t("bannerTitle")}</strong>
      {t("bannerText")}
    </div>
  );
}

const formClasses: FormClasses = {
  field: "sk-field",
  label: "sk-label",
  input: "sk-input",
  hint: "sk-hint",
  error: "sk-error",
  alert: "sk-alert",
  ok: "sk-ok",
  legend: "sk-label",
  radio: "sk-radio",
  submit: "sk-btn sk-submit",
  demo: "sk-btn sk-btn--ghost sk-demo-btn",
};

/* ---------- Pages ---------- */

function FrontPage(ctx: Ctx) {
  const { locale, c, nf } = ctx;
  const t = useTranslations("home");
  const tDemo = useTranslations("demo");
  const scarcest = courses.reduce((a, b) => (b.seatsLeft < a.seatsLeft ? b : a));
  const featured = courses.filter((course) => course.featured);
  return (
    <>
      <section style={{ paddingTop: 40 }} aria-labelledby="sk-title">
        <p className="sk-note" style={{ transform: "rotate(-2deg)", display: "inline-block" }}>
          {t("eyebrow")} ✶
        </p>
        <h1 id="sk-title" className="sk-hand sk-h1" style={{ marginTop: 10 }}>
          <Mark>{t("title")}</Mark>
        </h1>
        <p style={{ maxWidth: 640, marginTop: 18 }}>{t("subtitle")}</p>
        <div className="sk-actions">
          <Link href={ctx.href("/admission")} className="sk-btn">
            {c.signUp}
          </Link>
          <Link href={ctx.href("/courses")} className="sk-btn sk-btn--ghost">
            {c.seeAll}
          </Link>
        </div>
      </section>

      {site.demo.enabled && (
        <div className="sk-demo sk-section">
          {tDemo("stripText")}{" "}
          <Link href={ctx.href("/admission")} style={{ color: "#fafafa", textDecoration: "underline" }}>
            {tDemo("stripCta")} →
          </Link>
        </div>
      )}

      <section className="sk-section" aria-labelledby="sk-mind">
        <h2 id="sk-mind" className="sk-hand sk-h2">
          <Mark type="underline">{c.mindmap}</Mark>
        </h2>
        <MindMap ctx={ctx} />
      </section>

      <section className="sk-section" aria-labelledby="sk-featured">
        <h2 id="sk-featured" className="sk-hand sk-h2">
          <Mark>{t("featuredTitle")}</Mark>
        </h2>
        <p>{t("featuredSubtitle")}</p>
        <div className="sk-grid sk-grid-3" style={{ marginTop: 56 }}>
          {featured.map((course, i) => (
            <Polaroid
              key={course.id}
              course={course}
              index={i}
              ctx={ctx}
              note={course.id === scarcest.id ? c.hurry(nf(course.seatsLeft)) : i === 0 ? c.favourite : undefined}
            />
          ))}
        </div>
        <p style={{ marginTop: 28 }}>
          <Link href={ctx.href("/courses")} className="sk-hand sk-blue" style={{ fontSize: 26 }}>
            {c.seeAll}
          </Link>
        </p>
      </section>

      <section className="sk-section" aria-labelledby="sk-teachers">
        <h2 id="sk-teachers" className="sk-hand sk-h2">
          <Mark>{t("teachersTitle")}</Mark>
        </h2>
        <div className="sk-grid sk-grid-2" style={{ marginTop: 40, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {teachers
            .filter((teacher) => teacher.featured)
            .map((teacher, i) => (
              <Portrait key={teacher.id} teacher={teacher} index={i} ctx={ctx} />
            ))}
        </div>
        <p style={{ marginTop: 24 }}>
          <Link href={ctx.href("/teachers")} className="sk-hand sk-blue" style={{ fontSize: 26 }}>
            {c.meetAll}
          </Link>
        </p>
      </section>

      <section className="sk-section" aria-labelledby="sk-notes">
        <h2 id="sk-notes" className="sk-hand sk-h2">
          <Mark>{t("testimonialsTitle")}</Mark>
        </h2>
        <div className="sk-grid sk-grid-3" style={{ marginTop: 36 }}>
          {testimonials.map((item, i) => (
            <figure key={item.id} className="sk-sticky" style={{ margin: 0, "--sticky": STICKY[i % 3], "--tilt": `${TILTS[(i + 1) % TILTS.length]}deg` } as CSSProperties}>
              <blockquote style={{ margin: 0 }}>“{item.quote[locale]}”</blockquote>
              <figcaption className="sk-hand sk-blue" style={{ marginTop: 12, fontSize: 24 }}>
                — {item.name[locale]}
                <span style={{ display: "block", fontSize: 18, color: "#555" }}>{item.role[locale]}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="sk-section sk-faq" aria-labelledby="sk-faq">
        <h2 id="sk-faq" className="sk-hand sk-h2">
          <Mark type="underline">{t("faqTitle")}</Mark>
        </h2>
        {faqs.map((faq, i) => (
          <details key={faq.id} open={i === 0}>
            <summary>{faq.question[locale]}</summary>
            <p>{faq.answer[locale]}</p>
          </details>
        ))}
      </section>

      <section className="sk-section sk-box sk-boxes" aria-labelledby="sk-cta">
        <h2 id="sk-cta" className="sk-hand sk-h2">
          {t("ctaTitle")} <span className="sk-red">!</span>
        </h2>
        <p>{t("ctaText")}</p>
        <div className="sk-actions">
          <Link href={ctx.href("/admission")} className="sk-btn">
            {c.signUp}
          </Link>
          <a href={`tel:${site.contact.phone}`} className="sk-btn sk-btn--ghost">
            {t("ctaCall", { phone: site.contact.phone })}
          </a>
        </div>
      </section>
    </>
  );
}

function PageHead({ title, intro }: { title: string; intro?: string }) {
  return (
    <header style={{ paddingTop: 32 }}>
      <h1 className="sk-hand sk-h1">
        <Mark>{title}</Mark>
      </h1>
      {intro && <p style={{ maxWidth: 700, marginTop: 14 }}>{intro}</p>}
    </header>
  );
}

function CoursesPage(ctx: Ctx) {
  const { c, nf } = ctx;
  const t = useTranslations("coursesPage");
  const tLevels = useTranslations("levels");
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} />
      {levels.map((level) => (
        <section key={level} className="sk-section" aria-labelledby={`sk-level-${level}`}>
          <h2 id={`sk-level-${level}`} className="sk-hand sk-h2">
            <Mark type="underline">{tLevels(level)}</Mark>
          </h2>
          <div className="sk-grid sk-grid-2" style={{ marginTop: 56 }}>
            {courses
              .filter((course) => course.level === level)
              .map((course, i) => (
                <Polaroid key={course.id} course={course} index={i} ctx={ctx} full note={course.seatsLeft <= 4 ? c.hurry(nf(course.seatsLeft)) : undefined} />
              ))}
          </div>
        </section>
      ))}
    </>
  );
}

function TeachersPage(ctx: Ctx) {
  const t = useTranslations("teachersPage");
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} />
      <div className="sk-grid sk-grid-3 sk-section" style={{ marginTop: 56 }}>
        {teachers.map((teacher, i) => (
          <Portrait key={teacher.id} teacher={teacher} index={i} ctx={ctx} full headingLevel={2} />
        ))}
      </div>
    </>
  );
}

function SignUp(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("admissionPage");
  const tCourse = useTranslations("course");
  const accountType = site.payments.bkashAccountType;
  const steps = ["open", "send", "copy", "fill"] as const;
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} />
      <div className="sk-grid sk-split sk-section" style={{ marginTop: 40 }}>
        <section className="sk-box sk-boxes" aria-labelledby="sk-form-title">
          <h2 id="sk-form-title" className="sk-hand sk-h2">
            {t("formTitle")}
          </h2>
          <ThemedAdmissionForm
            locale={locale}
            cls={formClasses}
            idPrefix="sk-"
            initialCourseId={ctx.searchParams.get("course") ?? undefined}
            demoLabel={c.demoFill}
            submitLabel={c.signUp}
          />
        </section>
        <aside className="sk-grid" style={{ gap: 30 }}>
          <DemoNote />
          <div className="sk-sticky" style={{ "--tilt": "1.5deg" } as CSSProperties}>
            <p className="sk-hand sk-blue" style={{ fontSize: 28 }}>
              {c.payNote}
            </p>
            <ol style={{ paddingLeft: 22, lineHeight: 1.5 }}>
              {steps.map((step) => (
                <li key={step} style={{ marginTop: 6 }}>
                  {step === "open" ? t("steps.open", { action: accountType === "merchant" ? t("payment") : t("sendMoney") }) : t(`steps.${step}`)}
                </li>
              ))}
            </ol>
            <p style={{ marginTop: 12 }}>{t("payTo")}:</p>
            <p className="sk-hand" style={{ fontSize: 34 }}>
              <Mark type="box" color={RED}>
                {site.payments.bkashNumber}
              </Mark>
            </p>
            <p style={{ fontSize: "0.85em" }}>{t("accountType", { type: accountType })}</p>
          </div>
          <div className="sk-box sk-boxes">
            <p className="sk-hand sk-h3">{c.feeNote}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {courses.map((course) => (
                <li key={course.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px dashed rgba(43,43,43,0.3)" }}>
                  <span>{course.name[locale]}</span>
                  <span className="sk-blue">{tCourse("fee", { amount: course.admissionFee })}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function GotIt(ctx: Ctx) {
  const { c } = ctx;
  const t = useTranslations("success");
  const tDemo = useTranslations("demo");
  const ref = ctx.searchParams.get("ref");
  const valid = ref && REF_PATTERN.test(ref) ? ref : null;
  const extras = ["admin", "cms", "login", "gateway", "sms"] as const;
  return (
    <>
      <PageHead title={c.gotIt} intro={t("intro")} />
      <div className="sk-sticky sk-section" style={{ maxWidth: 560, "--tilt": "-1.5deg" } as CSSProperties}>
        <p>{t("refLabel")}:</p>
        <p className="sk-hand" style={{ fontSize: 44, lineHeight: 1.2 }}>
          {valid ? <Mark type="circle">{valid}</Mark> : "—"}
        </p>
        <p style={{ fontSize: "0.9em" }}>{valid ? t("refHint") : t("noRef")}</p>
      </div>
      <section className="sk-section" aria-labelledby="sk-next">
        <h2 id="sk-next" className="sk-hand sk-h2">
          <Mark type="underline">{t("nextTitle")}</Mark>
        </h2>
        <ol style={{ paddingLeft: 26 }}>
          {(["verify", "call", "start"] as const).map((k) => (
            <li key={k}>{t(`next.${k}`)}</li>
          ))}
        </ol>
      </section>
      {site.demo.enabled && (
        <div className="sk-demo sk-section">
          {site.demo.publicSheetUrl && (
            <p style={{ marginBottom: 10 }}>
              <a href={site.demo.publicSheetUrl} target="_blank" rel="noopener" style={{ color: "#fafafa", textDecoration: "underline" }}>
                {tDemo("seeRow")} ↗
              </a>{" "}
              {tDemo("seeRowHint")}
            </p>
          )}
          <strong>{tDemo("pitchTitle")}</strong>
          <p>{tDemo("pitchText")}</p>
          <p style={{ marginTop: 8 }}>{tDemo("alsoTitle")}:</p>
          <ul style={{ paddingLeft: 20 }}>
            {extras.map((k) => (
              <li key={k}>{tDemo(`also.${k}`)}</li>
            ))}
          </ul>
          {site.demo.hireUrl && (
            <a href={site.demo.hireUrl} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 10, padding: "6px 16px", background: "#fafafa", color: "#18181b", fontWeight: 700 }}>
              {tDemo("cta")}
            </a>
          )}
        </div>
      )}
      <p className="sk-section">
        <Link href={ctx.href("/")} className="sk-btn sk-btn--ghost">
          {c.back}
        </Link>
      </p>
    </>
  );
}

function SayHi(ctx: Ctx) {
  const { locale, c } = ctx;
  const t = useTranslations("contactPage");
  const tFooter = useTranslations("footer");
  const tForm = useTranslations("contactForm");
  const formBox = useRef<HTMLElement>(null);
  const onSent = useCallback(() => flyPaperAirplane(formBox.current), []);
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} />
      <div className="sk-grid sk-split sk-section" style={{ marginTop: 40 }}>
        <section ref={formBox} className="sk-box sk-boxes" aria-labelledby="sk-contact-title">
          <h2 id="sk-contact-title" className="sk-hand sk-h2">
            {tForm("title")}
          </h2>
          <ThemedContactForm locale={locale} cls={formClasses} idPrefix="sk-contact-" submitLabel={c.send} onSent={onSent} />
        </section>
        <aside className="sk-grid" style={{ gap: 30 }}>
          <div className="sk-sticky" style={{ "--sticky": "#c8e6ff", "--tilt": "-1deg" } as CSSProperties}>
            <p className="sk-blue">{t("address")}</p>
            <p>{site.contact.address[locale]}</p>
            <p className="sk-blue" style={{ marginTop: 8 }}>
              {t("phone")}
            </p>
            <p>
              <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a>
            </p>
            <p className="sk-blue" style={{ marginTop: 8 }}>
              {t("hours")}
            </p>
            <p>{tFooter("hours")}</p>
          </div>
          <div className="sk-polaroid" style={{ "--tilt": "1.5deg" } as CSSProperties}>
            <MapFacade query={site.contact.mapQuery} title={t("mapTitle")} label={t("loadMap")} note={t("mapNote")} />
          </div>
        </aside>
      </div>
    </>
  );
}

function Torn(ctx: Ctx) {
  const { c } = ctx;
  return (
    <section style={{ paddingTop: 60 }}>
      <h1 className="sk-hand sk-h1">
        <Mark type="circle">{c.tornTitle}</Mark>
      </h1>
      <p style={{ marginTop: 18 }}>{c.tornText}</p>
      <div className="sk-actions">
        <Link href={ctx.href("/")} className="sk-btn">
          {c.back}
        </Link>
      </div>
    </section>
  );
}
