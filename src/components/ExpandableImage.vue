<template>
  <button
    ref="trigger"
    type="button"
    class="max-w-full"
    :aria-label="`Zvětšit obrázek${alt ? `: ${alt}` : ''}`"
    @click="open"
  >
    <img
      :src="src"
      :alt="alt"
      class="cursor-pointer hover:transform hover:scale-102 transition-transform duration-200 max-w-full"
    />
  </button>

  <teleport to="body">
    <div
      v-if="isExpanded"
      class="fullscreen-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="alt || 'Zvětšený obrázek'"
      @click="close"
    >
      <img
        :src="src"
        :alt="alt"
        class="fullscreen-image"
        @click.stop
      />
      <button
        class="button-secondary absolute top-4 right-4 w-12 h-12 rounded-full flex justify-center items-center text-2xl z-[10000]"
        type="button"
        aria-label="Zavřít obrázek"
        @click="close"
      >
        &times;
      </button>
    </div>
  </teleport>
</template>

<script setup vapor lang="ts">
import { nextTick, ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  src?: string;
  alt?: string;
}>();

const isExpanded = ref(false);
const trigger = ref<HTMLButtonElement | null>(null);
const close = () => {
  isExpanded.value = false;
  nextTick(() => trigger.value?.focus());
};
const open = () => {
  isExpanded.value = true;
};

onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  window.addEventListener('keydown', handleKeydown);
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 999;
}

.fullscreen-image {
  max-width: 90%;
  max-height: 80%;
  margin-bottom: 20px;
}

.close-btn {
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
}
</style>
