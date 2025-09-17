// client/src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Your Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyC_fnBK0vfP3U6SKhFWJP98CC6e2sjjIJs",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "nut-track.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "nut-track",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "nut-track.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1656967210072",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:656967210072:web:5f17fc3d10e525e08ee62d",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://nut-track-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

export default app;