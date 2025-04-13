import posthog from "posthog-js";

export default {
  install(app: any) {
    app.config.globalProperties.$posthog = posthog.init(
      'phc_mhQg3g8DNF0MGFld4Tot8UNVWM38Kkd3DkjUQgg9eaf',
      {
        api_host: 'https://eu.i.posthog.com',
      }
    );
  },
};
