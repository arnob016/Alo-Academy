"use client";

import { useState } from "react";
import Link from "next/link";

type DemoFeature = {
  id: "admission" | "dashboard" | "track" | "trial" | "routine" | "results" | "themes" | "accounts";
  title: string;
  description: string;
  action: string;
  /** Already locale-prefixed: this client component has no translation runtime. */
  href: string;
  status: string;
};

export function LiveDemoPanel({
  eyebrow,
  title,
  intro,
  features,
  activeLabel,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  features: DemoFeature[];
  activeLabel: string;
}) {
  const [activeId, setActiveId] = useState<DemoFeature["id"]>("admission");
  const active = features.find((feature) => feature.id === activeId) ?? features[0];
  if (!active) return null;

  return (
    <section aria-labelledby="live-demo-panel" className="overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-xl">
      <div className="space-y-8 p-6 sm:p-8">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
            <h2 id="live-demo-panel" className="mt-3 text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-zinc-300">{intro}</p>
          </div>
          <div className="mt-6 flex shrink-0 items-center gap-2 text-sm text-emerald-300 lg:mt-0">
            <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_currentColor]" />
            {activeLabel}: {active.title}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const selected = feature.id === active.id;
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => setActiveId(feature.id)}
                aria-pressed={selected}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-emerald-300 bg-emerald-300/15"
                    : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                <span className="font-semibold">{feature.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-zinc-400">{feature.description}</span>
                <span className="mt-4 block text-xs font-bold uppercase tracking-wide text-emerald-300">
                  {feature.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 bg-white/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-sm text-zinc-300">{active.description}</p>
        {active.id === "themes" ? (
          <a
            href="#theme-switcher"
            onClick={(e) => {
              // The floating button opens the picker dialog.
              e.preventDefault();
              document.getElementById("theme-switcher")?.click();
            }}
            className="shrink-0 rounded-md bg-white px-4 py-2 text-center text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
          >
            {active.action} →
          </a>
        ) : (
          <Link
            href={active.href}
            className="shrink-0 rounded-md bg-white px-4 py-2 text-center text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
          >
            {active.action} →
          </Link>
        )}
      </div>
    </section>
  );
}
