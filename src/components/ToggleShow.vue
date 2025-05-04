<template>
  <button v-show="!visible" @click="visible = !visible">
    <slot name="toggle-button" />
  </button>
  <div v-bind="$attrs" v-show="visible">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  inheritAttrs: false
});

const visible = ref(false);
</script>
