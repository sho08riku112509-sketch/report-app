importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:"AIzaSyCkETt4udtIVVtHMTyyentSyup08_fTuKI",
  authDomain:"haisha-fd5a6.firebaseapp.com",
  projectId:"haisha-fd5a6",
  storageBucket:"haisha-fd5a6.firebasestorage.app",
  messagingSenderId:"217424745404",
  appId:"1:217424745404:web:485ca0f1649583927dd1b9"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  var title = payload.notification.title || "配車通知";
  var body = payload.notification.body || "";
  return self.registration.showNotification(title, {
    body: body,
    icon: "/favicon.svg"
  });
});
