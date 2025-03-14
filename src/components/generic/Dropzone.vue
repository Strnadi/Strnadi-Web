<script setup lang="ts">
import { useDropzone, type FileUploadOptions } from "vue3-dropzone";

const props = defineProps<FileUploadOptions>();

const {
  getRootProps,
  getInputProps,
  isDragActive,
  open
} = useDropzone(props);

</script>

<template>
  <div v-bind="getRootProps()" @click="open">
    <input v-bind="getInputProps()" />
    <p v-if="isDragActive"><slot name="dragging" /></p>
    <p v-else><slot /></p>
  </div>
</template>
