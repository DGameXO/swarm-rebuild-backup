#!/usr/bin/env node
/**
 * Stage the static site served by GitHub Pages into `_site`.
 *
 *   node scripts/build-site.mjs [--dist <dir>]   (default: ./dist)
 *
 * The demo pages import the bundle with a relative `../dist/index.js` path, so
 * `_site/demo` must sit next to `_site/dist`. Both trees are copied, then every
 * relative module import is resolved inside `_site`: a deploy that ships a 404
 * bundle is green, a deploy that fails this check is not.
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "_site");

const distFlag = process.argv.indexOf("--dist");
const dist = distFlag === -1 ? join(root, "dist") : resolve(process.argv[distFlag + 1]);

const IMPORT = /(?:import|export)[^"'"]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

async function isFile(path) {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}

/** Every relative specifier in a module script must resolve inside the site. */
async function unresolvedImports() {
  const missing = [];
  const pages = (await walk(join(site, "demo"))).filter((file) => file.endsWith(".html"));

  for (const page of pages) {
    const html = await readFile(page, "utf8");
    const scripts = [
      ...html.matchAll(/<script[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/g),
    ];

    for (const [, source] of scripts) {
      for (const match of source.matchAll(IMPORT)) {
        const specifier = match[1] ?? match[2];
        if (!specifier.startsWith(".")) continue;

        const target = resolve(dirname(page), specifier);
        if (relative(site, target).startsWith("..") || !(await isFile(target))) {
          missing.push(`${relative(site, page)} -> ${specifier}`);
        }
      }
    }
  }

  return missing;
}

const entry = join(dist, "index.js");
if (!(await isFile(entry))) {
  console.error(`::error::bundle missing: ${entry}. Run \`npm run build\` first.`);
  process.exit(1);
}

await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });
await cp(join(root, "demo"), join(site, "demo"), { recursive: true });
await cp(dist, join(site, "dist"), { recursive: true });
await writeFile(join(site, "robots.txt"), "User-agent: *\nDisallow: /\n");
await writeFile(join(site, ".nojekyll"), "");
await writeFile(
  join(site, "index.html"),
  '<!doctype html><meta charset="utf-8"><title>swarm-rebuild</title>' +
    '<meta http-equiv="refresh" content="0;url=./demo/"><a href="./demo/">Open the demo</a>',
);

const missing = await unresolvedImports();
for (const line of missing) console.error(`::error::unresolved module import: ${line}`);
if (missing.length > 0) process.exit(1);

console.log(`site ready: ${(await walk(site)).length} files, bundle at dist/index.js`);
