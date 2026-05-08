import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQqws5Z6tIr-iopdiam2_qcckGqQzlqaw",
  authDomain: "collabcore-2b1fb.firebaseapp.com",
  projectId: "collabcore-2b1fb",
  storageBucket: "collabcore-2b1fb.firebasestorage.app",
  messagingSenderId: "108990011298",
  appId: "1:108990011298:web:c3f7a54f74f77c1a2b04fb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and set persistence
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Set persistence to LOCAL so users stay logged in
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

export default app;

