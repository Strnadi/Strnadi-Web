<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useQuery } from '@tanstack/vue-query';
import type { Numeric } from '@/types/basic';
import { getUserInfo } from '@/api/account';
import { getRecordings } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import UserCard from '@/views/UserCard.vue';

const routeId = useRouteParams<Numeric>('id');

const numericId = computed(() => {
  const parsed = Number(routeId.value);
  return Number.isNaN(parsed) ? null : parsed;
});

const {
  data: user,
  isLoading: isUserLoading,
  isError: isUserError
} = useQuery({
  queryKey: computed(() => ['user', numericId.value]),
  enabled: computed(() => numericId.value !== null),
  queryFn: () => getUserInfo(numericId.value!, accountStore.token ?? undefined)
});

const {
  data: recordings,
  isLoading: isRecordingsLoading,
  isError: isRecordingsError
} = useQuery({
  queryKey: computed(() => ['user-recordings', numericId.value]),
  enabled: computed(() => numericId.value !== null),
  queryFn: () =>
    getRecordings({
      userId: numericId.value!,
      parts: false,
      audio: false
    })
});

const profileName = computed(() => {
  const current = user.value;
  if (!current) {
    return t('labels.user');
  }

  const first = current.firstName?.trim();
  const last = current.lastName?.trim();

  if (first || last) {
    return [first, last].filter(Boolean).join(' ');
  }

  if (current.nickname) {
    return `@${current.nickname}`;
  }

  return `${t('labels.user')} #${current.id}`;
});

const nicknameTagVisible = computed(
  () => Boolean(user.value?.nickname) && !profileName.value.startsWith('@')
);

const signupDate = computed(() =>
  user.value ? new Date(user.value.creationDate).toLocaleString() : ''
);

const roleLabel = computed(() => {
  if (!user.value) {
    return '';
  }

  return t(
    user.value.role === 'admin'
      ? 'pages.user_profile.roles.admin'
      : 'pages.user_profile.roles.user'
  );
});

const emailStatusLabel = computed(() => {
  if (!user.value) {
    return '';
  }

  return t(
    user.value.isEmailVerified
      ? 'account.users.email_verified'
      : 'account.users.email_unverified'
  );
});

const recordingsList = computed(() => {
  if (!recordings.value) {
    return [];
  }

  return [...recordings.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
});

const recordingsCount = computed(() => recordingsList.value.length);
</script>

<template>
  <div class="w-full space-y-10">
    <template v-if="isUserLoading">
      <p class="text-gray-500"><TranslatedText identifier="loading" />...</p>
    </template>
    <template v-else-if="isUserError || !user">
      <p class="text-gray-500">
        <TranslatedText identifier="not_found" />
      </p>
    </template>
    <template v-else>
      <div class="w-full space-y-6">
        <UserCard :user="user" />

        <section
          class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 class="mb-4 text-xl font-semibold">
            <TranslatedText identifier="pages.user_profile.details_section" />
          </h2>
          <dl class="grid gap-6 md:grid-cols-2">
            <div
              v-if="
                accountStore.user?.id === user.id ||
                accountStore.user?.role === 'admin'
              "
            >
              <dt class="text-sm uppercase tracking-wide text-gray-500">
                <TranslatedText identifier="labels.email" />
              </dt>
              <dd
                class="mt-1 flex flex-wrap items-center gap-2 text-base text-gray-900"
              >
                <span>{{ user.email }}</span>
                <span
                  class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {{ emailStatusLabel }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-sm uppercase tracking-wide text-gray-500">
                <TranslatedText identifier="labels.nickname" />
              </dt>
              <dd class="mt-1 text-base text-gray-900">
                <span v-if="user.nickname">{{ user.nickname }}</span>
                <span v-else>—</span>
              </dd>
            </div>
            <div>
              <dt class="text-sm uppercase tracking-wide text-gray-500">
                <TranslatedText identifier="labels.name" />
              </dt>
              <dd class="mt-1 text-base text-gray-900">
                <span v-if="user.firstName">{{ user.firstName }}</span>
                <span v-else>—</span>
              </dd>
            </div>
            <div>
              <dt class="text-sm uppercase tracking-wide text-gray-500">
                <TranslatedText identifier="labels.surname" />
              </dt>
              <dd class="mt-1 text-base text-gray-900">
                <span v-if="user.lastName">{{ user.lastName }}</span>
                <span v-else>—</span>
              </dd>
            </div>
            <div>
              <dt class="text-sm uppercase tracking-wide text-gray-500">
                <TranslatedText
                  identifier="pages.user_profile.location_label"
                />
              </dt>
              <dd class="mt-1 text-base text-gray-900">
                <span v-if="user.city">{{ user.city }}</span>
                <span v-else>
                  <TranslatedText identifier="account.profile.no_location" />
                </span>
              </dd>
            </div>
            <div v-if="accountStore.user?.role === 'admin'">
              <dt class="text-sm uppercase tracking-wide text-gray-500">ID</dt>
              <dd class="mt-1 text-base text-gray-900">
                {{ user.id }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              <TranslatedText
                identifier="pages.user_profile.recordings_section"
              />
            </h2>
            <span
              v-if="!isRecordingsLoading"
              class="text-sm text-gray-500"
            >
              {{ recordingsCount }}
            </span>
          </div>
          <div
            v-if="isRecordingsLoading"
            class="text-gray-500"
          >
            <TranslatedText identifier="loading" />...
          </div>
          <div
            v-else-if="isRecordingsError"
            class="text-red-600"
          >
            <TranslatedText identifier="errors.recordings.loading" />
          </div>
          <template v-else>
            <ul
              v-if="recordingsCount"
              class="space-y-3"
            >
              <li
                v-for="recording in recordingsList"
                :key="recording.id"
              >
                <prefetch-link
                  :to="`/mapa/nahravka/${recording.id}`"
                  class="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-yellow-400 hover:shadow-md"
                >
                  <div class="flex items-center justify-between">
                    <p class="text-lg font-semibold text-gray-900">
                      {{
                        recording.name ||
                        `${t('recordings.detail.fallback_prefix')}${recording.id}`
                      }}
                    </p>
                    <!-- <span class="text-sm text-lime-500">
                      <TranslatedText identifier="recordings.status.uploaded" />
                    </span> -->
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600"
                  >
                    <span>{{
                      new Date(recording.createdAt).toLocaleString()
                    }}</span>
                    <span v-if="recording.byApp">
                      {{ t('recordings.detail.by_app_suffix') }}
                    </span>
                    <span
                      v-if="
                        recording.estimatedBirdsCount !== null &&
                        recording.estimatedBirdsCount !== undefined
                      "
                    >
                      <TranslatedText identifier="upload.bird_count_label" />:
                      {{ recording.estimatedBirdsCount }}
                    </span>
                    <span v-if="recording.device">
                      <TranslatedText identifier="upload.device_label" />:
                      {{ recording.device }}
                    </span>
                  </div>
                  <p
                    v-if="recording.note"
                    class="text-sm text-gray-700"
                  >
                    {{ recording.note }}
                  </p>
                </prefetch-link>
              </li>
            </ul>
            <p
              v-else
              class="text-gray-500"
            >
              <TranslatedText identifier="empty" />
            </p>
          </template>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold">
            <TranslatedText
              identifier="pages.user_profile.admin.actions_section"
            />
          </h2>
          <div class="flex flex-col md:flex-row w-full gap-3">
            <button class="secondary p-2 w-full">Poslat oznámení</button>

            <button class="secondary danger p-2 w-full">
              <TranslatedText
                identifier="pages.user_profile.admin.delete_account_button"
              />
            </button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
