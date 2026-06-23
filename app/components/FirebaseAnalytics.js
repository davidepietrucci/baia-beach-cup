"use client";

import { useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

export default function FirebaseAnalytics() {
  useEffect(() => {
    const init = () => {
      // 1. Check if user accepted cookies
      const consent = localStorage.getItem("baia_beach_cup_cookie_consent");
      if (consent !== "accepted") {
        return;
      }

      // 2. Check if Firebase configuration is present
      if (!firebaseConfig.projectId || !firebaseConfig.appId) {
        console.warn("Firebase Analytics: Firebase project configuration is incomplete.");
        return;
      }

      // 3. Initialize Firebase Analytics if supported by environment
      isSupported().then((supported) => {
        if (supported) {
          try {
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
            getAnalytics(app);
            console.log("Firebase Analytics initialized successfully.");
          } catch (error) {
            console.error("Firebase Analytics initialization error:", error);
          }
        } else {
          console.warn("Firebase Analytics is not supported in this browser environment.");
        }
      });
    };

    // Attempt initialization on mount
    init();

    // Listen for custom cookie consent update event
    const handleConsentUpdate = () => {
      init();
    };

    window.addEventListener("cookie-consent-updated", handleConsentUpdate);
    return () => {
      window.removeEventListener("cookie-consent-updated", handleConsentUpdate);
    };
  }, []);

  return null;
}
