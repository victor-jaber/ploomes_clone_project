import { execSync } from "child_process";
import * as esbuild from "esbuild";

execSync("npx vite build", { stdio: "inherit" });

esbuild.buildSync({
  entryPoints: ["server/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url); import { fileURLToPath } from "url"; import { dirname } from "path"; const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);',
  },
  packages: "external",
});

console.log("Build completed successfully");
