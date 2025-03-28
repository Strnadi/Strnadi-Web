<script lang="ts" setup>
import { uploadStore } from '@/state/UploadStore';
</script>

<template>
  <h1>Přidání info</h1>
  <div class="flex flex-col gap-x-2 gap-y-4 w-full">
    <VueDatePicker
      :inline="true"
      :flow="['calendar', 'time']"
      v-model="uploadStore.dateTime"
      auto-apply
      partial-flow
      model-type="iso"
    />
    <div>
      <label for="title" class="block text-sm font-medium">Titulek</label>
      <input
        v-model="uploadStore.title"
        type="text"
        id="title"
      />
    </div>
    <div>
      <label for="note" class="block text-sm font-medium">Poznámka</label>
      <textarea
        v-model="uploadStore.note"
        id="note"
      />
    </div>
    <div>
      <label for="note" class="block text-sm font-medium">Nahrávací zařízení</label>
      <textarea
        v-model="uploadStore.device"
        id="note"
      />
    </div>
    <div>
      <label for="birdCount" class="block text-sm font-medium">Počet strnadů</label>
      <input
        v-model="uploadStore.birdCount"
        min="0"
        max="2"
        type="range"
        id="birdCount"
      />
    </div>
  </div>
  <button @click="uploadStore.nextStage" class="primary p-2 w-full">
    Pokračovat
  </button>
</template>
