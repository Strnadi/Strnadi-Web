import * as Sentry from "@sentry/vue";
import App from "@/App.vue";
import posthogPlugin from "@/plugins/vue/posthog";
import firebasePlugin from "@/plugins/vue/firebase";
import Vue3RouterPrefetch from 'vue3-router-prefetch'
import axios from "axios";
import { createApp, defineCustomElement } from "vue";
import { createRouter, createWebHistory, type RouteLocationRaw, type RouteRecordRaw } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { routes as generatedRoutes } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:meta-layouts';

import VueClickAway from "vue3-click-away";
import VWave from 'v-wave';
import vSelect from 'vue-select';
import VueDatePicker from "@vuepic/vue-datepicker";
import ExpandableImage from '@/components/ExpandableImage.vue';
import { ApiError } from "@/classes/api-error";
import "./styles/main.css";

declare global {
  interface Array<T> {
    guarded: (guard: (to: RouteRecordRaw, from: RouteRecordRaw) => RouteRecordRaw) => RouteRecordRaw[]
  }
}

Array.prototype.guarded = function(
  guard: (to: RouteRecordRaw, from: RouteRecordRaw) => RouteRecordRaw
): RouteRecordRaw[] {
  return this.map((route: RouteRecordRaw) => {
    // add guard to this route
    const guardedRoute: RouteRecordRaw = {
      ...route,
      beforeEnter: [
        ...(Array.isArray(route.beforeEnter)
          ? route.beforeEnter
          : route.beforeEnter
          ? [route.beforeEnter]
          : []),
        guard as any,
      ]
    };
    // recurse into children if any
    if (route.children) {
      guardedRoute.children = (route.children as RouteRecordRaw[]).guarded(guard);
    }
    return guardedRoute;
  });
};

const desktopBp = getComputedStyle(document.documentElement)
  .getPropertyValue('--breakpoint-desktop')
  .trim();

const desktopQuery = window.matchMedia(`(min-width: ${desktopBp})`);

// Mobile Firefox users (yes, all two of you), tough luck
// Y'all will just recieve the desktop site :^)
const initialIsDesktop =
  (navigator.userAgent.indexOf("Firefox") != -1) || desktopQuery.matches;

const handleResize = () => {
  const currentIsDesktop = desktopQuery.matches;
  if (currentIsDesktop !== initialIsDesktop) {
    window.location.reload();
  }
};

desktopQuery.addEventListener('change', handleResize);

const removeUnlayoutedRoutes = (routes: RouteRecordRaw[], isDesktop: boolean): RouteRecordRaw[] => {
  return routes.map(route => {
    let processedRoute = { ...route };

    if (processedRoute.children && processedRoute.children.length > 0) {
      processedRoute.children = removeUnlayoutedRoutes(processedRoute.children, isDesktop);
    }

    if (isDesktop && !processedRoute.meta?.layout) {
      processedRoute = {
        ...processedRoute,
        // component: 
      };
    }

    return processedRoute;
  });
};


const removeLayoutsRecursively = (routes: RouteRecordRaw[], isDesktop: boolean): RouteRecordRaw[] => {
  return routes.map(route => {
    let processedRoute = { ...route };

    if (processedRoute.children && processedRoute.children.length > 0) {
      processedRoute.children = removeLayoutsRecursively(processedRoute.children, isDesktop);
    }

    if (!isDesktop && processedRoute.meta?.layout) {
      processedRoute.meta = {
        ...processedRoute.meta,
        layout: false
      };
    }

    return processedRoute;
  });
};

const nameRoutes = (routes: RouteRecordRaw[], suffix: string, predicate: (route: RouteRecordRaw) => boolean): RouteRecordRaw[] => {
  return routes.map(route => {
    let processedRoute = { ...route };

    if (processedRoute.children && processedRoute.children.length > 0) {
      processedRoute.children = nameRoutes(processedRoute.children, suffix, predicate);
    }

    if (predicate(processedRoute)) {
      processedRoute.name = `${(processedRoute.name as string)}|${suffix}|`;
    }

    return processedRoute;
  });
};

