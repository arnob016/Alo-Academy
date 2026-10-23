"use client";

import { useState } from "react";

/**
 * Portfolio sales bar. Deliberately styled outside the Alo Academy brand
 * (neutral dark + white) so it never reads as part of the client's site.
 */
export function HireBar({
  href,
  text,
}: {
  href: string;
  text: { badge: string; pitch: string; cta: string; dismiss: string };
}) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="hire-bar bg-zinc-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <span className="rounded bg-white px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-zinc-900">
          {text.badge}
        </span>
        <p className="hire-pitch min-w-0 flex-1 leading-snug">{text.pitch}</p>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener"
            className="shrink-0 rounded bg-white px-3 py-1 font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            {text.cta}
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={text.dismiss}
          className="grid size-7 shrink-0 place-items-center rounded hover:bg-white/10"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
