"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLabels = { label: string; openMenu: string; closeMenu: string };

// Hrefs (already locale-prefixed) and labels come from the server, so no
// translation runtime ships to the browser.
export function MainNav({
  items,
  homeHref,
  labels,
}: {
  items: { href: string; label: string }[];
  homeHref: string;
  labels: NavLabels;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === homeHref ? pathname === homeHref : pathname.startsWith(href);
  // Remember which page the mobile menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = items.map((item) => {
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`block rounded-md px-3 py-2 font-medium transition-colors ${
            active ? "text-brand" : "text-ink/80 hover:text-brand"
          }`}
        >
          {item.label}
        </Link>
      </li>
    );
  });

  return (
    <nav aria-label={labels.label}>
      <ul className="hidden items-center gap-1 lg:flex">{links}</ul>

      <button
        type="button"
        onClick={() => setOpenOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? labels.closeMenu : labels.openMenu}
        className="grid size-10 place-items-center rounded-md text-ink lg:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      <ul
        id="mobile-menu"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-brand/10 bg-surface px-4 py-3 shadow-md lg:hidden"
      >
        {links}
      </ul>
    </nav>
  );
}
