<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { accountStore } from '@/state/AccountStore';
import { computed, ref } from 'vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import ProfilePhoto from '@/components/ProfilePhoto.vue';
import { uploadProfilePhoto } from '@/api/account';
import { useMutation } from '@tanstack/vue-query';

const photoVersion = ref(0);
const {
  mutate: saveProfilePhoto,
  isPending: isPhotoPending,
  error: photoError
} = useMutation({
  mutationFn: (file: File) => uploadProfilePhoto(accountStore.token!, file),
  onSuccess: () => {
    photoVersion.value += 1;
  }
});

const changeProfilePhoto = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) saveProfilePhoto(file);
  input.value = '';
};
const logout = () => {
  accountStore.logoutFromIdentityProvider();
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
    accountStore.user?.userName ||
    accountStore.user?.email?.split('@')[0] ||
    t('labels.user')
  );
});

const initials = computed(() => {
  const parts = [
    accountStore.user?.firstName,
    accountStore.user?.lastName
  ].filter(Boolean) as string[];
  if (parts.length)
    return parts
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  return (accountStore.user?.userName || accountStore.user?.email || '?')
    .slice(0, 2)
    .toUpperCase();
});
</script>

<template>
  <div class="profile-container">
    <h1>
      <TranslatedText identifier="account.profile.title" />
    </h1>

    <section class="profile-hero">
      <div class="profile-hero__photo">
        <ProfilePhoto
          :key="photoVersion"
          :user-id="accountStore.user?.id!"
          :fallback-text="initials"
        />
      </div>
      <div class="profile-hero__identity">
        <strong class="text-xl">
          {{ displayName || accountStore.user?.userName }}
          <template
            v-if="
              accountStore.user?.userName &&
              displayName !== accountStore.user.userName
            "
          >
            (@{{ accountStore.user?.userName }})
          </template>
        </strong>
        <span class="profile-hero__email">{{ accountStore.user?.email }}</span>
        <div class="profile-hero__chips">
          <span
            v-for="role in accountStore.user?.roles"
            :key="role"
            class="mobile-chip profile-chip--success"
          >
            {{ role }}
          </span>
          <span
            v-if="accountStore.user?.city"
            class="mobile-chip"
          >
            {{ accountStore.user?.city }}
            <span v-if="accountStore.user?.postCode"
              >({{ accountStore.user?.postCode }})</span
            >
          </span>
          <span
            v-else
            class="mobile-chip profile-chip--muted"
          >
            <TranslatedText identifier="account.profile.no_location" />
          </span>
        </div>
      </div>
    </section>

    <div class="flex flex-col items-start gap-2">
      <label class="button-secondary cursor-pointer px-4 py-2">
        {{ isPhotoPending ? 'Nahrávám…' : 'Změnit profilovou fotku' }}
        <input
          class="sr-only"
          type="file"
          accept="image/*"
          :disabled="isPhotoPending"
          @change="changeProfilePhoto"
        />
      </label>
      <p
        v-if="photoError"
        role="alert"
        class="text-sm text-red-700"
      >
        {{ photoError.message }}
      </p>
    </div>

    <section class="profile-actions">
      <RouterLink
        to="/ucet/sprava/moje-nahravky"
        class="mobile-action-row"
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
        to="/ucet/sprava/overeni-emailu"
        class="mobile-action-row"
      >
        <span class="font-medium">
          <TranslatedText identifier="account.settings.resend_verification" />
        </span>
      </RouterLink>

      <RouterLink
        to="/ucet/sprava/osobni-udaje"
        class="mobile-action-row"
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
        to="/ucet/sprava/propojene-ucty"
        class="mobile-action-row"
      >
        <span class="font-medium">Propojené účty</span>
        <span class="text-sm text-gray-600">
          Správa přihlášení přes Google a Apple
        </span>
      </RouterLink>
      <RouterLink
        v-if="accountStore.user?.role === 'admin'"
        to="/sprava"
        class="mobile-action-row"
      >
        <span class="flex flex-col">
          <strong
            ><TranslatedText identifier="account.profile.administration"
          /></strong>
          <small
            ><TranslatedText
              identifier="account.profile.administration_description"
          /></small>
        </span>
      </RouterLink>
    </section>

    <section class="mobile-danger-zone profile-danger">
      <h2><TranslatedText identifier="account.settings.title" /></h2>
      <button
        class="button-secondary p-3 w-full"
        @click="logout"
      >
        <TranslatedText identifier="buttons.logout" />
      </button>
      <RouterLink
        to="/ucet/sprava/smazat"
        class="button-danger flex min-h-11 items-center justify-center p-3"
      >
        <span class="text-red-600 font-medium">
          <TranslatedText identifier="buttons.delete_account" />
        </span>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

.profile-container {
  @apply mx-auto flex w-full flex-col gap-5;
}

.profile-hero {
  @apply flex items-center gap-4 p-4;
  border: 1px solid var(--mobile-border);
  border-radius: var(--mobile-radius-lg);
  background: var(--mobile-surface);
  box-shadow: var(--mobile-shadow);
}

.profile-hero__photo {
  @apply h-20 w-20 shrink-0 overflow-hidden rounded-full;
  border: 3px solid var(--mobile-yellow);
  background: var(--mobile-yellow);
}

.profile-hero__photo :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-hero__identity {
  @apply flex min-w-0 flex-1 flex-col gap-1;
}

.profile-hero__email {
  @apply truncate text-sm;
  color: var(--mobile-muted);
}

.profile-hero__chips {
  @apply mt-1 flex flex-wrap gap-1.5;
}

.profile-chip--success {
  background: #e7f6e7;
  border-color: #9ccc9c;
}
.profile-chip--warning {
  background: #fff2b8;
  border-color: #e4c952;
}
.profile-chip--muted {
  color: var(--mobile-muted);
}

.profile-actions {
  @apply grid gap-2;
}

.profile-actions small {
  color: var(--mobile-muted);
}

.profile-danger {
  @apply grid gap-3;
}

.profile-danger h2 {
  @apply text-lg font-bold;
}
</style>
