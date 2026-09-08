<script setup vapor lang="ts">
import axios from 'axios';
import { computedAsync } from '@vueuse/core';
import type { Numeric } from '@/types/basic';
import { extensionToMime } from '@/utils/files';
import { accountStore } from '@/state/AccountStore';

const props = defineProps<{
  userId: Numeric;
  fallbackText?: string;
}>();

const photoSource = computedAsync(async () => {
  try {
    const response = await axios.get(
      `/users/${props.userId}/get-profile-photo`,
      {
        headers: {
          Authorization: accountStore.token
            ? `Bearer ${accountStore.token}`
            : undefined
        }
      }
    );
    return (
      'data:image/' +
      extensionToMime[
        (response.data.format as string).substring(
          response.data.format.lastIndexOf('.')
        )
      ] +
      ';base64,' +
      response.data.photoBase64
    );
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
  <span v-else class="profile-photo-fallback" aria-hidden="true">
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
