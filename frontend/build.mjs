import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const options = {
  entryPoints: {
    "crescendo-card": "src/card.ts",
    "crescendo-panel": "src/panel.ts",
  },
  outdir: "../custom_components/cloudless_crescendo/frontend",
  bundle: true,
  format: "esm",
  target: "es2021",
  minify: !watch,
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
