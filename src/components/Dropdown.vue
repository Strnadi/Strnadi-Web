<script setup vapor lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function toggle() {
  isOpen.value = !isOpen.value;
}

function open() {
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

// Handler for clicks outside the dropdown (mobile only)
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div
    ref="dropdownRef"
    class="relative p-4 -m-4 max-desktop:hidden"
    @mouseleave="close"
  >
    <button
      class="flex items-center focus:outline-none hover:bg-gray-100 hover:border-0 rounded-xl px-5 py-2"
      @mouseenter="open"
      @click.stop="toggle"
    >
      <slot name="title" />
    </button>
    <ul
      v-if="isOpen"
      class="absolute p-2 left-0 desktop:left-0 desktop:right-auto mt-2 w-max z-[100] bg-white border border-gray-200 rounded shadow-lg"
    >
      <slot />
    </ul>
  </div>

  <div class="hidden max-desktop:block p-4 -m-4">
    <details class="w-full">
      <summary
        class="flex items-center justify-between cursor-pointer focus:outline-none hover:bg-gray-100 rounded-xl px-5 py-2"
      >
        <slot name="title" />
      </summary>
      <ul class="mt-2 p-2 bg-white border border-gray-200 rounded shadow-lg">
        <slot />
      </ul>
    </details>
  </div>
</template>

<style scoped>
@reference "../styles/main.css";

ol > li {
  @apply font-semibold flex flex-row gap-x-1 items-center px-4 py-2 hover:bg-gray-100;
}
</style>
