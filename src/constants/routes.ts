import type { RouteRecordRaw } from "vue-router";

const AccountRoutes: RouteRecordRaw[] = [
  {
    path: '/ucet',
    components: {
      side: () => import('@/views/profile/Profile.vue')
    },
  },
  {
    path: '/ucet/prihlaseni',
    components: {
      popup: () => import('@/views/Login.vue')
    },
  },
  {
    path: '/ucet/registrace',
    components: {
      popup: () => import('@/views/register/Register.vue')
    }
  },
  {
    path: '/ucet/osobni-udaje',
    components: {
      side: () => import('@/views/profile/PersonalDetails.vue')
    },
  },
  {
    path: '/ucet/moje-nahravky',
    components: {
      side: () => import('@/views/profile/MyRecordings.vue')
    },
  },
  {
    path: '/ucet/email-verifikovan',
    components: {
      popup: () => import('@/views/EmailVerified.vue')
    },
  },
  {
    path: '/ucet/email-neverifikovan',
    components: {
      popup: () => import('@/views/EmailNotVerified.vue')
    },
  },
  {
    path: '/ucet/zapomenute-heslo',
    components: {
      popup: () => import('@/views/ForgottenPassword.vue')
    },
  },
  {
    path: '/ucet/smazat',
    components: {
      popup: () => import('@/views/profile/DeleteAccount.vue')
    },
  }
];

const TextRoutes: RouteRecordRaw[] = [
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
    path: '/kde-nahravat',
    components: {
      side: () => import('@/texts/where-to-record.md')
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
    path: '/o-nas',
    components: {
      side: () => import('@/texts/about-us.md')
    }
  },
  {
    path: '/podporuji-nas',
    components: {
      side: () => import('@/texts/supporters.md')
    }
  },
  {
    path: '/aplikace',
    components: {
      popup: () => import('@/texts/application.md')
    }
  }
];

const MapRoutes: RouteRecordRaw[] = [
  {
    path: '/mapa/legenda',
    components: {
      popup: () => import('@/views/MapLegend.vue')
    }
  }
];

const UploadRoutes: RouteRecordRaw[] = [
  {
    path: '/nahrat',
    components: {
      center: () => import('@/views/upload/Upload.vue')
    },
  },
  {
    path: '/nahravka/:id',
    components: {
      side: () => import('@/views/Recording.vue')
    },
  }
];

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    components: {
      "non-existent-component": { render: () => null }
    }
  },
  {
    path: '/vitejte',
    components: {
      popup: () => import('@/views/IntroScreen.vue')
    }
  },

  ...TextRoutes,
  ...AccountRoutes,
  ...MapRoutes,
  ...UploadRoutes,

  {
    path: "/:pathMatch(.*)*",
    components: {
      popup: () => import('@/texts/not-found.md')
    }
  }
];
