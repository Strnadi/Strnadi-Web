<script setup lang="ts">
import { ref } from 'vue';
import { registerStore } from '@/state/RegisterStore';

const agreement = ref(false);
</script>

<template>
  <div>
    <input type="checkbox" id="agreement" v-model="agreement" />
    <button className='primary p-2 m-2' :disabled="!agreement" @click="registerStore.nextStage">Pokračovat</button>
  </div>
</template>
