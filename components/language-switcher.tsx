"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = { target: string; text: string; label: string };

/**
 * Same page in the other language. The query (e.g. ?course=, ?ref=) is kept;
 * reading it needs a Suspense boundary so pages stay statically prerendered.
 */
export function LanguageSwitcher(props: Props) {
  return (
    <Suspense fallback={<SwitchLink {...props} query="" />}>
      <SwitchLinkWithQuery {...props} />
    </Suspense>
  );
}

function SwitchLinkWithQuery(props: Props) {
  const query = useSearchParams().toString();
  return <SwitchLink {...props} query={query} />;
}

function SwitchLink({ target, text, label, query }: Props & { query: string }) {
  // Swap the leading locale segment.
  const path = usePathname().replace(/^\/[^/]+/, `/${target}`);

  return (
    <Link
      href={query ? `${path}?${query}` : path}
      lang={target}
      hrefLang={target}
      aria-label={label}
      className="rounded-md border border-brand/30 px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
    >
      {text}
    </Link>
  );
}
