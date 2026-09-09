const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");


// inizializza Firebase Admin una sola volta
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


  if (req.method !== "POST") {

    return res.status(405).json({
      error:"Method not allowed"
    });

  }


  try {

    const {
      employee,
      message
    } = req.body;

    console.log(
      "📩 PUSH RICHIESTA:",
      employee,
      message
    );




const usersSnapshot =
      await db
      .collection("users")
      .where(
        "employee",
        "==",
        employee
      )
      .get();


    let tokens = [];

console.log("UTENTI=" + usersSnapshot.size);


    usersSnapshot.forEach(doc => {

      const data = doc.data();


      if(data.fcmTokens){

        tokens.push(
          ...data.fcmTokens
        );

      }

    });

console.log("TOKENS=" + tokens.length);


    if(tokens.length === 0){

      return res.status(200).json({

        success:false,

        message:"Nessun token FCM"

      });

    }





    const response =
      await messaging.sendEachForMulticast({

        tokens,

        notification:{

          title:"Planner REP",

          body:message

        },

        data:{

          type:"notification",

          employee

        }

      });



    console.log(
      "✅ PUSH INVIATE:",
      response.successCount
    );



    return res.status(200).json({

  success:true,

  sent:response.successCount,

  failed:response.failureCount,

  tokens:tokens.length

});



  } catch(error){


    console.error(
      "❌ ERRORE PUSH:",
      error
    );


    return res.status(500).json({

      error:error.message

    });


  }


};
