import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from '@/constants/FirebaseConfig';
import { postDevice } from '@/api/device';
import { accountStore } from '@/state/AccountStore';
import { postDeleteDevice } from '@/api/device';
import { watch } from 'vue';

let registerPushDevice: (() => Promise<void>) | null = null;

export const requestPushNotifications = async () => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission === 'granted') await registerPushDevice?.();
};

export default {
  install(_vueApp: any) {
    // Mainly Apple stuff doesn't support these
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);
      let currentFcmToken: string | null = null;
      let boundUserId: number | null = null;

      const syncDevice = async () => {
        if (Notification.permission !== 'granted' || !accountStore.user) return;
        const registration = await navigator.serviceWorker.getRegistration('/');
        currentFcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration
        });
        if (!currentFcmToken) return;
        await postDevice(
          {
            fcmToken: currentFcmToken,
            userId: accountStore.user.id,
            devicePlatform: 'web',
            deviceModel: navigator.userAgent
          },
          accountStore.token!
        );
        boundUserId = accountStore.user.id;
      };
      registerPushDevice = syncDevice;

      watch(
        () => ({ userId: accountStore.user?.id ?? null, token: accountStore.token }),
        async (next, previous) => {
          try {
            if (
              currentFcmToken &&
              boundUserId !== null &&
              boundUserId !== next.userId &&
              previous?.token
            ) {
              await postDeleteDevice(currentFcmToken, previous.token);
              boundUserId = null;
            }
            if (next.userId && next.token) await syncDevice();
          } catch {
            // Push setup must never block login/logout or application startup.
          }
        },
        { immediate: true }
      );
    }
  }
};
