import { precacheAndRoute } from 'workbox-precaching'
import { app, messaging } from './firebase-provider'

/* @ts-ignore */
precacheAndRoute(self.__WB_MANIFEST)

// messaging.onBackgroundMessage((payload) => {
//   console.log('Received background message ', payload);

//   // Customize notification here
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: '/firebase-logo.png'
//   };

//   self.registration.showNotification(notificationTitle,
//     notificationOptions);
// }
