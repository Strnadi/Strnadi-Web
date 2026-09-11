import * as jose from 'jose';
import { reactive } from 'vue';
import type { User, JWTObject } from '@/api/account';
import { getCurrentUserInfo } from '@/api/account';
import {
  authorizationConfig,
  exchangeAuthorizationCode,
  exchangeProjectToken,
  refreshAccessToken,
  type TokenResponse
} from '@/api/auth';
import { posthogInstance } from '@/plugins/vue/posthog';

const REFRESH_TOKEN_STORAGE_KEY = 'strnadi.refresh-token.v1';
const LEGACY_ACCOUNT_STORAGE_KEY = 'strnadi.account.v2';
const REFRESH_WINDOW_MS = 60 * 1000;

type AuthenticationStatus =
  'initializing' | 'authenticated' | 'anonymous' | 'error';

let refreshTimer: number | null = null;
let activeRefresh: Promise<void> | null = null;

const getExpiry = (token: string, expiresIn: number | null): number | null => {
  try {
    const payload = jose.decodeJwt(token);
    if (payload.exp) return payload.exp * 1000;
  } catch {
    // OAuth access tokens are allowed to be opaque; expires_in is the fallback.
  }

  return expiresIn === null ? null : Date.now() + expiresIn * 1000;
};

const clearRefreshTimer = () => {
  if (refreshTimer !== null) window.clearTimeout(refreshTimer);
  refreshTimer = null;
};

const persistRefreshToken = (refreshToken: string | null) => {
  if (refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  } else {
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
};

export const accountStore = reactive({
  /** Project-audience token used exclusively for Tenant.Api calls. */
  token: null as string | null,
  /** Administration access token used only as subject_token and for refresh. */
  identityToken: null as string | null,
  refreshToken: null as string | null,
  user: null as User | null,
  token_object: null as JWTObject | null,
  status: 'initializing' as AuthenticationStatus,
  initializationError: null as string | null,
  identityTokenExpiresAt: null as number | null,
  projectTokenExpiresAt: null as number | null,

  async applyOAuthTokens(
    identityTokens: TokenResponse,
    fallbackRefreshToken: string | null = null
  ) {
    const projectTokens = await exchangeProjectToken(
      identityTokens.accessToken
    );
    const user = await getCurrentUserInfo(projectTokens.accessToken);
    const decoded = jose.decodeJwt<JWTObject>(projectTokens.accessToken);
    const refreshToken = identityTokens.refreshToken ?? fallbackRefreshToken;

    this.identityToken = identityTokens.accessToken;
    this.identityTokenExpiresAt = getExpiry(
      identityTokens.accessToken,
      identityTokens.expiresIn
    );
    this.token = projectTokens.accessToken;
    this.projectTokenExpiresAt = getExpiry(
      projectTokens.accessToken,
      projectTokens.expiresIn
    );
    this.token_object = decoded;
    this.refreshToken = refreshToken;
    this.user = user;
    this.status = 'authenticated';
    this.initializationError = null;
    persistRefreshToken(refreshToken);

    // Never send email/name to analytics. Analytics remains opted out until
    // an explicit analytics-consent control is added.
    posthogInstance?.identify(`${user.id}`);
    this.scheduleRefresh();
  },

  async loginWithAuthorizationCode(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ) {
    const identityTokens = await exchangeAuthorizationCode(
      code,
      codeVerifier,
      redirectUri
    );
    if (!identityTokens.refreshToken) {
      throw new Error('Autorizační server nevrátil refresh token.');
    }
    await this.applyOAuthTokens(identityTokens);
  },

  scheduleRefresh() {
    clearRefreshTimer();
    if (!this.refreshToken) return;

    const expiries = [
      this.identityTokenExpiresAt,
      this.projectTokenExpiresAt
    ].filter((expiry): expiry is number => expiry !== null);
    if (!expiries.length) return;

    const nextExpiry = Math.min(...expiries);
    const delay = Math.max(0, nextExpiry - Date.now() - REFRESH_WINDOW_MS);
    refreshTimer = window.setTimeout(() => {
      void this.refresh().catch(() => {
        // refresh() clears the invalid session and exposes the error in the store.
      });
    }, delay);
  },

  async refresh() {
    if (activeRefresh) return activeRefresh;
    if (!this.refreshToken)
      throw new Error('Obnovovací token není k dispozici.');

    const refreshToken = this.refreshToken;
    activeRefresh = (async () => {
      try {
        const identityTokens = await refreshAccessToken(refreshToken);
        await this.applyOAuthTokens(identityTokens, refreshToken);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Obnovení relace selhalo.';
        this.logout();
        this.initializationError = message;
        this.status = 'error';
        throw error;
      } finally {
        activeRefresh = null;
      }
    })();

    return activeRefresh;
  },

  logout() {
    clearRefreshTimer();
    this.user = null;
    this.token = null;
    this.identityToken = null;
    this.refreshToken = null;
    this.token_object = null;
    this.identityTokenExpiresAt = null;
    this.projectTokenExpiresAt = null;
    this.status = 'anonymous';
    persistRefreshToken(null);
    sessionStorage.removeItem(LEGACY_ACCOUNT_STORAGE_KEY);
    posthogInstance?.reset();
  },

  logoutFromIdentityProvider() {
    this.logout();
    if (!authorizationConfig.baseUrl) {
      window.location.assign('/');
      return;
    }
    const logoutUrl = new URL(`${authorizationConfig.baseUrl}/connect/logout`);
    logoutUrl.searchParams.set('redirect_uri', window.location.origin);
    window.location.assign(logoutUrl.toString());
  },

  async initialize() {
    this.status = 'initializing';
    this.initializationError = null;
    sessionStorage.removeItem(LEGACY_ACCOUNT_STORAGE_KEY);
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

    if (!refreshToken) {
      this.logout();
      return;
    }

    this.refreshToken = refreshToken;
    try {
      await this.refresh();
    } catch {
      // refresh() owns the public error state.
    }
  }
});

// Initialization must start only after main.ts configures the Tenant.Api base URL.
export const initializeAccount = (): Promise<void> => accountStore.initialize();
