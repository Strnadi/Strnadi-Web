import { accountStore } from "@/features/Account/state/AccountStore";
import type { Router, RouteRecordRaw } from "vue-router";

export function baseRoutes(): RouteRecordRaw[] {
  return [
    {
      path: "/:pathMatch(.*)*",
      components: {
        popup: () => import('@/features/Status/screens/NotFound.md')
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
        popup: () => import('@/features/Account/screens/Splash.vue')
    },
    },
    {
      path: '/ucet/prihlaseni',
      components: {
        popup: () => import('@/features/Account/screens/Login.vue')
      },
    },
    {
      path: '/ucet/registrace',
      components: {
        popup: () => import('@/features/Account/screens/Register.vue')
      }
    },
    {
      path: '/ucet/zapomenute-heslo',
      components: {
        popup: () => import('@/features/Account/screens/forgotten-password/ForgottenPassword.vue')
      }
    }
  ];

  const AccountRoutes: RouteRecordRaw[] = [
    {
      path: '/ucet',
      components: {
        side: () => import('@/features/Profile/screens/Profile.vue')
      },
    },
    {
      path: '/ucet/osobni-udaje',
      components: {
        side: () => import('@/features/Account/screens/PersonalDetails.vue')
      },
    },
    {
      path: '/ucet/moje-nahravky',
      components: {
        side: () => import('@/features/Profile/screens/UserRecordings.vue')
      },
    },
    {
      path: '/ucet/smazat',
      components: {
        popup: () => import('@/features/Account/screens/DeleteAccount.vue')
      },
    },
    {
      path: '/ucet/overeni-emailu',
      components: {
        popup: () => import('@/features/EmailVerification/screens/ResendVerifyEmail.vue')
      },
    },
    {
      path: '/uzivatel/:id',
      components: {
        // Assuming Profile handles user view by ID
        side: () => import('@/features/Profile/screens/Profile.vue')
      }
    }
  ];

  const OtherAccountRoutes: RouteRecordRaw[] = [
    {
      path: '/ucet/email-verifikovan',
      components: {
        popup: () => import('@/features/EmailVerification/screens/EmailVerified.vue')
      },
    },
    {
      path: '/ucet/email-neverifikovan',
      components: {
        popup: () => import('@/features/EmailVerification/screens/EmailVerified.vue')
      },
      props: {
        popup: { notVerified: true }
      }
    },
    {
      path: '/ucet/reset-hesla',
      components: {
        popup: () => import('@/features/Account/screens/forgotten-password/ResetPassword.vue')
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
        small_popup: () => import('@/features/Application/screens/Application.vue')
      }
    }
  ]

  const MapRoutes: RouteRecordRaw[] = [
    {
      path: '/mapa/legenda',
      components: {
        small_popup: () => import('@/features/Map/screens/MapLegend.vue')
      }
    },
    {
      path: '/nahravka/:id',
      components: {
        side: () => import('@/features/Map/screens/Recording.vue')
      },
    },
    {
      path: '/ctverec/:id',
      components: {
        side: () => import('@/features/Map/screens/Square.vue')
      },
    }
  ];

  const UploadRoutes: RouteRecordRaw[] = [
    {
      path: '/nahrat',
      components: {
        center: () => import('@/features/Upload/screens/Upload.vue')
      },
    },
    {
      path: '/nahrat/umisteni',
      components: {
        center: () => import('@/features/Upload/screens/stages/Location.vue')
      },
    },
    {
      path: '/nahrat/dialekt',
      components: {
        center: () => import('@/features/Upload/screens/stages/Dialect.vue')
      },
    },
    {
      path: '/nahrat/foto',
      components: {
        center: () => import('@/features/Upload/screens/stages/Photos.vue')
      },
    },
  ];

  const AdminRoutes: RouteRecordRaw[] = [
    {
      path: '/admin',
      components: {
        side: () => import('@/features/AdminPanel/screens/Admin.vue')
      }
    },
    {
      path: '/admin/vsechny-nahravky',
      components: {
        side: () => import('@/features/AdminPanel/screens/AllRecordings.vue')
      },
    },
    {
      path: '/admin/uzivatele',
      components: {
        side: () => import('@/features/AdminPanel/screens/Users.vue')
      },
    },
  ];

  return [
    {
      path: '/vitejte',
      components: {
        // Assuming IntroScreen is now LandingPage
        small_popup: () => import('@/features/LandingPage/screens/LandingPage.vue')
      }
    },
    ...guarded([{
      path: '/',
      components: {
        "non-existent-component": { render: () => null }
      }
    }], welcome),
  
    ...NoWelcomeTextRoutes,
    ...TextRoutes,
    ...guarded(MapRoutes, welcome),
    ...guarded(UploadRoutes, welcome),
    ...OtherAccountRoutes,
    ...guarded(guarded(LoginRoutes, () => accountStore.user === null || '/ucet'), welcome),
    ...guarded(guarded(AccountRoutes, () => accountStore.user !== null || '/ucet/splash'), welcome),
    ...guarded(guarded(AdminRoutes, () => true), welcome), // accountStore.user?.role === 'admin' || '/',

    {
      path: '/neautorizovano',
      components: {
        popup: () => import('@/features/Status/screens/Unauthorized.md')
      }
    },
  
    {
      path: "/:pathMatch(.*)*",
      components: {
        popup: () => import('@/features/Status/screens/NotFound.md')
      }
    }
  ] as readonly RouteRecordRaw[];
}
