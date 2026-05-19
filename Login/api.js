import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBrlxKh3uGCjU-Vijz2G6EGv6Fv4g75pP0",
    authDomain: "smart-city-a317c.firebaseapp.com",
  projectId: "smart-city-a317c",
  storageBucket: "smart-city-a317c.firebasestorage.app",
  messagingSenderId: "113117988731",
  appId: "1:113117988731:web:0a3f324fa3d691ecdfdfde"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);