import { db, auth } from "./fire.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- DOM ---
const signupForm = document.querySelector("#signup-form");
const loginForm = document.querySelector("#login-form");
const signupBtn = document.querySelector("#signup-btn");
const loginBtn = document.querySelector("#login-btn");
const passwordInput = document.getElementById("signup-password");
const lengthRule = document.getElementById("length-rule");
const uppercaseRule = document.getElementById("uppercase-rule");
const numberRule = document.getElementById("number-rule");
const specialRule = document.getElementById("special-rule");
const googleSignInBtn = document.getElementById("google-signin-btn");

// --- Google Provider ---
const provider = new GoogleAuthProvider();

// 🔥 GOOGLE SIGN IN
googleSignInBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user exists in Firestore
    const userRef = doc(db, "users", user.uid);

    await setDoc(
      userRef,
      {
        name: user.displayName,
        email: user.email,
        gamesPlayed: 0,
        gamesWon: 0,
      },
      { merge: true }
    ); // prevents overwrite

    window.location.href = "dash.html";
  } catch (error) {
    console.error(error);
    alert("Google sign-in error: " + error.message);
  }
});

// --- PASSWORD VALIDATION ---
if (passwordInput) {
  passwordInput.addEventListener("input", () => {
    const pass = passwordInput.value;

    lengthRule.classList.toggle("valid", pass.length >= 8);
    uppercaseRule.classList.toggle("valid", /[A-Z]/.test(pass));
    numberRule.classList.toggle("valid", /[0-9]/.test(pass));
    specialRule.classList.toggle("valid", /[@$!%*?&]/.test(pass));
  });
}

// 🔥 SIGNUP
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = signupForm["signup-name"].value;
  const email = signupForm["signup-email"].value;
  const password = signupForm["signup-password"].value;

  // validation
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[@$!%*?&]/.test(password)
  ) {
    alert("Password does not meet requirements");
    return;
  }

  signupBtn.classList.add("loading");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await sendEmailVerification(cred.user);

    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      gamesPlayed: 0,
      gamesWon: 0,
    });

    await updateProfile(cred.user, { displayName: name });

    alert("Account created! Verify your email.");
    window.location.reload();
  } catch (err) {
    alert(err.message);
  } finally {
    signupBtn.classList.remove("loading");
  }
});

// 🔥 LOGIN
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginBtn.classList.add("loading");

  const email = loginForm["login-email"].value;
  const password = loginForm["login-password"].value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    if (cred.user.emailVerified) {
      window.location.href = "dash.html";
    } else {
      alert("Please verify your email first.");
      await sendEmailVerification(cred.user);
      await signOut(auth);
    }
  } catch (err) {
    alert(err.message);
  } finally {
    loginBtn.classList.remove("loading");
  }
});
