import 'vue-router';

export type MobilePresentation = 'sheet' | 'dialog' | 'workspace';

declare module 'vue-router' {
  interface RouteMeta {
    mobilePresentation?: MobilePresentation;
    authenticated?: boolean;
    admin?: boolean;
    guestOnly?: boolean;
    'landing-bypass'?: boolean;
  }
}

export {};
