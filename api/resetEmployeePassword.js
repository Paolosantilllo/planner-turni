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
// 🔑 RESET PASSWORD
// ======================

module.exports = async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  try {

    const {
      uid,
      adminUid
    } = req.body;


    // ======================
    // 🔐 CONTROLLO DATI
    // ======================

    if (!uid || !adminUid) {

      return res.status(400).json({
        error: "UID mancante"
      });

    }


    // ======================
    // 🔐 VERIFICA ADMIN
    // ======================

    const adminDoc = await db
      .collection("users")
      .doc(adminUid)
      .get();


    if (!adminDoc.exists) {

      return res.status(403).json({
        error: "Admin non trovato"
      });

    }


    const adminData = adminDoc.data();


    if (adminData.role !== "ADMIN") {

      return res.status(403).json({
        error: "Non autorizzato"
      });

    }


    // ======================
    // 🔑 RESET
    // ======================

    const DEFAULT_PASSWORD = "123456";

    await auth.updateUser(uid, {
      password: DEFAULT_PASSWORD
    });


    console.log(
      "🔑 PASSWORD RESET:",
      uid,
      "da ADMIN:",
      adminUid
    );


    return res.status(200).json({

      success: true

    });


  } catch (error) {

    console.error(
      "❌ ERRORE RESET PASSWORD:",
      error
    );


    return res.status(500).json({

      success: false,
      error: error.message

    });

  }

};
