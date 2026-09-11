const AUTHORIZATION_STORAGE_PREFIX = 'strnadi.authorization.';
const MAX_TRANSACTION_AGE_MS = 10 * 60 * 1000;

export interface AuthorizationTransaction {
  codeVerifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
}

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
};

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const randomToken = (): string => base64UrlEncode(randomBytes(32));

const normalizeReturnTo = (returnTo: string): string =>
  returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';

/** Creates the one-use state and PKCE values that survive the authorization redirect. */
export const createAuthorizationTransaction = async (
  redirectUri: string,
  returnTo: string
): Promise<{ state: string; codeChallenge: string }> => {
  const state = randomToken();
  // RFC 7636 permits 43-128 characters. 64 random bytes produce 86 characters.
  const codeVerifier = base64UrlEncode(randomBytes(64));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  );
  const transaction: AuthorizationTransaction = {
    codeVerifier,
    redirectUri,
    returnTo: normalizeReturnTo(returnTo),
    createdAt: Date.now()
  };

  sessionStorage.setItem(
    `${AUTHORIZATION_STORAGE_PREFIX}${state}`,
    JSON.stringify(transaction)
  );

  return {
    state,
    codeChallenge: base64UrlEncode(new Uint8Array(digest))
  };
};

/** Reads and immediately removes a PKCE transaction, preventing code replay. */
export const consumeAuthorizationTransaction = (
  state: string
): AuthorizationTransaction => {
  const key = `${AUTHORIZATION_STORAGE_PREFIX}${state}`;
  const stored = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);

  if (!stored) throw new Error('Přihlašovací relace chybí nebo vypršela.');

  let transaction: AuthorizationTransaction;
  try {
    transaction = JSON.parse(stored) as AuthorizationTransaction;
  } catch {
    throw new Error('Přihlašovací relace je neplatná.');
  }

  if (
    typeof transaction.codeVerifier !== 'string' ||
    typeof transaction.redirectUri !== 'string' ||
    typeof transaction.returnTo !== 'string' ||
    typeof transaction.createdAt !== 'number'
  ) {
    throw new Error('Přihlašovací relace je neplatná.');
  }
  if (Date.now() - transaction.createdAt > MAX_TRANSACTION_AGE_MS) {
    throw new Error('Přihlašovací relace vypršela.');
  }

  return {
    ...transaction,
    returnTo: normalizeReturnTo(transaction.returnTo)
  };
};
