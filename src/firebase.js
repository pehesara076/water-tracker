// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase Dashboard එකෙන් ගත්ත Config Keys ටික මෙතනට දාන්න
const firebaseConfig = {
  apiKey: "AIzaSyAOy4eZ1-2fqqzAHdfdHb_wX-1z-9t3z2g",
  authDomain: "white-house-water-tracker.firebaseapp.com",
  projectId: "white-house-water-tracker",
  storageBucket: "white-house-water-tracker.firebasestorage.app",
  messagingSenderId: "826991418630",
  appId: "1:826991418630:web:303e535886302fed07d287"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);