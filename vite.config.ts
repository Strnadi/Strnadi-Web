// This file is actually crazy. It went through so much stuff, so many plugins, two different
// JavaScript frameworks, and a lot of trial and error. It is a miracle that it works at all.
// I am not sure if I will ever understand how it works and how I got here.
// Its inner workings are lost in chats with ChatGPT and nowhere else.
// Do not touch, unless absolutely necessary.

import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin as SentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer as Visualizer } from "rollup-plugin-visualizer";
import { purgePolyfills } from 'unplugin-purge-polyfills'
import Vue from "@vitejs/plugin-vue";
import TailwindCSS from "@tailwindcss/vite";
import TSConfigPaths from "vite-tsconfig-paths";
import Compression from "vite-plugin-compression2";
import vueDevTools from 'vite-plugin-vue-devtools';
import VueRouter from 'unplugin-vue-router/vite';
import MetaLayouts from "vite-plugin-vue-meta-layouts";
import Terminal from 'vite-plugin-terminal';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    purgePolyfills.rollup({  }),
    TSConfigPaths({ loose: true }),
    TailwindCSS(),
    VueRouter({  }),
    Vue({ include: [/\.vue$/, /\.md$/] }),
    Terminal({
      output: ['terminal', 'console']
    }),
    MetaLayouts({
      importMode: "async",
      target: 'src/layouts',
      defaultLayout: "default",
      skipTopLevelRouteLayout: false
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      // manifest: {
      //   name: "Strnadi",
      //   short_name: "Strnadi",
      //   theme_color: "#ffd641",
      //   background_color: "#ffffff",
      //   lang: "cs-CZ",
      //   display: "standalone",
      //   start_url: "/",
      //   id: "cz.delta-skola.strnadi",
      //   icons: [
      //     {
      //       src: "/logo.svg",
      //       sizes: "121x42",
      //       type: "image/svg+xml",
      //       purpose: "any maskable",
      //     },
      //   ],
      // },
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg}'], // exclude HTML
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(?:(new|dev|staging)\.)?strnadi\.cz\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'strnadi-cache',
              expiration: {
                maxEntries: 100000,
                maxAgeSeconds: 24 * 60 * 60 * 7, // 1 week
              },
            },
          },
          {
            urlPattern: /^https:\/\/(dev|new|old)?api.strnadi.cz\/map\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapy-cache',
              expiration: {
                maxEntries: 100000,
                maxAgeSeconds: 24 * 60 * 60 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/api.mapy.cz\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapy-cache',
              expiration: {
                maxEntries: 100000,
                maxAgeSeconds: 24 * 60 * 60 * 7, // 30 days
              },
            },
          },
        ],
      },
    }),
    Compression({ algorithm: "brotliCompress" }),
    SentryVitePlugin({
      org: "delta-strnadi",
      project: process.env.MODE === 'production' ? "strnadi-web" : "strnadi-web-staging",
      telemetry: false
    }),
    vueDevTools({
      launchEditor: "subl4"
    }),
    Visualizer({
      gzipSize: true,
      open: false,
      template: "sunburst",
    }),
  ],

  build: {
    target: "ESNext",
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
    reportCompressedSize: false
  },

  dev: {
    sourcemap: true,
  },

  resolve: {
    alias: [
      {
        find: /leaflet\/dist\/leaflet-src\.js(\?commonjs-es-import)?$/,
        replacement: 'leaflet/dist/leaflet-src.esm.js'
      }
    ],
  },

  server: {
    headers: {
      "content-security-policy":
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;",
    }
  },
});
