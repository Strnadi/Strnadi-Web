import * as Sentry from "@sentry/vue";
import App from '@/main/App.vue';
import { routes } from '../constants/routes';
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useGeographic } from 'ol/proj';
import OpenLayersMap from "vue3-openlayers";
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import '@/main/firebase';
import './main.css';
import { sentryConfig } from "@/constants/sentryConfig";

const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: routes
})

Sentry.init({ ...sentryConfig, app });

useGeographic();
app.use(VueQueryPlugin);
app.use(OpenLayersMap);
app.use(router);
app.component('VueDatePicker', VueDatePicker);
app.mount('#app');
