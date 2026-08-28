const functions = require("firebase-functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");

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
// 🔑 RESET PASSWORD DIPENDENTE
// ======================

exports.resetEmployeePassword = functions.https.onCall(async (data, context) => {

  try {

    // 🔐 Solo ADMIN
    if (!context.auth || context.auth.token.role !== "ADMIN") {

      throw new functions.https.HttpsError(
        "permission-denied",
        "Non autorizzato"
      );

    }

    const uid = data?.uid;

    if (!uid) {

      throw new functions.https.HttpsError(
        "invalid-argument",
        "UID dipendente mancante"
      );

    }

    // 🔑 Password predefinita
    const DEFAULT_PASSWORD = "123456";

    await admin.auth().updateUser(uid, {
      password: DEFAULT_PASSWORD
    });

    console.log(
      "🔑 PASSWORD RESET ESEGUITO:",
      uid
    );

    return {
      success: true
    };

  } catch (error) {

    console.error(
      "❌ ERRORE RESET PASSWORD:",
      error
    );

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      "Errore durante il reset della password"
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


// ======================
// 📦 ARCHIVIO ANNUALE - TEST
// ======================

exports.archiveYearTest = functions.https.onCall(async (data, context) => {

  try {

    // Per sicurezza: solo ADMIN
    if (!context.auth || context.auth.token.role !== "ADMIN") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Non autorizzato"
      );
    }

    const year = Number(data?.year);

    if (!year || year < 2000 || year > 2100) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Anno non valido"
      );
    }

    const db = admin.firestore();

    console.log("📦 AVVIO ARCHIVIAZIONE:", year);

    // ======================
    // 📥 LEGGI EVENTS
    // ======================

    const snapshot = await db
      .collection("events")
      .get();

    const events = [];

    snapshot.forEach(doc => {

      const ev = doc.data();

      if (!ev.employee || !ev.date || !ev.shift) {
        return;
      }

      const eventYear =
        new Date(ev.date).getFullYear();

      if (eventYear !== year) {
        return;
      }

      events.push({
        employee: ev.employee,
        date: ev.date,
        shift: ev.shift
      });

    });

    console.log(
      "📥 Eventi trovati:",
      events.length
    );

    // ======================
    // 📊 CALCOLO CFI
    // ======================

    const employeesSnapshot = await db
      .collection("employees")
      .get();

    const stats = {};

    employeesSnapshot.forEach(doc => {

      const employee = doc.data();

      stats[doc.id] = {
        name: employee.name || "",
        cfiF: 0,
        cfiA: 0
      };

    });

    // Festività fisse
    const holidays = [
      "01-01",
      "01-06",
      "25-04",
      "01-05",
      "02-06",
      "15-08",
      "01-11",
      "08-12",
      "25-12",
      "26-12"
    ];

    function isHolidayArchive(dateString) {

      const d = new Date(dateString);

      const key =
        String(d.getDate()).padStart(2, "0") +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0");

      return holidays.includes(key);
    }

    events.forEach(ev => {

      if (
        ev.shift !== "CFI" &&
        ev.shift !== "CFI/REP"
      ) {
        return;
      }

      if (!stats[ev.employee]) {
        return;
      }

      const d = new Date(ev.date);

      const weight =
        d.getDay() === 0 ||
        d.getDay() === 6 ||
        isHolidayArchive(ev.date)
          ? 2
          : 1;

      // Per l'archivio annuale entrambi
      // rappresentano il totale conclusivo dell'anno.
      stats[ev.employee].cfiF += weight;
      stats[ev.employee].cfiA += weight;

    });

    // ======================
    // 🎉 TURNazione FESTIVI
    // ======================

    const turnazioneFestivi = [];

    events.forEach(ev => {

      if (
        ev.shift !== "FREP" &&
        ev.shift !== "CFI/REP"
      ) {
        return;
      }

      if (!isHolidayArchive(ev.date)) {
        return;
      }

      turnazioneFestivi.push({
        date: ev.date,
        employee: ev.employee,
        shift: ev.shift
      });

    });

    turnazioneFestivi.sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // ======================
    // 💾 SALVA ARCHIVIO
    // ======================

    const archiveData = {

      year,

      cfi: stats,

      turnazioneFestivi,

      archivedAt:
        admin.firestore.FieldValue.serverTimestamp()

    };

    await db
      .collection("annualArchives")
      .doc(String(year))
      .set(
        archiveData,
        { merge: false }
      );

    console.log(
      "✅ ARCHIVIO CREATO:",
      `annualArchives/${year}`
    );

    return {

      success: true,

      year,

      eventsArchived: events.length,

      cfiEmployees:
        Object.keys(stats).length,

      festiviArchived:
        turnazioneFestivi.length

    };

  } catch (error) {

    console.error(
      "❌ ERRORE ARCHIVIAZIONE:",
      error
    );

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      error.message
    );

  }

});

