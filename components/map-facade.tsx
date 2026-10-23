"use client";

import { useState } from "react";

/** Shows a lightweight placeholder; the Google Maps iframe loads only on click. */
export function MapFacade({ query, title, label, note }: { query: string; title: string; label: string; note: string }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
        title={title}
        className="h-80 w-full rounded-xl border border-brand/10"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group relative grid h-80 w-full place-items-center overflow-hidden rounded-xl border border-brand/10 bg-brand/5"
    >
      {/* Decorative street grid */}
      <svg aria-hidden="true" className="absolute inset-0 size-full text-brand/10" preserveAspectRatio="none" viewBox="0 0 400 300">
        <g stroke="currentColor" strokeWidth="10" fill="none">
          <path d="M0 80h400M0 200h400M90 0v300M260 0v300M0 300L400 0" />
        </g>
      </svg>
      <span className="relative flex flex-col items-center gap-2">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-10 text-brand" fill="currentColor">
          <path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
        </svg>
        <span className="rounded-md bg-white px-4 py-2 font-semibold text-brand shadow-sm group-hover:bg-brand group-hover:text-white">
          {label}
        </span>
        <span className="text-sm text-muted">{note}</span>
      </span>
    </button>
  );
}
