<script setup lang="ts">
import { computed, type InputHTMLAttributes } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useDebounceFn } from '@vueuse/core';
import { getGeocodeAutocomplete } from '@/api/maps';

interface LocationSearchProps extends /* @vue-ignore */ InputHTMLAttributes {
  text?: string;
  location?: [number, number];
  searchThreshold?: number;
}

defineOptions({
  inheritAttrs: false
});

const props = withDefaults(
  defineProps<LocationSearchProps>(),
  {
    text: ""
  }
);
const emit = defineEmits(['update:text', 'update:location']);

const text = computed({
  get: () => props.text,
  set: (value) => { emit('update:text', value); },
});

const location = computed({
  get: () => props.location,
  set: (value) => { emit('update:location', value); },
});


const { data: suggestions } = useQuery({
  queryKey: ['places', text],
  queryFn: useDebounceFn(async () => {
    return getGeocodeAutocomplete(
      text.value,
      ["coordinate", "regional.address", "regional.street", "poi", "regional.municipality_part", "regional.municipality"]
    );
  }, 500),

  enabled: computed(() => text.value !== undefined && text.value.length >= (props.searchThreshold || 3)),
});

const update = () => {
  if (!suggestions.value) {
    return;
  }

  const selected = suggestions.value.find((suggestion) => suggestion.name === text.value) || null;
  if (!selected) {
    return;
  }

  location.value = [selected.position.lat, selected.position.lon];
}

</script>

<template>
  <input
    v-bind="$attrs"
    v-model="text"
    type="text"
    list="places"
    @input="update"
  >
  <datalist id="places">
    <option
      v-for="(suggestion, index) in suggestions"
      :key="index"
      :value="suggestion.name"
    >
      {{ suggestion.name }} ({{ suggestion.location }})
    </option>
  </datalist>
</template>
