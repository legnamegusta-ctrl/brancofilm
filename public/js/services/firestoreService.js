// js/services/firestoreService.js
import { db } from '../firebase-config.js';
import {
  collection, query, where,
  getDocs, getDoc, addDoc,
  doc, updateDoc, deleteDoc,
  orderBy, serverTimestamp,
  startAfter, limit as limitFn,
  Timestamp, setDoc, writeBatch,
  arrayUnion, enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Coleções ---
const customersCollection = collection(db, 'customers');
const vehiclesCollection  = collection(db, 'vehicles');
const servicosCollection  = collection(db, 'services');
const ordersCollection    = collection(db, 'orders');

// --- Clientes ---
export async function getCustomers(opts = {}) {
  const { order = 'desc', limit: limitCount, startAfterId } = opts;

  let q = query(customersCollection, orderBy('createdAt', order));

  if (startAfterId) {
    const startDoc = await getDoc(doc(customersCollection, startAfterId));
    if (startDoc.exists()) q = query(q, startAfter(startDoc));
  }

  if (limitCount) {
    q = query(q, limitFn(limitCount));
  }

  const snap = await getDocs(q).catch(async () => await getDocs(customersCollection));

  const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.lastId = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;
  return arr;
}
export async function getCustomerById(id) {
  const dref = await getDoc(doc(db, 'customers', id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}
export async function addCustomer(data) {
  const res = await addDoc(customersCollection, {
    ...data,
    createdAt: serverTimestamp()
  });
  return res.id;
}
export function updateCustomer(id, data) {
  return updateDoc(doc(db, 'customers', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}
export function deleteCustomer(id) {
  return deleteDoc(doc(db, 'customers', id));
}

// --- Veículos ---
export async function getVehiclesForCustomer(customerId) {
  const q = query(vehiclesCollection, where('customerId','==', customerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function getVehicleById(id) {
  const dref = await getDoc(doc(vehiclesCollection, id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}
export async function addVehicle(data) {
  const res = await addDoc(vehiclesCollection, { ...data, createdAt: serverTimestamp() });
  return res.id;
}
export function deleteVehicle(id) {
  return deleteDoc(doc(db, 'vehicles', id));
}

// --- Serviços ---
export async function getServicos() {
  const q = query(servicosCollection, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export function addServico({ name, price }) {
  return addDoc(servicosCollection, {
    name,
    price: Number(price) || 0,
    createdAt: serverTimestamp()
  });
}
export async function getServicoById(id) {
  const dref = await getDoc(doc(servicosCollection, id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}
export function updateServico(id, data) {
  return updateDoc(doc(servicosCollection, id), data);
}
export function deleteServico(id) {
  return deleteDoc(doc(servicosCollection, id));
}

// --- Ordens de Serviço ---
export async function getOrders(opts = {}) {
  const { status, from, to, limit: limitCount, startAfterId } = opts;
  let q = ordersCollection;

  if (status) q = query(q, where('status', '==', status));
  if (from)   q = query(q, where('scheduledStart', '>=', from));
  if (to)     q = query(q, where('scheduledStart', '<=', to));

  if (from || to) {
    q = query(q, orderBy('scheduledStart', 'asc'));
  } else {
    q = query(q, orderBy('createdAt', 'desc'));
  }

  if (startAfterId) {
    const startDoc = await getDoc(doc(ordersCollection, startAfterId));
    if (startDoc.exists()) q = query(q, startAfter(startDoc));
  }
  if (limitCount) q = query(q, limitFn(limitCount));

  const snap = await getDocs(q);
  const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  arr.lastId = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;
  return arr;
}
export async function getOrderById(id) {
  const dref = await getDoc(doc(ordersCollection, id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}
export async function addOrder(data) {
  const res = await addDoc(ordersCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return res.id;
}
export function updateOrder(id, data) {
  return updateDoc(doc(ordersCollection, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
export function deleteOrder(id) {
  return deleteDoc(doc(ordersCollection, id));
}

// --- Utilitários para dashboard ---
export async function countCustomers() {
  const snap = await getDocs(customersCollection);
  return snap.size;
}

export async function countVehicles() {
  const snap = await getDocs(vehiclesCollection);
  return snap.size;
}

export async function countServices() {
  const snap = await getDocs(servicosCollection);
  return snap.size;
}

export async function countOrders(opts = {}) {
  const { status, from, to } = opts;
  let q = ordersCollection;
  if (status) q = query(q, where('status', '==', status));
  if (from) q = query(q, where('scheduledStart', '>=', from));
  if (to) q = query(q, where('scheduledStart', '<=', to));
  if (from || to) q = query(q, orderBy('scheduledStart', 'asc'));
  const snap = await getDocs(q);
  return snap.size;
}

export async function sumOrdersTotal(opts = {}) {
  const { status = 'concluido', from, to } = opts;
  let q = ordersCollection;
  if (status) q = query(q, where('status', '==', status));
  if (from) q = query(q, where('updatedAt', '>=', from));
  if (to) q = query(q, where('updatedAt', '<=', to));
  const snap = await getDocs(q);
  return snap.docs.reduce((s, d) => s + (Number(d.data().total) || 0), 0);
}

export async function getNextSchedules(limit = 5) {
  const now = Timestamp.now();
  const q = query(
    ordersCollection,
    where('scheduledStart', '>=', now),
    orderBy('scheduledStart', 'asc'),
    limitFn(limit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- Relatórios ---
export async function getOrdersFinished({ from, to } = {}) {
  let q = query(ordersCollection, where('status', '==', 'concluido'));
  if (from) q = query(q, where('closedAt', '>=', from));
  if (to)   q = query(q, where('closedAt', '<=', to));
  q = query(q, orderBy('closedAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getOrdersByStatus({ from, to } = {}) {
  let q = ordersCollection;
  if (from) q = query(q, where('createdAt', '>=', from));
  if (to)   q = query(q, where('createdAt', '<=', to));
  const snap = await getDocs(q);
  const counts = {};
  snap.docs.forEach(d => {
    const st = d.data().status || 'novo';
    counts[st] = (counts[st] || 0) + 1;
  });
  return counts;
}

export async function getCycleDurations({ from, to } = {}) {
  const orders = await getOrdersFinished({ from, to });
  const durations = orders.map(o => {
    const start = o.createdAt?.toDate();
    const end = o.closedAt?.toDate() || o.updatedAt?.toDate();
    return start && end ? end.getTime() - start.getTime() : null;
  }).filter(Boolean);
  const avg = durations.length ? durations.reduce((a,b)=>a+b,0) / durations.length : 0;
  return { durations, avg };
}

// --- Usuários ---
const usersCollection = collection(db, 'users');

export async function ensureUserDocOnLogin(user) {
  if (!user) return null;
  const ref = doc(usersCollection, user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: 'user',
      active: true,
      createdAt: serverTimestamp()
    });
    return { uid: user.uid, email: user.email, displayName: user.displayName, role: 'user', active: true };
  }
  return { id: snap.id, ...snap.data() };
}

export async function getUsers() {
  const q = query(usersCollection, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function updateUserRole(uid, role) {
  return updateDoc(doc(usersCollection, uid), { role });
}

export function toggleUserActive(uid, active) {
  return updateDoc(doc(usersCollection, uid), { active });
}

// --- Backup ---
export async function exportCollections(keys = []) {
  const out = {};
  for (const k of keys) {
    const snap = await getDocs(collection(db, k));
    out[k] = snap.docs.map(d => {
      const data = { id: d.id, ...d.data() };
      Object.keys(data).forEach(key => {
        if (data[key] instanceof Timestamp) {
          data[key] = data[key].toDate().toISOString();
        }
      });
      return data;
    });
  }
  return JSON.stringify(out);
}

export async function importCollections(json, opts = { mode: 'merge', collections: [] }, progressCb) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  for (const key of opts.collections) {
    const coll = collection(db, key);
    if (opts.mode === 'overwrite') {
      const snap = await getDocs(coll);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    const docs = data[key] || [];
    let i = 0;
    while (i < docs.length) {
      const batch = writeBatch(db);
      docs.slice(i, i + 500).forEach(obj => {
        const { id, ...rest } = obj;
        Object.keys(rest).forEach(k => {
          if (typeof rest[k] === 'string' && rest[k].match(/T/)) {
            rest[k] = Timestamp.fromDate(new Date(rest[k]));
          }
        });
        batch.set(doc(coll, id), rest, { merge: true });
      });
      await batch.commit();
      i += 500;
      if (progressCb) progressCb(Math.min(i / docs.length, 1));
    }
  }
}

// --- FCM e Agenda helpers ---
export async function listAdminTokens() {
  const snap = await getDocs(query(usersCollection, where('role', '==', 'admin')));
  const tokens = [];
  snap.docs.forEach(d => {
    const arr = d.data().fcmTokens || [];
    arr.forEach(t => tokens.push(t));
  });
  return tokens;
}

export async function saveUserFcmToken(uid, token) {
  if (!uid || !token) return;
  await updateDoc(doc(usersCollection, uid), { fcmTokens: arrayUnion(token) });
}

export async function ordersInNext(hours = 24) {
  const now = Timestamp.now();
  const end = Timestamp.fromDate(new Date(Date.now() + hours * 60 * 60 * 1000));
  const q = query(
    ordersCollection,
    where('scheduledStart', '>=', now),
    where('scheduledStart', '<=', end)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function hasScheduleConflict({ customerId, vehicleId, start, end, excludeOrderId } = {}) {
  let q = ordersCollection;
  if (customerId) q = query(q, where('customerId', '==', customerId));
  if (vehicleId) q = query(q, where('vehicleId', '==', vehicleId));
  if (end) q = query(q, where('scheduledStart', '<', end));
  const snap = await getDocs(q);
  const s = start instanceof Date ? start : start.toDate();
  const e = end ? (end instanceof Date ? end : end.toDate()) : s;
  return snap.docs.some(d => {
    if (excludeOrderId && d.id === excludeOrderId) return false;
    const data = d.data();
    const st = data.scheduledStart?.toDate();
    const en = data.scheduledEnd ? data.scheduledEnd.toDate() : null;
    const endComp = en || new Date(st.getTime() + 1);
    return s < endComp && e > st;
  });
}

export function enableOfflinePersistence() {
  return enableIndexedDbPersistence(db);
}
