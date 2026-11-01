"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Hrefs (already locale-prefixed) and labels come from the server, so no
// translation runtime ships with the layout.
export function OfficeNav({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  // The first item is the office home (admissions), which only matches exactly.
  const isActive = (href: string, i: number) => (i === 0 ? pathname === href : pathname.startsWith(href));

  return (
    <nav aria-label={label} className="border-b border-brand/10 bg-white print:hidden">
      <ul className="relative mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {items.map((item, i) => {
          const active = isActive(item.href, i);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  active ? "border-brand text-brand" : "border-transparent text-ink/70 hover:text-brand"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
