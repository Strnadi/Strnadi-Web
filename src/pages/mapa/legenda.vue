<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup vapor lang="ts">
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import MultiColorSquare from '@/components/MultiColorSquare.vue';
import TranslatedText from '@/components/TranslatedText.vue';
import { computed } from 'vue';

const legendEntries = computed(() =>
  Object.entries(DialectColors.value ?? {})
    .filter(([code]) => !['nobird', 'no-bird'].includes(code.toLowerCase()))
    .sort(([left], [right]) => {
      const special = (value: string) =>
        ['unfinished', 'none'].includes(value.toLowerCase()) ? 1 : 0;
      return special(left) - special(right) || left.localeCompare(right);
    })
);
</script>

<template>
  <h1>
    <TranslatedText identifier="pages.map.legend.title" />
  </h1>

  <div class="flex flex-row gap-x-2 gap-y-2 flex-wrap">
    <div
      v-for="([key, icon]) in legendEntries"
      :key="key"
      class="flex min-w-fit flex-row p-2 items-center border-1 border-gray-200 bg-white rounded-2xl flex-[1_0_20%]"
    >
      <multi-color-square
        :colors="[icon]"
        size="16px"
        class="m-1 border-transparent! rounded-md"
      />
      <span class="text-sm font-medium">{{ key }}</span>
    </div>
  </div>
</template>
