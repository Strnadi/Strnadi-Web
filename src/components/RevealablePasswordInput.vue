<script setup lang="ts">
import { ref, computed, useId, useSlots } from 'vue';

const slots = useSlots();

// Disable attribute inheritance on the root element
defineOptions({
  inheritAttrs: false
});

interface RevealablePasswordInputProps {
  id?: string;
  modelValue?: string;
  label?: string;
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
const generatedId = useId();
const inputId = computed(() => String(props.id ?? generatedId));
</script>

<template>
  <div class="flex flex-row justify-end gap-x-2">
    <div class="flex flex-col w-full">
      <label
        v-if="slots['default'] || label"
        class="block text-sm font-medium mb-1"
        :for="inputId"
      >
        <slot>{{ label }}</slot>
      </label>
      <input
        v-bind="$attrs"
        :id="inputId"
        v-model="inputValue"
        :type="isRevealed ? 'text' : 'password'"
        class="w-full pr-16"
      />
    </div>
    <button
      class="text-xl"
      type="button"
      :aria-controls="inputId"
      :aria-pressed="isRevealed"
      :aria-label="isRevealed ? 'Skrýt heslo' : 'Zobrazit heslo'"
      @click="isRevealed = !isRevealed"
    >
      {{ isRevealed ? '🫣' : '👁️' }}
    </button>
  </div>
</template>
