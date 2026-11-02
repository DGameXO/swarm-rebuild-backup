/**
 * Data model shared by the snapshotter, the renderer and the swarm engine.
 *
 * Items, tasks and groups are deliberately open bags: the original engine
 * attaches per-kind fields (pen points, media sources, duplicate masters) as
 * the build progresses. The named fields below are the ones the whole engine
 * relies on; the index signature keeps the per-kind extras honest without
 * pretending every variant has the same shape.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Clip {
  l: number;
  t: number;
  r: number;
  b: number;
}

export interface Geometry {
  ox: number;
  oy: number;
  sx: number;
  sy: number;
  vw: number;
  vh: number;
}

export interface PageBackground {
  color: string;
  image: string;
  size?: string;
  position?: string;
  repeat?: string;
  from: Element | null;
}

/** Either the click-time screenshot or the cropped bitmap handed to the snapshotter. */
export interface Shot {
  src?: string;
  at?: Geometry;
  img?: HTMLImageElement;
  sx?: number;
  sy?: number;
  scale?: number;
  valid?: boolean;
}

export interface Env {
  scroller: Element;
  isRoot: boolean;
  pageBg: PageBackground;
  host: HTMLElement | null;
  geom(): Geometry;
  scrollHeight(): number;
  scrollWidth(): number;
  scrollTo(y: number, x?: number): void;
  scrollBy(dy: number): void;
}

export type Layer = "world" | "under" | "over";

export interface Item {
  id: number;
  v: number;
  rv: number;
  vis: boolean;
  dx: number;
  dy: number;
  scale: number;
  mode: string;
  kind: "rect" | "text" | "media" | "line" | string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: Layer;
  key: string;
  op: number;
  clip: Clip | null;
  parentBox: Item | null;
  blend: string;
  tb: Rect;
  fs: number;
  lh: number;
  align: string;
  text: string;
  sig: string;
  [extra: string]: any;
}

export interface Task {
  id: number;
  y: number;
  layer: Layer;
  spec: Record<string, any>;
  deps: Task[];
  gate: number;
  state: "wait" | "active" | "done";
  [extra: string]: any;
}

export interface Agent {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  task: Task | null;
  el: HTMLElement;
  [extra: string]: any;
}

export interface Group {
  axis: "x" | "y";
  pos: number;
  cur: number;
  op: number;
  flash: number;
  dragging: boolean;
  vis: boolean;
  task: Task;
  deps: Task[];
  [extra: string]: any;
}

export interface Guide extends Group {}

export interface Backdrop {
  x: number;
  y: number;
  w: number;
  h: number;
  key: string;
  color: string;
}

export interface Model {
  items: Item[];
  tasks: Task[];
  groups: Group[];
  guides: Guide[];
  docW: number;
  docH: number;
  backdrops: Backdrop[];
  portKey: string | null;
}

/** Options accepted by the vendored engine. */
export interface CoreOptions {
  /** Scroll the page down as the swarm builds. Defaults to false. */
  autoScroll?: boolean;
  /** Build speed multiplier. Defaults to 1. */
  speed?: number;
  /** Called once every layer is rebuilt. */
  onComplete?: () => void;
}
