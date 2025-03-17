import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useGeographic } from 'ol/proj';
import OpenLayersMap from "vue3-openlayers";
import App from '@/App.vue'
import './main.css'

import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(),
  routes: routes
})

useGeographic();

const app = createApp(App);
app.use(VueQueryPlugin);
app.use(OpenLayersMap);
app.use(router);
app.component('VueDatePicker', VueDatePicker);
app.mount('#app');
