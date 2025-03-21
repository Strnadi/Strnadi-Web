import * as Sentry from "@sentry/vue";
import App from '@/main/App.vue';
import { routes } from '@/constants/routes';
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useGeographic } from 'ol/proj';
import OpenLayersMap from "vue3-openlayers";
import VueDatePicker from '@vuepic/vue-datepicker';
import ExpandableImage from "@/components/generic/ExpandableImage.vue";
import '@vuepic/vue-datepicker/dist/main.css';
import '@/main/firebase';
import './main.css';

const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: routes
})

Sentry.init({
  app: app,
  dsn: "https://e3caec48db03fc752eb60fcccceb5d7e@o4508834111291392.ingest.de.sentry.io/4509010454970448",
  integrations: [
    Sentry.browserTracingIntegration({ router }),
    // Sentry.replayIntegration(),
  ],
  // tracesSampleRate: 1.0,
  // tracePropagationTargets: ["localhost", /^https:\/\/api.strnadi\.cz/],
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,
});

useGeographic();
app.use(VueQueryPlugin);
app.use(OpenLayersMap);
app.use(router);
app.component('VueDatePicker', VueDatePicker);
app.component('ExpandableImage', ExpandableImage)
app.mount('#app');
