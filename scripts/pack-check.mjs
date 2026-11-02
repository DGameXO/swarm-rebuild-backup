#!/usr/bin/env node
/**
 * Check the contents of the npm tarball before it is published.
 *
 *   node scripts/pack-check.mjs <tarball>
 *
 * Guard rails that `npm publish` alone does not give us:
 *   - the entry points declared in `package.json` exist in the tarball;
 *   - no source maps ship (they would double the download and leak `src/`);
 *   - no runtime dependency crept back in;
 *   - the tarball stays under a size budget, so a stray asset is caught in
 *     CI instead of after the release.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [tarball] = process.argv.slice(2);
if (!tarball) {
  console.error("usage: node scripts/pack-check.mjs <tarball>");
  process.exit(2);
}

const MAX_UNPACKED_BYTES = 950 * 1024;
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
);

// `shell: true` is what makes this work on Windows, where `npm` is a `.cmd`
// shim. The only variable is the tarball name emitted by our own build.
const command = `npm pack ${JSON.stringify(tarball)} --dry-run --json --ignore-scripts`;
const raw = execFileSync(command, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  shell: true,
});

const report = JSON.parse(raw.replace(/^\uFEFF/, ""));
const list = Object.values(report)[0];

const errors = [];
const files = new Map(list.files.map((file) => [file.path, file.size]));

const entries = [
  pkg.main,
  pkg.module,
  pkg.types,
  pkg.exports?.["."]?.types,
  pkg.exports?.["."]?.import,
  pkg.exports?.["."]?.require,
].filter(Boolean);

for (const entry of new Set(entries)) {
  const path = entry.replace(/^\.\//, "");
  if (!files.has(path)) errors.push(`missing entry point in the tarball: ${path}`);
}

for (const path of files.keys()) {
  if (path.endsWith(".map")) errors.push(`source map published: ${path}`);
  if (path.startsWith("src/") || path.startsWith("tests/") || path.startsWith("demo/")) {
    errors.push(`development file published: ${path}`);
  }
}

if (Object.keys(pkg.dependencies ?? {}).length > 0) {
  errors.push(`runtime dependencies are not allowed: ${Object.keys(pkg.dependencies).join(", ")}`);
}

const unpacked = list.unpackedSize ?? [...files.values()].reduce((sum, size) => sum + size, 0);
if (unpacked > MAX_UNPACKED_BYTES) {
  errors.push(
    `tarball unpacks to ${(unpacked / 1024).toFixed(1)} kB (budget ${MAX_UNPACKED_BYTES / 1024} kB)`,
  );
}

for (const error of errors) console.error(`::error::${error}`);
if (errors.length > 0) process.exit(1);

console.log(
  `tarball ok: ${files.size} files, ${(list.size / 1024).toFixed(1)} kB packed, ` +
    `${(unpacked / 1024).toFixed(1)} kB unpacked`,
);
