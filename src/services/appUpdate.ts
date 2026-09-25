import { reactive } from 'vue';
import { START_LOCATION, type Router } from 'vue-router';
import { registerSW } from 'virtual:pwa-register';
import { uploadQueueStore } from '@/state/UploadStore';
import { uploadStore } from '@/state/UploadDraftStore';

// An installed PWA on a phone is resumed rather than reloaded and has no reload
// button, so the app has to notice new deployments and switch to them itself.
//
// The service worker activates a new build as soon as it has downloaded it. The
// page that is already open keeps running the old code, so it gets reloaded at
// the first moment that doesn't cost the user anything: before they have
// touched it, on the next in-app navigation, or when they tap the banner.

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
const MIN_UPDATE_CHECK_GAP = 60 * 1000;
// Coming back after this long counts as a fresh start rather than a return to
// whatever the user was doing.
const STALE_SESSION_AFTER = 30 * 60 * 1000;
// A reload that lands back on the same problem must not turn into a loop.
const RELOAD_LOOP_WINDOW = 15 * 1000;
const RELOAD_STAMP_KEY = 'strnadi:auto-reload-at';

// Runtime caches of builds before this one were named after the build, so
// every deployment left the previous copy (models and WASM included) behind.
const LEGACY_CACHE_PATTERN = /^strnadi-api-cache-\d+$/;

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

// Reloading would throw away a recording that is being put together or sent.
const isBusy = () =>
  uploadQueueStore.getActiveTasks().length > 0 || !!uploadStore.parts?.length;

export const appUpdate = reactive({
  /** A newer build is active and this page is still running the old one. */
  available: false,
  reloading: false,
  /** Whether switching now is safe to offer. */
  get ready(): boolean {
    return this.available && !isBusy();
  }
});

let registration: ServiceWorkerRegistration | undefined;
let lastUpdateCheck = 0;
let interacted = false;
let hiddenAt: number | null = null;

const reloadedRecently = () => {
  try {
    const stamp = Number(sessionStorage.getItem(RELOAD_STAMP_KEY));
    return Date.now() - stamp < RELOAD_LOOP_WINDOW;
  } catch {
    return false;
  }
};

const reload = (href?: string) => {
  if (appUpdate.reloading) return;
  appUpdate.reloading = true;
  try {
    sessionStorage.setItem(RELOAD_STAMP_KEY, String(Date.now()));
  } catch {
    // Without storage the loop guard is off, but the reload is still right.
  }
  if (href && href !== location.pathname + location.search + location.hash) {
    location.assign(href);
  } else {
    location.reload();
  }
};

/** Switches to the new build now. Also what the update banner calls. */
export const applyUpdate = (href?: string) => reload(href);

const reloadIfUnnoticed = () => {
  if (appUpdate.available && !interacted && !isBusy() && !reloadedRecently()) {
    reload();
  }
};

const checkForUpdate = async () => {
  if (!registration || registration.installing || !navigator.onLine) return;
  if (Date.now() - lastUpdateCheck < MIN_UPDATE_CHECK_GAP) return;
  lastUpdateCheck = Date.now();
  try {
    await registration.update();
  } catch {
    // Offline or the server is mid-deploy; the next check will try again.
  }
};

const removeLegacyCaches = async () => {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => LEGACY_CACHE_PATTERN.test(key))
      .map((key) => caches.delete(key))
  );
};

// A build removed from the server (or dropped from the service worker's cache)
// takes its lazily loaded chunks with it. A page still running that build gets
// the new one by reloading, ideally straight into where the user was going.
const isChunkLoadError = (error: unknown) =>
  error instanceof Error && CHUNK_ERROR_PATTERN.test(error.message);

const recoverFromMissingChunk = (href?: string) => {
  if (reloadedRecently()) return false;
  reload(href);
  return true;
};

export const installAppUpdates = (router: Router) => {
  router.beforeEach((to, from) => {
    if (from === START_LOCATION || !appUpdate.available || isBusy()) return;
    if (reloadedRecently()) return;
    reload(router.resolve(to).href);
    return false;
  });

  router.onError((error, to) => {
    if (isChunkLoadError(error)) recoverFromMissingChunk(to.fullPath);
  });

  // Chunks imported outside of routing. The router's handler above runs first
  // for route components and knows the destination, so give it the chance.
  window.addEventListener('vite:preloadError', () => {
    setTimeout(() => recoverFromMissingChunk(), 0);
  });

  for (const type of ['pointerdown', 'keydown'] as const) {
    window.addEventListener(type, () => (interacted = true), {
      capture: true,
      passive: true
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    if (hiddenAt !== null && Date.now() - hiddenAt >= STALE_SESSION_AFTER) {
      interacted = false;
    }
    hiddenAt = null;
    reloadIfUnnoticed();
    void checkForUpdate();
  });

  window.addEventListener('online', () => void checkForUpdate());

  if (!('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onNeedReload() {
      appUpdate.available = true;
      reloadIfUnnoticed();
    },
    onRegisteredSW(_swUrl, r) {
      registration = r;
      lastUpdateCheck = Date.now();
      setInterval(() => {
        if (document.visibilityState === 'visible') void checkForUpdate();
      }, UPDATE_CHECK_INTERVAL);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    }
  });

  void removeLegacyCaches().catch(() => undefined);
};
