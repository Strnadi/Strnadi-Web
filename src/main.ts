import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useGeographic } from 'ol/proj';
import OpenLayersMap from "vue3-openlayers";
import App from '@/App.vue';
import './main.css';

import * as Sentry from "@sentry/vue";

import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

import { routes } from './routes';

useGeographic();
const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: routes
})

Sentry.init({
  app: app,
  dsn: "https://230547a60eede3df732b3c9b22fa0d02@o4508834111291392.ingest.de.sentry.io/4508930854682704",
  integrations: [
    Sentry.browserTracingIntegration({ router }),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

app.use(VueQueryPlugin);
app.use(OpenLayersMap);
app.use(router);
app.component('VueDatePicker', VueDatePicker);
app.mount('#app');
