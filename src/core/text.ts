import { ATOMIC } from "./constants.js";
import { boxyStyle } from "./clone.js";
// -------------------------------------------------------------- text reveal

function wsOf(n: any, root: any) {
  for (let e = n; e && e !== root.parentNode; e = e.parentNode) {
    const w = e.style && e.style.whiteSpace;
    if (w) return w;
  }
  return "normal";
}

export function prepText(it: any) {
  const live = it.full.cloneNode(true);
  const units: any[] = [];
  let seq = "";
  const boxes: any[] = [];
  (function rec(n, box) {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) {
        let s = c.data;
        const ws = wsOf(n, live);
        if (!/^pre|break-spaces/.test(ws)) s = s.replace(/[\t\n\r ]+/g, " ");
        if (!s.length) {
          c.remove();
          continue;
        }
        units.push({ t: c, s, len: s.length, box });
        seq += s;
      } else if (c.nodeType === 1) {
        // media, and empty styled boxes (mask icons, dots, swatches) appear in one keystroke
        if (
          ATOMIC.has(c.localName) ||
          c instanceof SVGElement ||
          (!/\S/.test(c.textContent) && c.style && boxyStyle(c.style))
        ) {
          units.push({ e: c, len: 1, box, on: true });
          seq += "□";
        } else {
          const b = c.style && boxyStyle(c.style) ? c : box;
          if (b === c) boxes.push(c);
          rec(c, b);
        }
      }
    }
  })(live, null);
  for (const u of units) {
    if (u.t) u.t.data = "";
    else {
      u.e.style.visibility = "hidden";
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

export function reveal(it: any, n: any) {
  let left = n;
  let last: any = null;
  for (const u of it.units) {
    const k = left <= 0 ? 0 : left >= u.len ? u.len : left;
    left -= k;
    if (u.t) {
      const want = k === u.len ? u.s : u.s.slice(0, k);
      if (u.t.data !== want) u.t.data = want;
      if (k) last = u.t;
    } else {
      const on = k > 0;
      if (u.on !== on) {
        u.e.style.visibility = on ? "" : "hidden";
        u.on = on;
      }
      if (on) last = u.e;
    }
    if (k && u.box && u.box.__on === false) {
      for (let b = u.box; b && b !== it.live; b = b.parentNode)
        if (b.__on === false) {
          b.style.visibility = "";
          b.__on = true;
        }
    }
  }
  return last;
}
