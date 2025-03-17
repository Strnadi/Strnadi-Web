import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import compression from "vite-plugin-compression2";
import Markdown from 'unplugin-vue-markdown/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills(),
    tsconfigPaths({ loose: true }),
    tailwindcss(),
    vue({ include: [/\.vue$/, /\.md$/] }),
    Markdown({  }),
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
      open: false,
      template: "flamegraph",
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {

          if(id.includes("vue3-openlayers") || id.includes("/ol") || id.includes("geojson") || id.includes("geotiff")) {
            return "maps";
          }
          
          // if(id.includes("vue")) {
          //   return "vue-core";
          // }

          if (id.includes("node_modules") || id.includes("src/vendor/")) {
            return "vendor";
          }
        },
        // hoistTransitiveImports: false
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

  // assetsInclude: ["**/*.md"]
});
