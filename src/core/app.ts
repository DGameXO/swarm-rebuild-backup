import { MIN_AGENTS } from "./constants.js";
import type { Agent, CoreOptions, Env, Model, Shot, Task } from "./model.js";
import { nextFrame, sleep } from "./utils.js";
import { captureModel } from "./snapshot.js";
import { detectEnv } from "./env.js";
import { View } from "./view.js";
import { Engine } from "./engine.js";
// -------------------------------------------------------------------- app

export class App {
  _dots!: string | null;
  _hudT!: number;
  complete!: boolean;
  dead!: boolean;
  engine!: Engine;
  env!: Env;
  last!: number;
  model!: Model | null;
  raf!: number;
  speedIx!: number;
  speeds!: number[];
  t0!: number;
  timing!: Record<string, number>;
  tour!: boolean;
  tourAcc!: number;
  tourV!: number;
  options: CoreOptions;
  startScroll: number;
  unbinds!: (() => void)[];
  view!: View;
  constructor(options: CoreOptions = {}) {
    this.options = options;
    this.startScroll = 0;
    this.dead = false;
    this.t0 = performance.now();
    this.tour = false;
    this.tourV = 0;
    this.tourAcc = 0;
    this.speeds = [1, 2, 3];
    this.speedIx = 0;
    this.complete = false;
    this.timing = {};
  }

  async loadShot() {
    let src = window.__swarmShot;
    window.__swarmShot = null;
    if (src) lastShot = { src, at: this.env.geom() };
    else if (lastShot) src = lastShot.src; // Replay reuses the click-time screenshot
    if (!src) return null;
    const img = new Image();
    img.src = src;
    try {
      await img.decode();
    } catch (_) {
      return null;
    }
    const g = lastShot && lastShot.src === src ? lastShot.at! : this.env.geom();
    return { img, sx: g.sx, sy: g.sy, scale: img.naturalWidth / innerWidth, valid: false };
  }

