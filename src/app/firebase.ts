import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

console.log("ENV CHECK", {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

export const app = initializeApp(firebaseConfig);

// 👇 prevents crashes when objects have undefined fields
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

export const auth = getAuth(app);

// make sure every device has a signed-in session (anonymous ok)
signInAnonymously(auth).catch(console.error);
