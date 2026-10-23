"use client";

import "@fontsource/orbitron/latin-500.css";
import "@fontsource/orbitron/latin-700.css";
import "@fontsource/share-tech-mono/latin-400.css";
import "./hud.css";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { animate } from "animejs";
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
import { ThemedAdmissionForm, ThemedContactForm, type ConfirmConfig, type FormClasses } from "../shared/forms";
import { graphemes, useInView, useOncePerSession, useThemeKit } from "../shared/kit";
import type { ThemeProps, ThemeRoute } from "../types";
import { hudCopy, type HudCopy } from "./copy";

export function prepare(locale: string) {
  return prepareMessages(locale as Locale);
}

export default function HudTheme(props: ThemeProps) {
  return (
    <ThemeIntl locale={props.locale}>
      <HudApp {...props} />
    </ThemeIntl>
  );
}

type Ctx = { locale: Locale; c: HudCopy; href: (p: string) => string; nf: (n: number) => string; searchParams: URLSearchParams };

const navItems = [
  ["/", "home"],
  ["/courses", "courses"],
  ["/teachers", "teachers"],
  ["/admission", "admission"],
  ["/contact", "contact"],
] as const;

/* ---------- Sound: soft UI beeps (off until the visitor turns audio on) ---------- */

let audio: AudioContext | null = null;
let audioOn = false;
function setAudio(on: boolean) {
  audioOn = on;
  if (on) {
    audio ??= new AudioContext();
    void audio.resume();
    beep(990, 0.08);
  }
}
function beep(freq = 720, duration = 0.05) {
  if (!audioOn || !audio) return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + duration);
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function HudApp({ locale, route, path, searchParams }: ThemeProps) {
  const c = hudCopy(locale);
  const { href, nf, other, otherHref } = useThemeKit(locale, path, searchParams);
  const [boot, finishBoot] = useOncePerSession("alo-hud-boot");
  const [sound, setSound] = useState(audioOn);
  const lastBeep = useRef(0);

  const ctx: Ctx = { locale, c, href, nf, searchParams };
  const pages: Record<ThemeRoute, ReactNode> = {
    home: <Bridge {...ctx} />,
    courses: <Missions {...ctx} />,
    teachers: <Crew {...ctx} />,
    admission: <Enlist {...ctx} />,
    success: <Received {...ctx} />,
    contact: <Comms {...ctx} />,
    notFound: <SignalLost {...ctx} />,
  };

  const onPointerOver = (e: React.PointerEvent) => {
    const target = (e.target as HTMLElement).closest(".hd-btn, .hd-tab");
    const now = performance.now();
    if (target && !target.contains(e.relatedTarget as Node | null) && now - lastBeep.current > 80) {
      lastBeep.current = now;
      beep(target.classList.contains("hd-tab") ? 560 : 760);
    }
  };

  return (
    <div className="hd-root" onPointerOver={onPointerOver}>
      <Space />
      <div className="hd-frame" aria-hidden="true">
        <i />
      </div>
      <header className="hd-top">
        <Link href={href("/")} className="hd-brand hd-label">
          ◢ {site.name[locale]} <span className="hd-dim">{"// "}{c.system}</span>
        </Link>
        <nav aria-label={c.system}>
          <ul className="hd-tabs hd-label hd-small">
            {navItems.map(([to, key], i) => (
              <li key={to}>
                <Link href={href(to)} className="hd-tab" aria-current={path === to || (to === "/admission" && route === "success") ? "page" : undefined}>
                  {String(i + 1).padStart(2, "0")} {c.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          className="hd-chip hd-small"
          aria-pressed={sound}
          onClick={() => {
            setAudio(!sound);
            setSound(!sound);
          }}
        >
          {c.audio}: {sound ? c.on : c.off}
        </button>
        <Link href={otherHref} className="hd-chip hd-small" lang={other} hrefLang={other}>
          {other === "en" ? "EN" : "বাং"}
        </Link>
      </header>

      <main className="hd-wrap" key={path}>
        {pages[route]}
      </main>

      <footer className="hd-wrap hd-section hd-dim hd-small" style={{ paddingBottom: 40 }}>
        <p>
          {site.name[locale]} · {site.contact.address[locale]} · {site.contact.phone} · {site.contact.email}
        </p>
      </footer>

      <Telemetry c={c} locale={locale} />
      <div key={`glitch-${path}`} className="hd-glitch" aria-hidden="true" />
      {boot && <Boot c={c} onDone={finishBoot} />}
    </div>
  );
}

/* ---------- Background: starfield + wireframe planet that follow the mouse ---------- */

function Space() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const stars = Array.from({ length: 220 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.9 + 0.1 }));
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let spin = 0;
    let frame = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      tx += (mx - tx) * 0.05;
      ty += (my - ty) * 0.05;
      g.clearRect(0, 0, w, h);

      for (const s of stars) {
        const x = w / 2 + (s.x * w) / 2 - tx * 40 * s.z;
        const y = h / 2 + (s.y * h) / 2 - ty * 40 * s.z;
        g.fillStyle = `rgba(205,248,255,${0.25 + s.z * 0.6})`;
        g.fillRect(x, y, s.z * 1.8, s.z * 1.8);
      }

      // Orthographic wireframe globe, tilted, slowly rotating.
      const r = Math.min(w, h) * 0.3;
      const cx = w * 0.76 + tx * 24;
      const cy = h * 0.6 + ty * 24;
      const tilt = 0.4;
      const project = (lat: number, lon: number) => {
        const x = Math.cos(lat) * Math.sin(lon);
        const y = Math.sin(lat);
        const z = Math.cos(lat) * Math.cos(lon);
        const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
        const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
        return [cx + x * r, cy - y2 * r, z2] as const;
      };
      const line = (points: (readonly [number, number, number])[]) => {
        for (let i = 1; i < points.length; i++) {
          const [x1, y1, z1] = points[i - 1];
          const [x2, y2] = points[i];
          g.strokeStyle = z1 > 0 ? "rgba(0,229,255,0.45)" : "rgba(0,229,255,0.1)";
          g.beginPath();
          g.moveTo(x1, y1);
          g.lineTo(x2, y2);
          g.stroke();
        }
      };
      g.lineWidth = 1;
      for (let k = 0; k < 12; k++) {
        const lon = (k / 12) * Math.PI * 2 + spin;
        line(Array.from({ length: 25 }, (_, i) => project(-Math.PI / 2 + (i / 24) * Math.PI, lon)));
      }
      for (let k = 1; k < 6; k++) {
        const lat = -Math.PI / 2 + (k / 6) * Math.PI;
        line(Array.from({ length: 49 }, (_, i) => project(lat, (i / 48) * Math.PI * 2 + spin)));
      }
      g.strokeStyle = "rgba(0,229,255,0.25)";
      g.beginPath();
      g.ellipse(cx, cy, r * 1.45, r * 0.32, -0.2, 0, Math.PI * 2);
      g.stroke();

      spin += 0.0016;
      if (!reduced) frame = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return <canvas ref={ref} className="hd-canvas" aria-hidden="true" />;
}

/** Fake telemetry around the viewport: cursor coordinates, Dhaka clock, status, scroll depth. */
function Telemetry({ c, locale }: { c: HudCopy; locale: Locale }) {
  const cursorRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const gaugeRef = useRef<HTMLSpanElement>(null);
  const gaugeBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clock = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = clock.format(new Date());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    const onMove = (e: PointerEvent) => {
      if (cursorRef.current) cursorRef.current.textContent = `X:${String(Math.round(e.clientX)).padStart(4, "0")} Y:${String(Math.round(e.clientY)).padStart(4, "0")}`;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      if (gaugeRef.current) gaugeRef.current.style.height = `${pct}%`;
      if (gaugeBox.current) gaugeBox.current.dataset.label = `${pct}%`;
    };
    onScroll();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [locale]);

  return (
    <>
      <div className="hd-bottom hd-small" aria-hidden="true">
        <span className="hd-online">
          {c.status}: {c.online}
        </span>
        <span className="hd-hide-sm">
          {c.cursor} <span ref={cursorRef}>X:0000 Y:0000</span>
        </span>
        <span className="hd-hide-sm">{c.coords}</span>
        <span>
          {c.clock} <span ref={clockRef} />
        </span>
      </div>
      <div ref={gaugeBox} className="hd-gauge" aria-hidden="true" data-label="0%">
        <span ref={gaugeRef} />
      </div>
    </>
  );
}

function Boot({ c, onDone }: { c: HudCopy; onDone: () => void }) {
  const [lines, setLines] = useState(1);
  useEffect(() => {
    if (lines > c.boot.length) {
      const id = window.setTimeout(onDone, 450);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setLines((n) => n + 1), lines === 1 ? 420 : 260);
    return () => window.clearTimeout(id);
  }, [lines, c.boot.length, onDone]);
  return (
    <div className="hd-boot" role="presentation">
      {c.boot.slice(0, lines).map((line) => (
        <p key={line}>{line}</p>
      ))}
      <button type="button" className="hd-btn" onClick={onDone} autoFocus>
        {c.skipBoot} ▸
      </button>
    </div>
  );
}

/* ---------- Building blocks ---------- */

/**
 * Angled panel. Its border is an SVG polygon sized to the panel in pixels, so
 * it matches the clip-path exactly and can "draw itself" (stroke-dashoffset)
 * when the panel scrolls into view; then the content flickers on.
 */
function Panel({
  children,
  as = "section",
  amber = false,
  className = "",
  ...rest
}: {
  children: ReactNode;
  as?: "section" | "article" | "div";
  amber?: boolean;
  className?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    resize.observe(el);
    const view = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          view.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    view.observe(el);
    return () => {
      resize.disconnect();
      view.disconnect();
    };
  }, []);

  const cut = 16;
  const points = size
    ? `${cut},0.75 ${size.w - 0.75},0.75 ${size.w - 0.75},${size.h - cut} ${size.w - cut},${size.h - 0.75} 0.75,${size.h - 0.75} 0.75,${cut}`
    : "";
  const Tag = as;
  return (
    <Tag ref={ref as Ref<HTMLDivElement>} className={`hd-panel${amber ? " hd-panel--amber" : ""}${on ? " hd-on" : ""} ${className}`} {...rest}>
      {size && (
        <svg className="hd-border" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
          <polygon points={points} pathLength={1} />
        </svg>
      )}
      <div className="hd-body">{children}</div>
    </Tag>
  );
}

const GLYPHS = "!<>-_\\/[]{}=+*^?#01ABCDEFXYZ$%&@";

/** Decrypt effect: scrambled glyphs resolve into the real text, left to right. */
function Scramble({ text, locale }: { text: string; locale: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const parts = graphemes(text, locale);
  const [frame, setFrame] = useState(() => (prefersReducedMotion() ? Number.POSITIVE_INFINITY : 0));
  const resolved = Math.floor(frame / 2);
  const done = resolved >= parts.length;

  useEffect(() => {
    if (!inView || done) return;
    const id = window.setTimeout(() => setFrame((f) => f + 1), 28);
    return () => window.clearTimeout(id);
  }, [inView, done, frame]);

  return (
    <span ref={ref}>
      <span className="hd-sr" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
        {text}
      </span>
      <span aria-hidden="true">
        {parts.map((ch, i) => (i < resolved || ch === " " ? ch : GLYPHS[(i * 7 + frame * 13) % GLYPHS.length])).join("")}
      </span>
    </span>
  );
}

/** Number that counts up when it scrolls into view. */
function Counter({ value, suffix = "", nf }: { value: number; suffix?: string; nf: (n: number) => string }) {
  const [ref, inView] = useInView<HTMLElement>();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = `${nf(0)}${suffix}`;
    if (!inView) return;
    if (prefersReducedMotion()) {
      el.textContent = `${nf(value)}${suffix}`;
      return;
    }
    const state = { v: 0 };
    const animation = animate(state, {
      v: value,
      duration: 1600,
      ease: "outExpo",
      onUpdate: () => {
        el.textContent = `${nf(Math.round(state.v))}${suffix}`;
      },
    });
    return () => {
      animation.pause();
    };
  }, [inView, value, suffix, nf, ref]);
  return <strong ref={ref} aria-label={`${nf(value)}${suffix}`} />;
}

