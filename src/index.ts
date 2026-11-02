import * as core from "./core/index.js";

export type { Item, Model } from "./core/index.js";

export type Trigger = "manual" | "load" | "visible";

export interface SwarmOptions {
  /** When to start. Defaults to "manual". */
  trigger?: Trigger;
  /** Anchor used by the "visible" trigger. Defaults to the whole document. */
  target?: Element | string;
  /** Scroll the page down as the swarm builds. Defaults to false. */
  autoScroll?: boolean;
  /** Build speed multiplier. Defaults to 1. */
  speed?: number;
  /** Called once every layer has been rebuilt. */
  onComplete?: () => void;
  /** Called after the overlay has been removed. */
  onDestroy?: () => void;
}

export interface Swarm {
  start(): void;
  stop(): void;
  replay(): void;
  destroy(): void;
  readonly running: boolean;
}

function resolveTarget(target: SwarmOptions["target"]): Element {
  if (!target) return document.documentElement;
  if (typeof target === "string") {
    const el = document.querySelector(target);
    if (!el) throw new Error(`[swarm-rebuild] target not found: ${target}`);
    return el;
  }
  return target;
}

/**
 * Adapter around the engine.
 *
 * The engine owns the overlay, the HUD and the keyboard shortcuts; this class
 * only decides when to start it and bridges the library options onto it.
 */
class SwarmImpl implements Swarm {
  private observer: IntersectionObserver | null = null;
  private stopped = false;

  constructor(private options: SwarmOptions) {
    const trigger = options.trigger ?? "manual";
    if (trigger === "load") this.start();
    else if (trigger === "visible") {
      this.observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.start();
        this.observer?.disconnect();
        this.observer = null;
      });
      this.observer.observe(resolveTarget(options.target));
    }
  }

  get running(): boolean {
    return core.isRunning();
  }

  start(): void {
    core.start();
    this.afterStart();
  }

  stop(): void {
    core.stop(false);
  }

  replay(): void {
    core.stop(false);
    core.start();
    this.afterStart();
  }

  destroy(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.observer?.disconnect();
    this.observer = null;
    core.stop(false);
    this.options.onDestroy?.();
  }

  /** Bridge library options onto the app once it has booted. */
  private afterStart(): void {
    const startY = window.scrollY;
    let tries = 0;
    let returned = false;

    const tick = (): void => {
      const app = core.getApp();
      const root = document.querySelector("swarm-rebuild")?.shadowRoot;

      if (app?.engine && this.options.speed) app.engine.speed = this.options.speed;
      if (root && this.options.autoScroll) {
        const tour = root.querySelector('[data-a="tour"]') as HTMLButtonElement | null;
        if (tour && !tour.classList.contains("on")) tour.click();
      }

      // Once the page is fully rebuilt, bring the visitor back where they were.
      if (app?.complete && !returned) {
        returned = true;
        if (this.options.autoScroll) {
          window.scrollTo({ top: startY, behavior: "smooth" });
        }
        this.options.onComplete?.();
        return;
      }

      if (!app?.complete && ++tries < 600) setTimeout(tick, 250);
    };

    setTimeout(tick, 150);
  }
}

export function createSwarm(options: SwarmOptions = {}): Swarm {
  return new SwarmImpl(options);
}
