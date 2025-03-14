<template>
  <h1 className='text-2xl font-bold'>Přidání info</h1>
  <button @click="uploadStore.nextStage">
    Pokračovat
  </button>
</template>

<script lang="ts" setup>
import { uploadStore } from '@/state/UploadStore';
</script>
