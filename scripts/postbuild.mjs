/**
 * `tsc` emits a single ESM declaration file. The package also ships a CommonJS
 * build, and `exports["."].require.types` must point at a `.d.cts` file or
 * `require()` consumers resolve ESM types (publint flags this). The declarations
 * are type-only, so a byte-identical copy is enough.
 */
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dist = new URL("../dist/", import.meta.url);
await copyFile(
  fileURLToPath(new URL("index.d.ts", dist)),
  fileURLToPath(new URL("index.d.cts", dist)),
);
