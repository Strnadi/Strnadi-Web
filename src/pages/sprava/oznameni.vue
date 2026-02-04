<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup vapor lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { onClickOutside, useEventListener } from '@vueuse/core';
import { useQuery } from '@tanstack/vue-query';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import { authorizedPost } from '@/api/utils';
import { accountStore } from '@/state/AccountStore';
import { getUsers, type User } from '@/api/account';
import { fuzzyMatch } from '@/utils/fuzzy-match';
import type { TranslationIdentifier } from '@/constants/Translations';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_RESULT_LIMIT = 8;

const languages = ['cs', 'en', 'de'] as const;
type Language = (typeof languages)[number];

const tabOptions = [
  {
    id: 'search',
    labelKey: 'admin.notifications.tabs.search',
    descriptionKey: 'admin.notifications.tabs.searchDescription'
  },
  {
    id: 'table',
    labelKey: 'admin.notifications.tabs.table',
    descriptionKey: 'admin.notifications.tabs.tableDescription'
  }
] as const satisfies Array<{
  id: 'search' | 'table';
  labelKey: TranslationIdentifier;
  descriptionKey: TranslationIdentifier;
}>;

const tableColumns = [
  { key: 'name', labelKey: 'admin.notifications.table.headers.name' },
  { key: 'nickname', labelKey: 'admin.notifications.table.headers.nickname' },
  { key: 'email', labelKey: 'admin.notifications.table.headers.email' },
  { key: 'city', labelKey: 'admin.notifications.table.headers.city' }
] as const satisfies Array<{
  key: 'name' | 'nickname' | 'email' | 'city';
  labelKey: TranslationIdentifier;
}>;

type TabId = (typeof tabOptions)[number]['id'];
type ColumnKey = (typeof tableColumns)[number]['key'];
type SortDirection = 'asc' | 'desc';

type ColumnFilterState = {
  mode: 'all' | 'custom';
  selectedValues: string[];
};

type ColumnOption = {
  value: string;
  label: string;
};

const createColumnFilterState = (): ColumnFilterState => ({
  mode: 'all',
  selectedValues: []
});

const toHTMLElement = (el: unknown): HTMLElement | null =>
  el instanceof HTMLElement ? el : null;

const activeTab = ref<TabId>('table');

const titles = reactive<Record<Language, string>>({ cs: '', en: '', de: '' });
const messages = reactive<Record<Language, string>>({ cs: '', en: '', de: '' });

const searchQuery = ref('');
const tableFilter = ref('');
const selectedUserIds = ref<Set<number>>(new Set());
const columnFilters = reactive<Record<ColumnKey, ColumnFilterState>>(
  Object.fromEntries(
    tableColumns.map((col) => [col.key, createColumnFilterState()])
  ) as Record<ColumnKey, ColumnFilterState>
);
const columnSorts = ref<Array<{ key: ColumnKey; direction: SortDirection }>>(
  []
);
const columnTriggerRefs = reactive<Partial<Record<ColumnKey, HTMLElement>>>({});
const tableWrapperRef = ref<HTMLElement | null>(null);
const columnMenuRoot = ref<HTMLElement | null>(null);
const columnMenuState = reactive<{
  activeColumn: ColumnKey | null;
  search: string;
  draftValues: Set<string>;
  position: { top: number; left: number } | null;
}>({
  activeColumn: null,
  search: '',
  draftValues: new Set(),
  position: null
});

const columnMenuAnchor = computed<HTMLElement | null>(() => {
  const column = columnMenuState.activeColumn;
  if (!column) return null;
  return columnTriggerRefs[column] ?? null;
});

const {
  data: users,
  isLoading: isUsersLoading,
  isError: isUsersError,
  error: usersError
} = useQuery({
  queryKey: ['admin-users'],
  queryFn: () => getUsers(accountStore.token!),
  enabled: computed(() => Boolean(accountStore.token))
});

const usersErrorMessage = computed(() =>
  usersError.value instanceof Error && usersError.value.message
    ? usersError.value.message
    : t('admin.notifications.errors.loadUsers')
);

const availableUsers = computed<User[]>(() => users.value ?? []);
const recipientsCount = computed(() => selectedUserIds.value.size);
const currentTabMeta = computed(() =>
  tabOptions.find((tab) => tab.id === activeTab.value)
);

const normalizeField = (value?: string | null) =>
  value ? value.toString().trim() : '';

const getColumnValue = (user: User, column: ColumnKey) => {
  switch (column) {
    case 'name': {
      const first = normalizeField(user.firstName);
      const last = normalizeField(user.lastName);
      return `${first} ${last}`.replace(/\s+/g, ' ').trim();
    }
    case 'nickname':
      return normalizeField(user.nickname);
    case 'email':
      return normalizeField(user.email);
    case 'city':
      return normalizeField(user.city);
    default:
      return '';
  }
};

