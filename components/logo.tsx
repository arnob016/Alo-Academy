import { useLocale } from "next-intl";
import { Link } from "./locale-link";
import { site } from "@/config/site";

export function Logo() {
  const locale = useLocale();

  return (
    <Link href="/" className="flex items-center gap-2 rounded-md">
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="size-9 shrink-0"
      >
        <circle cx="16" cy="16" r="16" className="fill-brand" />
        <circle cx="16" cy="17" r="6" className="fill-accent" />
        <g className="stroke-accent" strokeWidth="2" strokeLinecap="round">
          <path d="M16 6.5v3M7.5 17h3M21.5 17h3M10 11l2 2M22 11l-2 2" />
        </g>
      </svg>
      <span className="text-lg font-semibold leading-tight text-brand">
        {site.name[locale]}
      </span>
    </Link>
  );
}
