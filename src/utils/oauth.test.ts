import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeAuthorizationTransaction,
  createAuthorizationTransaction
} from './oauth';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('PKCE authorization transaction', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', new MemoryStorage());
  });

  it('creates an S256 challenge and consumes the transaction once', async () => {
    const redirectUri = 'https://strnadi.cz/ucet/prihlaseni';
    const { state, codeChallenge } = await createAuthorizationTransaction(
      redirectUri,
      '/mapa/nahrat?draft=1'
    );
    const transaction = consumeAuthorizationTransaction(state);
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(transaction.codeVerifier)
    );
    const expectedChallenge = btoa(
      String.fromCharCode(...new Uint8Array(digest))
    )
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');

    expect(transaction.redirectUri).toBe(redirectUri);
    expect(transaction.returnTo).toBe('/mapa/nahrat?draft=1');
    expect(transaction.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(codeChallenge).toBe(expectedChallenge);
    expect(() => consumeAuthorizationTransaction(state)).toThrow(
      'Přihlašovací relace chybí nebo vypršela.'
    );
  });

  it('does not retain an external return URL', async () => {
    const { state } = await createAuthorizationTransaction(
      'https://strnadi.cz/ucet/prihlaseni',
      'https://example.com/phishing'
    );

    expect(consumeAuthorizationTransaction(state).returnTo).toBe('/');
  });
});
