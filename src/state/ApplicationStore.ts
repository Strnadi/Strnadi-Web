import { reactive } from 'vue';
import type { Notification } from '@/types/notifications';
import { translations } from '@/constants/Translations';
import persist, { readPersistedObject } from '@/vendor/persist';

const APPLICATION_STORAGE_KEY = 'strnadi.application.v2';
const legacy = readPersistedObject(window.localStorage, 'reactive_persisted');

if (!window.localStorage.getItem(APPLICATION_STORAGE_KEY) && legacy) {
  const migrated: Record<string, unknown> = {};
  if (
    typeof legacy['language'] === 'string' &&
    legacy['language'] in translations
  ) {
    migrated['language'] = legacy['language'];
  }
  if (Array.isArray(legacy['notifications'])) {
    migrated['notifications'] = legacy['notifications'];
  }
  window.localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(migrated));
}

export const applicationStore = reactive({
  language: 'cs-CZ' as keyof typeof translations,
  notifications: [] as Notification[]
});

persist(applicationStore, {
  key: APPLICATION_STORAGE_KEY,
  paths: ['language', 'notifications']
});

// Remove authentication/PII left by the old shared persistence record while
// preserving preference fields long enough for older deployments to migrate.
if (legacy) {
  const sanitizedLegacy = {
    language: legacy['language'],
    notifications: legacy['notifications']
  };
  window.localStorage.setItem(
    'reactive_persisted',
    JSON.stringify(sanitizedLegacy)
  );
}
