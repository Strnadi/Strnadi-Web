import { describe, expect, it } from 'vitest';
import {
  ACCESS_TOKEN_TYPE,
  createProjectTokenExchangeParameters,
  TOKEN_EXCHANGE_GRANT
} from './auth';

describe('OAuth token exchange', () => {
  it('identifies the subject token as an access token', () => {
    const parameters = createProjectTokenExchangeParameters(
      'identity-access-token',
      'a09c83a7-ecb3-4434-9685-002c428c2325'
    );

    expect(parameters.get('grant_type')).toBe(TOKEN_EXCHANGE_GRANT);
    expect(parameters.get('subject_token')).toBe('identity-access-token');
    expect(parameters.get('subject_token_type')).toBe(ACCESS_TOKEN_TYPE);
    expect(parameters.get('project_id')).toBe(
      'a09c83a7-ecb3-4434-9685-002c428c2325'
    );
  });
});
