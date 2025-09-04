import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const firebaseConfig = {
  // TODO: Add your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const inventoryCol = collection(db, 'inventory');
const transactionsCol = collection(db, 'transactions');

async function loadInventory() {
  const snapshot = await getDocs(inventoryCol);
  const tbody = document.querySelector('#inventory-list tbody');
  tbody.innerHTML = '';
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data.name}</td>
      <td>${data.quantity}</td>
      <td>${data.cost}</td>
      <td>${data.threshold}</td>
      <td>
        <button class="edit" data-id="${docSnap.id}">Edit</button>
        <button class="delete" data-id="${docSnap.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadTransactions() {
  const snapshot = await getDocs(transactionsCol);
  const tbody = document.querySelector('#transaction-list tbody');
  tbody.innerHTML = '';
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data.type}</td>
      <td>${data.amount}</td>
      <td>${data.date}</td>
      <td>${data.note || ''}</td>
      <td>
        <button class="edit" data-id="${docSnap.id}">Edit</button>
        <button class="delete" data-id="${docSnap.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('inventory-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value,
    quantity: Number(form.quantity.value),
    cost: Number(form.cost.value),
    threshold: Number(form.threshold.value)
  };
  await addDoc(inventoryCol, data);
  form.reset();
  await loadInventory();
  await updateSummary();
});

document.getElementById('transaction-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    type: form.type.value,
    amount: Number(form.amount.value),
    date: form.date.value,
    note: form.note.value
  };
  await addDoc(transactionsCol, data);
  form.reset();
  await loadTransactions();
  await updateSummary();
});

document.getElementById('inventory-list').addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete')) {
    const id = e.target.dataset.id;
    await deleteDoc(doc(db, 'inventory', id));
    await loadInventory();
    await updateSummary();
  }
  if (e.target.classList.contains('edit')) {
    const id = e.target.dataset.id;
    const row = e.target.closest('tr');
    const data = {
      name: prompt('Name', row.children[0].textContent) || row.children[0].textContent,
      quantity: Number(prompt('Quantity', row.children[1].textContent) || row.children[1].textContent),
      cost: Number(prompt('Cost', row.children[2].textContent) || row.children[2].textContent),
      threshold: Number(prompt('Threshold', row.children[3].textContent) || row.children[3].textContent)
    };
    await updateDoc(doc(db, 'inventory', id), data);
    await loadInventory();
    await updateSummary();
  }
});

document.getElementById('transaction-list').addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete')) {
    const id = e.target.dataset.id;
    await deleteDoc(doc(db, 'transactions', id));
    await loadTransactions();
    await updateSummary();
  }
  if (e.target.classList.contains('edit')) {
    const id = e.target.dataset.id;
    const row = e.target.closest('tr');
    const data = {
      type: prompt('Type (in/out)', row.children[0].textContent) || row.children[0].textContent,
      amount: Number(prompt('Amount', row.children[1].textContent) || row.children[1].textContent),
      date: prompt('Date', row.children[2].textContent) || row.children[2].textContent,
      note: prompt('Note', row.children[3].textContent) || row.children[3].textContent
    };
    await updateDoc(doc(db, 'transactions', id), data);
    await loadTransactions();
    await updateSummary();
  }
});

async function updateSummary() {
  const invSnap = await getDocs(inventoryCol);
  const lowList = document.getElementById('low-stock-list');
  lowList.innerHTML = '';
  invSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.quantity <= data.threshold) {
      const li = document.createElement('li');
      li.textContent = `${data.name} (${data.quantity})`;
      lowList.appendChild(li);
    }
  });

  const transSnap = await getDocs(transactionsCol);
  let balance = 0;
  transSnap.forEach((docSnap) => {
    const t = docSnap.data();
    balance += t.type === 'in' ? Number(t.amount) : -Number(t.amount);
  });
  document.getElementById('cash-balance').textContent = balance.toFixed(2);
}

loadInventory();
loadTransactions();
updateSummary();
