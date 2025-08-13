import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { app, auth } from './firebase-config.js';
import { saveUserFcmToken } from './services/firestoreService.js';

const messaging = getMessaging(app);
const VAPID_KEY = 'REPLACE_WITH_VAPID_KEY';

export async function requestPermissionAndToken() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (auth.currentUser && token) await saveUserFcmToken(auth.currentUser.uid, token);
  } catch (err) {
    console.warn('FCM token error', err);
  }
}

onMessage(messaging, payload => {
  const msg = payload.notification?.title || 'Notificação';
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
});
