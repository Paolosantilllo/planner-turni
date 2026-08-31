
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

  const email = emailInput.value.trim();

  const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");

  if (!email || !forgotPasswordBtn) {
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
