<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getUsers } from '@/api/account';
import { accountStore } from '@/state/AccountStore';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const { data: users, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: async () => await getUsers(accountStore.token!)
});
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.users.title" />
  </h1>

  <template v-if="isLoading">
    <TranslatedText identifier="states.loading" />
  </template>
  <template v-else>
    <ul class="flex flex-col-reverse gap-y-3">
      <PrefetchLink
        v-for="user in users"
        :key="user.id"
        :to="`/uzivatel/${user.id}`"
        class="flex flex-col button-secondary p-4 gap-y-2"
      >
        <div @click.stop>
          <div>
            <span>{{ user.firstName }} {{ user.lastName }}</span>
            <div class="flex flex-row justify-between">
              <span>{{ user.email ?? t('account.users.unknown_email') }}</span>
              <span
                class="text-sm"
                :class="{
                  'text-lime-400': user.isEmailVerified,
                  'text-red-500': !user.isEmailVerified
                }"
              >
                {{
                  t(
                    user.isEmailVerified
                      ? 'account.users.email_verified'
                      : 'account.users.email_unverified'
                  )
                }}
              </span>
            </div>
          </div>
          <div class="flex flex-row justify-between">
            <button class="secondary p-2">Poslat oznámení</button>
          </div>
        </div>
      </PrefetchLink>
    </ul>
  </template>
</template>
