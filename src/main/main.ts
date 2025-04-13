import * as Sentry from "@sentry/vue";
import App from "@/main/App.vue";
import posthogPlugin from "@/plugins/posthog";
import Vue3RouterPrefetch from 'vue3-router-prefetch'
import axios from "axios";
import { routes, baseRoutes} from "@/constants/routes";
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";

// TODO: Remove unused layers from bundle
import {
  Map as OpenLayersMap,
  Layers as OpenLayersMapLayers,
  Sources as OpenLayersMapSources,
  MapControls as OpenLayersMapControls,
  Geometries as OpenLayersMapGeometries,
  Styles as OpenLayersMapStyles,
} from "vue3-openlayers";

import VueDatePicker from "@vuepic/vue-datepicker";
import ExpandableImage from "@/components/generic/ExpandableImage.vue";
import "@vuepic/vue-datepicker/dist/main.css";
import "@/main/firebase";
import "../styling/main.css";
import { ApiError } from "@/api/types/api-error";

const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: baseRoutes(),
  scrollBehavior(_to, _from, _savedPosition) {
    return { top: 0 }; // Always scroll to top
  }
});

// This is ugly shit right here.
routes(router).forEach((route) => router.addRoute(route))

if(import.meta.env.PROD) {
  Sentry.init({
    app: app,
    dsn: "https://e3caec48db03fc752eb60fcccceb5d7e@o4508834111291392.ingest.de.sentry.io/4509010454970448",
    integrations: [
      Sentry.browserTracingIntegration({ router }),
    ],
  });

  app.use(posthogPlugin);
}

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.interceptors.response.use(response => response, error => {
  throw new ApiError(error.code, error.response?.status, error.response?.data);
});

axios.defaults.onUploadProgress = (progressEvent) => {
  const { loaded, total } = progressEvent;
  const percentCompleted = Math.round((loaded * 100) / (total || 1));
  console.log(`Upload progress: ${percentCompleted}%`);
};

axios.defaults.onDownloadProgress = (progressEvent) => {
  const { loaded, total } = progressEvent;
  const percentCompleted = Math.round((loaded * 100) / (total || 1));
  console.log(`Download progress: ${percentCompleted}%`);
};

app.use(OpenLayersMap);
app.use(OpenLayersMapLayers);
app.use(OpenLayersMapSources);
app.use(OpenLayersMapControls);
app.use(OpenLayersMapGeometries);
app.use(OpenLayersMapStyles);

app.use(router);
app.use(VueQueryPlugin);
app.use(Vue3RouterPrefetch, { type: "hover", name: "PrefetchLink" })
app.component("VueDatePicker", VueDatePicker);
app.component("ExpandableImage", ExpandableImage);
app.mount("#app");
