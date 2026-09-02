<script setup vapor lang="ts">
import { ref, computed } from 'vue';
import { useDropZone, useFileDialog } from '@vueuse/core';
import { validateFiles } from '@/utils/files.ts';

interface CommonProps {
  accept?: string | string[];
  headless?: boolean;
}

interface SingleFileProps extends CommonProps {
  multiple?: false;
  modelValue?: File;
}

interface MultipleFileProps extends CommonProps {
  multiple: true;
  modelValue?: File[];
}

const props = defineProps<SingleFileProps | MultipleFileProps>();
const emit = defineEmits(['drop', 'invalid', 'update:modelValue']);

const dropzoneFiles = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (props.multiple) {
      const incoming = Array.isArray(value) ? value : [value];
      const previous = Array.isArray(props.modelValue) ? props.modelValue : [];
      emit('drop', incoming);
      emit('update:modelValue', [...previous, ...incoming]);
    } else {
      const newFile = Array.isArray(value) ? value[0] : value;
      emit('drop', newFile);
      emit('update:modelValue', newFile);
    }
  }
});

const dropZoneRef = ref<HTMLElement | null>(null);

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (files: File[] | null) => {
    const { valid, invalid } = validateFiles(
      Array.isArray(props.accept)
        ? props.accept
        : props.accept
          ? [props.accept]
          : ['*'],
      files || []
    );
    if (invalid.length) emit('invalid', invalid);
    dropzoneFiles.value = valid;
  }
});

const acceptString = computed(() => {
  if (Array.isArray(props.accept)) {
    return props.accept.join(',');
  }

  return props.accept;
});

const { open, onChange } = useFileDialog({
  accept: acceptString.value,
  multiple: props.multiple
});

onChange((files) => {
  if (files) {
    const { valid, invalid } = validateFiles(
      Array.isArray(props.accept)
        ? props.accept
        : props.accept
          ? [props.accept]
          : ['*'],
      Array.from(files)
    );
    if (invalid.length) emit('invalid', invalid);
    dropzoneFiles.value = valid;
  }
});
</script>

<template>
  <div
    ref="dropZoneRef"
    :class="[
      !headless && 'dropzone',
      isOverDropZone && !headless && 'dropzone-active'
    ]"
    :role="headless ? undefined : 'button'"
    :tabindex="headless ? undefined : 0"
    :aria-label="headless ? undefined : 'Vybrat soubory'"
    @click="() => !headless && open()"
    @keydown.enter.prevent="() => !headless && open()"
    @keydown.space.prevent="() => !headless && open()"
    @dragenter.stop
  >
    <div v-if="isOverDropZone">
      <slot name="dragging" />
    </div>
    <div v-else>
      <slot />
    </div>
  </div>
</template>

<style scoped>
@reference "../styles/main.css";

.dropzone {
  @apply border-3 border-dashed rounded-xl border-gray-300 bg-gray-50;
  @apply w-full p-4 sm:p-6;
  @apply flex flex-col justify-center items-center;
  @apply min-h-[12rem] sm:min-h-[14rem];
  @apply cursor-pointer touch-manipulation;
  @apply transition-all duration-200;
  @apply hover:border-blue-400 hover:bg-blue-50;
}

.dropzone-active {
  @apply border-blue-500 bg-blue-100 scale-[1.02];
}
</style>
