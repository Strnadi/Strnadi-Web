<script setup vapor lang="ts">
import { initializeProjects, projectStore, selectProject } from '@/state/ProjectStore';
import { authorizationState, dismissAuthorizationError } from '@/services/authorizationPopup';

const retry = async () => {
  await initializeProjects();
  if (projectStore.current) window.location.reload();
};
</script>

<template>
  <!-- Signing in happens in a popup, so a failure has no page to report on. -->
  <div v-if="authorizationState.error" class="auth-error" role="alert">
    <span>{{ authorizationState.error }}</span>
    <button type="button" aria-label="Zavřít" @click="dismissAuthorizationError">
      &times;
    </button>
  </div>

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

<style scoped>
.auth-error {
  position: fixed;
  z-index: 10000;
  top: 1rem;
  left: 50%;
  display: flex;
  max-width: min(32rem, calc(100vw - 2rem));
  transform: translateX(-50%);
  align-items: flex-start;
  gap: 0.75rem;
  border: 1px solid #fecaca;
  border-radius: 0.75rem;
  background: #fef2f2;
  padding: 0.75rem 1rem;
  color: #b91c1c;
  box-shadow: 0 10px 30px rgba(62, 51, 20, 0.18);
}

.auth-error button {
  line-height: 1;
  font-size: 1.25rem;
}
</style>
