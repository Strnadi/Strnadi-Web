import axios from 'axios';
import { reactive } from 'vue';
import { getProjects, type Project } from '@/api/projects';

const STORAGE_KEY = 'strnadi.project-id.v1';
const defaultProject: Project = {
  id: import.meta.env.VITE_PROJECT_ID || '',
  name: 'Nářečí českých strnadů',
  description: null,
  domain: import.meta.env.VITE_PUBLIC_URL.replace(/\/+$/, ''),
  apiUrl: import.meta.env.VITE_API_URL.replace(/\/+$/, ''),
  logoUrl: null
};

export const projectStore = reactive({
  current: defaultProject,
  projects: [defaultProject] as Project[],
  loading: true,
  error: null as string | null
});

export const resolveCurrentProject = (
  projects: Project[],
  currentOrigin: string,
  savedId: string | null
): Project =>
  projects.find(
    (project) =>
      project.domain && new URL(project.domain).origin === currentOrigin
  ) ??
  projects.find((project) => project.id === savedId) ??
  projects.find((project) => project.id === defaultProject.id) ??
  defaultProject;

export const initializeProjects = async (): Promise<void> => {
  try {
    const projects = await getProjects();
    if (!projects.length) throw new Error('No projects with API URLs');
    projectStore.projects = projects.some(
      (project) => project.id === defaultProject.id
    )
      ? projects
      : [defaultProject, ...projects];
    const savedId = window.localStorage.getItem(STORAGE_KEY);
    projectStore.current = resolveCurrentProject(
      projectStore.projects,
      window.location.origin,
      savedId
    );
    projectStore.error = null;
  } catch {
    projectStore.projects = [defaultProject];
    projectStore.current = defaultProject;
    projectStore.error = 'Projekty se nepodařilo načíst.';
  } finally {
    axios.defaults.baseURL = projectStore.current.apiUrl;
    projectStore.loading = false;
  }
};

export const selectProject = (project: Project): void => {
  if (project.id === projectStore.current.id) return;
  if (!projectStore.projects.some((item) => item.id === project.id)) return;
  window.localStorage.setItem(STORAGE_KEY, project.id);
  window.location.assign(project.domain || '/');
};
