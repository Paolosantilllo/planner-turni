const {
  initializeApp,
  cert,
  getApps
} = require("firebase-admin/app");

const {
  getAuth
} = require("firebase-admin/auth");

const {
  getFirestore
} = require("firebase-admin/firestore");

// ======================
// 🔥 FIREBASE ADMIN
// ======================

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );

  initializeApp({
    credential: cert(serviceAccount)
  });
}

const auth = getAuth();
const db = getFirestore();

// ======================
// 📧 CAMBIO EMAIL DIPENDENTE
// ======================

module.exports = async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    // ======================
    // 🔐 VERIFICA TOKEN ADMIN
    // ======================

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Autenticazione richiesta"
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({
        error: "Token non valido o scaduto"
      });
    }

    // ======================
    // 🔐 VERIFICA ADMIN
    // ======================

    const adminDoc = await db
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!adminDoc.exists) {
      return res.status(403).json({
        error: "Amministratore non trovato"
      });
    }

    const adminData = adminDoc.data();

    if (adminData.role !== "ADMIN") {
      return res.status(403).json({
        error: "Non autorizzato"
      });
    }

    // ======================
    // 🔐 SOLO SUPER ADMIN
    // ======================

    if (decodedToken.uid !== process.env.SUPER_ADMIN_UID) {
      return res.status(403).json({
        error: "Solo il Super Admin può modificare le email."
      });
    }

    // ======================
    // 🔎 CONTROLLO DATI
    // ======================

    const {
      employeeCode,
      newEmail
    } = req.body;

    if (!employeeCode || !newEmail) {
      return res.status(400).json({
        error: "Codice dipendente o nuova email mancanti"
      });
    }

    const email = String(newEmail).trim().toLowerCase();

    // ======================
    // 📧 CONTROLLO EMAIL
    // ======================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Indirizzo email non valido"
      });
    }

    // ======================
    // 👤 RECUPERA DIPENDENTE
    // ======================

    const employeeRef = db
      .collection("employees")
      .doc(employeeCode);

    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      return res.status(404).json({
        error: "Dipendente non trovato"
      });
    }

    const employeeData = employeeDoc.data();

    if (!employeeData.uid) {
      return res.status(400).json({
        error: "Il dipendente non ha un UID Firebase associato"
      });
    }

    const uid = employeeData.uid;

    // ======================
    // 🔎 CONTROLLO EMAIL GIÀ UTILIZZATA
    // ======================

    let existingUser;

    try {
      existingUser = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    if (existingUser && existingUser.uid !== uid) {
      return res.status(409).json({
        error: "Questa email è già associata a un altro account"
      });
    }

    // ======================
    // 🔄 AGGIORNA FIREBASE AUTH
    // ======================

    await auth.updateUser(uid, {
      email: email,
      emailVerified: false
    });

    // ======================
    // 🗂️ AGGIORNA EMPLOYEES
    // ======================

    await employeeRef.update({
      email: email
    });

    // ======================
    // 🗂️ AGGIORNA USERS
    // ======================

    await db
      .collection("users")
      .doc(uid)
      .set({
        email: email
      }, {
        merge: true
      });

    console.log(
      "📧 EMAIL AGGIORNATA:",
      employeeCode,
      "→",
      email,
      "da ADMIN:",
      decodedToken.uid
    );

    return res.status(200).json({
      success: true,
      email: email
    });

  } catch (error) {

    console.error(
      "❌ ERRORE CAMBIO EMAIL:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
