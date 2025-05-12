import { reactive } from 'vue'
import type { Notification } from "@/types/notifications";

/* @ts-ignore */
import persist from "@/vendor/persist";

export const notificationStore = reactive({
  notifications: [] as Notification[]
});
