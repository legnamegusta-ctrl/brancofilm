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
import {
  getStorage, ref, listAll, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- Coleções ---
const customersCollection = collection(db, 'customers');
const vehiclesCollection  = collection(db, 'vehicles');
const servicosCollection  = collection(db, 'services');
const ordersCollection    = collection(db, 'orders');
const quotesCollection    = collection(db, 'quotes');
const unitsCollection     = collection(db, 'units');
const clientErrorsCollection = collection(db, 'clientErrors');

const appSettingsDoc = doc(db, 'settings', 'app');

const memCache = {};
let currentUnitId = null;
export function setServiceUnit(id) { currentUnitId = id; }

// --- Clientes ---
export async function getCustomers(opts = {}) {
  const { order = 'desc', limit: limitCount, startAfterId, unitId } = opts;
  const cacheKey = `customers_${unitId || 'all'}_${order}_${limitCount || 0}_${startAfterId || 'start'}`;
  if (memCache[cacheKey]) return memCache[cacheKey];

  let q = query(customersCollection, orderBy('createdAt', order));
  if (unitId) q = query(q, where('unitId', '==', unitId));

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
  const cacheKey = `customers_${unitId || 'all'}_${order}_${limitCount || 0}_${startAfterId || 'start'}`;
  memCache[cacheKey] = arr;
  return arr;
}
export async function getCustomerById(id) {
  const dref = await getDoc(doc(db, 'customers', id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}
export async function addCustomer(data) {
  const res = await addDoc(customersCollection, {
    ...data,
    unitId: data.unitId || currentUnitId || null,
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
  const res = await addDoc(vehiclesCollection, { ...data, unitId: data.unitId || currentUnitId || null, createdAt: serverTimestamp() });
  return res.id;
}
export function deleteVehicle(id) {
  return deleteDoc(doc(db, 'vehicles', id));
}

// --- Serviços ---
export async function getServicos(opts = {}) {
  const { unitId } = opts;
  let q = query(servicosCollection, orderBy('createdAt', 'desc'));
  if (unitId) q = query(q, where('unitId', '==', unitId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export function addServico({ name, price }) {
  return addDoc(servicosCollection, {
    name,
    price: Number(price) || 0,
    unitId: currentUnitId || null,
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
  const { status, from, to, limit: limitCount, startAfterId, unitId } = opts;
  const cacheKey = `orders_${unitId || 'all'}_${status || 'all'}_${from || '0'}_${to || '0'}_${limitCount || 0}_${startAfterId || 'start'}`;
  if (memCache[cacheKey]) return memCache[cacheKey];
  let q = ordersCollection;

  if (status) q = query(q, where('status', '==', status));
  if (from)   q = query(q, where('scheduledStart', '>=', from));
  if (to)     q = query(q, where('scheduledStart', '<=', to));
  if (unitId) q = query(q, where('unitId', '==', unitId));

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
  memCache[cacheKey] = arr;
  return arr;
}
export async function getOrderById(id) {
  const dref = await getDoc(doc(ordersCollection, id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}
export async function addOrder(data) {
  const res = await addDoc(ordersCollection, {
    ...data,
    unitId: data.unitId || currentUnitId || null,
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

export async function countOrdersByStatus({ from, to } = {}) {
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

// --- Kanban e Minha Tarefa ---
export async function getOrdersByStatus(status) {
  const q = query(
    ordersCollection,
    where('status', '==', status),
    orderBy('kanbanOrder', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateOrdersKanban(updates = []) {
  const batch = writeBatch(db);
  updates.forEach(u => {
    const ref = doc(ordersCollection, u.id);
    batch.update(ref, {
      status: u.status,
      kanbanOrder: u.kanbanOrder,
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
}

export function setOrderAssignedTo(orderId, uid) {
  return updateDoc(doc(ordersCollection, orderId), { assignedTo: uid });
}

export async function getOrdersAssignedTo(uid) {
  const q = query(
    ordersCollection,
    where('assignedTo', '==', uid),
    orderBy('scheduledStart', 'asc'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function countOrderPhotos(orderId) {
  const storage = getStorage();
  const folder = ref(storage, `orders/${orderId}/photos`);
  const res = await listAll(folder).catch(() => ({ items: [] }));
  return res.items.length;
}

// --- Pagamentos ---
function paymentsCollection(orderId) {
  return collection(db, `orders/${orderId}/payments`);
}

export async function addPayment(orderId, data) {
  const collRef = paymentsCollection(orderId);
  return addDoc(collRef, {
    ...data,
    amount: Number(data.amount) || 0,
    paidAt: data.paidAt || serverTimestamp()
  });
}

export async function listPayments(orderId) {
  const snap = await getDocs(query(paymentsCollection(orderId), orderBy('paidAt', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function deletePayment(orderId, paymentId) {
  return deleteDoc(doc(db, `orders/${orderId}/payments/${paymentId}`));
}

export function sumPayments(payments = []) {
  return payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

// --- Assinatura ---
export async function saveSignature(orderId, blob, opts = {}) {
  const storage = getStorage();
  const path = `orders/${orderId}/signature.png`;
  const sref = ref(storage, path);
  await uploadBytes(sref, blob, {
    contentType: 'image/png',
    customMetadata: { uploadedBy: opts.uploadedBy || '' }
  });
  return getDownloadURL(sref);
}

export function getSignatureURL(orderId) {
  const storage = getStorage();
  const sref = ref(storage, `orders/${orderId}/signature.png`);
  return getDownloadURL(sref);
}

// --- Orçamentos ---
export async function getQuotes() {
  const snap = await getDocs(query(quotesCollection, orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getQuoteById(id) {
  const dref = await getDoc(doc(quotesCollection, id));
  return dref.exists() ? { id: dref.id, ...dref.data() } : null;
}

export async function addQuote(data) {
  const res = await addDoc(quotesCollection, {
    ...data,
    status: data.status || 'rascunho',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return res.id;
}

export function updateQuote(id, data) {
  return updateDoc(doc(quotesCollection, id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export function deleteQuote(id) {
  return deleteDoc(doc(quotesCollection, id));
}

function makeToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let t = '';
  for (let i = 0; i < 20; i++) t += chars[Math.floor(Math.random()*chars.length)];
  return t;
}

export async function createPublicQuoteSnapshot(quoteId) {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;
  const token = makeToken();
  const data = { ...quote };
  delete data.id;
  const pubRef = doc(collection(db, 'quotes_public'), token);
  await setDoc(pubRef, { ...data, quoteId });
  return token;
}

export async function convertQuoteToOrder(quoteId) {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;
  const { customerId, vehicleId, items, discount, total, notes } = quote;
  const res = await addDoc(ordersCollection, {
    customerId, vehicleId, items, discount, total, notes,
    status: 'novo',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return res.id;
}

// --- Advanced Reports ---
export async function revenueByService({ from, to, unitId } = {}) {
  let q = query(ordersCollection, where('status', '==', 'concluido'));
  if (from) q = query(q, where('closedAt', '>=', from));
  if (to) q = query(q, where('closedAt', '<=', to));
  if (unitId) q = query(q, where('unitId', '==', unitId));
  const snap = await getDocs(q);
  const map = {};
  snap.docs.forEach(d => {
    const data = d.data();
    (data.items || []).forEach(it => {
      const id = it.serviceId || it.id;
      const val = Number(it.price || 0);
      map[id] = (map[id] || 0) + val;
    });
  });
  return Object.entries(map).map(([serviceId, total]) => ({ serviceId, total }));
}

export async function customersStats({ from, to, unitId } = {}) {
  let q = ordersCollection;
  if (from) q = query(q, where('createdAt', '>=', from));
  if (to) q = query(q, where('createdAt', '<=', to));
  if (unitId) q = query(q, where('unitId', '==', unitId));
  const snap = await getDocs(q);
  const seen = new Set();
  const stats = { novos: 0, recorrentes: 0 };
  snap.docs.forEach(d => {
    const cId = d.data().customerId;
    if (!cId) return;
    if (seen.has(cId)) stats.recorrentes += 1; else { stats.novos += 1; seen.add(cId); }
  });
  return stats;
}

export async function conversionStats({ from, to, unitId } = {}) {
  let qQuotes = quotesCollection;
  if (from) qQuotes = query(qQuotes, where('createdAt', '>=', from));
  if (to) qQuotes = query(qQuotes, where('createdAt', '<=', to));
  const quotesSnap = await getDocs(qQuotes);

  let qOrders = query(ordersCollection, where('status', '==', 'concluido'));
  if (from) qOrders = query(qOrders, where('createdAt', '>=', from));
  if (to) qOrders = query(qOrders, where('createdAt', '<=', to));
  if (unitId) qOrders = query(qOrders, where('unitId', '==', unitId));
  const ordersSnap = await getDocs(qOrders);

  const totalQuotes = quotesSnap.size || 1;
  const converted = ordersSnap.size;
  return { totalQuotes, converted, rate: converted / totalQuotes };
}

export async function productivityStats({ from, to, unitId } = {}) {
  let q = query(ordersCollection, where('status', '==', 'concluido'));
  if (from) q = query(q, where('closedAt', '>=', from));
  if (to) q = query(q, where('closedAt', '<=', to));
  if (unitId) q = query(q, where('unitId', '==', unitId));
  const snap = await getDocs(q);
  const map = {};
  snap.docs.forEach(d => {
    const data = d.data();
    const uid = data.assignedTo || 'unassigned';
    const total = Number(data.total) || 0;
    const start = data.createdAt?.toDate();
    const end = data.closedAt?.toDate() || data.updatedAt?.toDate();
    const cycle = start && end ? end.getTime() - start.getTime() : 0;
    if (!map[uid]) map[uid] = { count: 0, total: 0, cycle: [] };
    map[uid].count += 1;
    map[uid].total += total;
    map[uid].cycle.push(cycle);
  });
  return Object.entries(map).map(([uid, info]) => ({
    uid,
    orders: info.count,
    total: info.total,
    avgCycle: info.cycle.length ? info.cycle.reduce((a,b)=>a+b,0)/info.cycle.length : 0,
  }));
}

export async function ordersHeatmap({ from, to, unitId } = {}) {
  let q = ordersCollection;
  if (from) q = query(q, where('createdAt', '>=', from));
  if (to) q = query(q, where('createdAt', '<=', to));
  if (unitId) q = query(q, where('unitId', '==', unitId));
  const snap = await getDocs(q);
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  snap.docs.forEach(d => {
    const date = d.data().createdAt?.toDate();
    if (!date) return;
    heat[date.getDay()][date.getHours()] += 1;
  });
  return heat;
}

// --- Goals ---
export async function getGoals(monthKey) {
  const ref = doc(db, 'settings/goals', monthKey);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export function setGoals(monthKey, data) {
  const ref = doc(db, 'settings/goals', monthKey);
  return setDoc(ref, data, { merge: true });
}

// --- Units helpers ---
export async function getUnits() {
  const snap = await getDocs(unitsCollection);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setDefaultUnitForAll(collections = [], unitId) {
  for (const key of collections) {
    const coll = collection(db, key);
    const snap = await getDocs(coll);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { unitId }));
    await batch.commit();
  }
}

// --- App settings ---
export async function getAppSettings() {
  const snap = await getDoc(appSettingsDoc);
  return snap.exists() ? snap.data() : {};
}

// --- Client error logs ---
export function logClientError(payload) {
  return addDoc(clientErrorsCollection, {
    ...payload,
    ts: payload.ts ? (payload.ts instanceof Date ? Timestamp.fromDate(payload.ts) : payload.ts) : serverTimestamp(),
  });
}

export async function getClientErrors(opts = {}) {
  const { from, to, route } = opts;
  let q = clientErrorsCollection;
  if (route) q = query(q, where('route', '==', route));
  if (from) q = query(q, where('ts', '>=', from));
  if (to) q = query(q, where('ts', '<=', to));
  q = query(q, orderBy('ts', 'desc'), limitFn(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function cleanOldClientErrors(days = 90) {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const q = query(clientErrorsCollection, where('ts', '<', cutoff));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

