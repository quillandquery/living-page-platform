import type { CSSProperties } from "react";

/** Turn a "--a:x;--b:y" custom-property string into an inline style object,
 *  so a format can scope its palette to its own element instead of :root —
 *  which is what lets many live previews coexist on one screen. */
export function paletteStyle(vars: string): CSSProperties {
  const o: Record<string, string> = {};
  for (const decl of vars.split(";")) {
    const i = decl.indexOf(":");
    if (i > 0) o[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return o as CSSProperties;
}
