<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { getUsers } from '@/api/account';
import { accountStore } from '@/state/AccountStore';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import UserCard from '@/views/UserCard.vue';

const { data: users, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: async () => await getUsers(accountStore.token!)
});
const orderedUsers = computed(() =>
  [...(users.value ?? [])].sort((left, right) =>
    `${left.lastName} ${left.firstName} ${left.id}`.localeCompare(
      `${right.lastName} ${right.firstName} ${right.id}`,
      'cs',
      { sensitivity: 'base' }
    )
  )
);
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.users.title" />
  </h1>

  <template v-if="isLoading">
    <TranslatedText identifier="states.loading" />
  </template>
  <p v-else-if="error" role="alert" class="text-red-700">
    {{ error.message }}
  </p>
  <template v-else>
    <ul class="flex flex-col gap-y-3">
      <li v-for="user in orderedUsers" :key="user.id" class="space-y-2">
        <RouterLink :to="`/uzivatel/${user.id}`" class="block rounded-xl focus:outline-2">
          <UserCard :user="user" />
        </RouterLink>
        <div class="flex items-center justify-between gap-2 px-2 text-sm">
          <span>{{ user.email ?? t('account.users.unknown_email') }}</span>
          <span :class="user.isEmailVerified ? 'text-green-700' : 'text-red-700'">
            {{
              t(
                user.isEmailVerified
                  ? 'account.users.email_verified'
                  : 'account.users.email_unverified'
              )
            }}
          </span>
          <RouterLink
            :to="{ path: '/sprava/oznameni', query: { userId: user.id } }"
            class="button-secondary p-2"
          >
            Poslat oznámení
          </RouterLink>
        </div>
      </li>
    </ul>
  </template>
</template>
