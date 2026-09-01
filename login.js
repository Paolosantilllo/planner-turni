
/* ======================
   LOGIN.JS PULITO
====================== */

import { auth } from "./firebase.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import { db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

/* ======================
   LOGIN FUNZIONE
====================== */

const emailInput = document.getElementById("email");

emailInput.addEventListener("blur", async () => {

  const email = emailInput.value.trim().toLowerCase();

  const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");

  if (!email || !forgotPasswordBtn) {
    return;
  }

  // 👑 SUPER ADMIN
  if (email === "paolosantillo@yahoo.it") {
    forgotPasswordBtn.style.display = "block";
    return;
  }

  try {

    const q = query(
      collection(db, "users"),
      where("email", "==", email)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {

      const userData = snapshot.docs[0].data();

      forgotPasswordBtn.style.display =
        userData.emailChanged === true
          ? "block"
          : "none";

    } else {

      forgotPasswordBtn.style.display = "none";

    }

  } catch (error) {

    console.error(
      "Errore controllo email:",
      error
    );

    forgotPasswordBtn.style.display = "none";
  }

});

window.login = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Inserisci email e password");
    return;
  }

  try {

    await signInWithEmailAndPassword(auth, email, password);

    // login ok → vai alla home
    window.location.href = "index.html";

  } catch (error) {

    console.error("Errore login:", error);

    alert("Email o password errati");

  }

};


/* ======================
   🔑 RECUPERO PASSWORD
====================== */

window.resetPassword = async function () {

  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Inserisci prima la tua email");
    return;
  }

  try {

    await sendPasswordResetEmail(auth, email);

    alert("📧 Email di recupero inviata. Controlla la tua casella di posta.");

  } catch (error) {

    console.error("Errore recupero password:", error);

    alert("❌ Impossibile inviare l'email di recupero.");

  }

};

/* ======================
   👁️ MOSTRA / NASCONDI PASSWORD
====================== */

window.togglePassword = function () {
  const passwordInput = document.getElementById("password");
  const eyeButton = document.querySelector('[aria-label="Mostra password"], [aria-label="Nascondi password"]');
  const eye = document.getElementById("passwordEye");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";

    eye.innerHTML = `
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <line x1="3" y1="3" x2="21" y2="21"/>
    `;

    eyeButton.setAttribute("aria-label", "Nascondi password");

  } else {
    passwordInput.type = "password";

    eye.innerHTML = `
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    `;

    eyeButton.setAttribute("aria-label", "Mostra password");
  }
};
