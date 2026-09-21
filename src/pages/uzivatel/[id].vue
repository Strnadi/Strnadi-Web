<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recordings';
import { getAchievements } from '@/api/achievements';
import { getUser } from '@/api/account';
import { Permissions } from '@/api/permissions';
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

// Looking someone else up needs a directory permission; without it the page
// still works, just without their name.
const canViewUsers = computed(() =>
  accountStore.hasAnyPermission(
    Permissions.ViewUsersBasic,
    Permissions.ViewUsersConfidential,
    Permissions.ManageUsers
  )
);

const { data: profile } = useQuery({
  queryKey: computed(() => ['user', userId.value]),
  queryFn: () => getUser(accountStore.identityToken!, userId.value),
  enabled: computed(
    () =>
      isUuid.value &&
      !isCurrentUser.value &&
      canViewUsers.value &&
      Boolean(accountStore.identityToken)
  )
});

const displayName = computed(() => {
  if (isCurrentUser.value && accountStore.user) {
    return (
      accountStore.user.userName ||
      [accountStore.user.firstName, accountStore.user.lastName]
        .filter(Boolean)
        .join(' ') ||
      t('labels.user')
    );
  }
  if (profile.value) {
    return (
      [profile.value.firstName, profile.value.lastName]
        .filter(Boolean)
        .join(' ') || t('labels.user')
    );
  }
  return t('labels.user');
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

// Asking for a user's achievements also awards any they have newly qualified
// for, which is exactly what this page should trigger.
const { data: achievements } = useQuery({
  queryKey: computed(() => ['user-achievements', userId.value]),
  enabled: isUuid,
  queryFn: () => getAchievements(userId.value)
});

const achievementText = (achievement: {
  contents: { title: string; description: string; languageCode: string }[];
}) =>
  achievement.contents.find((content) =>
    content.languageCode.toLowerCase().startsWith('cs')
  ) ?? achievement.contents[0];
</script>

<template>
  <section class="w-full space-y-6">
    <p
      v-if="!isUuid"
      role="alert"
      class="text-red-700"
    >
      <TranslatedText identifier="pages.user_profile.invalid_id" />
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

      <template v-if="achievements?.length">
        <h2>
          <TranslatedText
            identifier="pages.user_profile.achievements_section"
          />
        </h2>
        <ul class="flex flex-wrap gap-3">
          <li
            v-for="achievement in achievements"
            :key="achievement.id"
            class="flex w-60 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <img
              :src="achievement.imageUrl"
              alt=""
              class="h-12 w-12 shrink-0 object-contain"
              loading="lazy"
            />
            <div class="min-w-0">
              <strong class="block truncate">{{
                achievementText(achievement)?.title
              }}</strong>
              <span class="block text-sm text-gray-500">
                {{ achievementText(achievement)?.description }}
              </span>
            </div>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>
