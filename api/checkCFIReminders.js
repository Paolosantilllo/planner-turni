const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Inizializza Firebase Admin una sola volta
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
  );

  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const messaging = getMessaging();

module.exports = async function handler(req, res) {

  // Questo endpoint deve essere chiamato con GET
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const expectedSecret = process.env.CFI_CRON_SECRET;
  const authorization = req.headers.authorization || "";

  if (
    !expectedSecret ||
    authorization !== "Bearer " + expectedSecret
  ) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {

    const now = new Date();

    console.log(
      "🔔 CONTROLLO PROMEMORIA CFI:",
      now.toISOString()
    );

    const snapshot = await db
      .collection("cfiReminders")
      .where("sent", "==", false)
      .where("reminderAt", "<=", now)
      .get();

    if (snapshot.empty) {

      console.log(
        "ℹ️ Nessun promemoria CFI da inviare."
      );

      return res.status(200).json({
        success: true,
        sent: 0
      });
    }

    let sentCount = 0;
    let failureCount = 0;
    const diagnostics = [];

    for (const reminderDoc of snapshot.docs) {

      const reminder = reminderDoc.data();

      console.log(
        "🔔 PROMEMORIA CFI:",
        reminder.employee,
        reminder.date,
        reminder.minExit
      );

      // Cerca il dipendente
      const usersSnapshot = await db
        .collection("users")
        .where(
          "employee",
          "==",
          reminder.employee
        )
        .get();

      let tokens = [];

      usersSnapshot.forEach(doc => {

        const data = doc.data();

        if (data.fcmTokens) {
          tokens.push(
            ...data.fcmTokens
          );
        }

      });

      // Elimina eventuali token duplicati
      tokens = [...new Set(tokens)];

      if (tokens.length === 0) {

        console.log(
          "⚠️ Nessun token FCM per:",
          reminder.employee
        );

        continue;
      }

      const response =
        await messaging.sendEachForMulticast({

          tokens,

          notification: {
            title: "Planner REP",
            body:
              "🟢 CFI: puoi uscire. " +
              "Hai raggiunto l'orario minimo (" +
              reminder.minExit +
              ")."
          },

          data: {
            type: "cfiReminder",
            employee: reminder.employee,
            date: reminder.date,
            minExit: reminder.minExit
          }

        });

      console.log(
        "✅ PUSH CFI INVIATE:",
        response.successCount
      );

      // Segna il promemoria come inviato solo se almeno una notifica è stata accettata
      if (response.successCount > 0) {
        await reminderDoc.ref.update({
          sent: true,
          sentAt: new Date()
        });
      }

      sentCount += response.successCount;
      failureCount += response.failureCount;

      const fcmErrors = response.responses
        .filter(result => !result.success)
        .map(result => result.error?.code || "unknown");

      console.log(
        "📨 RISULTATO FCM CFI:",
        JSON.stringify({
          successCount: response.successCount,
          failureCount: response.failureCount,
          errors: fcmErrors
        })
      );

      if (fcmErrors.length > 0) {
        console.log(
          "❌ ERRORI FCM CFI:",
          JSON.stringify(fcmErrors)
        );
      }

      diagnostics.push({
        employee: reminder.employee,
        date: reminder.date,
        minExit: reminder.minExit,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: fcmErrors
      });
    }

    return res.status(200).json({
      success: true,
      sent: sentCount,
      reminders: snapshot.size,
      details: "Controllo FCM completato",
      successCount: sentCount,
      failureCount: failureCount,
      diagnostics: diagnostics
    });

  } catch (error) {

    console.error(
      "❌ ERRORE CONTROLLO CFI:",
      error
    );

    return res.status(500).json({
      error: error.message
    });

  }

};
