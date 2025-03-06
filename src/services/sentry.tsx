import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "https://230547a60eede3df732b3c9b22fa0d02@o4508834111291392.ingest.de.sentry.io/4508930854682704",
  integrations: [
  ],

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
