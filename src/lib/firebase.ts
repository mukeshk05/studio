
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging"; // Import getMessaging

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCroJnTi7x8JloktcyTU0OXUe2hA8V_hkc",
  authDomain: "smarttravel-e2cc9.firebaseapp.com",
  projectId: "smarttravel-e2cc9",
  storageBucket: "smarttravel-e2cc9.firebasestorage.app",
  messagingSenderId: "564263411903",
  appId: "1:564263411903:web:bd74c537549cd7b356260a",
  measurementId: "G-JLZ9414818"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Messaging and export it
// Check for window object to ensure it's client-side for messaging
let messaging = null;
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Firebase Messaging could not be initialized:", error);
    // Potentially means it's not supported or misconfigured,
    // but app should still run other Firebase services.
  }
}


export { app, auth, firestore, googleProvider, messaging };
