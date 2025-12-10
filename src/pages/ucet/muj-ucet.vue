<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { accountStore } from '@/state/AccountStore';
import { computed } from 'vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import ProfilePhoto from '@/components/ProfilePhoto.vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const logout = () => {
  accountStore.logout();
  router.replace('/');
};

// Compute if the user has both first and last name
const hasFullName = computed(
  () => accountStore.user?.firstName && accountStore.user?.lastName
);

// Compute a display name for the user
const displayName = computed(() => {
  if (hasFullName.value) {
    return `${accountStore.user?.firstName} ${accountStore.user?.lastName}`;
  }
  return (
    accountStore.user?.nickname ||
    accountStore.user?.email?.split('@')[0] ||
    t('labels.user')
  );
});
</script>

<template>
  <div class="profile-container">
    <h1 class="text-2xl font-bold mb-6">
      <TranslatedText identifier="account.profile.title" />
    </h1>

    <!-- User info card -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <ProfilePhoto :user-id="accountStore.user?.id!" />
      <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center"
      >
        <div class="flex flex-col">
          <span class="text-xl font-medium">
            {{ displayName || accountStore.user?.nickname }}
            <template v-if="accountStore.user?.nickname && displayName">
              ({{ accountStore.user?.nickname }})
            </template>
          </span>
          <span class="text-gray-600">{{ accountStore.user?.email }}</span>

          <div
            v-if="accountStore.user?.isEmailVerified"
            class="flex items-center mt-2"
          >
            <span
              class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
            >
              <TranslatedText
                identifier="account.profile.email_verified_badge"
              />
            </span>
          </div>
          <div
            v-else
            class="flex items-center mt-2"
          >
            <span
              class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
            >
              <TranslatedText
                identifier="account.profile.email_unverified_badge"
              />
            </span>
          </div>
        </div>

        <div class="mt-4 md:mt-0">
          <span
            v-if="accountStore.user?.city"
            class="text-gray-600"
          >
            {{ accountStore.user?.city }}
            <span v-if="accountStore.user?.postCode"
              >({{ accountStore.user?.postCode }})</span
            >
          </span>
          <span
            v-else
            class="text-gray-400 text-sm"
          >
            <TranslatedText identifier="account.profile.no_location" />
          </span>
        </div>
      </div>
    </div>

    <!-- Navigation links -->
    <div class="grid md:grid-cols-2 gap-3 mb-6">
      <RouterLink
        to="/ucet/sprava/moje-nahravky"
        class="link"
      >
        <span class="font-medium">
          <TranslatedText identifier="account.profile.my_recordings" />
        </span>
        <span class="text-sm text-gray-600">
          <TranslatedText
            identifier="account.profile.my_recordings_description"
          />
        </span>
      </RouterLink>

      <RouterLink
        to="/ucet/sprava/uspechy"
        class="link"
      >
        <span class="font-medium">
          <TranslatedText identifier="account.profile.achievements" />
        </span>
        <span class="text-sm text-gray-600">
          <TranslatedText
            identifier="account.profile.achievements_description"
          />
        </span>
      </RouterLink>

      <RouterLink
        to="/ucet/sprava/odmeny"
        class="link"
      >
        <span class="font-medium">
          <TranslatedText identifier="account.profile.rewards" />
        </span>
        <span class="text-sm text-gray-600">
          <TranslatedText identifier="account.profile.rewards_description" />
        </span>
      </RouterLink>

      <!-- <RouterLink
        to="/ucet/sprava/oznameni"
        class="link"
      >
        <span class="font-medium">Notifications</span>
        <span class="text-sm text-gray-600">Manage notifications</span>
      </RouterLink> -->

      <!-- <RouterLink
        v-if="accountStore.user?.role === 'admin'"
        to="/sprava"
        class="link bg-blue-50 border-blue-200"
      >
        <span class="font-medium">
          <TranslatedText identifier="account.profile.administration" />
        </span>
        <span class="text-sm text-gray-600">
          <TranslatedText
            identifier="account.profile.administration_description"
          />
        </span>
      </RouterLink> -->
    </div>

    <!-- Account actions -->
    <div class="mt-4 border-t border-gray-200 pt-4">
      <h2 class="text-lg font-medium mb-3">
        <TranslatedText identifier="account.settings.title" />
      </h2>

      <RouterLink
        v-if="!accountStore.user?.isEmailVerified"
        to="/ucet/sprava/overeni-emailu"
        class="flex items-center p-3 mb-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100"
      >
        <span class="font-medium">
          <TranslatedText identifier="account.settings.resend_verification" />
        </span>
      </RouterLink>

      <RouterLink
        to="/ucet/sprava/osobni-udaje"
        class="link"
      >
        <span class="font-medium">
          <TranslatedText identifier="account.profile.personal_data" />
        </span>
        <span class="text-sm text-gray-600">
          <TranslatedText
            identifier="account.profile.personal_data_description"
          />
        </span>
      </RouterLink>

      <RouterLink
        to="/ucet/sprava/smazat"
        class="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
      >
        <span class="text-red-600 font-medium">
          <TranslatedText identifier="buttons.delete_account" />
        </span>
      </RouterLink>
    </div>

    <!-- Logout button -->
    <div class="mt-6">
      <button
        class="button-secondary p-2 w-full"
        @click="logout"
      >
        <TranslatedText identifier="buttons.logout" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

.profile-container {
  @apply w-full mx-auto;
}

.link {
  @apply flex flex-col justify-center;
  @apply p-3 border-2 border-gray-300 rounded-lg;
  @apply hover:bg-gray-100 transition duration-200;
}

.link span:first-child {
  @apply mb-1;
}
</style>
