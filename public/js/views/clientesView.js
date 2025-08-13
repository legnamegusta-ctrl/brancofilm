// js/views/clientesView.js
import {
  getCustomers, getCustomerById,
  addCustomer, updateCustomer,
  getVehiclesForCustomer, addVehicle, deleteVehicle,
  deleteCustomer
} from '../services/firestoreService.js';

const appContainer = document.getElementById('app-container');

export const renderClientesView = async (maybeId) => {
  if (maybeId) return renderCustomerDetail(maybeId);

  appContainer.innerHTML = `
    <section class="card">
      <h2>Clientes</h2>
      <form id="form-new-customer" class="grid mt">
        <label>Nome <input id="cName" type="text" required /></label>
        <label>Telefone <input id="cPhone" type="tel" required /></label>
        <label>Email (opcional) <input id="cEmail" type="email" /></label>
        <button class="btn">Adicionar</button>
      </form>
      <div id="customers-list" class="mt"></div>
    </section>
  `;

  document.getElementById('form-new-customer').onsubmit = async (e) => {
    e.preventDefault();
    const name  = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    if (!name || !phone) return;
    await addCustomer({ name, phone, email: email || null });
    e.target.reset();
    renderClientesView();
  };

  await renderCustomerList();
};

async function renderCustomerList() {
  const customers = await getCustomers();
  const container = document.getElementById('customers-list');

  if (!customers.length) {
    container.innerHTML = '<p class="muted">Nenhum cliente cadastrado.</p>';
    return;
  }

  container.innerHTML = `
    <div class="grid-2">
      ${customers.map(c => `
        <div class="card">
          <div class="card-header">${esc(c.name || '-')}</div>
          <div class="card-body">
            <p><b>Telefone:</b> ${esc(c.phone || '-')}</p>
            <p><b>Email:</b> ${esc(c.email || '-')}</p>
          </div>
          <div class="card-actions">
            <button class="btn" data-act="open" data-id="${c.id}">Abrir</button>
            <button class="link" data-act="del" data-id="${c.id}">Excluir</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.onclick = async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const { act, id } = btn.dataset;
    if (act === 'open') {
      location.hash = `#clientes/${id}`;
    } else if (act === 'del') {
      if (confirm('Excluir cliente?')) {
        await deleteCustomer(id).catch(()=>{});
        renderClientesView();
      }
    }
  };
}

async function renderCustomerDetail(customerId) {
  const c = await getCustomerById(customerId);
  const vehicles = await getVehiclesForCustomer(customerId);

  appContainer.innerHTML = `
    <section class="card">
      <button class="link" id="back">&larr; Voltar</button>
      <h2>${esc(c?.name || 'Cliente')}</h2>
      <p class="muted">${esc(c?.phone || '')} ${c?.email ? '· '+esc(c.email): ''}</p>

      <h3 class="mt">Veículos</h3>
      <form id="form-vehicle" class="grid mt">
        <label>Placa <input id="vPlate" required /></label>
        <label>Modelo <input id="vModel" required /></label>
        <button class="btn">Adicionar veículo</button>
      </form>

      <ul id="vehicles" class="list mt"></ul>
    </section>
  `;

  document.getElementById('back').onclick = () => { location.hash = '#clientes'; };

  document.getElementById('form-vehicle').onsubmit = async (e) => {
    e.preventDefault();
    const plate = document.getElementById('vPlate').value.trim().toUpperCase();
    const model = document.getElementById('vModel').value.trim();
    if (!plate || !model) return;
    await addVehicle({ plate, model, customerId });
    renderCustomerDetail(customerId);
  };

  const ul = document.getElementById('vehicles');
  if (!vehicles.length) {
    ul.innerHTML = '<li class="muted">Nenhum veículo.</li>';
  } else {
    ul.innerHTML = vehicles.map(v => `
      <li class="item">
        <div><b>${esc(v.plate)}</b> — ${esc(v.model)}</div>
        <button class="link" data-del="${v.id}">Excluir</button>
      </li>
    `).join('');
    ul.onclick = async (e) => {
      const btn = e.target.closest('button[data-del]');
      if (!btn) return;
      if (confirm('Excluir veículo?')) {
        await deleteVehicle(btn.dataset.del).catch(()=>{});
        renderCustomerDetail(customerId);
      }
    };
  }
}

const esc = (s='') => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
