import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { getProjects, getUserProjectIds } from './projects';
import { resolveCurrentProject } from '@/state/ProjectStore';

afterEach(() => vi.restoreAllMocks());

describe('getProjects', () => {
  it('uses apiDomain and the configured URL for the default project', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: [
        {
          id: import.meta.env.VITE_PROJECT_ID,
          name: 'Strnadi',
          description: null,
          domain: import.meta.env.VITE_PUBLIC_URL,
          apiDomain: null
        },
        {
          id: 'second-project',
          name: 'Cvrcci',
          description: 'Project description',
          domain: 'https://cvrcci.example.test/',
          apiDomain: 'https://api.example.test/'
        }
      ]
    });

    expect(await getProjects()).toEqual([
      {
        id: import.meta.env.VITE_PROJECT_ID,
        name: 'Strnadi',
        description: null,
        domain: import.meta.env.VITE_PUBLIC_URL,
        apiUrl: import.meta.env.VITE_API_URL,
        logoUrl: null
      },
      {
        id: 'second-project',
        name: 'Cvrcci',
        description: 'Project description',
        domain: 'https://cvrcci.example.test',
        apiUrl: 'https://api.example.test',
        logoUrl: null
      }
    ]);
  });

  it('selects the project for the current domain before a saved choice', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: [
        {
          id: 'first',
          name: 'First',
          domain: 'https://first.example.test',
          apiDomain: 'https://api.first.example.test'
        },
        {
          id: 'second',
          name: 'Second',
          domain: 'https://second.example.test',
          apiDomain: 'https://api.second.example.test'
        }
      ]
    });

    const projects = await getProjects();
    expect(
      resolveCurrentProject(projects, 'https://second.example.test', 'first').id
    ).toBe('second');
    expect(
      resolveCurrentProject(projects, 'http://localhost:5173', 'first').id
    ).toBe('first');
  });
});

describe('getUserProjectIds', () => {
  it('extracts project ids from membership records', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({
      data: [
        { projectId: 'first' },
        { project: { id: 'second' } },
        { id: 'third' },
        'first'
      ]
    });

    expect(await getUserProjectIds('user-id', 'identity-token')).toEqual([
      'first',
      'second',
      'third'
    ]);
    expect(get).toHaveBeenCalledWith(
      `${import.meta.env.VITE_AUTH_URL}/users/user-id/projects`,
      {
        headers: { Authorization: 'Bearer identity-token' },
        timeout: 10000
      }
    );
  });
});
