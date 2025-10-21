<script setup lang="ts">
import { ref, computed, toRef } from 'vue';
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
const emit = defineEmits(['drop', 'update:modelValue']);

// expose multiple for template binding
const multiple = toRef(props, 'multiple');

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
    const { valid } = validateFiles(
      Array.isArray(props.accept)
        ? props.accept
        : props.accept
          ? [props.accept]
          : ['*'],
      files || []
    );
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
    const { valid } = validateFiles(
      Array.isArray(props.accept)
        ? props.accept
        : props.accept
          ? [props.accept]
          : ['*'],
      Array.from(files)
    );
    dropzoneFiles.value = valid;
  }
});
</script>

<template>
  <div
    ref="dropZoneRef"
    :class="
      !headless &&
      `border-2 border-dashed rounded-lg border-gray-300 w-full p-2 flex flex-col justify-center items-center min-h-[5rem] h-full`
    "
    @click="() => !headless && open()"
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
