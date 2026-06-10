import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

let db = null;
if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase init error:", error);
  }
}

// Safe JSON parse helper to prevent crashes
function safeJsonParse(str, fallback) {
  try {
    if (!str || str === "undefined") return fallback;
    return JSON.parse(str);
  } catch (e) {
    console.error("Failed to parse JSON:", str, e);
    return fallback;
  }
}

// Helper to check if using Firestore
export function isUsingFirebase() {
  return db !== null;
}

// 1. Tornei
export async function getTornei() {
  if (db) {
    try {
      const docRef = doc(db, "config", "tornei");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().list || [];
      }
    } catch (e) {
      console.error("Firestore read tornei error:", e);
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bvi_tornei");
    return safeJsonParse(saved, []);
  }
  return [];
}

export async function saveTornei(list) {
  if (db) {
    try {
      const docRef = doc(db, "config", "tornei");
      await setDoc(docRef, { list });
    } catch (e) {
      console.error("Firestore write tornei error:", e);
    }
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("bvi_tornei", JSON.stringify(list));
  }
}

// 2. Iscrizioni
export async function getIscrizioni() {
  if (db) {
    try {
      const docRef = doc(db, "config", "iscrizioni");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().list || [];
      }
    } catch (e) {
      console.error("Firestore read iscrizioni error:", e);
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bvi_iscrizioni");
    return safeJsonParse(saved, []);
  }
  return [];
}

export async function saveIscrizioni(list) {
  if (db) {
    try {
      const docRef = doc(db, "config", "iscrizioni");
      await setDoc(docRef, { list });
    } catch (e) {
      console.error("Firestore write iscrizioni error:", e);
    }
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("bvi_iscrizioni", JSON.stringify(list));
  }
}

// 3. Gironi (Tournament specific config)
export async function getGironi(slug) {
  const key = `bvi_gironi_v2_${slug}`;
  if (db) {
    try {
      const docRef = doc(db, "gironi", slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().data || null;
      }
    } catch (e) {
      console.error("Firestore read gironi error:", e);
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    return safeJsonParse(saved, null);
  }
  return null;
}

export async function saveGironi(slug, data) {
  const key = `bvi_gironi_v2_${slug}`;
  if (db) {
    try {
      const docRef = doc(db, "gironi", slug);
      await setDoc(docRef, { data });
    } catch (e) {
      console.error("Firestore write gironi error:", e);
    }
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// 4. Bracket (Tournament specific playoff/bracket matches)
export async function getBracket(slug) {
  const key = `bvi_bracket_v1_${slug}`;
  if (db) {
    try {
      const docRef = doc(db, "bracket", slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().data || null;
      }
    } catch (e) {
      console.error("Firestore read bracket error:", e);
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    return safeJsonParse(saved, null);
  }
  return null;
}

export async function saveBracket(slug, data) {
  const key = `bvi_bracket_v1_${slug}`;
  if (db) {
    try {
      const docRef = doc(db, "bracket", slug);
      await setDoc(docRef, { data });
    } catch (e) {
      console.error("Firestore write bracket error:", e);
    }
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// 5. Users (Athlete registrations)
export async function getUsers() {
  if (db) {
    try {
      const docRef = doc(db, "config", "users");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().list || [];
      }
    } catch (e) {
      console.error("Firestore read users error:", e);
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bvi_users");
    return safeJsonParse(saved, []);
  }
  return [];
}

export async function saveUsers(list) {
  if (db) {
    try {
      const docRef = doc(db, "config", "users");
      await setDoc(docRef, { list });
    } catch (e) {
      console.error("Firestore write users error:", e);
    }
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("bvi_users", JSON.stringify(list));
  }
}

// 6. Moduli (Custom Form Configurations)
export async function getModuli() {
  if (db) {
    try {
      const docRef = doc(db, "config", "moduli");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().list || [];
      }
    } catch (e) {
      console.error("Firestore read moduli error:", e);
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bvi_moduli");
    return safeJsonParse(saved, []);
  }
  return [];
}

export async function saveModuli(list) {
  if (db) {
    try {
      const docRef = doc(db, "config", "moduli");
      await setDoc(docRef, { list });
    } catch (e) {
      console.error("Firestore write moduli error:", e);
    }
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("bvi_moduli", JSON.stringify(list));
  }
}

