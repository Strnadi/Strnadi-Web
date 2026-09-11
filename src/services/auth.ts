import { authorizationConfig, getAuthorizationCallbackUri } from '@/api/auth';
import { createAuthorizationTransaction } from '@/utils/oauth';

export const beginAuthorization = async (
  returnTo = '/',
  callbackPath = '/ucet/prihlaseni',
  registration = false
): Promise<void> => {
  if (!authorizationConfig.baseUrl) {
    throw new Error('Chybí adresa autorizačního serveru.');
  }
  if (!authorizationConfig.projectId) {
    throw new Error('Chybí konfigurace VITE_PROJECT_ID.');
  }

  const redirectUri = getAuthorizationCallbackUri(callbackPath);
  console.log(redirectUri)
  const { state, codeChallenge } = await createAuthorizationTransaction(
    redirectUri,
    returnTo
  );
  const authorizeUrl = new URL(
    `${authorizationConfig.baseUrl}/connect/authorize`
  );

  authorizeUrl.searchParams.set('client_id', authorizationConfig.clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);
  if (authorizationConfig.scope) {
    authorizeUrl.searchParams.set('scope', authorizationConfig.scope);
  }

  if (registration) {
    const registrationUrl = new URL(
      `${authorizationConfig.baseUrl}/account/register`
    );
    registrationUrl.searchParams.set(
      'returnUrl',
      `${authorizeUrl.pathname}${authorizeUrl.search}`
    );
    window.location.assign(registrationUrl.toString());
    return;
  }

  window.location.assign(authorizeUrl.toString());
};
