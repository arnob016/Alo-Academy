import { notFound } from "next/navigation";

// Unknown paths under a locale render [locale]/not-found.tsx inside the site
// layout (and the active theme), instead of Next's bare default 404.
export default function CatchAll() {
  notFound();
}
