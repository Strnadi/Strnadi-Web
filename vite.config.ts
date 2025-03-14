import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import mdx from "@mdx-js/rollup";
import compression from "vite-plugin-compression2";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills(),
    tsconfigPaths({ loose: true }),
    tailwindcss(),
    vue(),
    VitePWA({
      srcDir: "src/workers",
      filename: "Worker.ts",
      strategies: "injectManifest",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
    compression(),
    sentryVitePlugin({
      org: "delta-strnadi",
      project: "strnadi-web",
      telemetry: false,
    }),
    visualizer({
      gzipSize: true,
      open: true,
      template: "flamegraph",
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules") || id.includes("src/vendor/")) {
            return "vendor";
          }
        },
      },
    },

    sourcemap: true,
  },

  resolve: {
    alias: [
      {
        find: /leaflet\/dist\/leaflet-src\.esm.js$/,
        replacement: "leaflet/dist/leaflet.js",
      },
      {
        find: /leaflet\/dist\/leaflet-src\.js(\?commonjs-es-import)?$/,
        replacement: "leaflet/dist/leaflet.js",
      },
      {
        find: /^leaflet$/,
        replacement: "leaflet/dist/leaflet.js",
      },
    ],

    dedupe: ["bn.js"],
  },

  dev: {
    sourcemap: true,
  },

  server: {
    headers: {
      "content-security-policy":
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;",
    },
  },

  assetsInclude: ["**/*.md"]
});
