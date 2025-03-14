import type { RouteRecordRaw } from "vue-router";

import VueMarkdown from 'vue-markdown-render';
import Login from '@/views/Login.vue';
import Register from '@/views/register/Register.vue'

import termsOfServices from '@/assets/texts/terms-of-services.md?raw';
import gdpr from '@/assets/texts/gdpr.md?raw';
import howToRecord from '@/assets/texts/how-to-record.md?raw';
import aboutBird from '@/assets/texts/about-bird.md?raw';
import aboutProject from '@/assets/texts/about-project.md?raw';
import application from '@/assets/texts/application.md?raw';
import Upload from "./views/upload/Upload.vue";

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    components: {}
  },
  {
    path: '/auth/login',
    components: {
      popup: Login
    },
  },
  {
    path: '/auth/register',
    components: {
      popup: Register
    }
  },
  {
    path: '/nahrat',
    components: {
      center: Upload
    },
  },
  {
    path: '/podminky-pouzivani',
    components: {
      center: VueMarkdown
    },
    props: {
      center: {
        source: termsOfServices
      }
    }
  },
  {
    path: '/ochrana-osobnich-udaju',
    components: {
      center: VueMarkdown
    },
    props: {
      center: {
        source: gdpr
      }
    }
  },
  {
    path: '/jak-nahravat',
    components: {
      side: VueMarkdown
    },
    props: {
      side: {
        source: howToRecord
      }
    }
  },
  {
    path: '/o-projektu',
    components: {
      side: VueMarkdown
    },
    props: {
      side: {
        source: aboutProject
      }
    }
  },
  {
    path: '/o-strnadovi',
    components: {
      side: VueMarkdown
    },
    props: {
      side: {
        source: aboutBird
      }
    }
  },
]
