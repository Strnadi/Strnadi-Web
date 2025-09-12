<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { accountStore } from '@/state/AccountStore'
import TranslatedText from '@/components/TranslatedText.vue';
</script>

<template>
  <h1><TranslatedText identifier="account.my_profile" /></h1>
  <span class="text-xl font-medium">{{ accountStore.user!.firstName }} {{ accountStore.user!.lastName }}</span>
  <span class="text-lg">{{ accountStore.user!.email }}</span>
  <PrefetchLink
    to="/ucet/moje-nahravky"
    class="link"
  >
    <TranslatedText identifier="account.my_recordings" />
  </PrefetchLink>
  <PrefetchLink
    to="/ucet/osobni-udaje"
    class="link"
  >
    <TranslatedText identifier="account.personal_data" />
  </PrefetchLink>
  <PrefetchLink
    to="/ucet/oznameni"
    class="link"
  >
    <TranslatedText identifier="account.notifications" />
  </PrefetchLink>

  <template v-if="!accountStore.user?.isEmailVerified">
    <PrefetchLink to="/ucet/overeni-emailu">
      <TranslatedText identifier="account.resend_verification_email" />
    </PrefetchLink>
  </template>

  <PrefetchLink
    to="/ucet/sprava/smazat"
    class="p-2"
  >
    <span class="text-red-500"><TranslatedText identifier="account.delete_account" /></span>
  </PrefetchLink>
</template>

<style scoped>
@reference "../../styles/main.css";

.link {
  @apply flex flex-col justify-center;
  @apply p-2 my-1 border-2 border-gray-300 rounded-lg;
}
</style>
