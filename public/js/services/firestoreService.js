// js/services/firestoreService.js

import { db } from '../firebase-config.js';
import { 
    collection, 
    query,
    where,
    getDocs, 
    getDoc,
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- COLEÇÕES ---
const servicosCollection = collection(db, 'services');
const customersCollection = collection(db, 'customers');
const vehiclesCollection = collection(db, 'vehicles');
const serviceOrdersCollection = collection(db, 'serviceOrders');

// --- FUNÇÕES DE SERVIÇOS ---
export const getServicos = async () => {
    const snapshot = await getDocs(servicosCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// ... (outras funções de serviço permanecem iguais)
export const getServicoById = async (id) => {
    const servicoDoc = doc(db, 'services', id);
    const snapshot = await getDoc(servicoDoc);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
export const addServico = (nome, preco) => {
    return addDoc(servicosCollection, { name: nome, price: Number(preco), isActive: true });
};
export const updateServico = (id, data) => {
    const servicoDoc = doc(db, 'services', id);
    const dataToUpdate = { name: data.name, price: Number(data.price) };
    return updateDoc(servicoDoc, dataToUpdate);
}
export const deleteServico = (id) => {
    const servicoDoc = doc(db, 'services', id);
    return deleteDoc(servicoDoc);
}

// --- FUNÇÕES DE CLIENTES ---
export const getCustomers = async () => {
    const snapshot = await getDocs(customersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// ... (outras funções de clientes permanecem iguais)
export const getCustomerById = async (id) => {
    const customerDoc = doc(db, 'customers', id);
    const snapshot = await getDoc(customerDoc);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};
export const addCustomer = (data) => {
    return addDoc(customersCollection, data);
};
export const updateCustomer = (id, data) => {
    const customerDoc = doc(db, 'customers', id);
    return updateDoc(customerDoc, data);
};
export const deleteCustomer = (id) => {
    const customerDoc = doc(db, 'customers', id);
    return deleteDoc(customerDoc);
};

// --- FUNÇÕES DE VEÍCULOS ---
export const getVehiclesForCustomer = async (customerId) => {
    const q = query(vehiclesCollection, where("customerId", "==", customerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// ... (outras funções de veículos permanecem iguais)
export const addVehicle = (data) => {
    return addDoc(vehiclesCollection, data);
};
export const deleteVehicle = (id) => {
    const vehicleDoc = doc(db, 'vehicles', id);
    return deleteDoc(vehicleDoc);
};


// --- FUNÇÕES DE ORDENS DE SERVIÇO (AGENDA) ---
export const getServiceOrders = async () => {
    const snapshot = await getDocs(serviceOrdersCollection);
    // Transforma os dados do Firestore para o formato que o FullCalendar entende
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            title: `${data.customer.name} - ${data.vehicle.model}`,
            start: data.start.toDate(), // Converte Timestamp para objeto Date
            end: data.end.toDate(),
            extendedProps: data // Armazena todos os outros dados aqui
        }
    });
};

export const getServiceOrderById = async (id) => {
    const orderDoc = doc(db, 'serviceOrders', id);
    const snapshot = await getDoc(orderDoc);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export const addServiceOrder = (data) => {
    return addDoc(serviceOrdersCollection, data);
};

export const updateServiceOrder = (id, data) => {
    const orderDoc = doc(db, 'serviceOrders', id);
    return updateDoc(orderDoc, data);
};

export const deleteServiceOrder = (id) => {
    const orderDoc = doc(db, 'serviceOrders', id);
    return deleteDoc(orderDoc);
};