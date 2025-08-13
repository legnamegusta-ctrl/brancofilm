importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAaaXxKG4BwAKIBdDk0vrSNsQzK8BbWIA0",
  authDomain: "brancofilmcv.firebaseapp.com",
  projectId: "brancofilmcv",
  storageBucket: "brancofilmcv.firebasestorage.app",
  messagingSenderId: "513537369615",
  appId: "1:513537369615:web:6cfec35394b5852857e57a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const notification = payload.notification || {};
  self.registration.showNotification(notification.title || '', {
    body: notification.body || ''
  });
});
