import { reactive } from 'vue'
import type { Notification } from "@/types/notifications";

export const notificationStore = reactive({
  notifications: [] as Notification[]
});
