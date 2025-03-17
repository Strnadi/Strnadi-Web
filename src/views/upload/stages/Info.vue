<template>
  <h1 className='text-2xl font-bold'>Přidání info</h1>
  <div class="flex flex-col gap-x-2 gap-y-4 w-full lg:w-1/2">
    <VueDatePicker
      v-model="uploadStore.dateTime"
      auto-apply
      partial-flow
      :flow="['calendar', 'time']"
      model-type="iso"
      :inline="true"
    />
    <div>
      <label for="title" class="block text-sm font-medium mb-1">Titulek</label>
      <input
        v-model="uploadStore.title"
        type="text"
        id="title"
      />
    </div>
    <div>
      <label for="note" class="block text-sm font-medium mb-1">Poznámka</label>
      <textarea
        v-model="uploadStore.note"
        type="text"
        id="note"
      />
    </div>
  </div>
  <button @click="uploadStore.nextStage" class="primary p-2 w-full">
    Pokračovat
  </button>
</template>

<script lang="ts" setup>
import { uploadStore } from '@/state/UploadStore';
</script>
