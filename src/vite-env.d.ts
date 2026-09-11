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

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_URL?: string;
  readonly VITE_AUTH_CLIENT_ID?: string;
  readonly VITE_AUTH_SCOPE?: string;
  readonly VITE_PROJECT_ID?: string;
  readonly VITE_POSTHOG_KEY: string;
  readonly VITE_PUBLIC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
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
