<script setup lang="ts">
import { ref, computed, useSlots } from 'vue';
import type { InputHTMLAttributes } from 'vue';

const slots = useSlots();

// Disable attribute inheritance on the root element
defineOptions({
  inheritAttrs: false
});

interface RevealablePasswordInputProps
  extends /* @vue-ignore */ InputHTMLAttributes {
  modelValue?: string;
}

const props = defineProps<RevealablePasswordInputProps>();
const emit = defineEmits(['update:modelValue']);

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
  }
});

const isRevealed = ref(false);
</script>

<template>
  <div class="flex flex-row justify-end gap-x-2">
    <div class="flex flex-col w-full">
      <label
        v-if="slots['default']"
        class="block text-sm font-medium mb-1"
        for="password"
      >
        <slot />
      </label>
      <input
        v-bind="$attrs"
        id="password"
        v-model="inputValue"
        :type="isRevealed ? 'text' : 'password'"
        class="w-full pr-16"
      >
    </div>
    <button
      class="text-xl"
      type="button"
      @click="isRevealed = !isRevealed"
    >
      {{ isRevealed ? '🫣' : '👁️' }}
    </button>
  </div>
</template>
