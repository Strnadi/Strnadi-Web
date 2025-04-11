<script setup lang="ts">
import { ref, computed } from 'vue';
import type { InputHTMLAttributes } from 'vue'

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
    <label :for="props.id" v-if="props.label" class="text-sm font-medium mb-1">
      {{ props.label }}
    </label>
    <input
      v-bind="{ ...props, type: isRevealed ? 'text' : 'password' }"
      v-model="inputValue"
    />
    <button type="button" @click="isRevealed = !isRevealed">
      {{ isRevealed ? 'Hide' : 'Show' }}
    </button>
  </div>
</template>