const welcomeGuard = (to: RouteRecordRaw, _from: RouteRecordRaw): boolean | RouteLocationRaw => {
  if(
       !localStorage.getItem("FirstLaunch")
    && !to.meta?.['landing-bypass']
  ) {
    localStorage.setItem("FirstLaunch", "false");
    return {
      path: '/vitejte',
      query: {
        from: to.path
      }
    };
  }

  return true;
};

const serverGuard = (to: RouteRecordRaw, _from: RouteRecordRaw): boolean | RouteLocationRaw => {
  console.log(to.path)

  if (to.path.startsWith("/__")) {
    window.location.pathname = to.path;
    return false;
  }

  return true;
};

// const authGuard = (to: RouteRecordRaw, _from: RouteRecordRaw): boolean | RouteLocationRaw => {
//   const user = accountStore.user;

//   if (to.meta?.auth && !user) {
//     return {
//       name: `${to.name}`,
//       params: to.params,
//       query: to.query
//     }
//   }

//   if (!to.meta?.auth
//       && user
//       && (to.name as string).includes('|auth|')
//   ) {
//     return {
//       name: (to.name as string).replace(/-guest$/, ''),
//       params: to.params,
//       query: to.query
//     }
//   }

//   return true
// }

let routes: RouteRecordRaw[];
routes = generatedRoutes;
// routes = removeUnlayoutedRoutes(routes, initialIsDesktop);
routes = removeLayoutsRecursively(routes, initialIsDesktop);
routes = setupLayouts(routes);
// routes = nameRoutes(routes, "guest", route => route.meta?.auth === false);
// routes = nameRoutes(routes, "auth", route => !!route.meta?.auth);
// routes = nameRoutes(routes, "admin", route => !!route.meta?.admin);
// routes = routes.guarded(authGuard);

if (!import.meta.env.MODE) {
  routes = routes.guarded(serverGuard);
}

routes = routes.guarded(welcomeGuard);

console.log(routes)

const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: routes,

  scrollBehavior(_to, _from, _savedPosition) {
    const scrollableContainers = document.querySelectorAll(
      'aside.side > div, aside.popup > div, aside.small_popup > div, aside.center > div'
    );

    scrollableContainers.forEach(container => {
      if (container) {
        container.scrollTop = 0;
      }
    });

    // Reset window scroll position as well
    return { top: 0, left: 0 };
  }
});

const sentryConfig = {
  app: app,
  integrations: [
    Sentry.browserTracingIntegration({ router }),
  ],
};

if(import.meta.env.MODE === 'production') {
  app.use(posthogPlugin);

  Sentry.init({
    ...sentryConfig,
    dsn: "https://e3caec48db03fc752eb60fcccceb5d7e@o4508834111291392.ingest.de.sentry.io/4509010454970448",
  });
}

if(import.meta.env.MODE === 'staging') {
  Sentry.init({
    ...sentryConfig,
    dsn: "https://02fdb339d395fe6066c7d0d5b5d4d4d8@o4508834111291392.ingest.de.sentry.io/4509155946266704",
  });
}

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.interceptors.response.use(response => response, error => {
  throw new ApiError(error.code, error.response?.status, error.response?.data);
});

/*
axios.defaults.onUploadProgress = (progressEvent) => {
  const { loaded, total } = progressEvent;
  const percentCompleted = Math.round((loaded * 100) / (total || 1));
};

axios.defaults.onDownloadProgress = (progressEvent) => {
  const { loaded, total } = progressEvent;
  const percentCompleted = Math.round((loaded * 100) / (total || 1));
};
*/


app.use(router);
app.use(firebasePlugin);
app.use(VueQueryPlugin);
app.use(Vue3RouterPrefetch, { type: "hover", name: "PrefetchLink" });
app.use(VWave, {
  duration: 0.2
});
app.use(VueClickAway);

app.component('vSelect', vSelect);
app.component("VueDatePicker", VueDatePicker);

customElements.define('expandable-image', defineCustomElement(ExpandableImage, { shadowRoot: false }));

app.mount("#app");
