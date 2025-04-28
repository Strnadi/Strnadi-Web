<script setup lang="ts">
import { getReverseGeocode } from '@/features/Map/api/maps';
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';


const props = defineProps<{
  lat: number;
  lng: number;
  type: string;
}>();

const { data: queryResult, isLoading, isError } = useQuery({
  queryKey: ['textual-coords', props.lat, props.lng],
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
  <template v-if="isError">Chyba při načítání lokace.</template>
  <template v-else-if="isLoading">Načítání...</template>
  <template v-else-if="name">{{ name }}</template>
</template>
