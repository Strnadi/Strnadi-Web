import axios, { type AxiosRequestConfig } from 'axios';
import { authorizationConfig } from '@/api/auth';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  domain: string;
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
  const apiUrl = projectUrl(item['apiDomain']);
  const domain = projectUrl(item['domain']);
  if (typeof id !== 'string' || typeof name !== 'string' || !apiUrl || !domain)
    return null;

  return {
    id,
    name,
    description:
      typeof item['description'] === 'string' ? item['description'] : null,
    domain,
    apiUrl,
    logoUrl: projectUrl(item['logoUrl'] ?? item['logo'])
  };
};

export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get<unknown>(
    `${authorizationConfig.baseUrl}/projects`,
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

/** Administration `ProjectResponse` as returned for a user's memberships. */
interface UserProjectResponse {
  id: string;
  name: string;
  description: string | null;
  domain: string;
  apiDomain: string | null;
}

/**
 * The projects a user belongs to. Anyone may look up their own; someone else's
 * needs a directory permission.
 */
export const getUserProjects = async (
  userId: string,
  identityToken: string
): Promise<UserProjectResponse[]> => {
  const response = await axios.get<UserProjectResponse[]>(
    `${authorizationConfig.baseUrl}/users/${encodeURIComponent(userId)}/projects`,
    {
      headers: { Authorization: `Bearer ${identityToken}` },
      timeout: 10000
    }
  );
  if (!Array.isArray(response.data))
    throw new Error('Invalid user projects response');
  return response.data;
};

export const getUserProjectIds = async (
  userId: string,
  identityToken: string
): Promise<string[]> => [
  ...new Set(
    (await getUserProjects(userId, identityToken))
      .map((project) => project.id)
      .filter((id): id is string => typeof id === 'string')
  )
];

/** Administration `ProjectMemberResponse`. */
export interface ProjectMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleNames: string[];
}

const identityRequest = (identityToken: string): AxiosRequestConfig => ({
  headers: { Authorization: `Bearer ${identityToken}` },
  timeout: 10000
});

export const getProjectMembers = async (
  projectId: string,
  identityToken: string
): Promise<ProjectMember[]> => {
  const response = await axios.get<ProjectMember[]>(
    `${authorizationConfig.baseUrl}/projects/${encodeURIComponent(projectId)}/members`,
    identityRequest(identityToken)
  );
  return response.data;
};

/**
 * Adds an existing user to the project by email, optionally granting a first
 * role in the same call.
 */
export const joinProject = async (
  projectId: string,
  identityToken: string,
  request: { email: string; roleId?: string | null }
): Promise<void> => {
  await axios.post(
    `${authorizationConfig.baseUrl}/projects/${encodeURIComponent(projectId)}/members`,
    { email: request.email, roleId: request.roleId ?? null },
    identityRequest(identityToken)
  );
};

/** Removes a user from the project - membership row and every role they hold. */
export const removeProjectMember = async (
  projectId: string,
  userId: string,
  identityToken: string
): Promise<void> => {
  await axios.delete(
    `${authorizationConfig.baseUrl}/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
    identityRequest(identityToken)
  );
};
