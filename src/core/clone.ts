import {
  DROP_IN_CLONE,
  ELEM_PROPS,
  FORMS,
  REPLACED,
  SVGNS,
  SVG_OUTER_PROPS,
  SVG_PROPS,
} from "./constants.js";
import type { PageBackground, Shot } from "./model.js";
import { alphaOf, intersect, ltrb } from "./utils.js";

export function styleString(cs: CSSStyleDeclaration, props: readonly string[]): string {
  let s = "";
  for (const p of props) {
    const v = cs.getPropertyValue(p);
    if (v !== "") s += `${p}:${v};`;
  }
  return s;
}

export const lhPx = (cs: CSSStyleDeclaration): number => {
  const v = parseFloat(cs.lineHeight);
  return isNaN(v) ? (parseFloat(cs.fontSize) || 16) * 1.2 : v;
};

export function kidsOf(el: Element): Node[] {
  if (el.shadowRoot) return [...el.shadowRoot.childNodes];
  if (el.localName === "slot") {
    const slot = el as HTMLSlotElement;
    const assigned = slot.assignedNodes({ flatten: true });
    return assigned.length ? assigned : [...el.childNodes];
  }
  return [...el.childNodes];
}

// Copy one element's computed style onto its clone, fix up media sources.
// ::before / ::after become real spans so icons, chevrons and separators survive.
export function pseudoClone(src: Element, which: "::before" | "::after"): HTMLSpanElement | null {
  const ps = getComputedStyle(src, which);
  const c = ps.content;
  if (!c || c === "none" || c === "normal" || ps.display === "none") return null;
  const sp = document.createElement("span");
  const str = c.match(/^"((?:[^"\\]|\\.)*)"/);
  if (str) sp.textContent = str[1]!.replace(/\\(.)/g, "$1");
  else if (/^url\(/.test(c)) {
    const u = c.match(/^url\(\s*["']?([^"')]+)["']?\s*\)/);
    if (u) {
      const im = document.createElement("img");
      im.src = u[1]!;
      im.setAttribute("style", "display:inline-block;vertical-align:middle;");
      sp.appendChild(im);
    }
  }
  sp.setAttribute("style", styleString(ps, ELEM_PROPS));
  return sp;
}

export function addPseudos(src: Element, dst: Element): void {
  const b = pseudoClone(src, "::before");
  if (b) dst.insertBefore(b, dst.firstChild);
  const a = pseudoClone(src, "::after");
  if (a) dst.appendChild(a);
}

export function prepClone(src: Element, dst: Element): Element | null {
  const tag = src.localName;
  if (DROP_IN_CLONE.has(tag)) {
    dst.remove();
    return null;
  }
  const cs = getComputedStyle(src);
  if (cs.display === "none") {
    dst.remove();
    return null;
  }
  const isSvg = src instanceof SVGElement;
  let st = styleString(cs, isSvg ? SVG_PROPS : ELEM_PROPS);
  if (isSvg && tag === "svg" && !(src as SVGSVGElement).ownerSVGElement) {
    dst.setAttribute("width", String(src.clientWidth || src.getBoundingClientRect().width));
    dst.setAttribute("height", String(src.clientHeight || src.getBoundingClientRect().height));
    st += styleString(cs, SVG_OUTER_PROPS);
  }
  dst.setAttribute("style", st);
  for (const a of [...dst.attributes]) {
    const n = a.name;
    if (
      n.startsWith("on") ||
      n === "contenteditable" ||
      n === "tabindex" ||
      n === "autofocus" ||
      n === "srcset" ||
      n === "sizes" ||
      n === "loading"
    )
      dst.removeAttribute(n);
  }
  if (tag === "img") {
    dst.setAttribute("src", imgSrc(src as HTMLImageElement));
    dst.setAttribute("decoding", "async");
  }
  if (tag === "svg") fixSvgRefs(dst);
  // Clones live in the page's document: custom elements would be upgraded by the
  // site's own JS (and often wipe their content), media would play. Swap in inert stand-ins.
  if (tag === "audio") {
    dst.remove();
    return null;
  }
  if (tag === "video" || tag === "canvas" || (!isSvg && tag.includes("-"))) {
    let rep: Element;
    if (tag === "video" || tag === "canvas") {
      const url =
        tag === "video" ? (src as HTMLVideoElement).poster : canvasPixels(src as HTMLCanvasElement);
      rep = document.createElement(url ? "img" : "span");
      if (url) rep.setAttribute("src", url);
      else st += "background:#1b1b1f;";
    } else {
      rep = document.createElement("span");
      while (dst.firstChild) rep.appendChild(dst.firstChild);
    }
    rep.setAttribute("style", st);
    if (dst.parentNode) dst.replaceWith(rep);
    dst = rep;
  }
  if (!isSvg && !REPLACED.has(tag) && !FORMS.has(tag) && tag !== "img") addPseudos(src, dst);
  return dst;
}

