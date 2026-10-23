"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Locale } from "@/i18n/routing";
import { loadTheme } from "./loaders";
import { switcherCopy, themes, type ThemeId } from "./registry";
import { prefersReducedMotion, setTheme, useTheme } from "./store";

/**
 * The theme picker: a floating button that opens a "channel guide" of live
 * mini previews. Part of the portfolio demo layer (neutral zinc styling).
 */
export function ThemeSwitcher({ locale }: { locale: Locale }) {
  const current = useTheme();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState<ThemeId | null>(null);

  async function choose(id: ThemeId) {
    if (id === current) {
      dialogRef.current?.close();
      return;
    }
    if (id !== "classic") {
      setLoading(id);
      try {
        await loadTheme(id, locale);
      } catch (error) {
        // Chunk failed to load: stay on the current theme; choosing again retries.
        console.error(error);
        return;
      } finally {
        setLoading(null);
      }
    }
    dialogRef.current?.close();

    const apply = () => flushSync(() => setTheme(id));
    if (!document.startViewTransition || prefersReducedMotion()) {
      apply();
      return;
    }
    // Each theme defines its own entrance (see globals.css: html[data-vt=…]).
    document.documentElement.setAttribute("data-vt", id);
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => document.documentElement.removeAttribute("data-vt"));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="theme-fab fixed right-4 bottom-4 z-[70] flex items-center gap-2 rounded-full bg-zinc-900 py-2 pr-4 pl-2 text-sm font-semibold text-white shadow-lg ring-2 ring-white/80 hover:bg-zinc-800"
      >
        <span aria-hidden="true" className="flex -space-x-1.5">
          {["#0f4c5c", "#38b764", "#c9a227", "#00e5ff", "#ff4f00"].map((c) => (
            <span key={c} className="size-4 rounded-full ring-2 ring-zinc-900" style={{ background: c }} />
          ))}
        </span>
        {switcherCopy.open[locale]}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="theme-switcher-title"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="theme-dialog m-auto w-[min(56rem,calc(100%-2rem))] rounded-2xl bg-zinc-950 p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="theme-switcher-title" className="text-xl font-semibold sm:text-2xl">
                {switcherCopy.title[locale]}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{switcherCopy.subtitle[locale]}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={switcherCopy.close[locale]}
              className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/10"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {themes.map((theme, i) => {
              const active = theme.id === current;
              return (
                <li key={theme.id} className="theme-card" style={{ animationDelay: `${i * 45}ms` }}>
                  <button
                    type="button"
                    disabled={!theme.ready || loading !== null}
                    onClick={() => choose(theme.id)}
                    aria-pressed={active}
                    className={`group block w-full rounded-xl p-2 text-left transition-colors disabled:cursor-not-allowed ${
                      active ? "bg-white/15 ring-2 ring-white" : "bg-white/5 enabled:hover:bg-white/10"
                    }`}
                  >
                    <ThemePreview id={theme.id} dimmed={!theme.ready} />
                    <span className="mt-2 flex items-center justify-between gap-2 px-1">
                      <span className="font-semibold">{theme.name[locale]}</span>
                      {active && <Badge>{switcherCopy.active[locale]}</Badge>}
                      {!theme.ready && <Badge muted>{switcherCopy.soon[locale]}</Badge>}
                      {loading === theme.id && <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    </span>
                    <span className="block px-1 pb-1 text-xs text-zinc-400">{theme.tagline[locale]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}

function Badge({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${muted ? "bg-white/10 text-zinc-300" : "bg-white text-zinc-900"}`}>
      {children}
    </span>
  );
}

/** Tiny hand-built previews; each hints at the theme's signature move on hover. */
function ThemePreview({ id, dimmed }: { id: ThemeId; dimmed: boolean }) {
  return (
    <span aria-hidden="true" className={`preview preview-${id} relative block aspect-[16/10] overflow-hidden rounded-lg ${dimmed ? "opacity-60" : ""}`}>
      {id === "classic" && (
        <>
          <span className="absolute inset-x-0 top-0 h-[14%] bg-[#fffbf3] shadow-sm" />
          <span className="absolute top-[24%] left-[8%] h-[9%] w-[48%] rounded-sm bg-[#0f4c5c]" />
          <span className="absolute top-[38%] left-[8%] h-[5%] w-[38%] rounded-sm bg-[#5b6673]/50" />
          <span className="absolute top-[50%] left-[8%] h-[11%] w-[18%] rounded-sm bg-[#f2a93b]" />
          <span className="absolute top-[24%] right-[8%] h-[46%] w-[30%] rounded-md bg-[#0f4c5c]" />
          <span className="absolute inset-x-[8%] bottom-[8%] h-[16%] rounded bg-white shadow-sm" />
        </>
      )}
      {id === "pixel" && (
        <>
          <span className="absolute inset-x-0 bottom-0 h-[22%] bg-[#38b764] [box-shadow:inset_0_4px_0_#a7f070]" />
          <span className="absolute top-[14%] left-[8%] h-[34%] w-[84%] bg-[#1a1c2c] [box-shadow:0_0_0_3px_#f4f4f4,inset_0_0_0_3px_#1a1c2c,inset_0_0_0_4px_#41a6f6]" />
          <span className="absolute top-[24%] left-[14%] h-[5%] w-[52%] bg-[#ffcd75]" />
          <span className="absolute top-[34%] left-[14%] h-[5%] w-[38%] bg-[#f4f4f4]/70" />
          <span className="pixel-hero absolute bottom-[22%] left-[20%] h-[16%] w-[7%] bg-[#b13e53] [box-shadow:0_-6px_0_#ffcd75]" />
        </>
      )}
      {id === "cinema" && (
        <>
          <span className="absolute inset-x-0 top-0 h-[16%] bg-black" />
          <span className="absolute inset-x-0 bottom-0 h-[16%] bg-black" />
          <span className="absolute top-[34%] left-[10%] h-[14%] w-[62%] bg-[#ede6d6]" />
          <span className="absolute top-[54%] left-[10%] h-[2%] w-[30%] bg-[#c9a227]" />
          <span className="absolute top-[60%] left-[10%] h-[4%] w-[44%] bg-[#ede6d6]/40" />
        </>
      )}
      {id === "hud" && (
        <>
          <span className="absolute inset-[12%] border border-[#00e5ff]/70 bg-[#00e5ff]/5 [clip-path:polygon(8%_0,100%_0,100%_80%,92%_100%,0_100%,0_20%)]" />
          <span className="absolute top-[26%] right-[18%] size-[30%] rounded-full border border-[#00e5ff]/60" />
          <span className="absolute top-[30%] left-[20%] h-[4%] w-[30%] bg-[#00e5ff]" />
          <span className="absolute top-[40%] left-[20%] h-[3%] w-[22%] bg-[#ffb300]" />
          <span className="hud-scan absolute inset-x-[12%] top-[12%] h-[2px] bg-[#00e5ff]/80" />
        </>
      )}
      {id === "sketch" && (
        <>
          <span className="absolute inset-0 [background:repeating-linear-gradient(transparent_0_11px,#2f4ea1_11px_12px)] opacity-25" />
          <span className="absolute top-[22%] left-[10%] h-[12%] w-[46%] bg-[#ffeb3b]/70 [border-radius:40%_10%_30%_10%]" />
          <span className="absolute top-[24%] left-[12%] h-[8%] w-[40%] border-b-2 border-[#2b2b2b]" />
          <span className="absolute top-[46%] right-[12%] h-[38%] w-[30%] rotate-3 bg-white shadow" />
          <span className="absolute top-[52%] left-[12%] size-[22%] rounded-[60%_40%_55%_45%] border-2 border-[#e4572e]" />
        </>
      )}
      {id === "editorial" && (
        <>
          <span className="absolute -top-[18%] -left-[2%] font-serif text-[4.6rem] leading-none font-black text-[#111]">Aa</span>
          <span className="absolute top-[18%] right-[8%] h-[42%] w-[22%] bg-[#ff4f00]" />
          <span className="absolute bottom-[12%] left-[8%] h-[3%] w-[52%] bg-[#111]" />
          <span className="absolute bottom-[20%] left-[8%] h-[3%] w-[40%] bg-[#111]/40" />
        </>
      )}
    </span>
  );
}
