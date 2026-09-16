const {
  initializeApp,
  cert,
  getApps
} = require("firebase-admin/app");

const {
  getFirestore
} = require("firebase-admin/firestore");

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

module.exports = async function handler(req, res) {
  // Endpoint richiamabile solo con GET
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  // Protezione del Cron
  const expectedSecret =
    process.env.CRON_SECRET;

  const authorization =
    req.headers.authorization || "";

  if (
    !expectedSecret ||
    authorization !==
      "Bearer " + expectedSecret
  ) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  try {
    const today = new Date('2027-01-01T02:00:00+01:00');

    // In automatico archivia sempre l'anno appena concluso.
    // Per il test è possibile indicare ?year=2026.
    const requestedYear = Number(req.query?.year);

    const previousYear =
      Number.isInteger(requestedYear) &&
      requestedYear >= 2000 &&
      requestedYear <= today.getFullYear()
        ? requestedYear
        : today.getFullYear() - 1;

    console.log(
      "📦 AVVIO ARCHIVIO ANNUALE:",
      previousYear
    );

    // ======================
    // 👥 LEGGI DIPENDENTI
    // ======================

    const employeesSnapshot =
      await db
        .collection("employees")
        .get();

    const employeeNames = {};

    employeesSnapshot.forEach(doc => {
      const employee = doc.data();

      employeeNames[doc.id] =
        employee.name || doc.id;
    });

    // ======================
    // 📅 LEGGI EVENTI
    // ======================

    const eventsSnapshot =
      await db
        .collection("events")
        .get();

    const events = [];

    eventsSnapshot.forEach(doc => {
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
        shift: ev.shift,
        createdAt: ev.createdAt || null
      });
    });

    // ======================
    // 📊 CALCOLO CFI
    // ======================

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
    // 🎉 TURNAZIONE FESTIVI
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

    const dryRun =
      String(req.query?.dryRun || "") === "1";

    if (dryRun) {
      console.log(
        "🧪 DRY RUN: nessun dato verrà salvato"
      );
    } else {
      await db
        .collection("annualArchives")
        .doc(String(previousYear))
        .set({
          year: previousYear,
          // 📅 Turnazione completa
          turnazione: events,
          // 👥 Nomi storici
          employeeNames,
          // 🎉 Festivi
          turnazioneFestivi,
          // 📊 Totali CFI / CFI-REP
          cfi: stats,
          archivedAt:
            new Date()
        });

      console.log(
        "📦 ARCHIVIO SALVATO:",
        previousYear
      );
    }

    console.log(
      "📦 EVENTI ARCHIVIATI:",
      events.length
    );

    console.log(
      "🎉 FESTIVI ARCHIVIATI:",
      turnazioneFestivi.length
    );

    console.log(
      "✅ ARCHIVIO COMPLETATO:",
      previousYear
    );

    return res.status(200).json({
      success: true,
      year: previousYear,
      events: events.length,
      festivi: turnazioneFestivi.length
    });

  } catch (error) {
    console.error(
      "❌ ERRORE ARCHIVIO:",
      error
    );

    return res.status(500).json({
      error: error.message
    });
  }
};
