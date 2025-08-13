// js/services/firestoreService.js
import { db } from '../firebase-config.js';
import {
  collection, query, where,
  getDocs, getDoc, addDoc,
  doc, updateDoc, deleteDoc,
  orderBy, serverTimestamp,
  startAfter, limit as limitFn
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
