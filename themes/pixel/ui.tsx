"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { animate, stagger, steps } from "animejs";
import { prefersReducedMotion } from "../store";
import { sfx } from "./sound";
import { HeroFrames } from "./sprites";

/** True once the element has scrolled into view (fires once). */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

/**
 * RPG dialogue box: text types out grapheme by grapheme (so Bangla conjuncts
 * never break apart), clicking skips ahead, ▼ blinks when done. Screen readers
 * get the full text immediately; the full text also reserves the box's height.
 */
export function Dialogue({
  speaker,
  text,
  locale,
  skipHint,
  face,
  children,
}: {
  speaker?: string;
  text: string;
  locale: string;
  skipHint: string;
  /** Speaker portrait, shown at the left like an RPG face box. */
  face?: ReactNode;
  children?: ReactNode;
}) {
  const parts = useMemo(
    () => Array.from(new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text), (s) => s.segment),
    [text, locale],
  );
  const [ref, inView] = useInView<HTMLDivElement>();
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? Number.POSITIVE_INFINITY : 0));
  const done = shown >= parts.length;

  useEffect(() => {
    if (!inView || done) return;
    const id = window.setTimeout(() => {
      setShown((n) => n + 1);
      if (shown % 3 === 0) sfx.type();
    }, 24);
    return () => window.clearTimeout(id);
  }, [inView, done, shown]);

  return (
    <div ref={ref} className="pq-frame">
      {speaker && <span className="pq-speaker pq-label">{speaker}</span>}
      <div className={face ? "pq-talk" : undefined}>
        {face && <span className="pq-face">{face}</span>}
        <div>
          <p className="pq-sr">{text}</p>
          <p className="pq-typed" aria-hidden="true" title={done ? undefined : skipHint} onClick={() => setShown(Number.POSITIVE_INFINITY)}>
            <span className="pq-ghost">{text}</span>
            <span className="pq-live">{parts.slice(0, shown).join("")}</span>
          </p>
          {children}
        </div>
      </div>
      {done && (
        <span className="pq-arrow" aria-hidden="true">
          ▼
        </span>
      )}
    </div>
  );
}

/** HP/MP-style bar that fills in chunky frames when it scrolls into view. */
export function StatBar({
  label,
  value,
  valueText,
  variant = "hp",
}: {
  label: string;
  value: number;
  valueText?: string;
  variant?: "hp" | "mp" | "xp";
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = fill.current;
    if (!inView || !el) return;
    if (prefersReducedMotion()) {
      el.style.width = `${value}%`;
      return;
    }
    const animation = animate(el, {
      width: ["0%", `${value}%`],
      duration: 900,
      ease: steps(Math.max(4, Math.round(value / 8))),
    });
    return () => {
      animation.pause();
    };
  }, [inView, value]);

  return (
    <div className="pq-bar-row">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{label}</span>
        <span className="pq-muted">{valueText ?? `${value}%`}</span>
      </div>
      <div
        ref={ref}
        className={`pq-bar pq-bar--${variant}`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={valueText}
      >
        <span ref={fill} />
      </div>
    </div>
  );
}

/** Children matching `selector` drop in one after another, in stepped frames. */
export function useStaggerIn(container: RefObject<HTMLElement | null>, selector: string, inView: boolean) {
  useEffect(() => {
    const root = container.current;
    if (!inView || !root || prefersReducedMotion()) return;
    const targets = root.querySelectorAll<HTMLElement>(selector);
    if (!targets.length) return;
    const animation = animate(targets, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 420,
      ease: steps(4),
      delay: stagger(90),
    });
    return () => {
      animation.revert();
    };
  }, [container, selector, inView]);
}

/** The hero walks along the ground as you scroll: position = scroll progress, snapped to a 4px grid. */
export function Walker() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    let lastY = window.scrollY;
    let frame = 0;
    let idle = 0;

    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      const x = Math.round((8 + progress * (window.innerWidth - 64)) / 4) * 4;
      el.style.transform = `translateX(${x}px)`;
      const dy = window.scrollY - lastY;
      if (dy !== 0 && !reduced) {
        el.dataset.flip = String(dy < 0);
        el.dataset.step = String(Math.floor(window.scrollY / 28) % 2);
        window.clearTimeout(idle);
        idle = window.setTimeout(() => (el.dataset.step = "0"), 160);
      }
      lastY = window.scrollY;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
    };
  }, []);

  return (
    <>
      <div className="pq-ground" aria-hidden="true" />
      <div ref={ref} className="pq-walker" data-step="0" data-flip="false" aria-hidden="true">
        <HeroFrames />
      </div>
    </>
  );
}

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** ↑ ↑ ↓ ↓ ← → ← → B A */
export function useKonami(onUnlock: () => void) {
  const callback = useRef(onUnlock);
  useEffect(() => {
    callback.current = onUnlock;
  });
  useEffect(() => {
    let index = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI[index]) {
        index += 1;
        if (index === KONAMI.length) {
          index = 0;
          callback.current();
        }
      } else {
        index = key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** A shower of pixel stars, animated with anime.js in 12 frames each. */
export function starBurst(count = 28) {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const star = document.createElement("div");
    star.className = "pq-star";
    star.style.left = `${Math.round((Math.random() * window.innerWidth) / 4) * 4}px`;
    document.body.appendChild(star);
    animate(star, {
      translateY: [0, window.innerHeight + 40],
      rotate: [0, 90 * (Math.random() > 0.5 ? 1 : -1)],
      duration: 1400 + Math.random() * 1200,
      delay: Math.random() * 500,
      ease: steps(12),
      onComplete: () => star.remove(),
    });
  }
}
