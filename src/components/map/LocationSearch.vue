<script setup lang="ts">
import { computed, ref, type InputHTMLAttributes } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useDebounceFn } from '@vueuse/core';
import { getGeocodeAutocomplete } from '@/api/maps';

interface LocationSearchProps extends /* @vue-ignore */ InputHTMLAttributes {
  text: string;
  location?: [number, number];
  searchThreshold?: number;
}

defineOptions({
  inheritAttrs: false
});

const props = defineProps<LocationSearchProps>();
const emit = defineEmits(['update:text', 'update:location']);

const text = computed({
  get: () => props.text,
  set: (value) => emit('update:text', value),
});

const location = computed({
  get: () => props.location,
  set: (value) => emit('update:location', value),
});


const { data: suggestions } = useQuery({
  queryKey: ['places', text.value],
  queryFn: useDebounceFn(async () => {
    return getGeocodeAutocomplete(
      text.value,
      ["regional.municipality","regional.municipality_part","regional.street","regional.address","poi","coordinate"]
    );
  }, 250),

  enabled: computed(() => text.value !== undefined && text.value.length >= (props.searchThreshold || 3)),
})

const update = () => {
  if (!suggestions.value) {
    return;
  }

  const selected = suggestions.value.find((suggestion) => suggestion.name === text.value) || null;
  if (!selected) {
    return;
  }

  location.value = [selected.position.lon, selected.position.lat];
}

</script>

<template>
  <input
    v-bind="$attrs"
    v-model="text"
    type='text'
    list='places'
    @change="update"
    @keydown.enter="update"
  />
  <datalist id="places">
    <option v-for="(suggestion, index) in suggestions" :key="index" :value="suggestion.name" />
  </datalist>
</template>
