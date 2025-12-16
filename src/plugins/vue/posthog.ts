import posthog from 'posthog-js';

const posthogInstance = posthog.init(process.env.PUBLIC_POSTHOG_KEY, {
  api_host: 'https://eu.i.posthog.com'
});

export default {
  install(app: any) {
    app.config.globalProperties.$posthog = posthogInstance;
  }
};

export { posthogInstance };
