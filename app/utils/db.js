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

// Helpers per il salvataggio su file JSON locali (solo lato Server)
async function getLocalFileDb(type, slug = null, fallback = []) {
  if (typeof window !== "undefined") return fallback;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "db_local");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = slug ? `${type}_${slug}.json` : `${type}.json`;
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading local db file for ${type}:`, e);
    return fallback;
  }
}

async function saveLocalFileDb(type, data, slug = null) {
  if (typeof window !== "undefined") return false;
  try {
    const fs = await import("fs");
    const path = await import("path");
    const dir = path.join(process.cwd(), "db_local");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = slug ? `${type}_${slug}.json` : `${type}.json`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error(`Error writing local db file for ${type}:`, e);
    return false;
  }
}

// Helper per eseguire chiamate HTTP sicure dal Client verso l'API del Server
async function fetchFromServerDb(type, slug = null) {
  let url = `/api/db?type=${type}`;
  if (slug) url += `&slug=${slug}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch fallito: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  } catch (e) {
    console.error(`Errore nel caricamento dal server db (${type}):`, e);
    return null;
  }
}

async function saveToServerDb(type, data, slug = null) {
  let url = `/api/db`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data, slug })
    });
    if (!res.ok) throw new Error(`Salvataggio fallito: ${res.statusText}`);
    const json = await res.json();
    return json.success;
  } catch (e) {
    console.error(`Errore nel salvataggio sul server db (${type}):`, e);
    return false;
  }
}

// Helper to check if using Firestore
export function isUsingFirebase() {
  return isFirebaseConfigured;
}

// 1. Tornei
export async function getTornei() {
  if (typeof window === "undefined") {
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
      return [];
    }
    return await getLocalFileDb("tornei", null, []);
  }

  const serverData = await fetchFromServerDb("tornei");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_tornei");
  return safeJsonParse(saved, []);
}

export async function saveTornei(list) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "tornei");
        await setDoc(docRef, { list });
      } catch (e) {
        console.error("Firestore write tornei error:", e);
      }
      return;
    }
    await saveLocalFileDb("tornei", list);
    return;
  }

  const success = await saveToServerDb("tornei", list);
  if (!success) {
    localStorage.setItem("bvi_tornei", JSON.stringify(list));
  }
}

// 2. Iscrizioni
export async function getIscrizioni() {
  if (typeof window === "undefined") {
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
      return [];
    }
    return await getLocalFileDb("iscrizioni", null, []);
  }

  const serverData = await fetchFromServerDb("iscrizioni");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_iscrizioni");
  return safeJsonParse(saved, []);
}

export async function saveIscrizioni(list) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "iscrizioni");
        await setDoc(docRef, { list });
      } catch (e) {
        console.error("Firestore write iscrizioni error:", e);
      }
      return;
    }
    await saveLocalFileDb("iscrizioni", list);
    return;
  }

  const success = await saveToServerDb("iscrizioni", list);
  if (!success) {
    localStorage.setItem("bvi_iscrizioni", JSON.stringify(list));
  }
}

// 3. Gironi (Tournament specific config)
export async function getGironi(slug) {
  const key = `bvi_gironi_v2_${slug}`;
  if (typeof window === "undefined") {
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
      return null;
    }
    return await getLocalFileDb("gironi", slug, null);
  }

  const serverData = await fetchFromServerDb("gironi", slug);
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem(key);
  return safeJsonParse(saved, null);
}

export async function saveGironi(slug, data) {
  const key = `bvi_gironi_v2_${slug}`;
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "gironi", slug);
        await setDoc(docRef, { data });
      } catch (e) {
        console.error("Firestore write gironi error:", e);
      }
      return;
    }
    await saveLocalFileDb("gironi", data, slug);
    return;
  }

  const success = await saveToServerDb("gironi", data, slug);
  if (!success) {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// 4. Bracket (Tournament specific playoff/bracket matches)
export async function getBracket(slug) {
  const key = `bvi_bracket_v1_${slug}`;
  if (typeof window === "undefined") {
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
      return null;
    }
    return await getLocalFileDb("bracket", slug, null);
  }

  const serverData = await fetchFromServerDb("bracket", slug);
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem(key);
  return safeJsonParse(saved, null);
}

export async function saveBracket(slug, data) {
  const key = `bvi_bracket_v1_${slug}`;
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "bracket", slug);
        await setDoc(docRef, { data });
      } catch (e) {
        console.error("Firestore write bracket error:", e);
      }
      return;
    }
    await saveLocalFileDb("bracket", data, slug);
    return;
  }

  const success = await saveToServerDb("bracket", data, slug);
  if (!success) {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// 5. Users (Athlete registrations)
export async function getUsers() {
  if (typeof window === "undefined") {
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
      return [];
    }
    return await getLocalFileDb("users", null, []);
  }

  const serverData = await fetchFromServerDb("users");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_users");
  return safeJsonParse(saved, []);
}

export async function saveUsers(list) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "users");
        await setDoc(docRef, { list });
      } catch (e) {
        console.error("Firestore write users error:", e);
      }
      return;
    }
    await saveLocalFileDb("users", list);
    return;
  }

  const success = await saveToServerDb("users", list);
  if (!success) {
    localStorage.setItem("bvi_users", JSON.stringify(list));
  }
}

