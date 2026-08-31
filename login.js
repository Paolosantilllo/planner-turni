
/* ======================
   LOGIN.JS PULITO
====================== */

import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

/* ======================
   LOGIN FUNZIONE
====================== */

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
