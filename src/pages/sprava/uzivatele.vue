<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { getUsers } from '@/api/account';
import { authorizationConfig } from '@/api/auth';
import { Permissions } from '@/api/permissions';
import {
  getProjectMembers,
  removeProjectMember,
  type ProjectMember
} from '@/api/projects';
import { accountStore } from '@/state/AccountStore';
import { projectStore } from '@/state/ProjectStore';
import ProfilePhoto from '@/components/ProfilePhoto.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const queryClient = useQueryClient();
const search = ref('');

const administrationUsersUrl = `${authorizationConfig.baseUrl}/dashboard/users`;

// The directory itself only needs a view permission; roles and membership are
// managed through the project-members endpoints.
const canViewUsers = computed(() =>
  accountStore.hasAnyPermission(
    Permissions.ViewUsersBasic,
    Permissions.ViewUsersConfidential,
    Permissions.ManageUsers
  )
);
// Project membership and roles are gated on ManageRoles, not on the
// user-directory permissions - both the members listing and the removal
// endpoint check that one.
const canManageRoles = computed(() =>
  accountStore.hasPermission(Permissions.ManageRoles)
);
const canSendNotifications = computed(() =>
  accountStore.hasPermission(Permissions.SendNotifications)
);

const {
  data: users,
  isLoading,
  isError
} = useQuery({
  queryKey: ['admin-users'],
  queryFn: () => getUsers(accountStore.identityToken!),
  enabled: computed(() =>
    Boolean(accountStore.identityToken && canViewUsers.value)
  )
});

const projectId = computed(() => projectStore.current?.id ?? null);

const { data: members } = useQuery({
  queryKey: ['project-members', projectId],
  queryFn: () =>
    getProjectMembers(projectId.value!, accountStore.identityToken!),
  enabled: computed(() =>
    Boolean(
      projectId.value && accountStore.identityToken && canManageRoles.value
    )
  )
});

const rolesByUserId = computed<Record<string, ProjectMember>>(() =>
  Object.fromEntries(
    (members.value ?? []).map((member) => [member.userId, member])
  )
);

const matches = computed(() => {
  const query = search.value.trim().toLowerCase();
  const list = users.value ?? [];
  if (!query) return list;
  return list.filter((user) =>
    [user.firstName, user.lastName, user.email, user.city, user.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query)
  );
});

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString('cs') : '—';

const initials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';

const { mutate: removeMember, isPending: isRemoving } = useMutation({
  mutationFn: (userId: string) =>
    removeProjectMember(projectId.value!, userId, accountStore.identityToken!),
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ['project-members'] })
});
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <h1><TranslatedText identifier="admin.users.title" /></h1>

    <p v-if="!canViewUsers">
      <TranslatedText identifier="errors.auth.forbidden" />
    </p>

    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="search"
          type="search"
          class="flex-1 min-w-60 rounded-lg border border-gray-300 px-3 py-2"
          :placeholder="t('admin.users.search_placeholder')"
        />
        <a
          :href="administrationUsersUrl"
          class="button-secondary px-4 py-2 text-sm"
          target="_blank"
          rel="noopener"
        >
          <TranslatedText identifier="admin.users.open_administration" />
        </a>
      </div>

      <p v-if="isLoading" role="status">
        <TranslatedText identifier="states.loading" />
      </p>
      <p v-else-if="isError" role="alert" class="text-red-700">
        <TranslatedText identifier="admin.users.load_error" />
      </p>

      <template v-else>
        <p class="text-sm text-gray-600">
          <TranslatedText identifier="admin.users.count_label" />
          {{ matches.length }} / {{ users?.length ?? 0 }}
        </p>

        <p v-if="!matches.length" class="text-sm text-gray-600">
          <TranslatedText identifier="admin.users.empty" />
        </p>

        <ul class="flex flex-col gap-2">
          <li
            v-for="user in matches"
            :key="user.id"
            class="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div class="h-10 w-10 overflow-hidden rounded-full">
              <ProfilePhoto
                :user-id="user.id"
                :fallback-text="initials(user.firstName, user.lastName)"
              />
            </div>

            <div class="flex-1 min-w-48">
              <p class="font-semibold text-gray-900">
                <RouterLink :to="`/uzivatel/${user.id}`" class="underline">
                  {{ user.firstName }} {{ user.lastName }}
                </RouterLink>
                <span
                  v-if="user.deleted"
                  class="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700"
                >
                  <TranslatedText identifier="admin.users.deleted_badge" />
                </span>
                <span
                  v-if="user.legacy"
                  class="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                >
                  <TranslatedText identifier="admin.users.legacy_badge" />
                </span>
              </p>
              <p class="text-sm text-gray-600">
                {{ user.email || t('account.users.unknown_email') }}
                <span
                  :class="
                    user.emailConfirmed ? 'text-emerald-700' : 'text-amber-700'
                  "
                >
                  ·
                  <TranslatedText
                    :identifier="
                      user.emailConfirmed
                        ? 'account.users.email_verified'
                        : 'account.users.email_unverified'
                    "
                  />
                </span>
              </p>
              <p class="text-xs text-gray-500">
                {{ user.city || t('account.users.unknown_city') }}
                <template v-if="user.postCode"> ({{ user.postCode }})</template>
                · <TranslatedText identifier="admin.users.registered_label" />
                {{ formatDate(user.createdAt) }}
              </p>
              <p class="text-xs text-gray-500">
                <TranslatedText identifier="admin.users.roles_label" />:
                <template v-if="rolesByUserId[user.id]?.roleNames?.length">
                  {{ rolesByUserId[user.id]!.roleNames.join(', ') }}
                </template>
                <template v-else>
                  <TranslatedText identifier="admin.users.no_roles" />
                </template>
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <RouterLink
                v-if="canSendNotifications"
                :to="`/sprava/oznameni?userId=${user.id}`"
                class="button-secondary px-3 py-1.5 text-sm"
              >
                <TranslatedText identifier="admin.users.notify" />
              </RouterLink>
              <button
                v-if="canManageRoles && rolesByUserId[user.id]"
                type="button"
                class="button-danger px-3 py-1.5 text-sm"
                :disabled="isRemoving"
                @click="removeMember(user.id)"
              >
                <TranslatedText identifier="admin.users.remove_member" />
              </button>
            </div>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>
