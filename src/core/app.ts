import { MIN_AGENTS } from "./constants.js";
import type { Shot } from "./model.js";
import { nextFrame, sleep } from "./utils.js";
import { captureModel } from "./snapshot.js";
import { detectEnv } from "./env.js";
import { View } from "./view.js";
import { Engine } from "./engine.js";
// -------------------------------------------------------------------- app

export class App {
  _dots: any;
  _hudT: any;
  complete: any;
  dead: any;
  engine: any;
  env: any;
  last: any;
  model: any;
  raf: any;
  speedIx: any;
  speeds: any;
  t0: any;
  timing: any;
  tour: any;
  tourAcc: any;
  tourV: any;
  unbinds: any;
  view: any;
  constructor() {
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
    const g = lastShot && lastShot.src === src ? lastShot.at : this.env.geom();
    return { img, sx: g.sx, sy: g.sy, scale: img.naturalWidth / innerWidth, valid: false };
  }

  async run() {
    this.env = detectEnv();
    const shotP = this.loadShot();
    this.view = new View(this.env);
    this.engine = new Engine(this.view);
    this.engine.onStart = () => this.view.intro.classList.add("gone");
    this.engine.onComplete = () => this.onComplete();
    this.bind();
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
    await nextFrame();
    this.view.bg.classList.add("on");
    this.view.intro.classList.add("on");
    this.view.hud.classList.add("on");
    const mark = (k: any) => (this.timing[k] = Math.round(performance.now() - this.t0));
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
      model = captureModel(this.env, shot);
    } catch (err) {
      console.error("[swarm-rebuild] capture failed", err);
      model = { items: [], tasks: [], groups: [], guides: [], docW: 0, docH: 0 };
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
    const on = (t: any, ev: any, fn: any, o?: any) => {
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
      (e: any) => {
        this.engine.mouse = { x: e.clientX, y: e.clientY };
      },
      { passive: true },
    );
    on(document.documentElement, "pointerleave", () => {
      this.engine.mouse = null;
    });
    on(
      window,
      "keydown",
      (e: any) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          stop(false);
        }
      },
      true,
    );
    if (!this.env.isRoot) {
      on(
        this.view.host,
        "wheel",
        (e: any) => {
          e.preventDefault();
          this.env.scroller.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "instant" });
        },
        { passive: false },
      );
    }
    on(this.view.hud, "click", (e: any) => {
      const b = e.target.closest("button");
      if (!b) return;
      const a = b.dataset.a;
      if (a === "close") stop(false);
      else if (a === "live") stop(true);
      else if (a === "replay") restart();
      else if (a === "tour") {
        this.tour = !this.tour;
        b.classList.toggle("on", this.tour);
        b.textContent = this.tour ? "Touring" : "Tour";
        if (this.tour) this.engine.start();
      } else if (a === "speed") {
        this.speedIx = (this.speedIx + 1) % this.speeds.length;
        this.engine.speed = this.speeds[this.speedIx];
        b.textContent = this.speeds[this.speedIx] + "×";
      }
    });
  }

  frame(now: any) {
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

  tourStep(dt: any) {
    const E = this.engine;
    if (!E.started) return;
    const g = this.env.geom();
    const maxY = this.env.scrollHeight() - g.vh;
    if (g.sy >= maxY - 1) {
      this.tourV = 0;
      return;
    }
    const crew = Math.max(MIN_AGENTS, E.cursors.filter((c: any) => !c.leaving).length);
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
    const workers = E.cursors.filter((c: any) => c.worked).length + E.retired;
    const total = E.tasks.length;
    const done = E.doneCount;
    if (this.complete) return;
    if (!E.started)
      v.status.innerHTML = `<b>${E.cursors.length}</b> agents ready<span class="sep"></span>${total.toLocaleString()} layers`;
    else {
      const pend = E.tasks.length - done;
      const below = E.tasks.some(
        (t: any) => t.state === "wait" && t.layer === "world" && t.gate > E.frontier,
      );
      v.status.innerHTML =
        `<b>${workers}</b> agents<span class="sep"></span><b>${done.toLocaleString()}</b> / ${total.toLocaleString()} layers` +
        (below && pend && !this.tour && E.backlog() === 0
          ? `<span class="sep"></span>scroll to keep building`
          : "");
    }
    v.barFill.style.width = total ? `${(done / total) * 100}%` : "0%";
    const busy = E.cursors.filter((c: any) => c.task).slice(-5);
    const key = busy.map((c: any) => c.id).join(",");
    if (key !== this._dots) {
      this._dots = key;
      v.dots.innerHTML = busy
        .map((c: any) => `<i style="background:${c.color}" title="${c.name}">${c.name[0]}</i>`)
        .join("");
    }
  }

  onComplete() {
    this.complete = true;
    const E = this.engine;
    const v = this.view;
    const workers = E.cursors.filter((c: any) => c.worked).length + E.retired;
    const secs = (E.endTime - E.startTime).toFixed(1);
    v.status.innerHTML = `Rebuilt by <b>${workers}</b> agents in <b>${secs}s</b>`;
    v.barFill.style.width = "100%";
    v.dots.innerHTML = "";
    v.root.querySelector('[data-a="live"]').hidden = false;
    v.root.querySelector('[data-a="replay"]').hidden = false;
    v.root.querySelector('[data-a="tour"]').hidden = true;
    v.root.querySelector('[data-a="speed"]').hidden = true;
    this.tour = false;
  }

  destroy(reveal: any) {
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
    app = null;
    a.dead = true;
    cancelAnimationFrame(a.raf);
    for (const u of a.unbinds || []) u();
    a.view.host.remove();
    // rebuild from where the first run started so screenshot crops line up again
    if (lastShot?.at) a.env.scrollTo(lastShot.at.sy, lastShot.at.sx);
  }
  start();
}

export function start(): void {
  if (app) return;
  app = new App();
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
