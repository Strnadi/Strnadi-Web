<script setup vapor lang="ts">
import { watch } from 'vue';
import { initializeProjects, projectStore, selectProject } from '@/state/ProjectStore';
import { authorizationState, dismissAuthorizationError } from '@/services/authorizationPopup';
import { accountStore } from '@/state/AccountStore';
import { consentStore } from '@/state/ConsentStore';

const retry = async () => {
  await initializeProjects();
  if (projectStore.current) window.location.reload();
};

// An unaccepted required document strips every role and permission from the
// project token, so the user has to be told rather than left wondering why
// their screens vanished.
watch(
  () => accountStore.identityToken,
  (token) => {
    if (token) void consentStore.load();
  },
  { immediate: true }
);
</script>

<template>
  <!-- Signing in happens in a popup, so a failure has no page to report on. -->
  <div v-if="authorizationState.error" class="auth-error" role="alert">
    <span>{{ authorizationState.error }}</span>
    <button type="button" aria-label="Zavřít" @click="dismissAuthorizationError">
      &times;
    </button>
  </div>

  <RouterLink
    v-if="consentStore.outstanding.length"
    to="/ucet/sprava/souhlasy"
    class="consent-banner"
  >
    {{ consentStore.outstanding.length }}× souhlas čeká na potvrzení – bez něj
    nemáte přístup ke svým oprávněním.
  </RouterLink>

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
.consent-banner {
  position: fixed;
  z-index: 9999;
  bottom: 1rem;
  left: 50%;
  display: block;
  max-width: min(36rem, calc(100vw - 2rem));
  transform: translateX(-50%);
  border: 1px solid #fcd34d;
  border-radius: 0.75rem;
  background: #fffbeb;
  padding: 0.75rem 1rem;
  color: #92400e;
  box-shadow: 0 10px 30px rgba(62, 51, 20, 0.18);
}

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
