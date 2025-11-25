// This file is actually crazy. It went through so much stuff, so many plugins, two different
// JavaScript frameworks, and a lot of trial and error. It is a miracle that it works at all.
// I am not sure if I will ever understand how it works and how I got here.
// Its inner workings are lost in chats with ChatGPT and nowhere else.
// Do not touch, unless absolutely necessary.

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin as SentryVitePlugin } from '@sentry/vite-plugin';
import { visualizer as Visualizer } from 'rollup-plugin-visualizer';
import { purgePolyfills } from 'unplugin-purge-polyfills';
import Vue from '@vitejs/plugin-vue';
import TailwindCSS from '@tailwindcss/vite';
import TSConfigPaths from 'vite-tsconfig-paths';
import Compression from 'vite-plugin-compression2';
import vueDevTools from 'vite-plugin-vue-devtools';
import VueRouter from 'unplugin-vue-router/vite';
import MetaLayouts from 'vite-plugin-vue-meta-layouts';
import Terminal from 'vite-plugin-terminal';
import SVGLoader from 'vite-svg-loader';
import DocsPlugin from './plugins/docs';
import Inspect from 'vite-plugin-inspect';
import { qrcode as QRCode } from 'vite-plugin-qrcode';
import mkcert from 'vite-plugin-mkcert';
import path from 'node:path';
import fs from 'node:fs';

// Add a unique build identifier that changes on every deployment. This will be appended
// to runtime cache names so they become versioned and won‘t clash with older builds.
const BUILD_VERSION = new Date().toISOString().replace(/[-:T.Z]/g, '');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    Inspect(),
    QRCode(),
    purgePolyfills.rollup({}),
    TSConfigPaths({ loose: true }),
    TailwindCSS(),
    DocsPlugin(),
    VueRouter({ importMode: 'sync', routeBlockLang: 'yaml' }),
    Vue({ include: [/\.vue$/, /\.md$/] }),
    SVGLoader({
      defaultImport: 'component'
    }),
    Terminal({
      output: ['terminal', 'console']
    }),
    MetaLayouts({
      importMode: 'sync',
      target: 'src/layouts',
      defaultLayout: 'default',
      skipTopLevelRouteLayout: false
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Strnadi - web',
        short_name: 'Strnadi - Web',
        theme_color: '#ffd641',
        background_color: '#ffffff',
        lang: 'cs-CZ',
        display: 'standalone',
        start_url: '/',
        id: 'cz.delta-skola.strnadi',
        icons: [
          {
            src: '/logo.svg',
            sizes: '121x42',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,html}'], // include HTML
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: `strnadi-html-cache-${BUILD_VERSION}`,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60 * 7 // 1 week
              },
              networkTimeoutSeconds: 0.5
            }
          },
          {
            urlPattern:
              /^https:\/\/(dev|new|old)?api.strnadi.cz\/recordings\/part\/(\d+)\/(\d+)\/sound$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `strnadi-api-cache-sounds`,
              expiration: {
                maxEntries: 100000,
                maxAgeSeconds: 24 * 60 * 60 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/(dev|new|old)?api.strnadi.cz\/map\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `strnadi-api-cache-maps`,
              expiration: {
                maxEntries: 100000,
                maxAgeSeconds: 24 * 60 * 60 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/(?:(new|dev|staging)\.)?strnadi\.cz\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `strnadi-api-cache-${BUILD_VERSION}`,
              expiration: {
                maxEntries: 100000,
                maxAgeSeconds: 24 * 60 * 60 * 7 // 1 week
              },
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    }),
    Compression({ algorithms: ['brotliCompress', 'gzip'] }),
    SentryVitePlugin({
      org: 'delta-strnadi',
      project:
        process.env['MODE'] === 'production'
          ? 'strnadi-web'
          : 'strnadi-web-staging',
      telemetry: false
    }),
    mkcert(),
    // vueDevTools({
    //   launchEditor: 'subl4'
    // }),
    Visualizer({
      gzipSize: true,
      open: false,
      template: 'sunburst'
    }),
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.originalUrl?.startsWith('/.well-known')) {
            res.setHeader('Content-Type', 'application/json');
            const filePath = path.join(__dirname, `public${req.originalUrl}`);
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.originalUrl?.startsWith('/.well-known')) {
            res.setHeader('Content-Type', 'application/json');
            const filePath = path.join(__dirname, `public${req.originalUrl}`);
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      }
    }
  ],

  build: {
    target: 'ESNext',
    cssTarget: 'es2022',
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: 'vendor', test: /node_modules/ }]
        }
      }
    },

    sourcemap: true,
    reportCompressedSize: false
  },

  dev: {
    sourcemap: true
  },

  resolve: {
    alias: [
      {
        find: /leaflet\/dist\/leaflet-src\.js/,
        replacement: 'leaflet/dist/leaflet-src.esm.js'
      }
    ]
  },

  server: {
    allowedHosts: true,
    hmr: false,
    // https: {
    //
    // },

    headers: {
      'content-security-policy':
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'script-src-elem' blob:;"
      // "cross-origin-embedder-policy": "require-corp",
      // "cross-origin-opener-policy": "same-origin"
    }
  }
});
