import type { Item, OverlayMeasure, Rect, TextItem } from "./model.js";

/** Screen-space bounds of an item, including its current offset and scale. */
export function bounds(it: Item): Rect {
  if (it.kind === "text") {
    const tb = it.tb;
    const lh = it.lh;
    let h = tb.h;
    if (it.editing && !it.selAll && it.total) {
      const lines = Math.max(1, Math.round(tb.h / lh));
      h = Math.min(tb.h, Math.max(lh, Math.ceil((it.shown! / it.total) * lines) * lh));
    }
    const s = it.scale;
    const ax =
      it.align === "center"
        ? (tb.w * (1 - s)) / 2
        : it.align === "right" || it.align === "end"
          ? tb.w * (1 - s)
          : 0;
    return { x: tb.x + it.dx + ax, y: tb.y + it.dy, w: tb.w * s, h: h * s };
  }
  if (it.kind === "line") {
    return { x: it.x + it.dx, y: it.y + it.dy, w: it.w, h: it.h };
  }
  return {
    x: it.x + it.dx,
    y: it.y + it.dy,
    w: it.draw ? it.draw.w : it.w,
    h: it.draw ? it.draw.h : it.h,
  };
}

/** Bounding box of a set of items. */
export function unionBounds(list: Item[]): Rect {
  const bs = list.map((it) => bounds(it));
  const x = Math.min(...bs.map((b) => b.x));
  const y = Math.min(...bs.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...bs.map((b) => b.x + b.w)) - x,
    h: Math.max(...bs.map((b) => b.y + b.h)) - y,
  };
}

/** Baseline indicator drawn under a text selection. */
export function underline(it: TextItem, b: Rect): Rect {
  return {
    x: b.x,
    y: b.y + (it.lh * 0.5 + it.fs * 0.42) * it.scale,
    w: Math.min(b.w, it.tb.w * it.scale),
    h: 0,
  };
}

/** Figma-style red measurement between two boxes, when they do not overlap. */
export function spacing(a: Rect, b: Rect): OverlayMeasure | null {
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  if (oy > 0) {
    const y = Math.max(a.y, b.y) + oy / 2;
    const [l, r] = a.x < b.x ? [a, b] : [b, a];
    const gap = r.x - (l.x + l.w);
    if (gap > 0)
      return {
        t: "measure",
        a: { x: l.x + l.w, y },
        b: { x: r.x, y },
        label: String(Math.round(gap)),
      };
  } else if (ox > 0) {
    const x = Math.max(a.x, b.x) + ox / 2;
    const [t, btm] = a.y < b.y ? [a, b] : [b, a];
    const gap = btm.y - (t.y + t.h);
    if (gap > 0)
      return {
        t: "measure",
        a: { x, y: t.y + t.h },
        b: { x, y: btm.y },
        label: String(Math.round(gap)),
      };
  }
  return null;
}
