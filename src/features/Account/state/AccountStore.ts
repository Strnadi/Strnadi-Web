import * as jose from 'jose'
import { reactive } from 'vue'
import type { User, JWTObject } from '@/features/Account/api/auth'
import { getCurrentUserInfo } from '@/features/Account/api';
import { posthogInstance } from '@/plugins/posthog'; // Import posthog

/* @ts-ignore */
import persist from "vue-reactive-persisted";

export const accountStore = reactive({
  token: null as string | null,
  user: null as User | null,
  token_object: null as JWTObject | null,

  async login(jwt: string) {
    if (!jwt) {
      return;
    }

    const decoded = jose.decodeJwt<JWTObject>(jwt);
    const user = await getCurrentUserInfo(jwt);

    if(user) {
      this.user = user;
      this.token = jwt;
      this.token_object = decoded;

      posthogInstance.identify(
        `${user.id}`,
        {
          email: user.email,
          name: user.firstName,
          surname: user.lastName
        }
      );  
    }
  },

  logout() {
    this.user = null;
    this.token = null;
    this.token_object = null;

    if (posthogInstance) {
      posthogInstance.reset();
    }
  }
});

persist(accountStore);
