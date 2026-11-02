/** Small numeric and timing helpers used across the engine. */

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Increment the "dirty" counter that tells the renderer an item changed. */
export const bump = (it: { v: number }): void => {
  it.v++;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

export const f1 = (n: number): number => Math.round(n * 10) / 10;

/** Alpha channel of a computed colour, 0..1. */
export function alphaOf(c: string | null | undefined): number {
  if (!c || c === "transparent") return 0;
  const slash = c.match(/\/\s*([\d.]+%?)\s*\)/);
  if (slash && slash[1]) {
    return slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
  }
  const m = c.match(/^rgba\(([^)]+)\)/);
  if (m && m[1]) {
    const p = m[1].split(",");
    return p.length >= 4 ? parseFloat(p[3] as string) : 1;
  }
  return 1;
}

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

export function intersect(a: Box | null, b: Box | null): Box | null {
  if (!a || !b) return null;
  const l = Math.max(a.l, b.l);
  const t = Math.max(a.t, b.t);
  const r = Math.min(a.r, b.r);
  const bt = Math.min(a.b, b.b);
  return r > l && bt > t ? { l, t, r, b: bt } : null;
}

export const ltrb = (r: { left: number; top: number; right: number; bottom: number }): Box => ({
  l: r.left,
  t: r.top,
  r: r.right,
  b: r.bottom,
});
