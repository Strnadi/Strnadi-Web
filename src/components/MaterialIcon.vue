<template>
  <div v-html="svg"></div>
</template>

<script setup lang="ts">
import { getIcon } from 'material-file-icons';
import { computed } from 'vue';

const props = defineProps<{
  filename: string
}>();

const svg = computed(() => getIcon(props.filename).svg)
</script>
