import * as jose from 'jose'
import { reactive } from 'vue'
import type { User, JWTObject } from '@/api/account'
import { getCurrentUserInfo } from '@/api/account';
import { posthogInstance } from '@/plugins/vue/posthog';
import persist from "@/vendor/persist";

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

    posthogInstance.reset();
  }
});

persist(accountStore, {
  syncCallback: (store) => {
    if (store.token_object) {
      const now = Math.floor(Date.now() / 1000);
      const exp = store.token_object.exp;

      if (exp && exp < now) {
        store.logout();
      }
    }
  }
});
