import * as Sentry from "@sentry/vue";
import App from "@/main/App.vue";
import PrefetchPlugin from 'vue-route-prefetch'
import axios from "axios";
import { routes } from "@/constants/routes";
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { useGeographic } from "ol/proj";

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

const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: routes,
  scrollBehavior(_to, _from, _savedPosition) {
    return { top: 0 }; // Always scroll to top
  }
});

if(import.meta.env.PROD) {
  Sentry.init({
    app: app,
    dsn: "https://e3caec48db03fc752eb60fcccceb5d7e@o4508834111291392.ingest.de.sentry.io/4509010454970448",
    integrations: [
      Sentry.browserTracingIntegration({ router }),
    ],
  });
}

axios.defaults.baseURL = import.meta.env.VITE_API_URL;

useGeographic();
app.use(VueQueryPlugin);

app.use(OpenLayersMap);
app.use(OpenLayersMapLayers);
app.use(OpenLayersMapSources);
app.use(OpenLayersMapControls);
app.use(OpenLayersMapGeometries);
app.use(OpenLayersMapStyles);

app.use(router);
app.use(PrefetchPlugin)
app.component("VueDatePicker", VueDatePicker);
app.component("ExpandableImage", ExpandableImage);
app.mount("#app");
