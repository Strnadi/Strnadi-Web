<script setup vapor lang="ts">
import {
  computed,
  nextTick,
  ref,
  type InputHTMLAttributes,
  useId,
  watch
} from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { onClickOutside, useDebounceFn, useWindowSize } from '@vueuse/core';
import { getGeocodeAutocomplete } from '@/api/maps';

interface LocationSearchProps extends /* @vue-ignore */ InputHTMLAttributes {
  text?: string;
  location?: [number, number];
  searchThreshold?: number;
}

interface AutocompleteSuggestion {
  id?: string | number;
  name: string;
  location?: string;
  position?: {
    lat: number;
    lon: number;
  };
  [key: string]: unknown;
}

defineOptions({
  inheritAttrs: false
});

const props = withDefaults(defineProps<LocationSearchProps>(), {
  text: ''
});
const emit = defineEmits(['update:text', 'update:location']);

const text = computed({
  get: () => props.text,
  set: (value) => {
    emit('update:text', value);
  }
});

const location = computed({
  get: () => props.location,
  set: (value) => {
    emit('update:location', value);
  }
});

const containerRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const dropdownPlacement = ref<'down' | 'up'>('down');
const dropdownMaxHeight = ref(256);

const componentId = useId();
const listboxId = `${componentId}-listbox`;

const { height: viewportHeight } = useWindowSize();
const DROPDOWN_MARGIN = 8;
const MIN_DROPDOWN_HEIGHT = 140;
const MAX_DROPDOWN_HEIGHT = 320;

const { data: suggestions } = useQuery<AutocompleteSuggestion[]>({
  queryKey: ['places', text],
  queryFn: useDebounceFn(async () => {
    return getGeocodeAutocomplete(text.value, [
      'coordinate',
      'regional.address',
      'regional.street',
      'poi',
      'regional.municipality_part',
      'regional.municipality'
    ]);
  }, 500),
  enabled: computed(
    () =>
      text.value !== undefined &&
      text.value.length >= (props.searchThreshold || 3)
  )
});

const showSuggestions = computed(
  () => isOpen.value && !!suggestions.value?.length
);

const activeDescendantId = computed(() => {
  if (!showSuggestions.value || highlightedIndex.value < 0) {
    return undefined;
  }

  return `${listboxId}-option-${highlightedIndex.value}`;
});

const clampDropdownHeight = (space: number) => {
  if (!Number.isFinite(space) || space <= 0) {
    return MIN_DROPDOWN_HEIGHT;
  }
  return Math.min(Math.max(space, MIN_DROPDOWN_HEIGHT), MAX_DROPDOWN_HEIGHT);
};

const updateDropdownMetrics = () => {
  if (!isOpen.value || !containerRef.value) {
    return;
  }

  const rect = containerRef.value.getBoundingClientRect();
  const viewportH =
    viewportHeight.value ||
    (typeof window !== 'undefined' ? window.innerHeight : MIN_DROPDOWN_HEIGHT);
  const spaceBelow = viewportH - rect.bottom - DROPDOWN_MARGIN;
  const spaceAbove = rect.top - DROPDOWN_MARGIN;

  if (spaceBelow >= spaceAbove) {
    dropdownPlacement.value = 'down';
    dropdownMaxHeight.value = clampDropdownHeight(spaceBelow);
  } else {
    dropdownPlacement.value = 'up';
    dropdownMaxHeight.value = clampDropdownHeight(spaceAbove);
  }
};

const dropdownInlineStyle = computed(() => ({
  maxHeight: `${dropdownMaxHeight.value}px`
}));

const syncLocationFromExactMatch = () => {
  if (!suggestions.value?.length) {
    return;
  }

  const selected =
    suggestions.value.find((suggestion) => suggestion.name === text.value) ||
    null;

  if (!selected?.position) {
    return;
  }

  location.value = [selected.position.lat, selected.position.lon];
};

const handleInput = () => {
  isOpen.value = true;
  highlightedIndex.value = -1;
  syncLocationFromExactMatch();
};

const handleFocus = () => {
  if (suggestions.value?.length) {
    isOpen.value = true;
  }
};

const handleBlur = (event: FocusEvent) => {
  const nextTarget = event.relatedTarget as Node | null;
  if (nextTarget && containerRef.value?.contains(nextTarget)) {
    return;
  }
  isOpen.value = false;
  highlightedIndex.value = -1;
};

const selectSuggestion = (suggestion: AutocompleteSuggestion) => {
  if (!suggestion.position) {
    return;
  }
  text.value = suggestion.name;
  location.value = [suggestion.position.lat, suggestion.position.lon];
  isOpen.value = false;
  highlightedIndex.value = -1;
};

