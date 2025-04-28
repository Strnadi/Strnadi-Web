import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, type Messaging } from "firebase/messaging";
import { firebaseConfig, vapidKey } from "@/plugins/firebase/config";
import { postDevice } from "@/features/Notifications/api/device";
import { accountStore } from "@/features/Account/state/AccountStore";

async function initializePushNotifications(app: FirebaseApp, messaging: Messaging) {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    console.log("Notification permission granted.");
  } else {
    console.log("Unable to get permission to notify.");
  }
  
  if (accountStore.user) {
  
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
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Mainly Apple stuff doesn't support these
    if ("Notification" in window && "serviceWorker" in navigator) {
      initializePushNotifications(app, messaging);
    }
  },
};