const getColumnLabel = (value: string) => (value.length ? value : '—');

const columnValueOptions = computed<Record<ColumnKey, ColumnOption[]>>(() => {
  const sets = Object.fromEntries(
    tableColumns.map((col) => [col.key, new Set<string>()])
  ) as Record<ColumnKey, Set<string>>;

  for (const user of availableUsers.value) {
    for (const { key } of tableColumns) {
      sets[key].add(getColumnValue(user, key));
    }
  }

  return Object.fromEntries(
    Object.entries(sets).map(([key, set]) => [
      key,
      [...set]
        .map((v) => ({ value: v, label: getColumnLabel(v) }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, 'cs', { sensitivity: 'base' })
        )
    ])
  ) as Record<ColumnKey, ColumnOption[]>;
});

const initializeColumnMenuDraft = (column: ColumnKey) => {
  const filterState = columnFilters[column];
  const options = columnValueOptions.value[column];
  columnMenuState.search = '';
  columnMenuState.draftValues =
    filterState.mode === 'custom'
      ? new Set(filterState.selectedValues)
      : new Set(options.map((o) => o.value));
};

const updateColumnMenuPosition = () => {
  const anchor = columnMenuAnchor.value;
  if (!anchor) {
    columnMenuState.position = null;
    return;
  }
  const rect = anchor.getBoundingClientRect();
  columnMenuState.position = { top: rect.bottom + 8, left: rect.left };
};

const closeColumnMenu = () => {
  columnMenuState.activeColumn = null;
  columnMenuState.search = '';
  columnMenuState.draftValues = new Set();
  columnMenuState.position = null;
  columnMenuRoot.value = null;
};

const toggleHeaderMenu = (column: ColumnKey) => {
  if (columnMenuState.activeColumn === column) {
    closeColumnMenu();
    return;
  }
  columnMenuState.activeColumn = column;
  initializeColumnMenuDraft(column);
  nextTick(() => {
    if (columnMenuState.activeColumn === column) {
      updateColumnMenuPosition();
    }
  });
};

const applyColumnSort = (column: ColumnKey, direction: SortDirection) => {
  const existingIndex = columnSorts.value.findIndex(
    (sort) => sort.key === column
  );
  const existing =
    existingIndex !== -1 ? columnSorts.value[existingIndex] : null;

  if (existing && existing.direction === direction) {
    columnSorts.value = columnSorts.value.filter((sort) => sort.key !== column);
    return;
  }

  const next = columnSorts.value.filter((sort) => sort.key !== column);
  columnSorts.value = [{ key: column, direction }, ...next];
};

const clearAllColumnSorts = () => {
  if (!columnSorts.value.length) return;
  columnSorts.value = [];
  closeColumnMenu();
};

const clearColumnFilter = (column: ColumnKey) => {
  columnFilters[column] = createColumnFilterState();
};

const columnHasFilter = (column: ColumnKey) =>
  columnFilters[column].mode === 'custom';

const columnSortMatches = (column: ColumnKey, direction?: SortDirection) => {
  const entry = columnSorts.value.find((sort) => sort.key === column);
  if (!entry) return false;
  if (!direction) return true;
  return entry.direction === direction;
};

const columnSortPosition = (column: ColumnKey) => {
  const index = columnSorts.value.findIndex((sort) => sort.key === column);
  return index === -1 ? null : index + 1;
};

const hasColumnMenuContext = (column: ColumnKey) =>
  columnMenuState.activeColumn === column;

const updateColumnMenuDraft = (mutator: (draft: Set<string>) => void) => {
  const next = new Set(columnMenuState.draftValues);
  mutator(next);
  columnMenuState.draftValues = next;
};

const toggleColumnMenuValue = (column: ColumnKey, value: string) => {
  if (!hasColumnMenuContext(column)) return;

  updateColumnMenuDraft((draft) => {
    draft.has(value) ? draft.delete(value) : draft.add(value);
  });
};

const areAllColumnValuesSelected = (column: ColumnKey) => {
  if (!hasColumnMenuContext(column)) return false;
  const total = columnValueOptions.value[column].length;
  return total > 0 && columnMenuState.draftValues.size === total;
};

const toggleColumnMenuSelectAll = (column: ColumnKey) => {
  if (!hasColumnMenuContext(column)) return;

  const options = columnValueOptions.value[column];
  columnMenuState.draftValues =
    columnMenuState.draftValues.size === options.length
      ? new Set()
      : new Set(options.map((o) => o.value));
};

const isColumnMenuValueChecked = (column: ColumnKey, value: string) =>
  hasColumnMenuContext(column) && columnMenuState.draftValues.has(value);

