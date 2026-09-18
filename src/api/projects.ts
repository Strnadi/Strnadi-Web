import axios from 'axios';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  apiUrl: string;
  logoUrl: string | null;
}

const projectUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.href.replace(/\/+$/, '');
  } catch {
    return null;
  }
};

const parseProject = (value: unknown): Project | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const id = item['id'] ?? item['projectId'];
  const name = item['name'] ?? item['projectName'];
  // /projects uses apiDomain; the default project's apiDomain may be null.
  const apiUrl =
    projectUrl(
      item['apiDomain'] ??
        item['apiUrl'] ??
        item['apiBaseUrl'] ??
        item['tenantApiUrl'] ??
        item['tenantApiBaseUrl']
    ) ??
    (id === import.meta.env.VITE_PROJECT_ID
      ? projectUrl(import.meta.env.VITE_API_URL)
      : null);
  if (typeof id !== 'string' || typeof name !== 'string' || !apiUrl)
    return null;

  return {
    id,
    name,
    description:
      typeof item['description'] === 'string' ? item['description'] : null,
    domain:
      projectUrl(item['domain']) ??
      (id === import.meta.env.VITE_PROJECT_ID
        ? projectUrl(import.meta.env.VITE_PUBLIC_URL)
        : null),
    apiUrl,
    logoUrl: projectUrl(item['logoUrl'] ?? item['logo'])
  };
};

export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get<unknown>(
    `${(import.meta.env.VITE_AUTH_URL || '').replace(/\/+$/, '')}/projects`,
    { timeout: 10000 }
  );
  const data = response.data;
  const items = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : [];
  return items
    .map(parseProject)
    .filter((project): project is Project => !!project);
};

const membershipProjectId = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const project = item['project'];
  const id =
    item['projectId'] ??
    (project && typeof project === 'object'
      ? (project as Record<string, unknown>)['id']
      : project) ??
    item['id'];
  return typeof id === 'string' ? id : null;
};

export const getUserProjectIds = async (
  userId: string,
  identityToken: string
): Promise<string[]> => {
  const response = await axios.get<unknown>(
    `${(import.meta.env.VITE_AUTH_URL || '').replace(/\/+$/, '')}/users/${encodeURIComponent(userId)}/projects`,
    {
      headers: { Authorization: `Bearer ${identityToken}` },
      timeout: 10000
    }
  );
  const data = response.data;
  const items = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((data as { items?: unknown; projects?: unknown }).items ??
        (data as { projects?: unknown }).projects)
      : null;
  if (!Array.isArray(items)) throw new Error('Invalid user projects response');
  return [
    ...new Set(
      items.map(membershipProjectId).filter((id): id is string => !!id)
    )
  ];
};
