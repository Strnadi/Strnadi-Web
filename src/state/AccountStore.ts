
import { reactive } from 'vue'
import type { User, JwtObject } from '@/api/types/auth'
import * as jose from 'jose'
import { getCurrentUserInfo } from '@/api/account';

/* @ts-ignore */
import persist from "vue-reactive-persisted";

export const accountStore = reactive({
  token: null as string | null,
  user: null as User | null,
  token_object: null as JwtObject | null,

  async login(jwt: string) {
    if (!jwt) {
      return;
    }

    const decoded = jose.decodeJwt(jwt) as JwtObject;

    const user = await getCurrentUserInfo(jwt, decoded);

    this.user = user;
    this.token = jwt;
    this.token_object = decoded;
  },

  logout() {
    this.user = null;
    this.token = null;
    this.token_object = null;
  }
});

persist(accountStore);