// Clones are made in a document without a custom-element registry so the
// site's component code never runs on them.
let inertDoc: Document | null = null;
export const inert = (): Document =>
  inertDoc || (inertDoc = document.implementation.createHTMLDocument(""));

export function cloneStyled(src: Element): Element {
  const dst = inert().importNode(src, true) as Element;
  const a = [...src.querySelectorAll("*")];
  const b = [...dst.querySelectorAll("*")];
  const root = prepClone(src, dst) || document.createElement("span");
  for (let i = 0; i < a.length && i < b.length; i++) prepClone(a[i]!, b[i]!);
  return root;
}

export function cloneDescendantsStyled(src: Element, dst: Element): void {
  const a = src.querySelectorAll("*");
  const b = dst.querySelectorAll("*");
  for (let i = 0; i < a.length && i < b.length; i++) prepClone(a[i]!, b[i]!);
}

export function imgSrc(img: HTMLImageElement): string {
  let s = img.currentSrc || img.src || "";
  const lazy =
    img.getAttribute("data-src") ||
    img.getAttribute("data-lazy-src") ||
    img.getAttribute("data-original");
  if (lazy && (!s || s.startsWith("data:") || !img.complete || !img.naturalWidth)) {
    try {
      s = new URL(lazy, location.href).href;
    } catch (_) {}
  }
  return s;
}

// Shadow trees can't see document-level <symbol>/<linearGradient> ids, so
// inline anything the clone references.
export function fixSvgRefs(dst: Element): void {
  for (const u of dst.querySelectorAll("use")) {
    const href = u.getAttribute("href") || u.getAttribute("xlink:href");
    if (!href || href[0] !== "#") continue;
    const ref = document.getElementById(href.slice(1));
    if (!ref) continue;
    const isSym = ref.localName === "symbol";
    const g = document.createElementNS(SVGNS, isSym ? "svg" : "g");
    if (isSym) {
      for (const at of ["viewBox", "preserveAspectRatio"]) {
        const v = ref.getAttribute(at);
        if (v) g.setAttribute(at, v);
      }
      g.setAttribute("width", u.getAttribute("width") || "100%");
      g.setAttribute("height", u.getAttribute("height") || "100%");
      g.setAttribute("x", u.getAttribute("x") || "0");
      g.setAttribute("y", u.getAttribute("y") || "0");
      g.setAttribute("overflow", "visible");
    } else if (u.getAttribute("x") || u.getAttribute("y")) {
      g.setAttribute(
        "transform",
        `translate(${u.getAttribute("x") || 0} ${u.getAttribute("y") || 0})`,
      );
    }
    const us = u.getAttribute("style");
    if (us) g.setAttribute("style", us);
    for (const ch of ref.childNodes) {
      if (ch.nodeType !== Node.ELEMENT_NODE) {
        g.appendChild(ch.cloneNode(true));
        continue;
      }
      g.appendChild(cloneStyled(ch as Element));
    }
    u.replaceWith(g);
  }
  const ids = new Set<string>();
  dst.outerHTML.replace(/url\(\s*["']?#([^"')\s]+)["']?\s*\)/g, (_match, id: string) => {
    ids.add(id);
    return "";
  });
  if (!ids.size) return;
  let defs: Element | null = null;
  for (const id of ids) {
    if (dst.querySelector(`[id="${CSS.escape(id)}"]`)) continue;
    const ref = document.getElementById(id);
    if (!ref) continue;
    if (!defs) {
      defs = document.createElementNS(SVGNS, "defs");
      dst.insertBefore(defs, dst.firstChild);
    }
    defs.appendChild(ref.cloneNode(true));
  }
}

