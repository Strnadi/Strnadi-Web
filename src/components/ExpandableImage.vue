<template>
  <img
    :src="src"
    :alt="alt"
    class="cursor-pointer hover:transform hover:scale-102 transition-transform duration-200 max-w-full"
    @click="isExpanded = true"
  >

  <teleport to="body">
    <div
      v-if="isExpanded"
      class="fullscreen-overlay"
      @click="isExpanded = false"
    >
      <img
        :src="src"
        :alt="alt"
        class="fullscreen-image"
        @click.stop
      >
      <button 
        class="button-secondary absolute top-4 right-4 w-12 h-12 rounded-full flex justify-center items-center text-2xl z-[10000]"
        @click="isExpanded = false"
      >
        &times;
      </button>
    </div>
  </teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' }
})

const isExpanded = ref(false)

onMounted(() => {
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      isExpanded.value = false
    }
  }
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})
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
