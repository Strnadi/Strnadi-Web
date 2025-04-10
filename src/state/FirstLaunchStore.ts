import { reactive } from 'vue'

/* @ts-ignore */
import persist from "vue-reactive-persisted";

export const firstLaunchStore = reactive({
  firstLaunch: true as boolean
});

persist(firstLaunchStore);
