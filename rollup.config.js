import svelte from "rollup-plugin-svelte";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import livereload from "rollup-plugin-livereload";
import replace from "rollup-plugin-replace";
import copy from "rollup-plugin-copy";
import { terser } from "rollup-plugin-terser";
import { sass } from "svelte-preprocess-sass";
import css from "rollup-plugin-css-only";
import json from "@rollup/plugin-json";
import ghPages from "gh-pages";
import { config } from "dotenv";
config();

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/main.js",
  output: {
    sourcemap: true,
    format: "es",
    name: "app",
    dir: "public/chunks",
    manualChunks: moduleName => {
      if (moduleName.includes("node_modules")) {
        return "vendor";
      }

      if (moduleName.includes("src/")) {
        return "main";
      }
    },
  },
  plugins: [
    replace({
      YOUTUBE_API: JSON.stringify(process.env.YOUTUBE_API),
      SPOTIFY_ID: JSON.stringify(process.env.SPOTIFY_ID),
      SPOTIFY_SECRET: JSON.stringify(process.env.SPOTIFY_SECRET),
    }),
    svelte({
      compilerOptions: {
        // enable run-time checks when not in production
        dev: !production,
        hydratable: true,
      },
      preprocess: { style: sass() },
    }),
    // we'll extract any component CSS out into
    // a separate file — better for performance
    css({ output: "bundle.css" }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration —
    // consult the documentation for details:
    // https://github.com/rollup/rollup-plugin-commonjs
    resolve({
      browser: true,
      dedupe: importee => importee === "svelte" || importee.startsWith("svelte/"),
    }),
    commonjs(),
    json({ compact: true }),

    copy({
      targets: [{ src: "public/chunks/bundle.css", dest: "public" }],
    }),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload("public"),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production &&
      terser() &&
      ghPages.publish("public", () => console.info("Uploaded to Github Pages")),
  ],
  watch: {
    clearScreen: false,
  },
};