// ======================
// 📦 ARCHIVIO ANNUALE AUTOMATICO
// ======================

exports.archivePreviousYear = onSchedule(
  {
    schedule: "0 2 1 1 *",
    timeZone: "Europe/Rome"
  },
  async (event) => {

    try {

      const db = admin.firestore();

      // Il 1° gennaio archiviamo l'anno appena concluso
      const today = new Date();

      const previousYear =
        today.getFullYear() - 1;

      console.log(
        "📦 Avvio archivio automatico:",
        previousYear
      );

      // ======================
      // 📥 LEGGI EVENTS
      // ======================

      const snapshot = await db
        .collection("events")
        .get();

      const events = [];

      snapshot.forEach(doc => {

        const ev = doc.data();

        if (
          !ev.employee ||
          !ev.date ||
          !ev.shift
        ) {
          return;
        }

        const eventYear =
          new Date(ev.date).getFullYear();

        if (eventYear !== previousYear) {
          return;
        }

        events.push({
          employee: ev.employee,
          date: ev.date,
          shift: ev.shift
        });

      });

      // ======================
      // 📊 CFI / CFI-REP
      // ======================

      const employeesSnapshot = await db
        .collection("employees")
        .get();

      const stats = {};

      employeesSnapshot.forEach(doc => {

        const employee = doc.data();

        stats[doc.id] = {
          name: employee.name || "",
          cfiF: 0,
          cfiA: 0
        };

      });

      const holidays = [
        "01-01",
        "01-06",
        "25-04",
        "01-05",
        "02-06",
        "15-08",
        "01-11",
        "08-12",
        "25-12",
        "26-12"
      ];

      function isHolidayArchive(dateString) {

        const d = new Date(dateString);

        const key =
          String(d.getDate()).padStart(2, "0") +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0");

        return holidays.includes(key);

      }

      events.forEach(ev => {

        if (
          ev.shift !== "CFI" &&
          ev.shift !== "CFI/REP"
        ) {
          return;
        }

        if (!stats[ev.employee]) {
          return;
        }

        const d = new Date(ev.date);

        const weight =
          d.getDay() === 0 ||
          d.getDay() === 6 ||
          isHolidayArchive(ev.date)
            ? 2
            : 1;

        stats[ev.employee].cfiF += weight;
        stats[ev.employee].cfiA += weight;

      });

      // ======================
      // 🎉 TURNazione FESTIVI
      // ======================

      const turnazioneFestivi = [];

      events.forEach(ev => {

        if (
          ev.shift !== "FREP" &&
          ev.shift !== "CFI/REP"
        ) {
          return;
        }

        if (!isHolidayArchive(ev.date)) {
          return;
        }

        turnazioneFestivi.push({
          date: ev.date,
          employee: ev.employee,
          shift: ev.shift
        });

      });

      turnazioneFestivi.sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      // ======================
      // 💾 SALVA ARCHIVIO
      // ======================

      await db
        .collection("annualArchives")
        .doc(String(previousYear))
        .set({

          year: previousYear,

          cfi: stats,

          turnazioneFestivi,

          archivedAt:
            admin.firestore.FieldValue.serverTimestamp()

        });

      console.log(
        "✅ Archivio automatico completato:",
        previousYear
      );

      return null;

    } catch (error) {

      console.error(
        "❌ Errore archivio automatico:",
        error
      );

      throw error;

    }

  }
);
