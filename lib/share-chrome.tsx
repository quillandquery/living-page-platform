/**
 * SHARE CHROME — the recurring Living Page motif.
 *
 * The one thing every share artifact carries, so that the fourth one
 * someone sees on a feed reads as "another one of those": a hairline
 * margin rule down one edge with a rotated `LIVING PAGE / 047`
 * annotation running along it, and a tiny `livingpage.one ↗` publisher
 * mark. Identity built through repetition, not through a logo.
 *
 * Satori notes: `writing-mode` is unsupported, so vertical text is an
 * absolutely-positioned element with `transform: rotate(-90deg)` and a
 * fixed width. No `inset` shorthand (unsupported) — explicit sides.
 */

export type ChromePalette = {
  ink: string;
  mute: string;
  rule: string;
  accent: string;
};

/** The vertical margin rule + page annotation down the left edge. */
export function PageEdge({
  height, pageMark, palette, left = 40, fontSize = 15,
}: { height: number; pageMark: string; palette: ChromePalette; left?: number; fontSize?: number }) {
  // The rotated label is positioned by its own top-left, so it is laid
  // out as a wide flat box and then turned a quarter turn.
  const labelWidth = Math.round(height * 0.52);
  return (
    // A plain wrapping div, not a Fragment — Satori's `type` resolution
    // trips on `Symbol(react.fragment)` ("Cannot convert a Symbol value
    // to a string") when it appears as a returned/array element rather
    // than JSX authored inline in the caller.
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex" }}>
      {/* the rule */}
      <div style={{
        position: "absolute", top: 0, left,
        width: 1, height, display: "flex", background: palette.rule,
      }} />
      {/* the annotation, running bottom-to-top along the rule */}
      <div style={{
        position: "absolute",
        left: left - Math.round(labelWidth / 2) + 14,
        top: Math.round(height / 2) - 10,
        width: labelWidth, height: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: "rotate(-90deg)",
        fontSize, letterSpacing: 5, textTransform: "uppercase",
        color: palette.mute, fontWeight: 500,
      }}>
        {pageMark}
      </div>
    </div>
  );
}

/** The publisher mark: `livingpage.one ↗`. Tiny, always. */
export function Signature({
  host, palette, fontSize = 17,
}: { host: string; palette: ChromePalette; fontSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize, letterSpacing: 2, color: palette.mute, fontWeight: 500 }}>
      <div style={{ display: "flex" }}>{host}</div>
      <div style={{ display: "flex", color: palette.accent }}>↗</div>
    </div>
  );
}

/** The life label: the writer's own place · date, set as a running head. */
export function LifeLabel({
  label, palette, fontSize = 20,
}: { label: string; palette: ChromePalette; fontSize?: number }) {
  if (!label) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 10, height: 10, borderRadius: 999, background: palette.accent, display: "flex" }} />
      <div style={{ display: "flex", fontSize, letterSpacing: 5, textTransform: "uppercase", color: palette.accent, fontWeight: 700 }}>
        {label}
      </div>
    </div>
  );
}
