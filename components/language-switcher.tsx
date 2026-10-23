"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LanguageSwitcher({ target, text, label }: { target: string; text: string; label: string }) {
  // Same page in the other language: swap the leading locale segment.
  const href = usePathname().replace(/^\/[^/]+/, `/${target}`);

  return (
    <Link
      href={href}
      lang={target}
      hrefLang={target}
      aria-label={label}
      className="rounded-md border border-brand/30 px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
    >
      {text}
    </Link>
  );
}
