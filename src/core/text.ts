import { ATOMIC } from "./constants.js";
import { boxyStyle } from "./clone.js";
import type { Item } from "./model.js";

// -------------------------------------------------------------- text reveal

interface TextUnit {
  /** Text node, when the unit is a run of characters. */
  t?: Text;
  /** Element, when the unit is an atomic box (image, icon, swatch). */
  e?: Element;
  /** Full text of the unit. */
  s?: string;
  len: number;
  /** Nearest ancestor that paints a box, used to reveal its background. */
  box: HTMLElement | null;
  on?: boolean;
}

interface RevealItem extends Item {
  live: HTMLElement;
  units: TextUnit[];
  seq: string;
  total: number;
  shown: number;
  rshown: number;
}

type BoxElement = HTMLElement & { __on?: boolean };

function wsOf(n: Node, root: Node): string {
  for (let e: Node | null = n; e && e !== root.parentNode; e = e.parentNode) {
    const style = (e as HTMLElement).style;
    const w = style?.whiteSpace;
    if (w) return w;
  }
  return "normal";
}

export function prepText(item: Item): void {
  const it = item as RevealItem;
  const live = it.full!.cloneNode(true) as HTMLElement;
  const units: TextUnit[] = [];
  let seq = "";
  const boxes: BoxElement[] = [];

  const rec = (n: Node, box: HTMLElement | null): void => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === Node.TEXT_NODE) {
        const text = c as Text;
        let s = text.data;
        const ws = wsOf(n, live);
        if (!/^pre|break-spaces/.test(ws)) s = s.replace(/[\t\n\r ]+/g, " ");
        if (!s.length) {
          text.remove();
          continue;
        }
        units.push({ t: text, s, len: s.length, box });
        seq += s;
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        const el = c as Element;
        const style = (el as HTMLElement).style;
        // media, and empty styled boxes (mask icons, dots, swatches) appear in one keystroke
        if (
          ATOMIC.has(el.localName) ||
          el instanceof SVGElement ||
          (!/\S/.test(el.textContent ?? "") && style && boxyStyle(style))
        ) {
          units.push({ e: el, len: 1, box, on: true });
          seq += "□";
        } else {
          const b = style && boxyStyle(style) ? (el as BoxElement) : box;
          if (b === el) boxes.push(b as BoxElement);
          rec(el, b);
        }
      }
    }
  };
  rec(live, null);

  for (const u of units) {
    if (u.t) u.t.data = "";
    else if (u.e) {
      (u.e as HTMLElement).style.visibility = "hidden";
      u.on = false;
    }
  }
  for (const b of boxes) {
    b.style.visibility = "hidden";
    b.__on = false;
  }

  it.live = live;
  it.units = units;
  it.seq = seq;
  it.total = seq.length;
  it.shown = 0;
  it.rshown = 0;
}

export function reveal(item: Item, n: number): Node | null {
  const it = item as RevealItem;
  let left = n;
  let last: Node | null = null;

  for (const u of it.units) {
    const k = left <= 0 ? 0 : left >= u.len ? u.len : left;
    left -= k;
    if (u.t) {
      const want = k === u.len ? (u.s ?? "") : (u.s ?? "").slice(0, k);
      if (u.t.data !== want) u.t.data = want;
      if (k) last = u.t;
    } else {
      const on = k > 0;
      if (u.on !== on && u.e) {
        (u.e as HTMLElement).style.visibility = on ? "" : "hidden";
        u.on = on;
      }
      if (on) last = u.e ?? last;
    }
    if (k && u.box && (u.box as BoxElement).__on === false) {
      for (let b: Node | null = u.box; b && b !== it.live; b = b.parentNode) {
        const box = b as BoxElement;
        if (box.__on === false) {
          box.style.visibility = "";
          box.__on = true;
        }
      }
    }
  }
  return last;
}
