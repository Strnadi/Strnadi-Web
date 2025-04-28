<script lang="ts" setup>
import { uploadStore } from '@/features/Upload/state/UploadStore';
import { computed, ref } from 'vue';

const dialect = ref("");

const partURLs = computed(() => {
  return uploadStore.parts!.map((part) => URL.createObjectURL(part.file));
});

const addDialect = () => {
  if (dialect.value && dialect.value != "none" && !uploadStore.dialects.includes(dialect.value)) {
    uploadStore.dialects.push(dialect.value);
    dialect.value = "none";
  }
};
</script>

<template>
  <h1>Informace o nahrávce</h1>
  <div class="flex flex-col w-full">
    <div class="flex flex-col gap-x-2 gap-y-4 w-full">
      <VueDatePicker
        :flow="['calendar', 'time']"
        v-model="uploadStore.dateTime"
        auto-apply
        partial-flow
        model-type="iso"
      />
      <div class="w-full">
        <label for="title" class="block text-sm font-medium w-full">Titulek</label>
        <input
          v-model="uploadStore.title"
          type="text"
          id="title"
          class="w-full"
        />
      </div>
      <div>
        <label for="note" class="block text-sm font-medium">Poznámka</label>
        <textarea
          v-model="uploadStore.note"
          id="note"
          class="w-full"
        />
      </div>
      <div>
        <label for="device" class="block text-sm font-medium">Nahrávací zařízení</label>
        <input
          v-model="uploadStore.device"
          id="device"
          type="text"
          class="w-full"
        />
      </div>
      <div>
        <label for="birdCount" class="block text-sm font-medium">Počet strnadů ({{ uploadStore.birdCount }})</label>
        <input
          v-model="uploadStore.birdCount"
          min="1"
          max="2"
          type="range"
          id="birdCount"
        />
      </div>
    </div>
    <div>
      <select
        class="filter-select drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 bg-white"
        v-model="dialect"
      >
        <option value="none" selected disabled hidden>Vyberte dialekt</option>
        <option value="BC">BC</option>
        <option value="BE">BE</option>
        <option value="BlBh">BlBh</option>
        <option value="BhBl">BhBl</option>
        <option value="XB">XB</option>
      </select>
      <button @click="addDialect" class="button-secondary">Přidat dialekt</button>
      <ul class="flex flex-col gap-y-2">
        <li v-for="(addedDialect, index) in uploadStore.dialects" :key="index" class="flex flex-row gap-x-2">
          <p>{{ addedDialect }}</p>
        </li>
      </ul>
    </div>
    <p class="flex flex-col text-gray-500 max-w-96">
      <span>Před tím, než nahrávku odešlete, zkontrolujte, zda je vše v pořádku. Pokud je vše v pořádku, klikněte na tlačítko "Nahrát". Pokud chcete nahrávku upravit, klikněte na šipku Zpět v horní části tohoto okna a vraťte se k předchozímu kroku.</span>
    </p>
    <button @click="uploadStore.nextStage" class="primary p-2 w-full">
      Nahrát
    </button>
  </div>
</template>
