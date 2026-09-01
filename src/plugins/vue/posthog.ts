import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogInstance = posthogKey
  ? posthog.init(posthogKey, {
      api_host: 'https://eu.i.posthog.com'
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
