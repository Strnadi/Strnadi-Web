import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { firebaseConfig, vapidKey } from "@/firebaseConfig";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);


const permission = await Notification.requestPermission();
if (permission === "granted") {
  console.log("Notification permission granted.");
} else {
  console.log("Unable to get permission to notify.");
}

const registration = await navigator.serviceWorker.getRegistration("/");
console.log(registration)

try {
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (token) {
    console.log("Token generated: ", token);
  } else {
    console.log("No registration token available. Request permission to generate one.");
  }
} catch (error) {
  console.error("An error occurred while retrieving token. ", error);
}
