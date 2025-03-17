<script setup lang="ts">
import { useDropzone, type FileRejectReason } from "vue3-dropzone";

const props = defineProps<{
  accept?: string | string[];
  multiple?: boolean;
}>();

const emit = defineEmits(['drop']);

const {
  getRootProps,
  getInputProps,
  isDragActive,
  open
} = useDropzone({ onDrop: (accepted, rejectReasons) => emit('drop', accepted, rejectReasons), accept: props.accept });

</script>

<template>
  <div class="border-2 border-dashed rounded-lg border-gray-300 w-full p-2 h-20 flex flex-col justify-center items-center" v-bind="getRootProps()" @click="open">
    <input v-bind="getInputProps()" />
    <p v-if="isDragActive"><slot name="dragging" /></p>
    <p v-else><slot /></p>
  </div>
</template>
