<script setup vapor lang="ts">
import axios from 'axios';
import { computedAsync } from '@vueuse/core';
import { extensionToMime } from '@/utils/files';
import { authorizationConfig } from '@/api/auth';

const props = defineProps<{
  userId: string | number;
  fallbackText?: string;
}>();

const photoSource = computedAsync(async () => {
  try {
    const response = await axios.get(
      `${authorizationConfig.baseUrl}/users/${encodeURIComponent(props.userId)}/profile-photo`
    );
    const format = response.data.format as string;
    const extension = format.startsWith('.') ? format : `.${format}`;
    const mime = format.includes('/')
      ? format
      : extensionToMime[extension.toLowerCase()] || 'image/jpeg';
    return `data:${mime};base64,${response.data.photoBase64}`;
  } catch (error) {
    return null;
  }
});
</script>

<template>
  <img
    v-if="photoSource"
    :src="photoSource"
    alt=""
  />
  <span
    v-else
    class="profile-photo-fallback"
    aria-hidden="true"
  >
    {{ props.fallbackText || '?' }}
  </span>
</template>

<style scoped>
.profile-photo-fallback {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  background: var(--mobile-yellow, #ffd641);
  color: var(--mobile-ink, #252319);
  font-size: 1.4rem;
  font-weight: 800;
}
</style>
