import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, type Messaging } from "firebase/messaging";
import { firebaseConfig, vapidKey } from "@/constants/FirebaseConfig";
import { postDevice } from "@/api/device";
import { accountStore } from "@/state/AccountStore";

async function initializePushNotifications(_app: FirebaseApp, messaging: Messaging) {

  while (Notification.permission === "default") {
    await Notification.requestPermission();
  }

  if (Notification.permission === "granted" && accountStore.user) {

    const registration = await navigator.serviceWorker.getRegistration("/");
  
    try {
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (token) {
        postDevice({
          fcmToken: token,
          userId: accountStore.user.id,
          devicePlatform: "web",
          deviceModel: navigator.userAgent
        }, accountStore.token!);
  
      } else {
        console.log(
          "No registration token available. Request permission to generate one."
        );
      }
    } catch (error) {
      console.error("An error occurred while retrieving token. ", error);
    }
    
  }
}

export default {
  install(_vueApp: any) {
    // Mainly Apple stuff doesn't support these
    if (("Notification" in window) && ("serviceWorker" in navigator)) {
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      initializePushNotifications(app, messaging);
    }
  },
};

