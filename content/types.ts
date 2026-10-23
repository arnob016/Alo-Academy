import type { Locale } from "@/i18n/routing";

/** A value written once per language, e.g. `{ bn: "হোম", en: "Home" }`. */
export type Localized<T = string> = Record<Locale, T>;

/**
 * How a person's cartoon portrait looks. Every theme draws the same character
 * in its own style (flat, pixel, sketch, hologram…), so people stay recognisable.
 */
export type Look = {
  skin: "light" | "medium" | "tan" | "deep";
  hair: "short" | "side" | "receding" | "long" | "bun" | "hijab";
  /** Defaults to black. Ignored for "hijab". */
  hairColor?: "black" | "brown" | "salt";
  /** Scarf colour when `hair` is "hijab". */
  hijab?: string;
  glasses?: boolean;
  facial?: "mustache" | "beard";
  /** "coat" is a white coat (with a stethoscope) over the outfit colour. */
  wear: "shirt" | "kameez" | "tshirt" | "coat";
  outfit: string;
};
