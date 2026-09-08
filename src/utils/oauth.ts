import * as jose from 'jose';

const STORAGE_PREFIX = 'strnadi.oauth.';
const MAX_TRANSACTION_AGE_MS = 10 * 60 * 1000;

interface OAuthTransaction {
  nonce: string;
  clientId: string;
  issuer: string;
  createdAt: number;
}

const randomToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
};

export const createOAuthTransaction = (
  clientId: string,
  issuer: string
): { state: string; nonce: string } => {
  const state = randomToken();
  const nonce = randomToken();
  const transaction: OAuthTransaction = {
    nonce,
    clientId,
    issuer,
    createdAt: Date.now()
  };

  sessionStorage.setItem(
    `${STORAGE_PREFIX}${state}`,
    JSON.stringify(transaction)
  );
  return { state, nonce };
};

export const validateOAuthResponse = (state: string, idToken: string) => {
  const key = `${STORAGE_PREFIX}${state}`;
  const stored = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);

  if (!stored) throw new Error('OAuth session is missing or expired');

  let transaction: OAuthTransaction;
  try {
    transaction = JSON.parse(stored) as OAuthTransaction;
  } catch {
    throw new Error('OAuth session is invalid');
  }

  if (Date.now() - transaction.createdAt > MAX_TRANSACTION_AGE_MS) {
    throw new Error('OAuth session has expired');
  }

  const token = jose.decodeJwt(idToken);
  const audiences = Array.isArray(token.aud) ? token.aud : [token.aud];

  if (token['nonce'] !== transaction.nonce) {
    throw new Error('OAuth nonce mismatch');
  }
  if (token.iss !== transaction.issuer) {
    throw new Error('OAuth issuer mismatch');
  }
  if (!audiences.includes(transaction.clientId)) {
    throw new Error('OAuth audience mismatch');
  }
};
