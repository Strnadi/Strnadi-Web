import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { getProjects, getUserProjectIds } from './projects';
import { resolveCurrentProject } from '@/state/ProjectStore';
import { authorizationConfig } from './auth';

afterEach(() => vi.restoreAllMocks());

describe('getProjects', () => {
  it('maps apiDomain to apiUrl and drops projects without one', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: [
        {
          id: 'no-api',
          name: 'Strnadi',
          description: null,
          domain: 'https://strnadi.example.test',
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
        id: 'second-project',
        name: 'Cvrcci',
        description: 'Project description',
        domain: 'https://cvrcci.example.test',
        apiUrl: 'https://api.example.test',
        logoUrl: null
      }
    ]);
  });

  it('selects the project whose domain matches the current origin', async () => {
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
    expect(resolveCurrentProject(projects, 'https://second.example.test')?.id)
      .toBe('second');
    expect(resolveCurrentProject(projects, 'http://localhost:5173')).toBeNull();
  });
});

describe('getUserProjectIds', () => {
  it('returns the ids of the projects the user belongs to', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({
      data: [
        { id: 'first', name: 'First', description: null, domain: 'https://a.test', apiDomain: null },
        { id: 'second', name: 'Second', description: null, domain: 'https://b.test', apiDomain: null },
        { id: 'first', name: 'First', description: null, domain: 'https://a.test', apiDomain: null }
      ]
    });

    expect(await getUserProjectIds('user-id', 'identity-token')).toEqual([
      'first',
      'second'
    ]);
    expect(get).toHaveBeenCalledWith(
      `${authorizationConfig.baseUrl}/users/user-id/projects`,
      {
        headers: { Authorization: 'Bearer identity-token' },
        timeout: 10000
      }
    );
  });

  it('rejects a response that is not a list', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { projects: [] } });
    await expect(getUserProjectIds('user-id', 'token')).rejects.toThrow(
      'Invalid user projects response'
    );
  });
});
