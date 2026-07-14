
import { messaging, db, firestore } from "./firebase.js";

import {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";


export async function initPush(user) {


const btn = document.getElementById("enablePushBtn");


if(!btn){

 console.log("Pulsante notifiche non trovato");
 return;

}


// ======================
// CONTROLLO TOKEN ESISTENTE
// ======================

async function checkExistingToken(){


try {


const snap = await firestore.getDoc(

  firestore.doc(
    db,
    "users",
    user.uid
  )

);



if(!snap.exists()){

  btn.style.display="block";
  return;

}



const data = snap.data();


const tokens = data.fcmTokens || [];


console.log(
"FCM FIRESTORE:",
tokens
);



if(tokens.length > 0){


btn.style.display="none";


console.log(
"✅ Notifiche già attive"
);



}else{


btn.style.display="block";


console.log(
"🔔 Attiva notifiche disponibile"
);



}



}catch(err){


console.error(
"Errore controllo token:",
err
);


}


}


// AVVIO CONTROLLO

await checkExistingToken();



// ======================
// ATTIVAZIONE PULSANTE
// ======================


btn.onclick = async ()=>{

try{


const permission =
await Notification.requestPermission();



if(permission !== "granted"){

alert("Notifiche non autorizzate");
return;

}



const registration =
await navigator.serviceWorker.register(
"/firebase-messaging-sw.js"
);

console.log("SERVICE WORKER:", registration);


const token =
await getToken(
messaging,
{

vapidKey:
"BFbZ0Pz3kOKUY0FQFGy85omU5UT22XK4Dg8NDkiU4gueTSN4J8KJLz3-XKIV73Upqe1XZLS1yRnq9_9yBFMgBfCc"

serviceWorkerRegistration:
registration

}

);



console.log(
"TOKEN:",
token
);



await firestore.setDoc(

firestore.doc(
db,
"users",
user.uid
),

{

email:user.email,

fcmTokens:
firestore.arrayUnion(token),

lastUpdate:
new Date()

},

{merge:true}

);



console.log(
"✅ Token salvato"
);



alert(
"✅ Notifiche attivate"
);



btn.style.display="none";



}catch(err){


console.error(
"Errore notifiche:",
err
);


alert(
"❌ Errore attivazione notifiche:\n\n"+err.message
);


}


};


}


export function listenForegroundNotifications(){


onMessage(
messaging,
(payload)=>{


console.log(
"📩 NOTIFICA APP APERTA:",
payload
);



const title =
payload.notification?.title ||
"Nuova notifica";


const body =
payload.notification?.body ||
"";



alert(
`${title}\n\n${body}`
);



}

);


}
