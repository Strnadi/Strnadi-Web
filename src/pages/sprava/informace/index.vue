<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import Articles from './prispevky/index.vue'
import Categories from './kategorie/index.vue'

</script>

<template>
  <h1>Správa informací</h1>

  <div class="flex flex-col">
    <Categories />
  </div>

  <div class="flex flex-col">
    <Articles />
  </div>
</template>
