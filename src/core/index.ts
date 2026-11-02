/**
 * Public entry point of the vendored engine.
 *
 * The engine itself is a faithful TypeScript port of the Swarm Rebuild
 * extension: same snapshot model, same choreography, same HUD. Only the
 * entry point differs — it no longer auto-starts, so the library controls
 * when the effect runs.
 */
export { captureModel } from "./snapshot.js";
export { detectEnv } from "./env.js";
export { getApp, isRunning, restart, start, stop, toggle, unhidePage } from "./app.js";
export type { Agent, CoreOptions, Env, Geometry, Group, Item, Model, Shot, Task } from "./model.js";
