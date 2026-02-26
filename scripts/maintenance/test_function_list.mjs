import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBw... (will replace with actual if needed)",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "fisioflow-migration.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "fisioflow-migration",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "fisioflow-migration.appspot.com",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

import 'dotenv/config';

async function run() {
    const app = initializeApp({
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID
    });

    const auth = getAuth(app);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, "rafael.minatto@yahoo.com.br", "Yukari30@");
        const token = await userCredential.user.getIdToken();
        console.log("Got token:", token.substring(0, 20) + "...");

        // Call the Cloud Function
        const today = new Date();
        const dateFrom = new Date(today);
        dateFrom.setDate(today.getDate() - 3);
        const dateTo = new Date(today);
        dateTo.setDate(today.getDate() + 3);

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const payload = {
            action: 'list',
            dateFrom: formatDate(dateFrom),
            dateTo: formatDate(dateTo),
            limit: 100
        };

        console.log("Calling appointmentServiceHttp with payload:", payload);

        const response = await fetch("https://southamerica-east1-fisioflow-migration.cloudfunctions.net/appointmentServiceHttp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response text:", text.substring(0, 500) + (text.length > 500 ? "..." : ""));

    } catch (error) {
        console.error("Error:", error);
    }
}

run();
