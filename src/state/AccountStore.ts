import * as jose from 'jose';
import { reactive } from 'vue';
import type { User, JWTObject } from '@/api/account';
import { getCurrentUserInfo, getRenewedJWT } from '@/api/account';
import { posthogInstance } from '@/plugins/vue/posthog';
import persist from '@/vendor/persist';

const ACCOUNT_STORAGE_KEY = 'strnadi.account.v2';
const RENEW_WINDOW_SECONDS = 5 * 60;

type AuthenticationStatus =
  | 'initializing'
  | 'authenticated'
  | 'anonymous'
  | 'error';

export const accountStore = reactive({
  token: null as string | null,
  user: null as User | null,
  token_object: null as JWTObject | null,
  status: 'initializing' as AuthenticationStatus,
  initializationError: null as string | null,

  async login(jwt: string) {
    if (!jwt) {
      return;
    }

    try {
      const decoded = jose.decodeJwt<JWTObject>(jwt);
      const user = await getCurrentUserInfo(jwt);

      if (!user) throw new Error('User data is unavailable');
      this.user = user;
      this.token = jwt;
      this.token_object = decoded;
      this.status = 'authenticated';
      this.initializationError = null;

      // Never send email/name to analytics. Analytics remains opted out until
      // an explicit analytics-consent control is added.
      posthogInstance?.identify(`${user.id}`);
    } catch (error) {
      this.logout();
      throw error;
    }
  },

  logout() {
    this.user = null;
    this.token = null;
    this.token_object = null;
    this.status = 'anonymous';

    posthogInstance?.reset();
  },

  async initialize() {
    this.status = 'initializing';
    this.initializationError = null;

    if (!this.token) {
      this.logout();
      return;
    }

    try {
      const decoded = jose.decodeJwt<JWTObject>(this.token);
      const now = Math.floor(Date.now() / 1000);
      const token =
        decoded.exp && decoded.exp - now <= RENEW_WINDOW_SECONDS
          ? await getRenewedJWT(this.token)
          : this.token;
      await this.login(token);
    } catch (error) {
      this.initializationError =
        error instanceof Error ? error.message : 'Session restoration failed';
      this.logout();
      this.status = 'error';
    }
  }
});

persist(accountStore, {
  key: ACCOUNT_STORAGE_KEY,
  storage: window.sessionStorage,
  paths: ['token']
});

export const accountInitialization = accountStore.initialize();
