import axios from 'axios';

export const AUTHORIZATION_CODE_GRANT = 'authorization_code';
export const REFRESH_TOKEN_GRANT = 'refresh_token';
export const TOKEN_EXCHANGE_GRANT =
  'urn:ietf:params:oauth:grant-type:token-exchange';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string;
  scope: string | null;
}

interface WireTokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
}

const authorizationBaseUrl = (import.meta.env.VITE_AUTH_URL || '').replace(
  /\/+$/,
  ''
);

export const authorizationConfig = {
  baseUrl: authorizationBaseUrl,
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID || 'strnadi-app',
  projectId: import.meta.env.VITE_PROJECT_ID,
  scope: import.meta.env.VITE_AUTH_SCOPE || 'offline_access'
};

export const getAuthorizationCallbackUri = (
  callbackPath = '/ucet/prihlaseni'
): string => new URL(callbackPath, window.location.origin).toString();

const parseTokenResponse = (value: WireTokenResponse): TokenResponse => {
  if (typeof value.access_token !== 'string' || !value.access_token) {
    throw new Error('Autorizační server nevrátil access token.');
  }

  return {
    accessToken: value.access_token,
    refreshToken:
      typeof value.refresh_token === 'string' ? value.refresh_token : null,
    expiresIn: typeof value.expires_in === 'number' ? value.expires_in : null,
    tokenType:
      typeof value.token_type === 'string' ? value.token_type : 'Bearer',
    scope: typeof value.scope === 'string' ? value.scope : null
  };
};

const postToken = async (
  parameters: URLSearchParams
): Promise<TokenResponse> => {
  const response = await axios.post<WireTokenResponse>(
    `${authorizationConfig.baseUrl}/connect/token`,
    parameters,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );

  return parseTokenResponse(response.data);
};

export const exchangeAuthorizationCode = (
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenResponse> =>
  postToken(
    new URLSearchParams({
      grant_type: AUTHORIZATION_CODE_GRANT,
      client_id: authorizationConfig.clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
    })
  );

export const exchangeProjectToken = (
  subjectToken: string
): Promise<TokenResponse> => {
  if (!authorizationConfig.projectId) {
    throw new Error('Chybí konfigurace VITE_PROJECT_ID.');
  }

  return postToken(
    new URLSearchParams({
      grant_type: TOKEN_EXCHANGE_GRANT,
      client_id: authorizationConfig.clientId,
      subject_token: subjectToken,
      project_id: authorizationConfig.projectId
    })
  );
};

export const refreshAccessToken = (
  refreshToken: string
): Promise<TokenResponse> =>
  postToken(
    new URLSearchParams({
      grant_type: REFRESH_TOKEN_GRANT,
      client_id: authorizationConfig.clientId,
      refresh_token: refreshToken
    })
  );
