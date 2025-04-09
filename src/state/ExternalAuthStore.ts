import { reactive } from 'vue'

/* @ts-ignore */
import persist from "vue-reactive-persisted";

export const externalAuthStore = reactive({
  nonce: null as string | null,

  setNonce(nonce: string) {
    this.nonce = nonce;
  }
});

persist(externalAuthStore);
