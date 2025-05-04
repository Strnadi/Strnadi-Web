<script setup lang="ts">
import { ref } from 'vue';
import { useDropZone } from '@vueuse/core';
import { computed } from 'vue';

const props = defineProps<{
  accept?: string | string[];
  multiple?: boolean;
}>();

const emit = defineEmits(['drop']);

const dropZoneRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

function validateFiles(files: File[]) {
  if (!props.accept || !props.accept.length) {
    return { valid: files, invalid: [] };
  }

  const acceptTypes = Array.isArray(props.accept) ? props.accept : [props.accept];
  const valid: File[] = [];
  const invalid: File[] = [];
  
  files.forEach(file => {
    const isValid = acceptTypes.some(type => {
      if (type.includes('*')) {
        const [mainType] = type.split('/*');
        return file.type.startsWith(mainType + '/');
      }

      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }

      return file.type === type;
    });
    
    isValid ? valid.push(file) : invalid.push(file);
  });
  
  return { valid, invalid };
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (files: File[] | null) => {
    const { valid } = validateFiles(files || []);
    emit('drop', valid);
  }
});

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    const fileArray = Array.from(target.files);
    const { valid } = validateFiles(fileArray);
    emit('drop', valid);
  }
}

function openFileDialog() {
  inputRef.value?.click();
}

const acceptString = computed(() => {
  if (Array.isArray(props.accept)) {
    return props.accept.join(',');
  }

  return props.accept;
});
</script>

<template>
  <div 
    ref="dropZoneRef" 
    class="border-2 border-dashed rounded-lg border-gray-300 w-full p-2 h-20 flex flex-col justify-center items-center"
    @click="openFileDialog"
  >
    <input 
      ref="inputRef"
      type="file"
      :accept="acceptString"
      :multiple="multiple"
      class="hidden"
      @change="onInputChange" 
    />
    <p v-if="isOverDropZone"><slot name="dragging" /></p>
    <p v-else><slot /></p>
  </div>
</template>
