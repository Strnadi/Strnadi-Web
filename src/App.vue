<script setup vapor lang="ts">
import { initializeProjects, projectStore, selectProject } from '@/state/ProjectStore';

const retry = async () => {
  await initializeProjects();
  if (projectStore.current) window.location.reload();
};
</script>

<template>
  <router-view v-if="projectStore.current" />
  <main v-else class="flex min-h-svh flex-col items-center justify-center gap-5 bg-[#fdfcdc] p-6 text-center">
    <h1 class="text-2xl font-bold">Vyberte projekt</h1>
    <p v-if="projectStore.loading" role="status">Načítání projektů…</p>
    <p v-else-if="projectStore.error" role="alert">{{ projectStore.error }}</p>
    <ul v-if="projectStore.projects.length" class="flex w-full max-w-sm flex-col gap-2">
      <li v-for="project in projectStore.projects" :key="project.id">
        <button type="button" class="w-full rounded-xl bg-white px-5 py-3 font-semibold shadow"
          @click="selectProject(project)">
          {{ project.name }}
        </button>
      </li>
    </ul>
    <button v-if="projectStore.error" type="button" class="rounded-xl border px-5 py-2"
      @click="retry">
      Zkusit znovu
    </button>
  </main>
</template>
