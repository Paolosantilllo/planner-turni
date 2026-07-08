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


    // 1. CREA UTENTE AUTH
    const userRecord =
      await admin.auth().createUser({
        email,
        password
      });


    // 2. CREA FIRESTORE USER
    await admin.firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set({

        email,
        employee,
        role: role || "USER",
        active:true,
        fcmTokens:[]

      });


    return {

      success:true,
      uid:userRecord.uid

    };


  } catch(error){

    throw new functions.https.HttpsError(
      "internal",
      error.message
    );

  }

});




// ==============================
// 🔔 INVIO PUSH NOTIFICATION
// ==============================

exports.sendPushNotification =
functions.firestore
.document("notifications/{notificationId}")
.onCreate(async (snap, context) => {


  const notification = snap.data();


  try {


    const email = notification.email;


    if(!email){

      console.log(
        "Nessuna email destinatario"
      );

      return null;

    }



    // CERCA UTENTE DA EMAIL

    const usersSnapshot =
      await admin.firestore()
      .collection("users")
      .where("email","==",email)
      .get();



    if(usersSnapshot.empty){

      console.log(
        "Utente non trovato:",
        email
      );

      return null;

    }



    const userData =
      usersSnapshot.docs[0].data();



    const tokens =
      Array.isArray(userData.fcmTokens)
      ? userData.fcmTokens
      : [];



    if(tokens.length === 0){

      console.log(
        "Nessun token FCM per:",
        email
      );

      return null;

    }



    await admin.messaging()
    .sendEachForMulticast({

      tokens:tokens,

      notification:{

        title:"Planner REP",

        body:notification.message

      },

      data:{

        type:"notification"

      }

    });



    console.log(
      "✅ Push inviata a:",
      email
    );


    return null;



  }catch(error){


    console.error(
      "Errore invio push:",
      error
    );


    return null;


  }


});
