<template>
  <div>
    <img
      :src="src"
      :alt="alt"
      class="normal-image"
      @click="isExpanded = true"
      style="cursor: pointer; max-width: 100%;"
    />

    <teleport to="body">
      <div v-if="isExpanded" class="fullscreen-overlay">
        <img :src="src" :alt="alt" class="fullscreen-image"/>
        <button 
          class="button-secondary absolute top-4 right-4 w-12 h-12 rounded-full flex justify-center items-center text-2xl z-[10000]"
          @click="isExpanded = false"
        >
          &times;
        </button>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' }
})

const isExpanded = ref(false)
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