const visibleColumnMenuOptions = computed<ColumnOption[]>(() => {
  const activeColumn = columnMenuState.activeColumn;
  if (!activeColumn) return [];

  const options = columnValueOptions.value[activeColumn];
  const search = columnMenuState.search.trim().toLowerCase();
  if (!search) return options;

  return options
    .map((option) => {
      const [matched, score] = fuzzyMatch(search, option.label.toLowerCase());
      return matched ? { option, score } : null;
    })
    .filter((e): e is { option: ColumnOption; score: number } => Boolean(e))
    .sort((a, b) =>
      b.score === a.score
        ? a.option.label.localeCompare(b.option.label, 'cs', {
            sensitivity: 'base'
          })
        : b.score - a.score
    )
    .map((e) => e.option);
});

const applyColumnMenuChanges = () => {
  const key = columnMenuState.activeColumn;
  if (!key) return;

  const selected = columnMenuState.draftValues;
  const total = columnValueOptions.value[key];

  columnFilters[key] =
    selected.size === total.length || total.length === 0
      ? createColumnFilterState()
      : { mode: 'custom', selectedValues: [...selected] };

  closeColumnMenu();
};

onClickOutside(
  columnMenuRoot,
  () => {
    if (columnMenuState.activeColumn) {
      closeColumnMenu();
    }
  },
  { ignore: [columnMenuAnchor] }
);

watch(
  columnMenuAnchor,
  (anchor) => {
    if (!anchor) {
      columnMenuState.position = null;
      return;
    }
    updateColumnMenuPosition();
  },
  { flush: 'post' }
);

let stopWindowResize: (() => void) | undefined;
let stopWindowScroll: (() => void) | undefined;
let stopTableScroll: (() => void) | undefined;

watch(
  () => columnMenuState.activeColumn,
  (column) => {
    stopWindowResize?.();
    stopWindowScroll?.();
    stopTableScroll?.();

    if (!column) return;

    stopWindowResize = useEventListener(
      window,
      'resize',
      updateColumnMenuPosition
    );
    stopWindowScroll = useEventListener(
      window,
      'scroll',
      updateColumnMenuPosition,
      { capture: true }
    );
    stopTableScroll = useEventListener(
      tableWrapperRef,
      'scroll',
      updateColumnMenuPosition,
      { passive: true }
    );
  },
  { flush: 'post' }
);

const columnMenuContext = computed(() => {
  const key = columnMenuState.activeColumn;
  const position = columnMenuState.position;
  if (!key || !position) return null;
  const column = tableColumns.find((col) => col.key === key);
  if (!column) return null;
  return { column, key, position };
});

const getUserSearchHaystack = (user: User) =>
  [
    user.id.toString(),
    normalizeField(user.firstName),
    normalizeField(user.lastName),
    normalizeField(user.nickname),
    normalizeField(user.email),
    normalizeField(user.city)
  ]
    .filter(Boolean)
    .join(' ');

const fuzzySearch = (query: string, haystack: string): [boolean, number] => {
  const q = query.trim().toLowerCase();
  return q ? fuzzyMatch(q, haystack.toLowerCase()) : [true, 0];
};

const userSearchIndex = computed<Map<number, string>>(() => {
  const map = new Map<number, string>();
  for (const user of availableUsers.value) {
    map.set(user.id, getUserSearchHaystack(user));
  }
  return map;
});

type MatchUsersOptions = {
  minLength?: number;
  fallbackAll?: boolean;
  sort?: boolean;
};

const matchUsersByQuery = (
  usersToFilter: User[],
  rawQuery: string,
  { minLength = 0, fallbackAll = true, sort = true }: MatchUsersOptions = {}
) => {
  const query = rawQuery.trim();
  if (!query.length) {
    return fallbackAll ? [...usersToFilter] : [];
  }
  if (query.length < minLength) {
    return [];
  }

  const matches: Array<{ user: User; score: number }> = [];
  for (const user of usersToFilter) {
    const haystack = userSearchIndex.value.get(user.id) ?? '';
    const [matched, score] = fuzzySearch(query, haystack);
    if (matched) {
      matches.push({ user, score });
    }
  }

  if (sort) {
    matches.sort((a, b) =>
      b.score === a.score
        ? getColumnValue(a.user, 'name').localeCompare(
            getColumnValue(b.user, 'name'),
            'cs',
            { sensitivity: 'base' }
          ) || a.user.id - b.user.id
        : b.score - a.score
    );
  }

  return matches.map((match) => match.user);
};

const applyColumnFilters = (usersToFilter: User[]) =>
  usersToFilter.filter((user) =>
    tableColumns.every(({ key }) => {
      const filterState = columnFilters[key];
      if (filterState.mode !== 'custom') return true;
      return filterState.selectedValues.includes(getColumnValue(user, key));
    })
  );