  async run() {
    this.env = detectEnv();
    this.startScroll = window.scrollY;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await this.reducedMotion();
      return;
    }
    const shotP = this.loadShot();
    this.view = new View(this.env);
    this.engine = new Engine(this.view);
    this.engine.onStart = () => this.view.intro.classList.add("gone");
    this.engine.onComplete = () => this.onComplete();
    if (this.options.speed) this.engine.speed = this.options.speed;
    if (this.options.autoScroll) {
      this.tour = true;
      this.applyTourUi(true);
    }
    this.bind();
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
    await nextFrame();
    this.view.bg.classList.add("on");
    this.view.intro.classList.add("on");
    this.view.hud.classList.add("on");
    const mark = (k: string) => (this.timing[k] = Math.round(performance.now() - this.t0));
    await sleep(520);
    await unhidePage();
    mark("blank");
    if (this.dead) return;
    await this.scan();
    mark("scan");
    if (this.dead) return;
    try {
      await Promise.race([document.fonts.ready, sleep(1200)]);
    } catch (_) {}
    mark("fonts");
    this.view.measure();
    const shot = await shotP;
    if (shot) {
      const g = this.env.geom();
      shot.valid = Math.abs(g.sx - shot.sx) < 1 && Math.abs(g.sy - shot.sy) < 1;
    }
    let model;
    try {
      model = captureModel(this.env, shot, this.options);
    } catch (err) {
      console.error("[swarm-rebuild] capture failed", err);
      model = {
        items: [],
        tasks: [],
        groups: [],
        guides: [],
        docW: 0,
        docH: 0,
        backdrops: [],
        portKey: null,
      };
    }
    mark("capture");
    if (this.dead) return;
    this.view.mount(model);
    this.engine.setModel(model);
    this.model = model;
    mark("mount");
    const wait = 1500 - (performance.now() - this.t0);
    if (wait > 0) await sleep(wait);
    if (this.dead) return;
    this.engine.start();
  }

  /** No cursors, no choreography: a single calm cross-fade. */
  private async reducedMotion(): Promise<void> {
    const view = new View(this.env);
    view.bg.classList.add("on");
    view.hud.classList.add("on");
    view.status.textContent = "Rebuilding…";
    await sleep(550);
    view.host.style.setProperty("transition", "opacity .45s ease", "important");
    view.host.style.setProperty("opacity", "0", "important");
    await sleep(520);
    view.host.remove();
    this.complete = true;
    this.dead = true;
    this.options.onComplete?.();
  }

  async scan() {
    const env = this.env;
    const g = env.geom();
    const H = env.scrollHeight();
    if (H <= g.vh * 1.25) return;
    this.view.frozen = { ...this.view.vp };
    const steps = Math.min(28, Math.ceil(H / (g.vh * 0.85)));
    for (let i = 1; i <= steps && !this.dead; i++) {
      env.scrollTo(Math.min(H, (H / steps) * i));
      await nextFrame();
      await sleep(30);
    }
    env.scrollTo(g.sy, g.sx);
    await nextFrame();
    await sleep(750);
    env.scrollTo(g.sy, g.sx);
    this.view.frozen = null;
  }

  bind() {
    const on = (
      t: EventTarget,
      ev: string,
      fn: EventListener,
      o?: boolean | AddEventListenerOptions,
    ) => {
      t.addEventListener(ev, fn, o);
      (this.unbinds || (this.unbinds = [])).push(() => t.removeEventListener(ev, fn, o));
    };
    const scrollTarget = this.env.isRoot ? window : this.env.scroller;
    on(
      scrollTarget,
      "scroll",
      () => {
        if (!this.view.frozen) this.view.syncWorld();
      },
      { passive: true },
    );
    on(window, "resize", () => this.view.measure());
    on(
      window,
      "wheel",
      () => {
        if (this.engine.ready) this.engine.start();
      },
      { passive: true },
    );
    on(
      window,
      "pointermove",
      (e: Event) => {
        const pointer = e as PointerEvent;
        this.engine.mouse = { x: pointer.clientX, y: pointer.clientY };
      },
      { passive: true },
    );
    on(document.documentElement, "pointerleave", () => {
      this.engine.mouse = null;
    });
    on(
      window,
      "keydown",
      (e: Event) => {
        const key = e as KeyboardEvent;
        if (key.key === "Escape") {
          key.stopPropagation();
          stop(false);
        }
      },
      true,
    );
    if (!this.env.isRoot) {
      on(
        this.view.host,
        "wheel",
        (e: Event) => {
          const wheel = e as WheelEvent;
          wheel.preventDefault();
          this.env.scroller.scrollBy({
            top: wheel.deltaY,
            left: wheel.deltaX,
            behavior: "instant",
          });
        },
        { passive: false },
      );
    }
    on(this.view.hud, "click", (e: Event) => {
      const b = (e.target as Element).closest("button");
      if (!b) return;
      const a = b.dataset.a;
      if (a === "close") stop(false);
      else if (a === "live") stop(true);
      else if (a === "replay") restart();
      else if (a === "tour") {
        this.setTour(!this.tour);
      } else if (a === "speed") {
        this.speedIx = (this.speedIx + 1) % this.speeds.length;
        this.engine.speed = this.speeds[this.speedIx];
        b.textContent = this.speeds[this.speedIx] + "×";
      }
    });
  }

  frame(now: number): void {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    try {
      this.engine.step(dt);
      if (this.tour) this.tourStep(dt);
      this.view.render(this.engine);
      if (!this._hudT || now - this._hudT > 200) {
        this._hudT = now;
        this.updateHud();
      }
    } catch (err) {
      console.error("[swarm-rebuild]", err);
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  tourStep(dt: number): void {
    const E = this.engine;
    if (!E.started) return;
    const g = this.env.geom();
    const maxY = this.env.scrollHeight() - g.vh;
    if (g.sy >= maxY - 1) {
      this.tourV = 0;
      return;
    }
    const crew = Math.max(MIN_AGENTS, E.cursors.filter((c: Agent) => !c.leaving).length);
    const backlog = E.backlog();
    const target = backlog <= Math.max(4, crew * 0.6) ? 230 : backlog <= crew * 1.5 ? 80 : 0;
    this.tourV += (target - this.tourV) * Math.min(1, dt * 2.5);
    this.tourAcc += this.tourV * dt;
    if (this.tourAcc >= 1) {
      const d = Math.floor(this.tourAcc);
      this.tourAcc -= d;
      this.env.scrollBy(d);
    }
  }

  updateHud() {
    const E = this.engine;
    const v = this.view;
    if (!E.ready) return;
    const workers = E.cursors.filter((c: Agent) => c.worked).length + E.retired;
    const total = E.tasks.length;
    const done = E.doneCount;
    if (this.complete) return;
    if (!E.started)
      v.status.innerHTML = `<b>${E.cursors.length}</b> agents ready<span class="sep"></span>${total.toLocaleString()} layers`;
    else {
      const pend = E.tasks.length - done;
      const below = E.tasks.some(
        (t: Task) => t.state === "wait" && t.layer === "world" && t.gate > E.frontier,
      );
      v.status.innerHTML =
        `<b>${workers}</b> agents<span class="sep"></span><b>${done.toLocaleString()}</b> / ${total.toLocaleString()} layers` +
        (below && pend && !this.tour && E.backlog() === 0
          ? `<span class="sep"></span>scroll to keep building`
          : "");
    }
    v.barFill.style.width = total ? `${(done / total) * 100}%` : "0%";
    const busy = E.cursors.filter((c: Agent) => c.task).slice(-5);
    const key = busy.map((c: Agent) => c.id).join(",");
    if (key !== this._dots) {
      this._dots = key;
      v.dots.innerHTML = busy
        .map((c: Agent) => `<i style="background:${c.color}" title="${c.name}">${c.name[0]}</i>`)
        .join("");
    }
  }

  setTour(on: boolean): void {
    this.tour = on;
    this.applyTourUi(on);
    if (on) this.engine?.start();
  }

  private applyTourUi(on: boolean): void {
    const button = this.view?.root.querySelector('[data-a="tour"]') as HTMLButtonElement | null;
    if (!button) return;
    button.classList.toggle("on", on);
    button.textContent = on ? "Touring" : "Tour";
  }

  onComplete() {
    this.complete = true;
    const E = this.engine;
    const v = this.view;
    const workers = E.cursors.filter((c: Agent) => c.worked).length + E.retired;
    const secs = (E.endTime - E.startTime).toFixed(1);
    v.status.innerHTML = `Rebuilt by <b>${workers}</b> agents in <b>${secs}s</b>`;
    v.barFill.style.width = "100%";
    v.dots.innerHTML = "";
    (v.root.querySelector('[data-a="live"]') as HTMLElement).hidden = false;
    (v.root.querySelector('[data-a="replay"]') as HTMLElement).hidden = false;
    (v.root.querySelector('[data-a="tour"]') as HTMLElement).hidden = true;
    (v.root.querySelector('[data-a="speed"]') as HTMLElement).hidden = true;
    this.tour = false;
    if (this.options.autoScroll && Math.abs(window.scrollY - this.startScroll) > 4) {
      window.scrollTo({ top: this.startScroll, behavior: "smooth" });
    }
    this.options.onComplete?.();
  }

  destroy(reveal: boolean): void {
    unhidePage();
    const finish = () => {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      for (const u of this.unbinds || []) u();
      this.view.host.remove();
    };
    if (reveal) {
      this.engine.releasing = true;
      this.engine.flocking = true;
      for (const c of this.engine.cursors) {
        c.gen = null;
        c.follow = false;
      }
      this.view.hud.classList.remove("on");
      setTimeout(() => {
        this.view.host.style.setProperty("opacity", "0", "important");
      }, 450);
      setTimeout(finish, 1150);
    } else {
      this.view.host.style.setProperty("transition", "opacity .25s ease", "important");
      this.view.host.style.setProperty("opacity", "0", "important");
      this.dead = true;
      cancelAnimationFrame(this.raf);
      for (const u of this.unbinds || []) u();
      setTimeout(() => this.view.host.remove(), 260);
    }
  }
}

// background.js may have hidden everything but media for its screenshot;
// put the page back once our canvas covers it (or if we bail out early).
async function unhidePage() {
  if (!window.__swarmHidden) return;
  window.__swarmHidden = false;
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage)
      await chrome.runtime.sendMessage({ type: "swarm:unhide" });
  } catch (_) {}
  if (typeof window.__swarmUnhide === "function") {
    try {
      window.__swarmUnhide();
    } catch (_) {}
  }
  await nextFrame();
}

let app: App | null = null;
let lastShot: Shot | null = null;

function restart(): void {
  if (app) {
    const a = app;
    const options = a.options;
    app = null;
    a.dead = true;
    cancelAnimationFrame(a.raf);
    for (const u of a.unbinds || []) u();
    a.view.host.remove();
    // rebuild from where the first run started so screenshot crops line up again
    if (lastShot?.at) a.env.scrollTo(lastShot.at.sy, lastShot.at.sx);
    start(options);
    return;
  }
  start();
}

export function start(options: CoreOptions = {}): void {
  if (app) return;
  app = new App(options);
  app.run().catch((err) => console.error("[swarm-rebuild]", err));
}

export function stop(reveal: boolean): void {
  if (!app) return;
  const a = app;
  app = null;
  a.destroy(reveal);
}

export function toggle(): void {
  if (app) stop(false);
  else start();
}

export function isRunning(): boolean {
  return !!(app && app.engine);
}

export function getApp(): App | null {
  return app;
}

export { restart, unhidePage, captureModel, detectEnv };