// 6. Moduli (Custom Form Configurations)
export async function getModuli() {
  if (typeof window === "undefined") {
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
      return [];
    }
    return await getLocalFileDb("moduli", null, []);
  }

  const serverData = await fetchFromServerDb("moduli");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_moduli");
  return safeJsonParse(saved, []);
}

export async function saveModuli(list) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "moduli");
        await setDoc(docRef, { list });
      } catch (e) {
        console.error("Firestore write moduli error:", e);
      }
      return;
    }
    await saveLocalFileDb("moduli", list);
    return;
  }

  const success = await saveToServerDb("moduli", list);
  if (!success) {
    localStorage.setItem("bvi_moduli", JSON.stringify(list));
  }
}

// 7. Notifiche Staff
export async function getNotifiche() {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "notifiche");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().list || [];
        }
      } catch (e) {
        console.error("Firestore read notifiche error:", e);
      }
      return [];
    }
    return await getLocalFileDb("notifiche", null, []);
  }

  const serverData = await fetchFromServerDb("notifiche");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_notifiche");
  return safeJsonParse(saved, []);
}

export async function saveNotifiche(list) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "notifiche");
        await setDoc(docRef, { list });
      } catch (e) {
        console.error("Firestore write notifiche error:", e);
      }
      return;
    }
    await saveLocalFileDb("notifiche", list);
    return;
  }

  const success = await saveToServerDb("notifiche", list);
  if (!success) {
    localStorage.setItem("bvi_notifiche", JSON.stringify(list));
  }
}

// 8. Staff (Staff/Admin accounts)
export async function getStaff() {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "staff");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().list || [];
        }
      } catch (e) {
        console.error("Firestore read staff error:", e);
      }
      return [];
    }
    return await getLocalFileDb("staff", null, []);
  }

  const serverData = await fetchFromServerDb("staff");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_staff");
  return safeJsonParse(saved, []);
}

export async function saveStaff(list) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "staff");
        await setDoc(docRef, { list });
      } catch (e) {
        console.error("Firestore write staff error:", e);
      }
      return;
    }
    await saveLocalFileDb("staff", list);
    return;
  }

  const success = await saveToServerDb("staff", list);
  if (!success) {
    localStorage.setItem("bvi_staff", JSON.stringify(list));
  }
}

// 9. Impostazioni Countdown
export async function getCountdown() {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "countdown");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().settings || { enabled: false, date: "", label: "" };
        }
      } catch (e) {
        console.error("Firestore read countdown error:", e);
      }
      return { enabled: false, date: "", label: "" };
    }
    return await getLocalFileDb("countdown", null, { enabled: false, date: "", label: "" });
  }

  const serverData = await fetchFromServerDb("countdown");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_countdown");
  return safeJsonParse(saved, { enabled: false, date: "", label: "" });
}

export async function saveCountdown(settings) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "countdown");
        await setDoc(docRef, { settings });
      } catch (e) {
        console.error("Firestore write countdown error:", e);
      }
      return;
    }
    await saveLocalFileDb("countdown", settings);
    return;
  }

  const success = await saveToServerDb("countdown", settings);
  if (!success) {
    localStorage.setItem("bvi_countdown", JSON.stringify(settings));
  }
}

// 10. Impostazioni Sponsor
export async function getSponsors() {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "sponsors");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().list || [];
        }
      } catch (e) {
        console.error("Firestore read sponsors error:", e);
      }
      return [];
    }
    return await getLocalFileDb("sponsors", null, []);
  }

  const serverData = await fetchFromServerDb("sponsors");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_sponsors");
  return safeJsonParse(saved, []);
}

export async function saveSponsors(list) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "sponsors");
        await setDoc(docRef, { list });
      } catch (e) {
        console.error("Firestore write sponsors error:", e);
      }
      return;
    }
    await saveLocalFileDb("sponsors", list);
    return;
  }

  const success = await saveToServerDb("sponsors", list);
  if (!success) {
    localStorage.setItem("bvi_sponsors", JSON.stringify(list));
  }
}

// 11. MVP (Most Valuable Player)
export async function getMvp() {
  const fallback = { attivo: false, candidati: [], titolo: "Vota l'MVP del Torneo" };
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "mvp");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().mvpData || fallback;
        }
      } catch (e) {
        console.error("Firestore read mvp error:", e);
      }
      return fallback;
    }
    return await getLocalFileDb("mvp", null, fallback);
  }

  const serverData = await fetchFromServerDb("mvp");
  if (serverData !== null) return serverData;
  const saved = localStorage.getItem("bvi_mvp");
  return safeJsonParse(saved, fallback);
}

export async function saveMvp(mvpData) {
  if (typeof window === "undefined") {
    if (db) {
      try {
        const docRef = doc(db, "config", "mvp");
        await setDoc(docRef, { mvpData });
      } catch (e) {
        console.error("Firestore write mvp error:", e);
      }
      return;
    }
    await saveLocalFileDb("mvp", mvpData);
    return;
  }

  const success = await saveToServerDb("mvp", mvpData);
  if (!success) {
    localStorage.setItem("bvi_mvp", JSON.stringify(mvpData));
  }
}

