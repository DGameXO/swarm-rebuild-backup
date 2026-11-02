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
 * Thin adapter over the engine.
 *
 * The engine owns the overlay, the HUD and the keyboard shortcuts. This class
 * only translates library options into engine options and decides when to
 * start it — no DOM probing, no polling.
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
    core.start({
      autoScroll: this.options.autoScroll ?? false,
      speed: this.options.speed ?? 1,
      onComplete: this.options.onComplete,
    });
  }

  stop(): void {
    core.stop(false);
  }

  replay(): void {
    core.stop(false);
    this.start();
  }

  destroy(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.observer?.disconnect();
    this.observer = null;
    core.stop(false);
    this.options.onDestroy?.();
  }
}

export function createSwarm(options: SwarmOptions = {}): Swarm {
  return new SwarmImpl(options);
}