const applyColumnSorts = (usersToSort: User[]) => {
  if (!columnSorts.value.length) return usersToSort;

  return [...usersToSort].sort((a, b) => {
    for (const { key, direction } of columnSorts.value) {
      const valA = getColumnValue(a, key).toLowerCase();
      const valB = getColumnValue(b, key).toLowerCase();
      if (valA === valB) continue;
      const comparison = valA.localeCompare(valB, 'cs', {
        sensitivity: 'base'
      });
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
};

const selectedUsers = computed(() =>
  availableUsers.value.filter((user) => selectedUserIds.value.has(user.id))
);

const searchMatches = computed(() =>
  matchUsersByQuery(availableUsers.value, searchQuery.value, {
    minLength: MIN_SEARCH_LENGTH,
    fallbackAll: false
  })
);

const searchResults = computed(() =>
  searchMatches.value.slice(0, SEARCH_RESULT_LIMIT)
);

const hasMoreSearchMatches = computed(
  () => searchMatches.value.length > SEARCH_RESULT_LIMIT
);

const tableFilteredUsers = computed(() => {
  const filteredByColumns = applyColumnFilters(availableUsers.value);
  const filteredByQuery = matchUsersByQuery(
    filteredByColumns,
    tableFilter.value,
    { fallbackAll: true, sort: false }
  );

  return applyColumnSorts(filteredByQuery);
});

const allFilteredSelected = computed(
  () =>
    tableFilteredUsers.value.length > 0 &&
    tableFilteredUsers.value.every((user) => selectedUserIds.value.has(user.id))
);

const hasPartialSelection = computed(() => {
  const filteredIds = tableFilteredUsers.value.map((u) => u.id);
  const selectedInFilter = filteredIds.filter((id) =>
    selectedUserIds.value.has(id)
  );
  return (
    selectedInFilter.length > 0 &&
    selectedInFilter.length < tableFilteredUsers.value.length
  );
});

const mutateSelectedIds = (mutator: (draft: Set<number>) => void) => {
  const next = new Set(selectedUserIds.value);
  mutator(next);
  selectedUserIds.value = next;
};

const isUserSelected = (userId: number) => selectedUserIds.value.has(userId);

const toggleRecipient = (userId: number) => {
  mutateSelectedIds((draft) => {
    draft.has(userId) ? draft.delete(userId) : draft.add(userId);
  });
};

const addRecipient = (userId: number) => {
  if (selectedUserIds.value.has(userId)) return;
  mutateSelectedIds((draft) => {
    draft.add(userId);
  });
};

const removeRecipient = (userId: number) => {
  if (!selectedUserIds.value.has(userId)) return;
  mutateSelectedIds((draft) => {
    draft.delete(userId);
  });
};

const toggleSelectAllFiltered = () => {
  const filteredIds = tableFilteredUsers.value.map((u) => u.id);
  mutateSelectedIds((draft) => {
    const shouldDeselect = filteredIds.every((id) => draft.has(id));
    filteredIds.forEach((id) => {
      if (shouldDeselect) {
        draft.delete(id);
      } else {
        draft.add(id);
      }
    });
  });
};

const clearRecipients = () => {
  selectedUserIds.value = new Set();
};

const isSending = ref(false);
const sendStatus = ref<'idle' | 'success' | 'error'>('idle');
const sendErrorMessage = ref<string | null>(null);

const hasAnyTitle = computed(() => languages.some((lang) => titles[lang]));
const hasAnyBody = computed(() => languages.some((lang) => messages[lang]));

const canSend = computed(
  () =>
    recipientsCount.value > 0 &&
    hasAnyTitle.value &&
    hasAnyBody.value &&
    !isSending.value
);

const sendNotification = async () => {
  if (!accountStore.token || !canSend.value) return;

  isSending.value = true;
  sendStatus.value = 'idle';
  sendErrorMessage.value = null;

  try {
    await Promise.all(
      Array.from(selectedUserIds.value).map((userId) =>
        authorizedPost(`/utils/send-notification`, accountStore.token!, {
          userId,
          titleCs: titles.cs || undefined,
          titleEn: titles.en || undefined,
          titleDe: titles.de || undefined,
          bodyCs: messages.cs || undefined,
          bodyEn: messages.en || undefined,
          bodyDe: messages.de || undefined
        })
      )
    );
    sendStatus.value = 'success';
  } catch (error) {
    console.error(error);
    sendStatus.value = 'error';
    sendErrorMessage.value =
      error instanceof Error
        ? error.message
        : t('admin.notifications.content.errorUnknown');
  } finally {
    isSending.value = false;
  }
};

const titlePlaceholders: Record<Language, TranslationIdentifier> = {
  cs: 'admin.notifications.content.placeholders.titleCs',
  en: 'admin.notifications.content.placeholders.titleEn',
  de: 'admin.notifications.content.placeholders.titleDe'
};

const messagePlaceholders: Record<Language, TranslationIdentifier> = {
  cs: 'admin.notifications.content.placeholders.messageCs',
  en: 'admin.notifications.content.placeholders.messageEn',
  de: 'admin.notifications.content.placeholders.messageDe'
};

const titleLabels: Record<Language, TranslationIdentifier> = {
  cs: 'admin.notifications.content.titles.cs',
  en: 'admin.notifications.content.titles.en',
  de: 'admin.notifications.content.titles.de'
};

const messageLabels: Record<Language, TranslationIdentifier> = {
  cs: 'admin.notifications.content.messages.cs',
  en: 'admin.notifications.content.messages.en',
  de: 'admin.notifications.content.messages.de'
};
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.notifications.title" />
  </h1>

  <section class="mt-6 w-full space-y-6">
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-gray-900">
            <TranslatedText identifier="admin.notifications.recipients.title" />
            ({{ recipientsCount }})
          </p>
          <p class="text-sm text-gray-500">
            <TranslatedText
              identifier="admin.notifications.recipients.helper"
            />
          </p>
        </div>
        <button
          class="secondary px-3 py-2 text-sm"
          type="button"
          :disabled="!recipientsCount"
          @click="clearRecipients"
        >
          <TranslatedText identifier="admin.notifications.recipients.clear" />
        </button>
      </div>

      <div
        v-if="selectedUsers.length"
        class="mt-4 flex flex-wrap gap-2"
      >
        <span
          v-for="user in selectedUsers"
          :key="user.id"
          class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
        >
          <span>
            {{ user.firstName }} {{ user.lastName }}
            <span class="text-gray-500">
              ({{ user.email || t('account.users.unknown_email') }})
            </span>
          </span>
          <button
            class="text-xs text-red-500 hover:underline"
            type="button"
            @click="removeRecipient(user.id)"
          >
            <TranslatedText identifier="buttons.remove" />
          </button>
        </span>
      </div>
      <p
        v-else
        class="mt-4 text-sm text-gray-500"
      >
        <TranslatedText identifier="admin.notifications.recipients.empty" />
      </p>
    </div>

    <details>
      <summary>
        <TranslatedText identifier="admin.notifications.search.title" />
      </summary>

      <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-4">
          <div class="border-b border-gray-200">
            <div
              class="flex flex-wrap gap-1"
              role="tablist"
            >
              <button
                v-for="tab in tabOptions"
                :key="tab.id"
                class="rounded-t-lg px-4 py-2 text-sm font-medium transition"
                :aria-selected="activeTab === tab.id"
                :class="[
                  activeTab === tab.id
                    ? 'bg-white text-indigo-700 shadow-sm border border-b-white border-gray-200'
                    : 'text-gray-600 border border-transparent hover:text-indigo-600'
                ]"
                role="tab"
                type="button"
                @click="activeTab = tab.id"
              >
                <TranslatedText :identifier="tab.labelKey" />
              </button>
            </div>
          </div>
          <p class="text-sm text-gray-500">
            <TranslatedText
              v-if="currentTabMeta"
              :identifier="currentTabMeta.descriptionKey"
            />
          </p>

          <template v-if="isUsersLoading">
            <p class="text-sm text-gray-500">
              <TranslatedText identifier="admin.notifications.loadingUsers" />
            </p>
          </template>
          <template v-else-if="isUsersError">
            <p class="text-sm text-red-500">
              {{ usersErrorMessage }}
            </p>
          </template>
          <template v-else>
            <div v-if="activeTab === 'search'">
              <details
                open
                class="rounded-2xl border border-gray-200 bg-gray-50/70 p-4"
              >
                <summary
                  class="flex cursor-pointer select-none items-center justify-between gap-2 text-sm font-semibold text-gray-900"
                >
                  <span>
                    <TranslatedText
                      identifier="admin.notifications.search.inputLabel"
                    />
                  </span>
                  <span class="text-xs font-normal text-gray-500">
                    {{ searchResults.length }} / {{ availableUsers.length }}
                  </span>
                </summary>

                <div class="mt-4 space-y-4">
                  <div class="flex flex-col gap-2">
                    <input
                      v-model="searchQuery"
                      type="search"
                      class="rounded-lg border border-gray-200 p-3 shadow-inner focus:border-indigo-500 focus:outline-none"
                      :placeholder="
                        t('admin.notifications.search.placeholder').replace(
                          '{count}',
                          MIN_SEARCH_LENGTH.toString()
                        )
                      "
                      :aria-label="t('admin.notifications.search.inputLabel')"
                    />
                    <p class="text-xs text-gray-500">
                      <TranslatedText
                        identifier="admin.notifications.search.helper"
                      />
                    </p>
                  </div>

                  <div
                    v-if="searchQuery.trim().length < MIN_SEARCH_LENGTH"
                    class="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500"
                  >
                    {{
                      t('admin.notifications.search.minChars').replace(
                        '{count}',
                        MIN_SEARCH_LENGTH.toString()
                      )
                    }}
                  </div>

                  <div v-else>
                    <div
                      v-if="searchResults.length"
                      class="flex flex-col gap-3"
                    >
                      <div
                        v-for="user in searchResults"
                        :key="user.id"
                        class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div>
                          <p class="font-semibold text-gray-900">
                            {{ user.firstName }} {{ user.lastName }}
                          </p>
                          <p class="text-sm text-gray-600">
                            {{ user.email || t('account.users.unknown_email') }}
                          </p>
                          <p class="text-xs text-gray-500">
                            {{
                              user.nickname
                                ? `@${user.nickname}`
                                : t('account.users.unknown_nickname')
                            }}
                            · {{ user.city || t('account.users.unknown_city') }}
                          </p>
                        </div>
                        <button
                          class="primary px-4 py-2 text-sm"
                          type="button"
                          :disabled="isUserSelected(user.id)"
                          @click="addRecipient(user.id)"
                        >
                          <template v-if="isUserSelected(user.id)">
                            <TranslatedText
                              identifier="admin.notifications.search.added"
                            />
                          </template>
                          <template v-else>
                            <TranslatedText identifier="buttons.add" />
                          </template>
                        </button>
                      </div>
                      <p
                        v-if="hasMoreSearchMatches"
                        class="text-xs text-gray-500"
                      >
                        {{
                          t(
                            'admin.notifications.search.limitedResults'
                          ).replace('{limit}', SEARCH_RESULT_LIMIT.toString())
                        }}
                      </p>
                    </div>
                    <div
                      v-else
                      class="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500"
                    >
                      <TranslatedText
                        identifier="admin.notifications.search.noResults"
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <div
              v-else
              class="space-y-4"
            >
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex-1">
                  <label class="text-sm font-medium text-gray-700">
                    <TranslatedText
                      identifier="admin.notifications.table.filterLabel"
                    />
                  </label>
                  <input
                    v-model="tableFilter"
                    type="search"
                    class="mt-1 w-full rounded-lg border border-gray-200 p-3 shadow-inner focus:border-indigo-500 focus:outline-none"
                    :placeholder="
                      t('admin.notifications.table.filterPlaceholder')
                    "
                  />
                </div>
                <button
                  class="secondary h-fit px-4 py-2 text-sm"
                  type="button"
                  :disabled="!tableFilter"
                  @click="tableFilter = ''"
                >
                  <TranslatedText
                    identifier="admin.notifications.table.clearFilter"
                  />
                </button>
              </div>

              <div
                class="overflow-auto rounded-xl border border-gray-200"
                ref="tableWrapperRef"
              >
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                  <thead
                    class="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500"
                  >
                    <tr>
                      <th class="w-12 px-4 py-3 text-left whitespace-nowrap">
                        <input
                          type="checkbox"
                          :checked="allFilteredSelected"
                          :indeterminate="hasPartialSelection"
                          @change="toggleSelectAllFiltered"
                        />
                      </th>
                      <th
                        v-for="column in tableColumns"
                        :key="column.key"
                        class="px-4 py-3 text-left whitespace-nowrap"
                      >
                        <div
                          class="relative inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1"
                          :data-column-menu="column.key"
                        >
                          <span class="font-semibold text-gray-700">
                            <TranslatedText :identifier="column.labelKey" />
                          </span>
                          <button
                            class="flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest transition"
                            type="button"
                            :class="[
                              columnMenuState.activeColumn === column.key ||
                              columnSortMatches(column.key) ||
                              columnHasFilter(column.key)
                                ? 'secondary border-indigo-300! bg-indigo-50! text-indigo-700!'
                                : 'secondary border-gray-200 text-gray-500 hover:bg-gray-100'
                            ]"
                            :ref="
                              (el) =>
                                (columnTriggerRefs[column.key] =
                                  toHTMLElement(el) ?? undefined)
                            "
                            @click.stop="toggleHeaderMenu(column.key)"
                          >
                            <svg
                              class="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 5h18" />
                              <path d="M6 12h12" />
                              <path d="M10 19h4" />
                            </svg>
                            <span class="sr-only">
                              <TranslatedText
                                identifier="admin.notifications.filterMenu.triggerLabel"
                              />
                            </span>
                          </button>
                          <span
                            v-if="columnSortPosition(column.key)"
                            class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                          >
                            #{{ columnSortPosition(column.key) }}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 bg-white">
                    <tr
                      v-for="user in tableFilteredUsers"
                      :key="user.id"
                      class="hover:bg-indigo-50"
                    >
                      <td class="px-4 py-3">
                        <input
                          type="checkbox"
                          :checked="isUserSelected(user.id)"
                          @change="toggleRecipient(user.id)"
                        />
                      </td>
                      <td class="px-4 py-3">
                        <p class="font-medium text-gray-900">
                          {{ user.firstName }} {{ user.lastName }}
                        </p>
                        <p class="text-xs text-gray-500">
                          {{ t('admin.notifications.table.idLabel') }}
                          {{ user.id }}
                        </p>
                      </td>
                      <td class="px-4 py-3 text-gray-700">
                        {{
                          user.nickname || t('account.users.unknown_nickname')
                        }}
                      </td>
                      <td class="px-4 py-3 text-gray-700">
                        {{ user.email || t('account.users.unknown_email') }}
                      </td>
                      <td class="px-4 py-3 text-gray-700">
                        {{ user.city || t('account.users.unknown_city') }}
                      </td>
                    </tr>
                    <tr v-if="!tableFilteredUsers.length">
                      <td
                        colspan="5"
                        class="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        <TranslatedText
                          identifier="admin.notifications.table.noMatches"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <Teleport
                  v-if="columnMenuContext"
                  to="body"
                >
                  <div
                    :ref="(el) => (columnMenuRoot = toHTMLElement(el) ?? null)"
                    class="fixed z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 text-left text-gray-700 shadow-2xl"
                    :style="{
                      top: `${columnMenuContext.position.top}px`,
                      left: `${columnMenuContext.position.left}px`
                    }"
                    data-column-menu-root="true"
                    @click.stop
                  >
                    <div class="space-y-4">
                      <div>
                        <p
                          class="text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          <TranslatedText
                            identifier="admin.notifications.filterMenu.sortTitle"
                          />
                        </p>
                        <div class="mt-2 flex flex-col gap-1">
                          <button
                            class="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-indigo-50"
                            type="button"
                            :class="{
                              'bg-indigo-50 font-semibold text-indigo-700':
                                columnSortMatches(columnMenuContext.key, 'asc')
                            }"
                            @click="
                              applyColumnSort(columnMenuContext.key, 'asc')
                            "
                          >
                            <span>
                              <TranslatedText
                                identifier="admin.notifications.filterMenu.sortAsc"
                              />
                            </span>
                            <span class="text-xs text-gray-400">
                              <TranslatedText
                                identifier="admin.notifications.filterMenu.sortAscHint"
                              />
                            </span>
                          </button>
                          <button
                            class="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-indigo-50"
                            type="button"
                            :class="{
                              'bg-indigo-50 font-semibold text-indigo-700':
                                columnSortMatches(columnMenuContext.key, 'desc')
                            }"
                            @click="
                              applyColumnSort(columnMenuContext.key, 'desc')
                            "
                          >
                            <span>
                              <TranslatedText
                                identifier="admin.notifications.filterMenu.sortDesc"
                              />
                            </span>
                            <span class="text-xs text-gray-400">
                              <TranslatedText
                                identifier="admin.notifications.filterMenu.sortDescHint"
                              />
                            </span>
                          </button>
                        </div>
                        <button
                          class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          :disabled="!columnSorts.length"
                          @click="clearAllColumnSorts"
                        >
                          <TranslatedText
                            identifier="admin.notifications.filterMenu.clearSort"
                          />
                        </button>
                      </div>

                      <div class="border-t border-gray-100 pt-3">
                        <p
                          class="text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          <TranslatedText
                            identifier="admin.notifications.filterMenu.optionsTitle"
                          />
                        </p>
                        <button
                          class="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          :disabled="!columnHasFilter(columnMenuContext.key)"
                          @click="clearColumnFilter(columnMenuContext.key)"
                        >
                          <TranslatedText
                            identifier="admin.notifications.filterMenu.clearFilterPrefix"
                          />
                          &nbsp;„
                          <TranslatedText
                            :identifier="columnMenuContext.column.labelKey"
                          />
                          "
                        </button>
                      </div>

                      <div class="border-t border-gray-100 pt-3">
                        <p
                          class="text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          <TranslatedText
                            identifier="admin.notifications.filterMenu.textFiltersTitle"
                          />
                        </p>
                        <div
                          class="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-2"
                        >
                          <svg
                            class="h-4 w-4 text-gray-400"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <circle
                              cx="9"
                              cy="9"
                              r="6"
                            />
                            <path d="M14 14l4 4" />
                          </svg>
                          <input
                            v-model="columnMenuState.search"
                            type="search"
                            class="h-9 flex-1 bg-transparent text-sm focus:outline-none"
                            :placeholder="
                              t(
                                'admin.notifications.filterMenu.searchPlaceholder'
                              )
                            "
                          />
                        </div>

                        <div
                          class="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-white"
                        >
                          <label
                            class="flex items-center gap-3 border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-700"
                          >
                            <input
                              type="checkbox"
                              :checked="
                                areAllColumnValuesSelected(
                                  columnMenuContext.key
                                )
                              "
                              @change="
                                toggleColumnMenuSelectAll(columnMenuContext.key)
                              "
                            />
                            <span>
                              <TranslatedText
                                identifier="admin.notifications.filterMenu.selectAll"
                              />
                            </span>
                          </label>
                          <template v-if="visibleColumnMenuOptions.length">
                            <label
                              v-for="option in visibleColumnMenuOptions"
                              :key="`${columnMenuContext.key}-${option.value || 'empty'}`"
                              class="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                :checked="
                                  isColumnMenuValueChecked(
                                    columnMenuContext.key,
                                    option.value
                                  )
                                "
                                @change="
                                  toggleColumnMenuValue(
                                    columnMenuContext.key,
                                    option.value
                                  )
                                "
                              />
                              <span>{{ option.label }}</span>
                            </label>
                          </template>
                          <p
                            v-else
                            class="px-3 py-4 text-xs text-gray-500"
                          >
                            <TranslatedText
                              identifier="admin.notifications.filterMenu.noValues"
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                    <div class="mt-4 flex justify-end gap-2">
                      <button
                        class="secondary px-3 py-2 text-sm"
                        type="button"
                        @click="closeColumnMenu"
                      >
                        <TranslatedText identifier="buttons.cancel" />
                      </button>
                      <button
                        class="primary px-3 py-2 text-sm"
                        type="button"
                        @click="applyColumnMenuChanges"
                      >
                        <TranslatedText identifier="common.ok" />
                      </button>
                    </div>
                  </div>
                </Teleport>
              </div>

              <div
                class="flex items-center justify-between text-xs text-gray-500"
              >
                <span>
                  <TranslatedText
                    identifier="admin.notifications.table.visibleCountLabel"
                  />
                  {{ tableFilteredUsers.length }}
                </span>
                <span>
                  <TranslatedText
                    identifier="admin.notifications.table.selectedCountLabel"
                  />
                  {{ recipientsCount }}
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </details>
  </section>

  <section class="mt-8 w-full space-y-6">
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900">
        <TranslatedText identifier="admin.notifications.content.heading" />
      </h2>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div
          v-for="lang in languages"
          :key="`title-${lang}`"
          class="flex flex-col gap-2"
        >
          <label class="text-sm font-medium text-gray-700">
            <TranslatedText :identifier="titleLabels[lang]" />
          </label>
          <input
            v-model="titles[lang]"
            type="text"
            class="rounded-lg border border-gray-200 p-3 focus:border-indigo-500 focus:outline-none"
            :placeholder="t(titlePlaceholders[lang])"
          />
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div
          v-for="lang in languages"
          :key="`message-${lang}`"
          class="flex flex-col gap-2"
        >
          <label class="text-sm font-medium text-gray-700">
            <TranslatedText :identifier="messageLabels[lang]" />
          </label>
          <textarea
            v-model="messages[lang]"
            rows="4"
            class="rounded-lg border border-gray-200 p-3 focus:border-indigo-500 focus:outline-none"
            :placeholder="t(messagePlaceholders[lang])"
          ></textarea>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4">
        <p class="text-sm text-gray-500">
          <TranslatedText
            identifier="admin.notifications.content.summary.recipients"
          />
          : {{ recipientsCount }} ·
          <span>
            <TranslatedText
              :identifier="
                hasAnyTitle
                  ? 'admin.notifications.content.summary.titleReady'
                  : 'admin.notifications.content.summary.titleMissing'
              "
            />
          </span>
          ·
          <span>
            <TranslatedText
              :identifier="
                hasAnyBody
                  ? 'admin.notifications.content.summary.bodyReady'
                  : 'admin.notifications.content.summary.bodyMissing'
              "
            />
          </span>
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <button
            class="primary px-5 py-2 font-semibold"
            :disabled="!canSend || isSending"
            @click="sendNotification"
          >
            {{
              isSending
                ? t('admin.notifications.content.sending')
                : `${t('admin.notifications.content.sendButton')} (${recipientsCount})`
            }}
          </button>
          <p
            v-if="sendStatus === 'success'"
            class="text-sm text-green-600"
          >
            <TranslatedText
              identifier="admin.notifications.content.successMessage"
            />
          </p>
          <p
            v-else-if="sendStatus === 'error'"
            class="text-sm text-red-500"
          >
            <TranslatedText
              identifier="admin.notifications.content.errorPrefix"
            />
            {{ sendErrorMessage }}
          </p>
          <p
            v-else
            class="text-xs text-gray-500"
          >
            <TranslatedText
              identifier="admin.notifications.content.defaultHint"
            />
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
