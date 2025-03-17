import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: "AIzaSyAfm8ZszcBvDv4Odc17uEpfuxfUoIT4sz0",
  authDomain: "strnadi-54f7f.firebaseapp.com",
  projectId: "strnadi-54f7f",
  storageBucket: "strnadi-54f7f.firebasestorage.app",
  messagingSenderId: "287278255232",
  appId: "1:287278255232:web:0ed3a8c8c09d2696bcea65",
  measurementId: "G-RST36B5B15"
};

export const vapidKey = "BKOP5EHJJ_C3vVZB5-ZaY80d2eMr0kticqRqXiJRdA0ih9iLe2dnPnwwz-CrHTql6kH4ztle_1fmAMxffSWL574";

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
