/** Figma-style cursor glyphs, rendered as inline SVG paths. */

export type CursorShape =
  "arrow" | "dup" | "pen" | "pen-add" | "pen-close" | "cross" | "ibeam" | "ew" | "ns";

export const ARROW_D =
  "M4.6 3.9 C4.2 3.1 4.9 2.4 5.7 2.8 L20.6 9.4 C21.5 9.8 21.4 11.1 20.4 11.3 L13.9 12.9 C13.4 13 13 13.4 12.9 13.9 L11.3 20.4 C11.1 21.4 9.8 21.5 9.4 20.6 Z";

export const HOT: Record<CursorShape, [number, number]> = {
  arrow: [5, 3.5],
  dup: [5, 3.5],
  pen: [3, 3],
  "pen-add": [3, 3],
  "pen-close": [3, 3],
  cross: [12, 12],
  ibeam: [12, 12],
  ew: [12, 12],
  ns: [12, 12],
};

export function cursorSVG(shape: CursorShape, c: string): string {
  const st = 'stroke="#fff" stroke-width="1.5" stroke-linejoin="round"';
  switch (shape) {
    case "arrow":
      return `<path d="${ARROW_D}" fill="${c}" ${st}/>`;
    case "dup":
      return (
        `<path d="${ARROW_D}" transform="translate(4 3.5)" fill="#fff" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>` +
        `<path d="${ARROW_D}" fill="${c}" ${st}/>`
      );
    case "pen":
    case "pen-add":
    case "pen-close": {
      let s =
        `<path d="M17.4 10.6 L20.6 13.8 L13.8 20.6 L10.6 17.4 Z" fill="${c}" ${st}/>` +
        `<path d="M3 3 L13.1 6.3 L17.4 10.6 L10.6 17.4 L6.3 13.1 Z" fill="${c}" ${st}/>` +
        `<path d="M3.6 3.6 L8.9 8.9" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>` +
        `<circle cx="10.2" cy="10.2" r="1.75" fill="none" stroke="#fff" stroke-width="1.2"/>`;
      if (shape === "pen-add")
        s +=
          `<g stroke-linecap="round"><path d="M23 19.5 V26.5 M19.5 23 H26.5" stroke="#fff" stroke-width="3.4"/>` +
          `<path d="M23 19.5 V26.5 M19.5 23 H26.5" stroke="#1E1E1E" stroke-width="1.3"/></g>`;
      if (shape === "pen-close")
        s +=
          `<circle cx="23" cy="23" r="2.8" fill="none" stroke="#fff" stroke-width="3.2"/>` +
          `<circle cx="23" cy="23" r="2.8" fill="none" stroke="#1E1E1E" stroke-width="1.2"/>`;
      return s;
    }
    case "cross":
      return (
        `<g stroke-linecap="round"><path d="M12 3.5 V20.5 M3.5 12 H20.5" stroke="#fff" stroke-width="3.6"/>` +
        `<path d="M12 3.5 V20.5 M3.5 12 H20.5" stroke="${c}" stroke-width="1.5"/></g>`
      );
    case "ibeam": {
      const d =
        "M8.5 4.5 H10.5 Q12 4.5 12 6 Q12 4.5 13.5 4.5 H15.5 M12 6 V18 M8.5 19.5 H10.5 Q12 19.5 12 18 Q12 19.5 13.5 19.5 H15.5";
      return (
        `<g fill="none" stroke-linecap="round"><path d="${d}" stroke="#fff" stroke-width="3.6"/>` +
        `<path d="${d}" stroke="${c}" stroke-width="1.5"/></g>`
      );
    }
    case "ew":
    case "ns":
      return `<path d="M2.5 12 L7 7.5 V10.4 H17 V7.5 L21.5 12 L17 16.5 V13.6 H7 V16.5 Z"${
        shape === "ns" ? ' transform="rotate(90 12 12)"' : ""
      } fill="${c}" ${st}/>`;
  }
  return "";
}

export const IMG_ICON =
  '<svg class="ph" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18 L10 13 L14 16 L17 13.5 L21 17"/></svg>';
