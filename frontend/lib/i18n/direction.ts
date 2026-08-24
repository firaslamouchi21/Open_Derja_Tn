import type { Script } from "@open-derja/shared";

export type TextDirection = "ltr" | "rtl";

export function scriptTextProps(script: Script): { dir: TextDirection; lang: string } {
  switch (script) {
    case "arabic":
      return { dir: "rtl", lang: "ar-TN" };
    case "arabizi":
      return { dir: "ltr", lang: "aeb-Latn" };
    case "latin":
      return { dir: "ltr", lang: "fr" };
    case "mixed":
      return { dir: "rtl", lang: "ar-TN" };
  }
}

export const LRM = "‎";
export const RLM = "‏";

export function wrapWithDirectionalMark(text: string, dir: TextDirection): string {
  return `${dir === "rtl" ? RLM : LRM}${text}${dir === "rtl" ? RLM : LRM}`;
}
