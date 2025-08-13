// js/firebase-config.js

// Importe as funções que você precisa do SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Suas credenciais do Firebase (do console do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAaaXxKG4BwAKIBdDk0vrSNsQzK8BbWIA0",
  authDomain: "brancofilmcv.firebaseapp.com",
  projectId: "brancofilmcv",
  storageBucket: "brancofilmcv.firebasestorage.app",
  messagingSenderId: "513537369615",
  appId: "1:513537369615:web:6cfec35394b5852857e57a"
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);

// Exporte os serviços para serem usados em outros módulos
export const db = getFirestore(app);
export const auth = getAuth(app);