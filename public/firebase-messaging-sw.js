
// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE_AGAIN_FOR_SW",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN_HERE_AGAIN_FOR_SW",
  projectId: "YOUR_FIREBASE_PROJECT_ID_HERE_AGAIN_FOR_SW",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET_HERE_AGAIN_FOR_SW",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE_AGAIN_FOR_SW",
  appId: "YOUR_FIREBASE_APP_ID_HERE_AGAIN_FOR_SW",
};

// Check if Firebase has already been initialized
if (typeof self.firebase === 'undefined' || !self.firebase.apps.length) {
  self.importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
  self.importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
  self.firebase.initializeApp(firebaseConfig);
} else {
  self.firebase.app(); // if already initialized, use that one
}


if (self.firebase && self.firebase.messaging) {
  const messaging = self.firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log(
      '[firebase-messaging-sw.js] Received background message ',
      payload
    );
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: payload.notification?.icon || '/icons/icon-192x192.png', // Ensure you have an icon here
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.error("Firebase messaging is not available in SW. Check imports and initialization.");
}
