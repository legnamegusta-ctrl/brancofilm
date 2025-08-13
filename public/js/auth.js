import { auth } from './firebase-config.js';
import { navigate } from './router.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export function signIn(email, pass) {
  return signInWithEmailAndPassword(auth, email, pass);
}

export function signUp(email, pass) {
  return createUserWithEmailAndPassword(auth, email, pass);
}

export function sendReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function signOut() {
  return firebaseSignOut(auth);
}

const header = document.querySelector('header');
const loginView = document.getElementById('login-view');
const whoami = document.getElementById('whoami');
const appContainer = document.getElementById('app-container');

// Listeners for forms
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    try {
      await signIn(email, pass);
    } catch (err) {
      alert(err.message);
    }
  };
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const pass = document.getElementById('signup-pass').value.trim();
    try {
      await signUp(email, pass);
    } catch (err) {
      alert(err.message);
    }
  };
}

const resetLink = document.getElementById('reset-link');
if (resetLink) {
  resetLink.onclick = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      alert('Informe o email para reset.');
      return;
    }
    try {
      await sendReset(email);
      alert('Email de redefinição enviado.');
    } catch (err) {
      alert(err.message);
    }
  };
}

const btnSignOut = document.getElementById('btnSignOut');
if (btnSignOut) {
  btnSignOut.onclick = () => signOut();
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    whoami.textContent = user.email;
    header.style.display = '';
    loginView.style.display = 'none';
    if (location.hash === '#login' || !location.hash) {
      location.hash = '#dashboard';
    }
    navigate();
  } else {
    whoami.textContent = '';
    header.style.display = 'none';
    loginView.style.display = '';
    appContainer.innerHTML = '';
    if (location.hash !== '#login') {
      location.hash = '#login';
    }
  }
});

