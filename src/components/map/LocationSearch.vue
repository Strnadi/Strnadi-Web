<script setup lang="ts">
import { computed, ref, type InputHTMLAttributes } from 'vue';
import axios from 'axios';import { useQuery } from '@tanstack/vue-query';
import { useDebounceFn } from '@vueuse/core';

interface LocationSearchProps extends /* @vue-ignore */ InputHTMLAttributes {
  modelValue?: string;
}

defineOptions({
  inheritAttrs: false
});

const props = defineProps<LocationSearchProps>();
const emit = defineEmits(['update:modelValue']);

const text = ref('');

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});


const { data: suggestions } = useQuery({
  queryKey: ['places', text.value],
  queryFn: useDebounceFn(async () => {
    const response = await axios.get(`https://api.mapy.cz/v1/suggest?query=${text.value}&apikey=${import.meta.env.VITE_MAPYCZ_API_KEY}`);
    return response.data.items;
  }, 250),

  enabled: computed(() => text.value !== undefined && text.value.length >= 3),
})

const update = () => {
  inputValue.value = suggestions.value.find((suggestion) => suggestion.name === text.value) || null;
}

</script>

<template>
  <input
    v-bind="$attrs"
    v-model="text"
    @change="update"
    type='text'
    list='places'
  />
  <datalist id="places">
    <option v-for="(suggestion, index) in suggestions" :key="index" :value="suggestion.name" />
  </datalist>
</template>