// Pixels for things the DOM can't give back (WebGL canvases, playing video,
// cross-origin iframes) come from a screenshot taken when the user clicked.
export function cropShot(shot: Shot | null, r: DOMRect): string | null {
  if (!shot || !shot.valid || !shot.img || !shot.scale) return null;
  if (r.height > innerHeight * 3 || r.width > innerWidth * 2) return null;
  const vis = intersect(ltrb(r), { l: 0, t: 0, r: innerWidth, b: innerHeight });
  if (!vis) return null;
  const k = shot.scale;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.width * k));
  c.height = Math.max(1, Math.round(r.height * k));
  const w = (vis.r - vis.l) * k;
  const h = (vis.b - vis.t) * k;
  c.getContext("2d")!.drawImage(
    shot.img,
    vis.l * k,
    vis.t * k,
    w,
    h,
    (vis.l - r.left) * k,
    (vis.t - r.top) * k,
    w,
    h,
  );
  const full =
    vis.l <= r.left + 1 && vis.t <= r.top + 1 && vis.r >= r.right - 1 && vis.b >= r.bottom - 1;
  try {
    return c.toDataURL(full ? "image/jpeg" : "image/webp", 0.9);
  } catch (_) {
    return null;
  }
}

export function canvasPixels(el: HTMLCanvasElement): string | null {
  try {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 12;
    const g = probe.getContext("2d")!;
    g.drawImage(el, 0, 0, 12, 12);
    const d = g.getImageData(0, 0, 12, 12).data;
    let a = 0;
    for (let i = 3; i < d.length; i += 4) a += d[i]!;
    return a > 0 ? el.toDataURL() : null;
  } catch (_) {
    return null;
  }
}

export function boxyStyle(st: CSSStyleDeclaration): boolean {
  if (alphaOf(st.backgroundColor) > 0.02) return true;
  if (st.backgroundImage && st.backgroundImage !== "none") return true;
  if (st.boxShadow && st.boxShadow !== "none") return true;
  for (const side of ["top", "right", "bottom", "left"]) {
    const width = parseFloat(st.getPropertyValue(`border-${side}-width`));
    const style = st.getPropertyValue(`border-${side}-style`);
    const color = st.getPropertyValue(`border-${side}-color`);
    if (width > 0 && style !== "none" && alphaOf(color) > 0.02) return true;
  }
  return false;
}

export function sameColor(a?: string | null, b?: string | null): boolean {
  return (a || "").replace(/\s/g, "") === (b || "").replace(/\s/g, "");
}

export function pageBackground(): PageBackground {
  const h = document.documentElement;
  const b = document.body;
  const hs = getComputedStyle(h);
  const bs = b ? getComputedStyle(b) : null;
  const pick = (cs: CSSStyleDeclaration) => ({
    color: cs.backgroundColor,
    image: cs.backgroundImage,
    size: cs.backgroundSize,
    position: cs.backgroundPosition,
    repeat: cs.backgroundRepeat,
  });
  if (alphaOf(hs.backgroundColor) > 0.01 || hs.backgroundImage !== "none")
    return { ...pick(hs), from: h };
  if (bs && (alphaOf(bs.backgroundColor) > 0.01 || bs.backgroundImage !== "none"))
    return { ...pick(bs), from: b };
  const dark = /dark/.test(hs.colorScheme) && matchMedia("(prefers-color-scheme: dark)").matches;
  return { color: dark ? "rgb(18, 18, 18)" : "rgb(255, 255, 255)", image: "none", from: null };
}

/**
 * Walk the live DOM and produce a blueprint the swarm can rebuild.
 * Items live in "world" coords (scroller content space) or, for fixed UI,
 * in screen coords on an "over"/"under" layer.
 */
