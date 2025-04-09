<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isOpen = ref(false);
const dropdownRef = ref(null);

function open() {
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

</script>

<template>
  <div ref="dropdownRef" class="relative p-4 -m-4" @mouseleave="close">
    <button class="flex items-center focus:outline-none hover:bg-gray-100 hover:border-0 rounded-xl px-5 py-2" @mouseenter="open">
      <slot name="title" />
    </button>
    <ul
      v-if="isOpen"
      class="absolute p-2 left-0 desktop:right-0 desktop:left-auto mt-2 min-w-40 w-max z-[100] bg-white border border-gray-200 rounded shadow-lg"
    >
      <slot />
    </ul>
  </div>
</template>

<style scoped>
@reference "../../styling/main.css";

ul > li {
  @apply font-semibold flex flex-row gap-x-1 items-center px-4 py-2 hover:bg-gray-100;
}
</style>
