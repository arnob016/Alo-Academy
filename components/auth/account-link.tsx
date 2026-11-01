"use client";

import Link from "next/link";
import { useWho } from "@/lib/use-who";

/** Header chip: "Sign in", or the signed-in person's initial and first name. Hrefs come from the server. */
export function AccountLink({
  signInHref,
  accountHref,
  labels,
}: {
  signInHref: string;
  accountHref: string;
  labels: { signIn: string; account: string };
}) {
  const who = useWho();

  if (!who) {
    return (
      <Link
        href={signInHref}
        className="rounded-md border border-brand/30 px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
      >
        {labels.signIn}
      </Link>
    );
  }

  const first = who.name.trim().split(/\s+/)[0] ?? who.name;
  return (
    <Link
      href={accountHref}
      aria-label={`${labels.account}: ${who.name}`}
      className="flex items-center gap-2 rounded-full border border-brand/20 py-1 pr-3 pl-1 text-sm font-semibold text-ink transition-colors hover:border-brand/50"
    >
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">
        {Array.from(first)[0]?.toUpperCase()}
      </span>
      <span className="hidden max-w-24 truncate sm:inline">{first}</span>
    </Link>
  );
}
