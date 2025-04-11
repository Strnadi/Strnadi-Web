<script setup lang="ts">
import { ref, computed } from 'vue';
import type { InputHTMLAttributes } from 'vue'

// Disable attribute inheritance on the root element
defineOptions({
  inheritAttrs: false
});

interface RevealablePasswordInputProps extends /* @vue-ignore */ InputHTMLAttributes {
  label?: string;
  modelValue?: string;
}

const props = defineProps<RevealablePasswordInputProps>();
const emit = defineEmits(['update:modelValue']);

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isRevealed = ref(false);
</script>

<template>
  <div class="flex flex-row gap-x-2">
    <div class="relative flex-grow">
      <input
        v-bind="$attrs"
        :type="isRevealed ? 'text' : 'password'"
        v-model="inputValue"
        class="w-full pr-16"
      />
      <span v-if="props.label" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
        {{ props.label }}
      </span>
    </div>
    <button class="text-xl" type="button" @click="isRevealed = !isRevealed">
      {{ isRevealed ? '🫣' : '👁️' }}
    </button>
  </div>
</template>
