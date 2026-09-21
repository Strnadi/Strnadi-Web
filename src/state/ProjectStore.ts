import axios from 'axios';
import { reactive } from 'vue';
import { getProjects, type Project } from '@/api/projects';

export const projectStore = reactive({
  current: null as Project | null,
  projects: [] as Project[],
  loading: true,
  error: null as string | null
});

export const resolveCurrentProject = (
  projects: Project[],
  currentOrigin: string
): Project | null =>
  projects.find((project) => new URL(project.domain).origin === currentOrigin) ??
  null;

export const getCurrentProject = (): Project => {
  if (!projectStore.current) {
    throw new Error('Pro tento web není nakonfigurován projekt.');
  }
  return projectStore.current;
};

export const initializeProjects = async (): Promise<void> => {
  projectStore.loading = true;
  try {
    projectStore.projects = await getProjects();
    projectStore.current = resolveCurrentProject(
      projectStore.projects,
      window.location.origin
    );
    projectStore.error = projectStore.current
      ? null
      : 'Pro tuto doménu nebyl nalezen projekt. Vyberte projekt ze seznamu.';
    axios.defaults.baseURL = projectStore.current?.apiUrl;
  } catch {
    projectStore.current = null;
    projectStore.projects = [];
    projectStore.error = 'Projekty se nepodařilo načíst.';
    axios.defaults.baseURL = undefined;
  } finally {
    projectStore.loading = false;
  }
};

export const selectProject = (project: Project): void => {
  if (project.id === projectStore.current?.id) return;
  if (!projectStore.projects.some((item) => item.id === project.id)) return;
  window.location.assign(project.domain);
};
