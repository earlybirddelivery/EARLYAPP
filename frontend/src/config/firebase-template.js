import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

// Replace these with your Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSy...",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "earlyapp-production.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "earlyapp-production",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "earlyapp-production.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abc123...",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication with persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Initialize Firestore (optional, for real-time data)
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Cloud Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn("Cloud Messaging not supported in this environment:", error);
}

// Initialize Analytics
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Analytics not supported:", error);
}

// Function to get FCM token
export const getFCMToken = async () => {
  if (!messaging) {
    console.warn("Cloud Messaging is not available");
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
    });
    return token;
  } catch (error) {
    console.error("Failed to get FCM token:", error);
    return null;
  }
};

// Function to request notification permission
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return await getFCMToken();
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return await getFCMToken();
      }
    } catch (error) {
      console.error("Notification permission error:", error);
    }
  }
  return false;
};

export { messaging, analytics };
