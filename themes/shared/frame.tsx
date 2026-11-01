"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Dresses a tool page (routine, results, sign-in, office…) in a theme. Those
 * pages keep their classic markup, which carries all their behaviour; the frame
 *
 * - turns the classic page container (#classic-root) into the theme's root, so
 *   the theme's background, fonts and colours apply, and marks it "theme-app"
 *   (globals.css then hides the classic header and footer);
 * - puts the theme's own header, footer and background effects into the empty
 *   slots the root layout leaves for them.
 *
 * The page content itself is restyled by shared/app-skin.css plus the "Tool
 * pages" section of each theme's stylesheet.
 */
export function AppFrame({
  rootClass,
  header,
  footer,
  effects,
}: {
  /** The theme's root class(es), e.g. "cn-root skin-dark". */
  rootClass: string;
  header: ReactNode;
  footer: ReactNode;
  effects?: ReactNode;
}) {
  useLayoutEffect(() => {
    const root = document.getElementById("classic-root");
    if (!root) return;
    const classes = [...rootClass.split(/\s+/).filter(Boolean), "theme-app"];
    root.classList.add(...classes);
    // Reveals the page (globals.css keeps it hidden until the frame is on).
    document.documentElement.setAttribute("data-theme-frame", "");
    return () => {
      root.classList.remove(...classes);
      document.documentElement.removeAttribute("data-theme-frame");
    };
  }, [rootClass]);

  // Frames only render in the browser, after hydration (the theme store reads
  // "classic" on the server), so the layout's slots are already in the DOM.
  const top = document.getElementById("theme-header");
  const bottom = document.getElementById("theme-footer");
  const layer = document.getElementById("theme-effects");
  return (
    <>
      {top && createPortal(header, top)}
      {bottom && createPortal(footer, bottom)}
      {layer && effects ? createPortal(effects, layer) : null}
    </>
  );
}
