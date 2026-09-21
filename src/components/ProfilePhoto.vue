<script setup vapor lang="ts">
import { computedAsync } from '@vueuse/core';
import { getProfilePhoto, profilePhotoDataUrl } from '@/api/account';

const props = defineProps<{
  userId: string;
  fallbackText?: string;
}>();

const photoSource = computedAsync(async () => {
  const photo = await getProfilePhoto(props.userId);
  return photo ? profilePhotoDataUrl(photo) : null;
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
