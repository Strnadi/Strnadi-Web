<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { computed } from 'vue';
import { Permissions } from '@/api/permissions';
import { accountStore } from '@/state/AccountStore';
import TranslatedText from '@/components/TranslatedText.vue';

// Each tile leads to screens the API gates on a specific permission; hiding
// what the caller cannot use keeps the dashboard honest.
const canViewUsers = computed(() =>
  accountStore.hasAnyPermission(
    Permissions.ViewUsersBasic,
    Permissions.ViewUsersConfidential,
    Permissions.ManageUsers
  )
);
const canManageArticles = computed(() =>
  accountStore.hasAnyPermission(
    Permissions.ManageArticles,
    Permissions.ManageArticleCategories,
    Permissions.ManageArticleTranslations
  )
);
const canModerateRecordings = computed(() =>
  accountStore.hasAnyPermission(
    Permissions.ModerateRecordings,
    Permissions.DownloadRecordings
  )
);
const canSendNotifications = computed(() =>
  accountStore.hasPermission(Permissions.SendNotifications)
);
const canManageAchievements = computed(() =>
  accountStore.hasPermission(Permissions.ManageAchievements)
);
const canReviewFiltered = computed(() =>
  accountStore.hasPermission(Permissions.ReviewFilteredRecordings)
);
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.dashboard.title" />
  </h1>

  <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    <RouterLink
      v-if="canViewUsers"
      to="/sprava/uzivatele"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.users" />
    </RouterLink>
    <RouterLink
      v-if="canManageArticles"
      to="/sprava/informace"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.articles" />
    </RouterLink>
    <RouterLink
      v-if="canModerateRecordings"
      to="/sprava/vsechny-nahravky"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.recordings" />
    </RouterLink>
    <RouterLink
      v-if="canSendNotifications"
      to="/sprava/oznameni"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.notifications.title" />
    </RouterLink>
    <RouterLink
      v-if="canManageAchievements"
      to="/sprava/odmeny"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.awards" />
    </RouterLink>
    <RouterLink
      v-if="canManageAchievements"
      to="/sprava/uspechy"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.achievments" />
    </RouterLink>
    <RouterLink
      v-if="canReviewFiltered"
      to="/sprava/potvrzeni-dialektu"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.confirmation" />
    </RouterLink>
    <RouterLink
        v-if="canReviewFiltered"
        to="/ucet/sprava/trenink-ai"
        class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      Trénink AI modelu
    </RouterLink>
  </div>
</template>
