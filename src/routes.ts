import type { RouteRecordRaw } from "vue-router";

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    components: {
      "non-existent-component": { render: () => null }
    }
  },
  {
    path: '/email-verifikovan',
    components: {
      popup: () => import('@/views/EmailVerified.vue')
    },
  },
  {
    path: '/login',
    components: {
      popup: () => import('@/views/Login.vue')
    },
  },
  {
    path: '/registrace',
    components: {
      popup: () => import('@/views/register/Register.vue')
    }
  },
  {
    path: '/nastaveni-mapy',
    components: {
      popup: () => import('@/views/MapOptions.vue')
    }
  },
  {
    path: '/legenda-mapy',
    components: {
      popup: () => import('@/views/MapLegend.vue')
    }
  },
  {
    path: '/nahrat',
    components: {
      center: () => import('@/views/upload/Upload.vue')
    },
  },
  {
    path: '/podminky-pouziti',
    components: {
      center: () => import('@/texts/terms-of-services.md')
    }
  },
  {
    path: '/ochrana-osobnich-udaju',
    components: {
      center: () => import('@/texts/gdpr.md')
    }
  },
  {
    path: '/jak-nahravat',
    components: {
      side: () => import('@/texts/how-to-record.md')
    }
  },
  {
    path: '/o-projektu',
    components: {
      side: () => import('@/texts/about-project.md')
    }
  },
  {
    path: '/o-strnadovi',
    components: {
      side: () => import('@/texts/about-bird.md')
    }
  },
  {
    path: '/aplikace',
    components: {
      popup: () => import('@/texts/application.md')
    }
  },
  {
    path: "/:pathMatch(.*)*",
    components: {
      popup: () => import('@/texts/not-found.md')
    }
  }
]
