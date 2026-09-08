<script setup vapor lang="ts">
import { computed, useId } from 'vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const value = computed({
  get: () => props.modelValue,
  set: (newValue: boolean) => {
    emit('update:modelValue', newValue);
  }
});
const inputId = useId();
</script>

<template>
  <label class="details-toggle-card" :for="inputId">
    <span class="details-toggle-text"><slot /></span>
    <span class="toggle-switch">
      <input
        :id="inputId"
        v-model="value"
        type="checkbox"
        class="toggle-switch-input"
      />
      <span
        class="toggle-switch-track"
        :class="{
          'toggle-switch-track--active': value
        }"
      >
        <span class="toggle-switch-thumb" />
      </span>
    </span>
  </label>
</template>

<style scoped>
@reference "../../styles/main.css";

.toggle-switch {
  @apply relative inline-flex items-center cursor-pointer;
}

.toggle-switch-input {
  @apply sr-only;
}

.toggle-switch-track {
  @apply w-14 h-8 rounded-full bg-gray-200 flex items-center px-1 transition-colors duration-200;
}

.toggle-switch-track--active {
  background-color: #ffd400;
}

.toggle-switch-thumb {
  @apply w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200;
  transform: translateX(0);
}

.toggle-switch-track--active .toggle-switch-thumb {
  transform: translateX(1.5rem);
}
</style>
