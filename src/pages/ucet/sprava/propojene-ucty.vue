<route lang="yaml">
meta:
  layout: mobile/default
</route>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { getExternalLogins, getExternalLoginUrl } from '@/api/account';
import { accountStore } from '@/state/AccountStore';

const { data, isLoading, error } = useQuery({
  queryKey: ['external-logins', accountStore.user?.id],
  queryFn: () => getExternalLogins(accountStore.token!)
});

const linked = computed(
  () => new Set((data.value ?? []).map((provider) => provider.toLowerCase()))
);
const providers = [
  { id: 'Google' as const, label: 'Google', className: 'bg-blue-600' },
  { id: 'Apple' as const, label: 'Apple', className: 'bg-black' }
];
</script>

<template>
  <section class="p-4">
    <h1 class="mb-2 text-2xl font-bold">Propojené účty</h1>
    <p class="mb-6 text-sm text-gray-600">
      Externí účty můžete použít pro rychlejší a bezpečné přihlášení.
    </p>

    <p
      v-if="isLoading"
      role="status"
    >
      Načítám propojené účty…
    </p>
    <p
      v-else-if="error"
      role="alert"
      class="text-red-700"
    >
      {{ error.message }}
    </p>

    <ul
      v-else
      class="space-y-3"
    >
      <li
        v-for="provider in providers"
        :key="provider.id"
        class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4"
      >
        <div class="flex items-center gap-3">
          <span
            :class="provider.className"
            class="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
            aria-hidden="true"
          >
            {{ provider.label.slice(0, 1) }}
          </span>
          <div>
            <strong>{{ provider.label }}</strong>
            <p class="text-sm text-gray-600">
              {{
                linked.has(provider.id.toLowerCase())
                  ? 'Propojeno'
                  : 'Nepřipojeno'
              }}
            </p>
          </div>
        </div>

        <span
          v-if="linked.has(provider.id.toLowerCase())"
          class="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
        >
          Aktivní
        </span>
        <a
          v-else
          :href="getExternalLoginUrl(provider.id)"
          class="button-secondary px-4 py-2 text-sm"
        >
          Připojit
        </a>
      </li>
    </ul>
  </section>
</template>