const handleKeydown = (event: KeyboardEvent) => {
  const items = suggestions.value ?? [];
  if (!items.length) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    isOpen.value = true;
    highlightedIndex.value =
      highlightedIndex.value < items.length - 1
        ? highlightedIndex.value + 1
        : 0;
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    isOpen.value = true;
    highlightedIndex.value =
      highlightedIndex.value > 0
        ? highlightedIndex.value - 1
        : items.length - 1;
    return;
  }

  if (event.key === 'Enter') {
    if (highlightedIndex.value >= 0) {
      event.preventDefault();
      const suggestion = items[highlightedIndex.value];
      if (suggestion) {
        selectSuggestion(suggestion);
      }
      return;
    }
    syncLocationFromExactMatch();
    isOpen.value = false;
    return;
  }

  if (event.key === 'Escape') {
    isOpen.value = false;
    highlightedIndex.value = -1;
  }
};

const formatSuggestionMeta = (suggestion: AutocompleteSuggestion) => {
  if (suggestion.location?.trim()) {
    return suggestion.location;
  }

  if (suggestion.position) {
    return `${suggestion.position.lat.toFixed(4)}, ${suggestion.position.lon.toFixed(
      4
    )}`;
  }

  return '';
};

watch(showSuggestions, (open) => {
  if (open) {
    nextTick(updateDropdownMetrics);
  }
});

watch(
  () => viewportHeight.value,
  () => {
    if (showSuggestions.value) {
      nextTick(updateDropdownMetrics);
    }
  }
);

watch(
  () => suggestions.value?.length,
  (length) => {
    if (!length) {
      isOpen.value = false;
      highlightedIndex.value = -1;
      return;
    }

    if (highlightedIndex.value >= length) {
      highlightedIndex.value = -1;
    }

    if (showSuggestions.value) {
      nextTick(updateDropdownMetrics);
    }
  }
);

onClickOutside(containerRef, () => {
  isOpen.value = false;
  highlightedIndex.value = -1;
});
</script>

<template>
  <div ref="containerRef" class="location-search">
    <input
      v-bind="$attrs"
      v-model="text"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="showSuggestions"
      :aria-controls="listboxId"
      :aria-activedescendant="activeDescendantId"
      @focus="handleFocus"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="handleBlur"
    />
    <Transition name="location-search-fade">
      <ul
        v-if="showSuggestions"
        :id="listboxId"
        :class="[
          'location-search__dropdown',
          `location-search__dropdown--${dropdownPlacement}`
        ]"
        :style="dropdownInlineStyle"
        role="listbox"
      >
        <li
          v-for="(suggestion, index) in suggestions || []"
          :id="`${listboxId}-option-${index}`"
          :key="suggestion.id ?? `${suggestion.name}-${index}`"
          class="location-search__option"
          :class="{ 'is-active': index === highlightedIndex }"
          role="option"
          :aria-selected="index === highlightedIndex"
          @mousedown.prevent
          @click="selectSuggestion(suggestion)"
          @mouseenter="highlightedIndex = index"
        >
          <p class="location-search__name">
            {{ suggestion.name }}
          </p>
          <p class="location-search__meta">
            {{ formatSuggestionMeta(suggestion) }}
          </p>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.location-search {
  position: relative;
  width: 100%;
}

.location-search__dropdown {
  position: absolute;
  left: 0;
  right: 0;
  max-height: 16rem;
  overflow-y: auto;
  border: 1px solid var(--strnadi-border, rgba(15, 23, 42, 0.12));
  border-radius: 0.75rem;
  padding: 0.5rem 0;
  background-color: var(--strnadi-surface, #fff);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
  z-index: 30;
}

.location-search__dropdown--down {
  top: calc(100% + 0.25rem);
  bottom: auto;
}

.location-search__dropdown--up {
  bottom: calc(100% + 0.25rem);
  top: auto;
}

.location-search__option {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.location-search__option.is-active {
  background-color: rgba(59, 130, 246, 0.1);
  color: #0f172a;
}

.location-search__name {
  margin: 0;
  font-weight: 600;
}

.location-search__meta {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}

@media (max-width: 640px) {
  .location-search__dropdown {
    border-radius: 1rem;
    padding: 0.75rem 0;
  }

  .location-search__option {
    padding: 0.75rem 1rem;
  }

  .location-search__name {
    font-size: 1rem;
  }

  .location-search__meta {
    font-size: 0.95rem;
  }
}

.location-search-fade-enter-active,
.location-search-fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.location-search-fade-enter-from,
.location-search-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
