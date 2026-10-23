"use client";

import { useEffect, useState } from "react";

/** Copies `value` to the clipboard and briefly confirms. Labels come from the server. */
export function CopyButton({
  value,
  labels,
  className = "",
}: {
  value: string;
  labels: { copy: string; copied: string };
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context or denied): the value is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-md border border-current/30 px-2.5 py-1 text-sm font-semibold transition-colors hover:bg-current/10 ${className}`}
    >
      <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
    </button>
  );
}
