import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogInstance = posthogKey
  ? posthog.init(posthogKey, {
      api_host: 'https://eu.i.posthog.com',
      opt_out_capturing_by_default: true,
      persistence: 'memory',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false
    })
  : null;

export default {
  install(app: any) {
    if (posthogInstance) {
      app.config.globalProperties.$posthog = posthogInstance;
    }
  }
};

export { posthogInstance };
