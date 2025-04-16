import { accountStore } from "@/state/AccountStore";
import type { Router, RouteRecordRaw } from "vue-router";

export function baseRoutes(): RouteRecordRaw[] {
  return [
    {
      path: "/:pathMatch(.*)*",
      components: {
        popup: () => import('@/views/NotFound.md')
      }
    }
  ]
}

export function routes(_router: Router) {
  const guarded = (routes: RouteRecordRaw[], guard: (to?: any, from?: any) => any): RouteRecordRaw[] =>
    routes.map(route => ({
      ...route,
      beforeEnter: [...(Array.isArray(route.beforeEnter) ? route.beforeEnter : (route.beforeEnter ? [route.beforeEnter] : [])), guard]
    }));

  const welcome = ((to?: any) => {
   if(!localStorage.getItem("FirstLaunch")) {
      localStorage.setItem("FirstLaunch", "false");
      return `/vitejte?from=${to.path}`;
    }
  
    return true;
  });
  
  const missingToken = (tokenParam: string) => (to?: any) => {
    if(!to.query[tokenParam]) {
      return false;
    }

    return true;
  }
  
  const LoginRoutes: RouteRecordRaw[] = [
    {
      path: '/ucet/splash',
      components: {
        popup: () => import('@/views/AccountSplash.vue')
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
      path: '/ucet/zapomenute-heslo',
      components: {
        popup: () => import('@/views/ForgottenPassword.vue')
      }
    }
  ];
  
  const AccountRoutes: RouteRecordRaw[] = [
    {
      path: '/ucet',
      components: {
        side: () => import('@/views/profile/Profile.vue')
      },
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
      path: '/ucet/smazat',
      components: {
        popup: () => import('@/views/profile/DeleteAccount.vue')
      },
    }
  ];
  
  const OtherAccountRoutes: RouteRecordRaw[] = [
    {
      path: '/ucet/email-verifikovan',
      components: {
        popup: () => import('@/views/EmailVerified.vue')
      },
    },
    {
      path: '/ucet/email-neverifikovan',
      components: {
        popup: () => import('@/views/EmailVerified.vue')
      },
      props: {
        notVerified: true
      }
    },
    {
      path: '/ucet/reset-hesla',
      components: {
        popup: () => import('@/views/ResetPassword.vue')
      },
      beforeEnter: [missingToken("token")]
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
    }
  ];

  const NoWelcomeTextRoutes: RouteRecordRaw[] = [
    {
      path: '/aplikace',
      components: {
        popup: () => import('@/views/Application.vue')
      }
    }
  ]
  
  const MapRoutes: RouteRecordRaw[] = [
    {
      path: '/mapa/legenda',
      components: {
        small_popup: () => import('@/views/MapLegend.vue')
      }
    },
    {
      path: '/nahravka/:id',
      components: {
        side: () => import('@/views/Recording.vue')
      },
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
      path: '/nahrat/umisteni',
      components: {
        center: () => import('@/views/upload/stages/Location.vue')
      },
    },
    {
      path: '/nahrat/dialekt',
      components: {
        center: () => import('@/views/upload/stages/Dialect.vue')
      },
    },
    {
      path: '/nahrat/foto',
      components: {
        center: () => import('@/views/upload/stages/Photos.vue')
      },
    },
  ];
  
  const AdminRoutes: RouteRecordRaw[] = [
    {
      path: '/admin/vsechny-nahravky',
      components: {
        center: () => import('@/views/admin/AllRecordings.vue')
      },
    }
  ];
  
  return [
    {
      path: '/vitejte',
      components: {
        small_popup: () => import('@/views/IntroScreen.vue')
      }
    },
    ...guarded([{
      path: '/',
      components: {
        "non-existent-component": { render: () => null }
      }
    }], welcome),
  
    ...NoWelcomeTextRoutes,
    ...guarded(TextRoutes, welcome),
    ...guarded(MapRoutes, welcome),
    ...guarded(UploadRoutes, welcome),
    ...OtherAccountRoutes,
    ...guarded(guarded(LoginRoutes, () => accountStore.user === null || '/ucet'), welcome),
    ...guarded(guarded(AccountRoutes, () => accountStore.user !== null || '/ucet/splash'), welcome),
    ...guarded(guarded(AdminRoutes, () => true), welcome), // accountStore.user?.role === 'admin' || '/',

    {
      path: '/neautorizovano',
      components: {
        popup: () => import('@/views/Unauthorized.md')
      }
    },
  
    {
      path: "/:pathMatch(.*)*",
      components: {
        popup: () => import('@/views/NotFound.md')
      }
    }
  ] as readonly RouteRecordRaw[];  
}
