import { reactive } from 'vue'
import type { Notification } from "@/types/notification";

/* @ts-ignore */
import persist from "vue-reactive-persisted";

export const notificationStore = reactive({
  notifications: [] as Notification[]
});
