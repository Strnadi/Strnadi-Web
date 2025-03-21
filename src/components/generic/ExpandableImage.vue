<template>
  <!-- Regular image - shown when not expanded -->
  <img 
    v-if="!isExpanded" 
    :src="src" 
    :alt="alt" 
    class="expandable-image" 
    @click="expandImage"
  />
  
  <!-- Expanded image container with backdrop -->
  <div 
    v-if="isExpanded" 
    class="expanded-image-backdrop" 
    @click.self="closeImage"
    tabindex="-1"
    ref="backdropRef"
    @keydown.esc="closeImage"
  >
    <div class="expanded-image-container">
      <img :src="src" :alt="alt" class="expanded-image" />
      <button class="close-button" @click="closeImage" aria-label="Close">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  }
});

// State for tracking expanded status
const isExpanded = ref(false);
const backdropRef = ref(null);

// Methods to handle expanding and closing
const expandImage = () => {
  isExpanded.value = true;
  document.body.style.overflow = 'hidden'; // Prevent scrolling when expanded
  
  // Focus the backdrop for keyboard accessibility
  setTimeout(() => {
    if (backdropRef.value) {
      backdropRef.value.focus();
    }
  }, 50);
};

const closeImage = () => {
  isExpanded.value = false;
  document.body.style.overflow = ''; // Restore scrolling
};

// Global event listener for ESC key
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isExpanded.value) {
    closeImage();
  }
};

// Setup and cleanup
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  // Ensure we restore scroll if component is unmounted while expanded
  if (isExpanded.value) {
    document.body.style.overflow = '';
  }
});
</script>

<style scoped>

.expandable-image {
  cursor: pointer;
  max-width: 100%;
  transition: transform 0.2s ease;
}

.expandable-image:hover {
  transform: scale(1.02);
}

.expanded-image-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  outline: none;
}

.expanded-image-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.expanded-image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}

.close-button {
  position: absolute;
  top: -40px;
  right: -40px;
  background-color: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
  z-index: 1001;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .close-button {
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    font-size: 24px;
  }
  
  .expanded-image {
    max-height: 80vh;
  }
}
</style>