<script setup vapor lang="ts">
import type { User } from '@/api/account';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import { computed } from 'vue';

import ProfileIcon from '@/icons/interface/icon-profile.svg';
import { accountStore } from '@/state/AccountStore';

const props = defineProps<{
  user: User;
}>();

const profileName = computed(() => {
  const current = props.user;
  if (!current) {
    return t('labels.user');
  }

  if (current.nickname) {
    return `@${current.nickname}`;
  }

  const first = current.firstName?.trim();
  const last = current.lastName?.trim();
  if (first || last) {
    return [first, last].filter(Boolean).join(' ');
  }

  return `${t('labels.user')} #${current.id}`;
});
</script>

<template>
  <div
    class="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center"
  >
    <div
      class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-lime-100"
    >
      <ProfileIcon class="h-12 w-12 text-gray-600" />
      <!-- <ProfilePhoto :user-id="props.user.id" /> -->
    </div>
    <div class="flex-1 space-y-2">
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-semibold">
          {{ profileName }}
        </h1>
      </div>
      <div class="flex flex-wrap gap-4 text-sm text-gray-600">
        <!-- <span v-if="signupDate">
          <TranslatedText identifier="pages.user_profile.joined_label" />:
          <span class="font-medium text-gray-800">{{ signupDate }}</span>
        </span> -->
        <span v-if="accountStore.user?.role === 'admin'">
          <TranslatedText identifier="pages.user_profile.role_label" />:
          <span class="font-medium text-gray-800">{{ props.user.role }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
