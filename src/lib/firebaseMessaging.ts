
"use client";

import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app as firebaseApp } from "./firebase"; // Use your existing initialized app
import { toast } from "@/hooks/use-toast";

export const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (firebaseApp && supported) {
    return getMessaging(firebaseApp);
  }
  return null;
};

export const requestPermissionAndGetToken = async (): Promise<string | null> => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    console.log("Firebase Messaging is not supported in this browser or not initialized.");
    toast({
      title: "Notifications Not Supported",
      description: "Push notifications are not supported in this browser.",
      variant: "destructive",
    });
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("VAPID key is not defined. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env file.");
        toast({
            title: "Configuration Error",
            description: "Notification service is not configured correctly (missing VAPID key).",
            variant: "destructive",
        });
        return null;
      }
      const currentToken = await getToken(messaging, { vapidKey: vapidKey });
      if (currentToken) {
        console.log("FCM Token:", currentToken);
        // TODO: Send this token to your server to subscribe the user
        // For now, we can store it or just log it
        localStorage.setItem('fcmToken', currentToken); // Example: storing in localStorage
        toast({
          title: "Notifications Enabled!",
          description: "You will now receive updates.",
        });
        return currentToken;
      } else {
        console.log("No registration token available. Request permission to generate one.");
        toast({
          title: "Token Error",
          description: "Could not retrieve notification token. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } else {
      console.log("Unable to get permission to notify.");
      toast({
        title: "Permission Denied",
        description: "You have denied notification permissions. Please enable them in browser settings if you wish to receive updates.",
        variant: "default",
      });
      return null;
    }
  } catch (err) {
    console.error("An error occurred while trying to get permission or token.", err);
    toast({
      title: "Notification Error",
      description: "An error occurred while setting up notifications.",
      variant: "destructive",
    });
    return null;
  }
};

export const onForegroundMessageListener = async () => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Received foreground message: ", payload);
      toast({
        title: payload.notification?.title || "New Notification",
        description: payload.notification?.body || "",
      });
      resolve(payload);
    });
  });
};
