import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAfm8ZszcBvDv4Odc17uEpfuxfUoIT4sz0",
  authDomain: "strnadi-54f7f.firebaseapp.com",
  projectId: "strnadi-54f7f",
  storageBucket: "strnadi-54f7f.firebasestorage.app",
  messagingSenderId: "287278255232",
  appId: "1:287278255232:web:0ed3a8c8c09d2696bcea65",
  measurementId: "G-RST36B5B15"
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
