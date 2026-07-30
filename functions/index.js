const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createEmployee = functions.https.onCall(async (data, context) => {

  try {

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

    const userRecord = await admin.auth().createUser({
      email,
      password
    });

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


// ======================
// PUSH AUTOMATICHE FCM
// ======================

exports.sendNotificationPush = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap) => {

    const notification = snap.data();

    const employee = notification.employee;
    const message = notification.message;

    console.log(
      "🔔 Nuova notifica per:",
      employee
    );


    const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("employee", "==", employee)
      .get();


    if (usersSnapshot.empty) {

      console.log(
        "❌ Nessun utente trovato:",
        employee
      );

      return null;
    }


    let tokens = [];


    usersSnapshot.forEach((doc) => {

      const data = doc.data();

      if (data.fcmTokens) {
        tokens.push(...data.fcmTokens);
      }

    });


    if (tokens.length === 0) {

      console.log(
        "❌ Nessun token FCM"
      );

      return null;
    }


    const response = await admin.messaging()
      .sendEachForMulticast({

        tokens,

        notification: {
          title: "Planner REP",
          body: message
        },

        data: {
          type: "notification",
          employee
        }

      });


    console.log(
      "✅ Push inviate:",
      response.successCount
    );


    return null;

  });
