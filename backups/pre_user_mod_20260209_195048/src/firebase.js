
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD1ptV9pDATbRmCq_tzumgek_4jelRrlWg",
    authDomain: "distunitech.firebaseapp.com",
    projectId: "distunitech",
    storageBucket: "distunitech.firebasestorage.app",
    messagingSenderId: "638084675410",
    appId: "1:638084675410:web:4042cbb9b4d3d9f8536c8b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
