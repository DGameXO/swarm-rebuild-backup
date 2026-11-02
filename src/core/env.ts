import { pageBackground } from "./clone.js";
import type { Env } from "./model.js";
// -------------------------------------------------------------------- env

export function detectEnv(): Env {
  const se = document.scrollingElement || document.documentElement;
  let scroller = se;
  let isRoot = true;
  if (se.scrollHeight <= innerHeight + 4) {
    let best: Element | null = null;
    let bestArea = 0;
    const all = document.body ? document.body.getElementsByTagName("*") : [];
    for (let i = 0; i < all.length && i < 20000; i++) {
      const el = all[i];
      if (el.scrollHeight <= el.clientHeight + 40 || el.clientHeight < innerHeight * 0.4) continue;
      const oy = getComputedStyle(el).overflowY;
      if (!/(auto|scroll|overlay)/.test(oy)) continue;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea && r.width > innerWidth * 0.35) {
        best = el;
        bestArea = area;
      }
    }
    if (best) {
      scroller = best;
      isRoot = false;
    }
  }
  const env = {
    scroller,
    isRoot,
    host: null,
    pageBg: pageBackground(),
    geom() {
      if (isRoot) {
        return {
          ox: 0,
          oy: 0,
          sx: window.scrollX,
          sy: window.scrollY,
          vw: document.documentElement.clientWidth,
          vh: window.innerHeight,
        };
      }
      const r = scroller.getBoundingClientRect();
      return {
        ox: r.left + scroller.clientLeft,
        oy: r.top + scroller.clientTop,
        sx: scroller.scrollLeft,
        sy: scroller.scrollTop,
        vw: scroller.clientWidth,
        vh: scroller.clientHeight,
      };
    },
    scrollHeight: () =>
      isRoot
        ? Math.max(se.scrollHeight, document.body ? document.body.scrollHeight : 0)
        : scroller.scrollHeight,
    scrollWidth: () => (isRoot ? se.scrollWidth : scroller.scrollWidth),
    scrollTo(y: number, x?: number) {
      const opts: ScrollToOptions = { top: y, behavior: "instant" };
      if (x != null) opts.left = x;
      if (isRoot) window.scrollTo(opts);
      else scroller.scrollTo(opts);
    },
    scrollBy(dy: number) {
      if (isRoot) window.scrollBy({ top: dy, behavior: "instant" });
      else scroller.scrollBy({ top: dy, behavior: "instant" });
    },
  };
  return env;
}
