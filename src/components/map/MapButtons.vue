<script setup lang="ts">
import InfoIcon from '@/assets/icon-info.svg';
import OptionsIcon from '@/assets/icon-options.svg';

</script>

<template>
  <PrefetchLink
    to="/mapa/legenda"
    class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
  >
    <img :src="InfoIcon" />
  </PrefetchLink>

  <PrefetchLink
    to="/mapa/nastaveni"
    class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
  >
    <img :src="OptionsIcon" />
  </PrefetchLink>
</template>
