/**
 * Data model shared by the snapshotter, the renderer and the swarm engine.
 *
 * Every field is typed. Kind-specific fields are optional on the shared
 * interface: a rect has no text runs, a line has no media element. The
 * snapshotter only ever produces the fields documented under each kind.
 */

export interface Point {
  x: number;
  y: number;
}

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

/** Click-time screenshot used for pixels the DOM cannot give back. */
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

export type ItemKind = "rect" | "text" | "image" | "line";

/** One unit of the text reveal: a character run or an atomic box. */
export interface TextUnit {
  t?: Text;
  e?: Element;
  s?: string;
  len: number;
  box: HTMLElement | null;
  on?: boolean;
}

export type ItemNode = HTMLElement & {
  _st?: ReturnType<typeof setTimeout>;
  _css?: string;
  _src?: unknown;
  _shape?: string;
  _hx?: number;
  _hy?: number;
};

export type CursorNode = HTMLElement & {
  _shape?: string;
  _hx?: number;
  _hy?: number;
};

export interface DrawState {
  w: number;
  h: number;
}

export interface Item {
  // ---- identity, set by the snapshotter
  id: number;
  kind: ItemKind;
  /** Bumped whenever the item changes, read by the renderer. */
  v: number;
  rv: number;
  vis: boolean;
  dx: number;
  dy: number;
  scale: number;
  mode: string;

  // ---- geometry, document or layer coordinates
  x: number;
  y: number;
  w: number;
  h: number;

  // ---- stacking and clipping
  layer: Layer;
  key: string | number;
  op: number;
  clip: Clip | null;
  parentBox: Item | null;
  blend?: string;
  /** Signature used to detect duplicate siblings. */
  sig: string;

  // ---- rect
  css?: string;
  radius?: string;
  big?: boolean;
  styled?: boolean;
  draw?: DrawState | null;

  // ---- text
  tb?: Rect;
  full?: HTMLElement;
  fs?: number;
  lh?: number;
  align?: string;
  text?: string;
  live?: HTMLElement;
  units?: TextUnit[];
  seq?: string;
  total?: number;
  shown?: number;
  rshown?: number;

  // ---- image
  media?: Element;
  frame?: string;
  shadow?: string;
  bg?: string;
  src?: string;

  // ---- line
  pts?: Point[];
  stroke?: string;
  sw?: number;
  dash?: string | null;
  placed?: number;
  shut?: boolean;
  edit?: boolean;
  owner?: Agent | null;

  // ---- runtime, attached while the build progresses
  task?: Task | null;
  final?: Task[];
  group?: Group | null;
  master?: Group | null;
  copyOf?: Item | null;
  twinOf?: Item | null;
  deps?: Task[];
  dupTask?: Task | null;
  editTask?: Task | null;
  node?: ItemNode | null;
  start?: number;
  done?: boolean;
  draggable?: boolean;
  settle?: boolean;
  selAll?: boolean;
  editing?: boolean;
  _caret?: HTMLElement | null;
  _last?: Node | null;
  _mv?: HTMLElement | null;
  _tv?: number;
}

export type NewItem = Omit<Item, "id" | "v" | "rv" | "vis" | "dx" | "dy" | "scale" | "mode">;

export interface Task {
  id: number;
  y: number;
  layer: Layer;
  spec: TaskSpec;
  deps: Task[];
  gate: number;
  state: "wait" | "active" | "done";
  agent?: Agent | null;
  gen?: Generator<void, void, number> | null;
  doneAt?: number;
  startedAt?: number;
}

/** A task carries the choreography for one item, group or guide. */
export interface TaskSpec {
  type: "rect" | "text" | "image" | "line" | "guide" | "dup" | "edit" | "swap" | "restyle";
  it?: Item;
  g?: Group;
  snap?: Group;
  snapDx?: number;
  grow?: boolean;
  drag?: boolean;
  bend?: number;
  speed?: number;
  [extra: string]: unknown;
}

export interface OverlayBox {
  t: "box";
  b: Rect;
  color?: string;
  handles?: boolean;
  badge?: string;
  rulerLines?: boolean;
  underline?: { x: number; y: number; w: number; h: number };
}

export interface OverlayMeasure {
  t: "measure";
  a: Point;
  b: Point;
  label: string;
}

export type Overlay = OverlayBox | OverlayMeasure;

export interface Agent {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  task: Task | null;
  worked?: boolean;
  home?: boolean;
  idleFor?: number;
  ov?: (() => Overlay[]) | null;
  force?: number;
  spin?: number;
  curl?: number;
  orbit?: number;
  follow_?: boolean;
  leaving?: boolean;
  follow?: boolean;
  gen?: Generator<void, void, number> | null;
  shape?: string;
  press?: number;
  angle?: number;
  sticky?: boolean;
}

export interface Group {
  id?: number;
  axis: "x" | "y";
  pos: number;
  cur: number;
  op: number;
  flash: number;
  dragging: boolean;
  vis: boolean;
  shownAt?: number;
  task?: Task;
  deps?: Task[];
  master?: { start: number; end: number; box?: Rect };
  copies?: { start: number; end: number; layer?: Layer; box?: Rect }[];
  src?: { items: Item[]; box?: Rect };
  dst?: { items: Item[]; box?: Rect; task: Task }[];
}

export interface Backdrop {
  x: number;
  y: number;
  w: number;
  h: number;
  key: string | number;
  color: string;
}

export interface Model {
  items: Item[];
  tasks: Task[];
  groups: Group[];
  guides: Group[];
  docW: number;
  docH: number;
  backdrops: Backdrop[];
  portKey: string | null;
}

/** Options accepted by the engine. */
export interface CoreOptions {
  /** Scroll the page down as the swarm builds. Defaults to false. */
  autoScroll?: boolean;
  /** Build speed multiplier. Defaults to 1. */
  speed?: number;
  /** Called once every layer is rebuilt. */
  onComplete?: () => void;
}
