const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createEmployee = functions.https.onCall(async (data, context) => {

  try {

    // 🔐 SOLO ADMIN
    if (!context.auth || context.auth.token.role !== "ADMIN") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not allowed"
      );
    }

    const { email, password, employee, role } = data;

    if (!email || !password) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing fields"
      );
    }

    // CREA UTENTE AUTH
    const userRecord = await admin.auth().createUser({
      email,
      password
    });

    // CREA DOCUMENTO USERS
    await admin.firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email,
        employee,
        role: role || "USER",
        active: true,
        fcmTokens: []
      });

    return {
      success: true,
      uid: userRecord.uid
    };

  } catch (error) {

    throw new functions.https.HttpsError(
      "internal",
      error.message
    );

  }

});
