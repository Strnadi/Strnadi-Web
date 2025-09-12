<script setup lang="ts">
import { getReverseGeocode } from '@/api/maps';
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import TranslatedText from '../TranslatedText.vue';


const props = defineProps<{
  lat: number;
  lng: number;
  type: 'country' | 'region' | 'municipality' | 'municipality_part' | 'street' | 'address';
}>();

const { data: queryResult, isLoading, isError } = useQuery({
  queryKey: [
    'textual-coords',
    () => props.lat,
    () => props.lng
  ],
  queryFn: () => getReverseGeocode(props.lat, props.lng)
});

const name = computed(() => {
  if (queryResult.value) {
    for (const item of queryResult.value.items) {
      for (const regionalStructure of item.regionalStructure) {
        if (regionalStructure.type === `regional.${props.type}`) {
          return regionalStructure.name;
        }
      }
    }
  }

  return null;
});

</script>

<template>
  <template v-if="isError">
    <TranslatedText identifier="errors.location" />
  </template>
  <template v-else-if="isLoading">
    <TranslatedText identifier="loading" />...
  </template>
  <template v-else-if="name">
    {{ name }}
  </template>
</template>
