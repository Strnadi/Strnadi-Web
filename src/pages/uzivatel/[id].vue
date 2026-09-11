<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';
import ProfilePhoto from '@/components/ProfilePhoto.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const userId = useRouteParams<string>('id');
const isUuid = computed(() =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    userId.value
  )
);
const isCurrentUser = computed(() => accountStore.user?.id === userId.value);
const displayName = computed(() => {
  if (!isCurrentUser.value || !accountStore.user) return t('labels.user');
  return (
    accountStore.user.userName ||
    [accountStore.user.firstName, accountStore.user.lastName]
      .filter(Boolean)
      .join(' ') ||
    t('labels.user')
  );
});

const {
  data: recordings,
  isLoading,
  isError
} = useQuery({
  queryKey: computed(() => ['user-recordings', userId.value]),
  enabled: isUuid,
  queryFn: () => getRecordings({ userId: userId.value })
});
</script>

<template>
  <section class="w-full space-y-6">
    <p
      v-if="!isUuid"
      role="alert"
      class="text-red-700"
    >
      Neplatný identifikátor uživatele.
    </p>

    <template v-else>
      <header
        class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div class="h-20 w-20 overflow-hidden rounded-full">
          <ProfilePhoto
            :user-id="userId"
            :fallback-text="displayName.slice(0, 2)"
          />
        </div>
        <div class="min-w-0">
          <h1 class="truncate">{{ displayName }}</h1>
          <p class="truncate text-sm text-gray-500">{{ userId }}</p>
        </div>
      </header>

      <div class="flex items-center justify-between">
        <h2>
          <TranslatedText identifier="pages.user_profile.recordings_section" />
        </h2>
        <span
          v-if="recordings"
          class="text-sm text-gray-500"
        >
          {{ recordings.length }}
        </span>
      </div>

      <p v-if="isLoading"><TranslatedText identifier="states.loading" /></p>
      <p
        v-else-if="isError"
        role="alert"
        class="text-red-700"
      >
        <TranslatedText identifier="errors.recordings.loading" />
      </p>
      <ul
        v-else-if="recordings?.length"
        class="space-y-3"
      >
        <li
          v-for="recording in recordings"
          :key="recording.id"
        >
          <RouterLink
            :to="`/mapa/nahravka/${recording.id}`"
            class="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-yellow-400"
          >
            <strong>{{ recording.name || `Nahrávka #${recording.id}` }}</strong>
            <span class="mt-1 block text-sm text-gray-500">
              {{ new Date(recording.createdAt).toLocaleString() }}
            </span>
          </RouterLink>
        </li>
      </ul>
      <p v-else><TranslatedText identifier="empty" /></p>
    </template>
  </section>
</template>