/** Spider chart of the academy's strengths, with a rotating radar sweep. */
function Radar({ axes }: { axes: { label: string; value: number }[] }) {
  const [ref, inView] = useInView<SVGSVGElement>();
  const shape = useRef<SVGPolygonElement>(null);
  const center = 160;
  const radius = 108;
  const point = (i: number, scale: number) => {
    const angle = -Math.PI / 2 + (i / axes.length) * Math.PI * 2;
    return [center + Math.cos(angle) * radius * scale, center + Math.sin(angle) * radius * scale] as const;
  };
  const poly = (scale: (i: number) => number) =>
    axes.map((_, i) => point(i, scale(i)).map((n) => n.toFixed(1)).join(",")).join(" ");

  useEffect(() => {
    const el = shape.current;
    if (!inView || !el || prefersReducedMotion()) return;
    const animation = animate(el, { scale: [0, 1], opacity: [0, 1], duration: 1200, ease: "outElastic(1, 0.6)" });
    return () => {
      animation.pause();
    };
  }, [inView]);

  return (
    <svg ref={ref} viewBox="0 0 320 320" className="hd-radar" role="img" aria-label={axes.map((a) => `${a.label} ${a.value}%`).join(", ")}>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={poly(() => s)} fill="none" stroke="rgba(0,229,255,0.18)" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(0,229,255,0.18)" />;
      })}
      <g className="hd-sweep">
        <path d={`M${center},${center} L${center},${center - radius} A${radius},${radius} 0 0,1 ${center + radius * Math.sin(0.5)},${center - radius * Math.cos(0.5)} Z`} fill="rgba(0,229,255,0.12)" />
      </g>
      <polygon
        ref={shape}
        points={poly((i) => axes[i].value / 100)}
        fill="rgba(0,229,255,0.22)"
        stroke="#00e5ff"
        strokeWidth="1.5"
        style={{ transformOrigin: "160px 160px" }}
      />
      {axes.map((a, i) => {
        const [x, y] = point(i, 1.24);
        return (
          <text key={a.label} x={x} y={y} textAnchor={Math.abs(x - center) < 8 ? "middle" : x > center ? "start" : "end"} dominantBaseline="middle">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="hd-h2 hd-section-title">
      {children}
    </h2>
  );
}

function MissionFile({ course, index, full = false, ctx }: { course: Course; index: number; full?: boolean; ctx: Ctx }) {
  const t = useTranslations("course");
  const tLevels = useTranslations("levels");
  const { locale, c, nf } = ctx;
  const segments = 20;
  const free = Math.round((course.seatsLeft / course.seatsTotal) * segments);
  return (
    <Panel as="article">
      <div className="hd-panel-head">
        <span className="hd-small hd-dim">
          {c.missionFile} #{nf(index + 1).padStart(3, nf(0))}
        </span>
        <span className="hd-stamp">{c.classified}</span>
      </div>
      <p className="hd-small hd-amber">
        {c.clearance[course.level]} · {tLevels(course.level)}
      </p>
      <h3 className="hd-h3" style={{ marginTop: 8 }}>
        <Scramble text={course.name[locale]} locale={locale} />
      </h3>
      <p className="hd-dim" style={{ marginTop: 8 }}>
        {course.description[locale]}
      </p>
      <dl className="hd-kv">
        <dt>{c.cost}</dt>
        <dd>{t("fee", { amount: course.monthlyFee })}</dd>
        <dt>{c.entry}</dt>
        <dd>{t("fee", { amount: course.admissionFee })}</dd>
        <dt>{c.duration}</dt>
        <dd>{course.duration[locale]}</dd>
      </dl>
      {full && (
        <>
          <p className="hd-small hd-dim">{c.objectives}</p>
          <ul className="hd-tags">
            {course.subjects[locale].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
            {course.batches.map((b) => (
              <li key={b.id}>
                {b.label[locale]} <span className="hd-dim">— {b.schedule[locale]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hd-small" style={{ marginTop: 14 }}>
        {c.slots}: {t("seatsLeft", { count: course.seatsLeft })}
      </p>
      <div className="hd-meter" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <i key={i} className={i >= free ? "hd-used" : undefined} />
        ))}
      </div>
      <div className="hd-actions">
        <Link href={ctx.href(`/admission?course=${course.id}`)} className="hd-btn">
          {c.launch} ▸
        </Link>
      </div>
    </Panel>
  );
}

function Dossier({ teacher, full = false, headingLevel = 3, ctx }: { teacher: Teacher; full?: boolean; headingLevel?: 2 | 3; ctx: Ctx }) {
  const { locale, c, nf } = ctx;
  const Heading = `h${headingLevel}` as const;
  return (
    <Panel as="article">
      <div className="hd-panel-head">
        <span className="hd-small hd-dim">{c.dossier}</span>
        <span className="hd-small hd-amber">{c.serviceRecord(nf(teacher.experienceYears))}</span>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: 64,
            height: 64,
            flexShrink: 0,
            border: "1px solid var(--hd-cyan)",
            clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
            background: "rgba(0,229,255,0.1)",
            fontFamily: "var(--hd-label)",
            fontSize: 20,
            color: "var(--hd-cyan)",
          }}
        >
          {teacher.initials[locale]}
        </span>
        <div>
          <Heading className="hd-h3">
            <Scramble text={teacher.name[locale]} locale={locale} />
          </Heading>
          <p className="hd-amber">{teacher.subject[locale]}</p>
        </div>
      </div>
      <p className="hd-dim" style={{ marginTop: 10 }}>
        {teacher.qualification[locale]}
      </p>
      <div className="hd-meter" aria-hidden="true" style={{ marginTop: 10 }}>
        {Array.from({ length: 15 }, (_, i) => (
          <i key={i} className={i >= teacher.experienceYears ? "hd-used" : undefined} />
        ))}
      </div>
      {full && <p style={{ marginTop: 12 }}>“{teacher.bio[locale]}”</p>}
    </Panel>
  );
}

function DemoNote() {
  const t = useTranslations("demo");
  if (!site.demo.enabled) return null;
  return (
    <div className="hd-demo" role="note">
      <strong>{t("bannerTitle")}</strong>
      {t("bannerText")}
    </div>
  );
}

const formClasses: FormClasses = {
  field: "hd-field",
  label: "hd-flabel",
  input: "hd-input",
  hint: "hd-hint",
  error: "hd-error",
  alert: "hd-alert",
  ok: "hd-ok",
  legend: "hd-flabel",
  radio: "hd-radio",
  submit: "hd-btn hd-submit",
  demo: "hd-btn hd-btn--amber hd-demo-btn",
};

function confirmConfig(c: HudCopy): ConfirmConfig {
  return {
    title: c.transmitTitle,
    text: c.transmitText,
    yes: c.transmitYes,
    no: c.transmitNo,
    className: "hd-confirm",
    panelClassName: "hd-confirm-panel",
    yesClassName: "hd-btn hd-btn--amber",
    noClassName: "hd-btn",
  };
}

const onFormError = () => beep(220, 0.18);

/* ---------- Pages ---------- */

function Bridge(ctx: Ctx) {
  const { locale, c, nf } = ctx;
  const t = useTranslations("home");
  const tDemo = useTranslations("demo");
  const axes = [
    { label: c.scanAxes.batch, value: 92 },
    { label: c.scanAxes.report, value: 100 },
    { label: c.scanAxes.tests, value: 88 },
    { label: c.scanAxes.bkash, value: 100 },
    { label: c.scanAxes.exp, value: 80 },
    { label: c.scanAxes.results, value: 86 },
  ];
  return (
    <>
      <Panel aria-labelledby="hd-title">
        <p className="hd-small hd-amber">
          {c.sections.briefing} {"//"} {t("eyebrow")}
        </p>
        <h1 id="hd-title" className="hd-h1" style={{ marginTop: 12 }}>
          <Scramble text={t("title")} locale={locale} />
        </h1>
        <p style={{ marginTop: 14, maxWidth: 720 }}>{t("subtitle")}</p>
        <div className="hd-actions">
          <Link href={ctx.href("/admission")} className="hd-btn hd-btn--amber">
            {c.sections.cta} ▸
          </Link>
          <Link href={ctx.href("/courses")} className="hd-btn">
            {c.nav.courses}
          </Link>
        </div>
      </Panel>

      {site.demo.enabled && (
        <div className="hd-demo hd-section">
          {tDemo("stripText")}{" "}
          <Link href={ctx.href("/admission")} style={{ color: "#fafafa", textDecoration: "underline" }}>
            {tDemo("stripCta")} →
          </Link>
        </div>
      )}

      <div className="hd-grid hd-split hd-section">
        <Panel aria-labelledby="hd-telemetry">
          <SectionTitle id="hd-telemetry">{c.sections.telemetry}</SectionTitle>
          <div className="hd-readouts">
            {(
              [
                ["years", site.stats.years, "+"],
                ["students", site.stats.students, "+"],
                ["gpa5", site.stats.gpa5, "+"],
                ["batch", site.stats.batchMax, ""],
              ] as const
            ).map(([key, value, suffix]) => (
              <div key={key} className="hd-readout">
                <Counter value={value} suffix={suffix} nf={nf} />
                <span className="hd-small hd-dim">{c.telemetry[key]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel aria-labelledby="hd-scan">
          <SectionTitle id="hd-scan">{c.sections.scan}</SectionTitle>
          <Radar axes={axes} />
        </Panel>
      </div>

      <section className="hd-section" aria-labelledby="hd-active">
        <SectionTitle id="hd-active">{c.sections.active}</SectionTitle>
        <div className="hd-grid hd-grid-3">
          {courses
            .filter((course) => course.featured)
            .map((course) => (
              <MissionFile key={course.id} course={course} index={courses.indexOf(course)} ctx={ctx} />
            ))}
        </div>
        <p style={{ marginTop: 16 }}>
          <Link href={ctx.href("/courses")} className="hd-label hd-small">
            {c.allMissions} ▸
          </Link>
        </p>
      </section>

      <section className="hd-section" aria-labelledby="hd-crew">
        <SectionTitle id="hd-crew">{c.sections.crew}</SectionTitle>
        <div className="hd-grid hd-grid-2">
          {teachers
            .filter((teacher) => teacher.featured)
            .map((teacher) => (
              <Dossier key={teacher.id} teacher={teacher} ctx={ctx} />
            ))}
        </div>
      </section>

      <section className="hd-section" aria-labelledby="hd-comms">
        <SectionTitle id="hd-comms">{c.sections.comms}</SectionTitle>
        <div className="hd-grid hd-grid-3">
          {testimonials.map((item, i) => (
            <Panel key={item.id} as="article">
              <p className="hd-small hd-amber">
                {c.transmission} TX-{nf(i + 1).padStart(2, nf(0))} · {item.role[locale]}
              </p>
              <blockquote style={{ margin: "10px 0" }}>“{item.quote[locale]}”</blockquote>
              <p className="hd-dim">— {item.name[locale]}</p>
            </Panel>
          ))}
        </div>
      </section>

      <Panel className="hd-section hd-kb" aria-labelledby="hd-kb">
        <SectionTitle id="hd-kb">{c.sections.kb}</SectionTitle>
        {faqs.map((faq, i) => (
          <details key={faq.id} open={i === 0}>
            <summary>
              <span className="hd-dim">{c.query}:</span> {faq.question[locale]}
            </summary>
            <p>{faq.answer[locale]}</p>
          </details>
        ))}
      </Panel>

      <Panel amber className="hd-section" aria-labelledby="hd-cta">
        <h2 id="hd-cta" className="hd-h2" style={{ color: "var(--hd-amber)" }}>
          {t("ctaTitle")}
        </h2>
        <p style={{ marginTop: 8 }}>{t("ctaText")}</p>
        <div className="hd-actions">
          <Link href={ctx.href("/admission")} className="hd-btn hd-btn--amber">
            {c.sections.cta} ▸
          </Link>
          <a href={`tel:${site.contact.phone}`} className="hd-btn">
            {t("ctaCall", { phone: site.contact.phone })}
          </a>
        </div>
      </Panel>
    </>
  );
}

function PageHead({ title, intro, kicker, locale }: { title: string; intro?: string; kicker: string; locale: string }) {
  return (
    <Panel>
      <p className="hd-small hd-amber">{kicker}</p>
      <h1 className="hd-h1" style={{ marginTop: 10 }}>
        <Scramble text={title} locale={locale} />
      </h1>
      {intro && <p style={{ marginTop: 12, maxWidth: 760 }}>{intro}</p>}
    </Panel>
  );
}

function Missions(ctx: Ctx) {
  const { c, locale } = ctx;
  const t = useTranslations("coursesPage");
  const tLevels = useTranslations("levels");
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} kicker={c.sections.active} locale={locale} />
      {levels.map((level) => (
        <section key={level} className="hd-section" aria-labelledby={`hd-level-${level}`}>
          <SectionTitle id={`hd-level-${level}`}>
            {c.clearance[level]} · {tLevels(level)}
          </SectionTitle>
          <div className="hd-grid hd-grid-2">
            {courses
              .filter((course) => course.level === level)
              .map((course) => (
                <MissionFile key={course.id} course={course} index={courses.indexOf(course)} full ctx={ctx} />
              ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Crew(ctx: Ctx) {
  const { c, locale } = ctx;
  const t = useTranslations("teachersPage");
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} kicker={c.sections.crew} locale={locale} />
      <div className="hd-grid hd-grid-3 hd-section">
        {teachers.map((teacher) => (
          <Dossier key={teacher.id} teacher={teacher} full headingLevel={2} ctx={ctx} />
        ))}
      </div>
    </>
  );
}

function Enlist(ctx: Ctx) {
  const { c, locale } = ctx;
  const t = useTranslations("admissionPage");
  const tCourse = useTranslations("course");
  const accountType = site.payments.bkashAccountType;
  const steps = ["open", "send", "copy", "fill"] as const;
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} kicker={c.enlistTerminal} locale={locale} />
      <div className="hd-grid hd-split hd-section">
        <Panel aria-labelledby="hd-form-title">
          <SectionTitle id="hd-form-title">{t("formTitle")}</SectionTitle>
          <ThemedAdmissionForm
            locale={locale}
            cls={formClasses}
            idPrefix="hd-"
            initialCourseId={ctx.searchParams.get("course") ?? undefined}
            demoLabel={`◆ ${c.autofill}`}
            submitLabel={`${c.transmitYes.replace("[Y] ", "")} ▸`}
            pendingLabel={c.transmitting}
            confirm={confirmConfig(c)}
            onFeedback={onFormError}
          />
        </Panel>
        <div className="hd-grid">
          <DemoNote />
          <Panel amber aria-labelledby="hd-uplink">
            <SectionTitle id="hd-uplink">{c.uplink}</SectionTitle>
            <ol style={{ paddingLeft: 20 }}>
              {steps.map((step) => (
                <li key={step} style={{ marginTop: 6 }}>
                  {step === "open" ? t("steps.open", { action: accountType === "merchant" ? t("payment") : t("sendMoney") }) : t(`steps.${step}`)}
                </li>
              ))}
            </ol>
            <p className="hd-small hd-dim" style={{ marginTop: 14 }}>
              {t("payTo")}
            </p>
            <p className="hd-h2" style={{ color: "var(--hd-amber)" }}>
              {site.payments.bkashNumber}
            </p>
            <p className="hd-small hd-dim">{t("accountType", { type: accountType })}</p>
          </Panel>
          <Panel aria-labelledby="hd-fees">
            <SectionTitle id="hd-fees">{c.feeTable}</SectionTitle>
            <dl className="hd-kv" style={{ margin: 0 }}>
              {courses.map((course) => (
                <div key={course.id} style={{ display: "contents" }}>
                  <dt>{course.name[locale]}</dt>
                  <dd>{tCourse("fee", { amount: course.admissionFee })}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Received(ctx: Ctx) {
  const { c, locale } = ctx;
  const t = useTranslations("success");
  const tDemo = useTranslations("demo");
  const ref = ctx.searchParams.get("ref");
  const valid = ref && REF_PATTERN.test(ref) ? ref : null;
  const extras = ["admin", "cms", "login", "gateway", "sms"] as const;
  return (
    <>
      <PageHead title={c.received} intro={t("intro")} kicker={t("title")} locale={locale} />
      <Panel amber className="hd-section">
        <p className="hd-small hd-dim">{t("refLabel")}</p>
        <p className="hd-h1" style={{ color: "var(--hd-amber)", marginTop: 6 }}>
          {valid ? <Scramble text={valid} locale={locale} /> : "—"}
        </p>
        <p style={{ marginTop: 8 }}>{valid ? t("refHint") : t("noRef")}</p>
      </Panel>
      <Panel className="hd-section">
        <SectionTitle id="hd-next">{t("nextTitle")}</SectionTitle>
        <ol style={{ paddingLeft: 20 }}>
          {(["verify", "call", "start"] as const).map((k) => (
            <li key={k} style={{ marginTop: 6 }}>
              {t(`next.${k}`)}
            </li>
          ))}
        </ol>
      </Panel>
      {site.demo.enabled && (
        <div className="hd-demo hd-section">
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
            <a href={site.demo.hireUrl} target="_blank" rel="noopener" className="hd-btn hd-btn--amber" style={{ marginTop: 12 }}>
              {tDemo("cta")}
            </a>
          )}
        </div>
      )}
      <p className="hd-section">
        <Link href={ctx.href("/")} className="hd-btn">
          ◂ {c.reroute}
        </Link>
      </p>
    </>
  );
}

function Comms(ctx: Ctx) {
  const { c, locale } = ctx;
  const t = useTranslations("contactPage");
  const tFooter = useTranslations("footer");
  const tForm = useTranslations("contactForm");
  return (
    <>
      <PageHead title={t("title")} intro={t("intro")} kicker={c.coords} locale={locale} />
      <div className="hd-grid hd-split hd-section">
        <Panel aria-labelledby="hd-contact-title">
          <SectionTitle id="hd-contact-title">{tForm("title")}</SectionTitle>
          <ThemedContactForm locale={locale} cls={formClasses} idPrefix="hd-contact-" confirm={confirmConfig(c)} onFeedback={onFormError} />
        </Panel>
        <div className="hd-grid">
          <Panel>
            <dl className="hd-kv" style={{ margin: 0 }}>
              <dt>{t("address")}</dt>
              <dd>{site.contact.address[locale]}</dd>
              <dt>{t("phone")}</dt>
              <dd>
                <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a>
              </dd>
              <dt>{t("email")}</dt>
              <dd>
                <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
              </dd>
              <dt>{t("hours")}</dt>
              <dd>{tFooter("hours")}</dd>
            </dl>
          </Panel>
          <div style={{ filter: "invert(0.92) hue-rotate(180deg)" }}>
            <MapFacade query={site.contact.mapQuery} title={t("mapTitle")} label={t("loadMap")} note={t("mapNote")} />
          </div>
        </div>
      </div>
    </>
  );
}

function SignalLost(ctx: Ctx) {
  const { c, locale } = ctx;
  return (
    <Panel amber>
      <p className="hd-small" style={{ color: "var(--hd-red)" }}>
        {"ERR 404 // NO CARRIER"}
      </p>
      <h1 className="hd-h1" style={{ marginTop: 10, color: "var(--hd-red)", textShadow: "0 0 24px rgba(255,59,92,0.5)" }}>
        <Scramble text={c.signalLost} locale={locale} />
      </h1>
      <p style={{ marginTop: 12 }}>{c.signalText}</p>
      <div className="hd-actions">
        <Link href={ctx.href("/")} className="hd-btn hd-btn--amber">
          ◂ {c.reroute}
        </Link>
      </div>
    </Panel>
  );
}
