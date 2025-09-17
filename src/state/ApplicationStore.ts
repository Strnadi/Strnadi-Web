import { reactive } from 'vue'
import type { Notification } from "@/types/notifications";
import type { translations } from '@/constants/Translations';
import persist from '@/vendor/persist';

export const applicationStore = reactive({
  language: "cs-CZ" as keyof typeof translations,
  notifications: [] as Notification[]
});

persist(applicationStore);
