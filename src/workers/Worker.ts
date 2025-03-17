import { precacheAndRoute } from 'workbox-precaching'
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { firebaseConfig } from "@/firebaseConfig";

/* @ts-ignore */
precacheAndRoute(self.__WB_MANIFEST)

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('Received background FCM message: ', payload);

  // // Customize notification here
  // const notificationTitle = 'Background Message Title';
  // const notificationOptions = {
  //   body: 'Background Message body.',
  //   icon: '/firebase-logo.png'
  // };

  // self.registration.showNotification(notificationTitle,
  //   notificationOptions);
});
