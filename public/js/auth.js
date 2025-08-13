import { auth } from './firebase-config.js';
import { navigate } from './router.js';
import { ensureUserDocOnLogin } from './services/firestoreService.js';
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

export function signOutUser() {
  return firebaseSignOut(auth);
}

const authShell = document.querySelector('.auth-shell');
const authAlert = document.getElementById('auth-alert');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const resetForm = document.getElementById('reset-form');
const showPassBtns = document.querySelectorAll('.show-pass-btn');

const header = document.querySelector('header');
const nav = document.getElementById('main-nav');
const whoami = document.getElementById('whoami');
const appContainer = document.getElementById('app-container');
const btnSignOut = document.getElementById('btnSignOut');

function mapError(code) {
  const map = {
    'auth/invalid-email': 'Email inválido.',
    'auth/user-disabled': 'Usuário desativado.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Email já cadastrado.',
    'auth/weak-password': 'Senha fraca. Use pelo menos 6 caracteres.',
    'auth/missing-password': 'Informe a senha.'
  };
  return map[code] || 'Ocorreu um erro. Tente novamente.';
}

function showAlert(type, msg) {
  authAlert.textContent = msg;
  authAlert.className = `alert ${type}`;
  authAlert.style.display = 'block';
}

function clearAlert() {
  authAlert.textContent = '';
  authAlert.className = 'alert';
  authAlert.style.display = 'none';
}

function setBusy(form, busy) {
  form.setAttribute('aria-busy', busy);
  const elements = form.querySelectorAll('input, button');
  elements.forEach(el => (el.disabled = busy));
  const spinner = form.querySelector('.spinner');
  if (spinner) spinner.hidden = !busy;
}

let activateTab;
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('[role="tabpanel"]');
  const linkReset = document.getElementById('link-reset');
  const backToLogin = document.getElementById('back-to-login');

  function show(id) {
    clearAlert();
    tabButtons.forEach(btn => {
      const selected = btn.dataset.target === `#${id}`;
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    panels.forEach(p => {
      p.hidden = p.id !== id;
    });
    const panel = document.getElementById(id);
    const focusable = panel?.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => show(btn.dataset.target.substring(1)));
  });

  linkReset?.addEventListener('click', (e) => {
    e.preventDefault();
    show('tab-reset');
  });
  backToLogin?.addEventListener('click', () => show('tab-login'));

  const first = document.querySelector('.tab-btn[aria-selected="true"]');
  if (first) show(first.dataset.target.substring(1));

  activateTab = show;
}

document.addEventListener('DOMContentLoaded', initTabs);

showPassBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement?.querySelector('input');
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword
      ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.29 20.29 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a20.29 20.29 0 0 1-4.06 4.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  });
});

signinForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  const email = document.getElementById('signin-email').value.trim();
  const pass = document.getElementById('signin-pass').value;
  setBusy(signinForm, true);
  try {
    await signIn(email, pass);
    location.hash = '#dashboard';
  } catch (err) {
    showAlert('error', mapError(err.code));
  } finally {
    setBusy(signinForm, false);
  }
});

signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  if (pass.length < 6) {
    showAlert('error', 'Senha deve ter ao menos 6 caracteres.');
    return;
  }
  setBusy(signupForm, true);
  try {
    await signUp(email, pass);
    location.hash = '#dashboard';
  } catch (err) {
    showAlert('error', mapError(err.code));
  } finally {
    setBusy(signupForm, false);
  }
});

resetForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  const email = document.getElementById('reset-email').value.trim();
  setBusy(resetForm, true);
  try {
    await sendReset(email);
    showAlert('success', 'Email de redefinição enviado.');
    activateTab && activateTab('tab-login');
  } catch (err) {
    showAlert('error', mapError(err.code));
  } finally {
    setBusy(resetForm, false);
  }
});

btnSignOut?.addEventListener('click', () => signOutUser());

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await ensureUserDocOnLogin(user);
    window.sessionState = { role: userDoc?.role || 'user' };
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = window.sessionState.role === 'admin' ? '' : 'none';
    });
    whoami.textContent = user.email;
    nav.style.display = '';
    authShell.style.display = 'none';
    if (location.hash === '#login' || !location.hash) {
      location.hash = '#dashboard';
    }
    navigate();
  } else {
    window.sessionState = {};
    document.querySelectorAll('.admin-only').forEach(el => { el.style.display = 'none'; });
    whoami.textContent = '';
    nav.style.display = 'none';
    authShell.style.display = '';
    appContainer.innerHTML = '';
    if (location.hash !== '#login') {
      location.hash = '#login';
    }
  }
});

