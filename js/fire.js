// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyBjIX5Bemf7ysZ0ra7lg37mcd-ySgNa1bc",
  authDomain: "tictactoe-20186.firebaseapp.com",
  projectId: "tictactoe-20186",
  storageBucket: "tictactoe-20186.firebasestorage.app",
  messagingSenderId: "774793584882",
  appId: "1:774793584882:web:a98039e29d33ec3f59f06b",
  measurementId: "G-TR46MB2L1K"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };