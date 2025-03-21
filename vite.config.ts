// This file is actually crazy. It went through so much stuff, so many plugins, two different
// JavaScript frameworks, and a lot of trial and error. It is a miracle that it works at all.
// I am not sure if I will ever understand how it works and how I got here.
// Its inner workings are lost in chats with ChatGPT and nowhere else.
// Do not touch, unless absolutely necessary.

import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import compression from "vite-plugin-compression2";
import Markdown from 'unplugin-vue-markdown/vite';
// import mkcert from'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths({ loose: true }),
    tailwindcss(),
    vue({ include: [/\.vue$/, /\.md$/] }),
    Markdown({
      wrapperDiv: false,
      markdownItOptions: {
        html: true,
        linkify: true,
      },
      markdownItSetup(md) {
        md.renderer.rules.image = (tokens, idx) => {
          const token = tokens[idx];
          const srcIndex = token.attrIndex('src');
          const altIndex = token.attrIndex('alt');
          const src = srcIndex >= 0 ? token.attrs![srcIndex][1] : '';
          const alt = altIndex >= 0 ? token.attrs![altIndex][1] : '';

          return `<ExpandableImage src="${src}" alt="${alt}"></ExpandableImage>`;
        };
      }
    }),
    VitePWA({
      srcDir: "src/workers",
      filename: "Worker.ts",
      strategies: "injectManifest",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        buildPlugins: {
          vite: [
            tsconfigPaths({ loose: true })
          ]
        }
      },
    }),
    compression({ algorithm: "brotliCompress" }),
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
    // mkcert()
  ],

  build: {
    target: "ESNext",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if(id.includes("vue3-openlayers") || id.includes("/ol") || id.includes("geojson") || id.includes("geotiff")) {
            return "maps";
          }

          if (id.includes("node_modules") || id.includes("src/vendor/")) {
            return "vendor";
          }
        },
      },
    },

    sourcemap: true,
    reportCompressedSize: false
  },

  dev: {
    sourcemap: true,
  },

  server: {
    headers: {
      "content-security-policy":
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;",
    }
  },
});
