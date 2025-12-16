/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />
/// <reference types="unplugin-vue-router/client" />
/// <reference types="vite-plugin-vue-meta-layouts/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

namespace NodeJS {
  interface ProcessEnv {
    readonly PUBLIC_GOOGLE_CLIENT_ID: string;
    readonly PUBLIC_APPLE_CLIENT_ID: string;
    readonly PUBLIC_API_URL: string;
    readonly PUBLIC_POSTHOG_KEY: string;
    readonly PUBLIC_URL: string;
  }
}

declare global {
  interface ViewTransition {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition(): void;
  }

  interface Document {
    startViewTransition?: (
      callback: () => void | Promise<void>
    ) => ViewTransition;
  }
}
