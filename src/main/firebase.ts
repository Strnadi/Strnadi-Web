import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { firebaseConfig, vapidKey } from "@/constants/firebaseConfig";
import { postDevice } from "@/api/device";
import { accountStore } from "@/state/AccountStore";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

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
        userEmail: accountStore.user.email,
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

