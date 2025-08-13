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
const servicosCollection  = collection(db, 'servicos');
const serviceOrdersCollection = collection(db, 'serviceOrders');

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
  const snap = await getDocs(servicosCollection);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export function addServico(name, price) {
  return addDoc(servicosCollection, { name, price: Number(price)||0, createdAt: serverTimestamp() });
}
export async function getServicoById(id) {
  const dref = await getDoc(doc(db, 'servicos', id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}
export function updateServico(id, data) {
  return updateDoc(doc(db, 'servicos', id), data);
}
export function deleteServico(id) {
  return deleteDoc(doc(db, 'servicos', id));
}

// --- Ordens (Agenda) ---
export async function getServiceOrders() {
  const snap = await getDocs(serviceOrdersCollection);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export function addServiceOrder(data) {
  return addDoc(serviceOrdersCollection, { ...data, createdAt: serverTimestamp() });
}
export function updateServiceOrder(id, data) {
  return updateDoc(doc(db, 'serviceOrders', id), data);
}
export function deleteServiceOrder(id) {
  return deleteDoc(doc(db, 'serviceOrders', id));
}
