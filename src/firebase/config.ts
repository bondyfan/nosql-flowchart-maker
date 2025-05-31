// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAVH2O8CZwxFP-IiiaJ5jaPvDmMhyG8Sd8",
  authDomain: "nosql-flowchart.firebaseapp.com",
  projectId: "nosql-flowchart",
  storageBucket: "nosql-flowchart.firebasestorage.app",
  messagingSenderId: "125574741453",
  appId: "1:125574741453:web:42155f10fbc2356e7f5884",
  measurementId: "G-58ELEFWGXC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

export default app; 