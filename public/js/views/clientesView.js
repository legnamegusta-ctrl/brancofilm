// js/views/clientesView.js
import {
  getCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getVehiclesForCustomer,
  addVehicle,
  deleteVehicle
} from '../services/firestoreService.js';

const appContainer = document.getElementById('app-container');
const PAGE_SIZE = 6;
let customers = [];
let lastId = null;

export const renderClientesView = async (maybeId) => {
  if (maybeId) return renderCustomerDetail(maybeId);

  customers = [];
  lastId = null;

  appContainer.innerHTML = `
    <section class="card">
      <h2>Clientes</h2>
      <div id="clientes-alert" class="alert" aria-live="polite"></div>
      <form id="form-new-customer" class="grid mt" aria-busy="false">
        <label>Nome <input id="cName" type="text" required /></label>
        <label>Telefone <input id="cPhone" type="tel" required /></label>
        <label>Email (opcional) <input id="cEmail" type="email" /></label>
        <button class="btn">Adicionar</button>
      </form>
      <div class="grid mt">
        <input id="search" class="input" type="search" placeholder="Buscar" />
        <select id="sort" class="input">
          <option value="date">Mais recentes</option>
          <option value="name">A–Z</option>
        </select>
      </div>
      <div id="customers-list" class="mt"></div>
      <button class="btn mt" id="load-more" hidden>Carregar mais</button>
    </section>
  `;

  document.getElementById('form-new-customer').onsubmit = onAddCustomer;
  document.getElementById('search').addEventListener('input', renderCustomerList);
  document.getElementById('sort').addEventListener('change', renderCustomerList);
  document.getElementById('load-more').onclick = () => loadCustomers();

  await loadCustomers(true);
};

async function onAddCustomer(e) {
  e.preventDefault();
  const form = e.target;
  const name = document.getElementById('cName').value.trim();
  const phone = document.getElementById('cPhone').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  if (!name || !phone) return;
  setBusy(form, true);
  try {
    await addCustomer({ name, phone, email: email || null });
    showAlert('success', 'Cliente adicionado.');
    form.reset();
    customers = [];
    lastId = null;
    await loadCustomers(true);
    document.getElementById('cName').focus();
  } catch {
    showAlert('error', 'Erro ao adicionar cliente.');
  }
  setBusy(form, false);
}

async function loadCustomers(reset = false) {
  if (reset) {
    customers = [];
    lastId = null;
  }
  const opts = { order: 'desc', limit: PAGE_SIZE };
  if (lastId) opts.startAfterId = lastId;
  const res = await getCustomers(opts);
  lastId = res.lastId;
  customers = customers.concat(res);
  renderCustomerList();
  document.getElementById('load-more').hidden = !lastId || document.getElementById('sort').value !== 'date';
}

function renderCustomerList() {
  const container = document.getElementById('customers-list');
  const search = document.getElementById('search').value.toLowerCase();
  const sort = document.getElementById('sort').value;

  let list = customers.slice();
  if (search) {
    list = list.filter(c =>
      c.name?.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search)
    );
  }
  if (sort === 'name') {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (!list.length) {
    container.innerHTML = '<p class="muted">Nenhum cliente encontrado.</p>';
    return;
  }

  container.innerHTML = `
    <div class="grid-2">
      ${list.map(renderCard).join('')}
    </div>
  `;

  list.forEach(c => updateVehicleBadge(c.id));
  container.onclick = onListClick;
}

function renderCard(c) {
  return `
    <div class="card" data-id="${c.id}">
      <div class="card-header flex between">
        <span>${esc(c.name || '-')}</span>
        <span class="badge" data-badge="${c.id}">0</span>
      </div>
      <div class="card-body">
        <p><b>Telefone:</b> ${esc(c.phone || '-')}</p>
        <p><b>Email:</b> ${esc(c.email || '-')}</p>
      </div>
      <div class="card-actions">
        <button class="btn" data-act="open" data-id="${c.id}">Abrir</button>
        <button class="link" data-act="edit" data-id="${c.id}">Editar</button>
        <button class="link" data-act="del" data-id="${c.id}">Excluir</button>
      </div>
    </div>
  `;
}

async function updateVehicleBadge(customerId) {
  const badge = document.querySelector(`[data-badge="${customerId}"]`);
  if (!badge) return;
  const vehicles = await getVehiclesForCustomer(customerId);
  badge.textContent = vehicles.length;
}

async function onListClick(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;

  if (act === 'open') {
    location.hash = `#clientes/${id}`;
  } else if (act === 'del') {
    const vehicles = await getVehiclesForCustomer(id);
    if (vehicles.length) {
      showAlert('error', 'Exclua os veículos antes de remover o cliente.');
      return;
    }
    if (confirm('Excluir cliente?')) {
      await deleteCustomer(id).catch(() => {});
      customers = customers.filter(c => c.id !== id);
      renderCustomerList();
      showAlert('success', 'Cliente excluído.');
    }
  } else if (act === 'edit') {
    showEditForm(id);
  }
}

function showEditForm(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  const c = customers.find(x => x.id === id);
  if (!card || !c) return;
  card.innerHTML = `
    <form class="grid" data-edit="${id}" aria-busy="false">
      <label>Nome <input id="eName-${id}" value="${attr(c.name)}" required /></label>
      <label>Telefone <input id="ePhone-${id}" value="${attr(c.phone)}" required /></label>
      <label>Email <input id="eEmail-${id}" value="${attr(c.email || '')}" type="email" /></label>
      <div class="card-actions">
        <button class="btn">Salvar</button>
        <button type="button" class="link" data-cancel="${id}">Cancelar</button>
      </div>
    </form>
  `;

  const form = card.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById(`eName-${id}`).value.trim(),
      phone: document.getElementById(`ePhone-${id}`).value.trim(),
      email: document.getElementById(`eEmail-${id}`).value.trim() || null
    };
    if (!data.name || !data.phone) return;
    setBusy(form, true);
    try {
      await updateCustomer(id, data);
      Object.assign(c, data);
      showAlert('success', 'Cliente atualizado.');
      renderCustomerList();
    } catch {
      showAlert('error', 'Erro ao atualizar.');
      setBusy(form, false);
    }
  };
  form.querySelector('[data-cancel]')?.addEventListener('click', renderCustomerList);
  card.querySelector('input')?.focus();
}

async function renderCustomerDetail(customerId) {
  const c = await getCustomerById(customerId);
  if (!c) {
    appContainer.innerHTML = '<p class="card">Cliente não encontrado.</p>';
    return;
  }
  const vehicles = await getVehiclesForCustomer(customerId);

  appContainer.innerHTML = `
    <section class="card">
      <button class="link" id="back">&larr; Voltar</button>
      <h2>${esc(c.name || 'Cliente')}</h2>
      <p class="muted">${esc(c.phone || '')}${c.email ? ' · ' + esc(c.email) : ''}</p>
      <div id="clientes-alert" class="alert" aria-live="polite"></div>

      <h3 class="mt">Veículos</h3>
      <form id="form-vehicle" class="grid mt" aria-busy="false">
        <label>Placa <input id="vPlate" required /></label>
        <label>Modelo <input id="vModel" required /></label>
        <button class="btn">Adicionar veículo</button>
      </form>

      <ul id="vehicles" class="list mt"></ul>
      <div class="card-actions mt">
        <button class="link" id="delCustomer">Excluir cliente</button>
      </div>
    </section>
  `;

  document.getElementById('back').onclick = () => { location.hash = '#clientes'; };
  document.getElementById('form-vehicle').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const plate = document.getElementById('vPlate').value.trim().toUpperCase();
    const model = document.getElementById('vModel').value.trim();
    if (!plate || !model) return;
    setBusy(form, true);
    try {
      await addVehicle({ plate, model, customerId });
      showAlert('success', 'Veículo adicionado.');
      renderCustomerDetail(customerId);
    } catch {
      showAlert('error', 'Erro ao adicionar veículo.');
      setBusy(form, false);
    }
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
        await deleteVehicle(btn.dataset.del).catch(() => {});
        showAlert('success', 'Veículo excluído.');
        renderCustomerDetail(customerId);
      }
    };
  }

  document.getElementById('delCustomer').onclick = async () => {
    if (vehicles.length) {
      showAlert('error', 'Exclua os veículos antes de remover o cliente.');
      return;
    }
    if (confirm('Excluir cliente?')) {
      await deleteCustomer(customerId).catch(() => {});
      location.hash = '#clientes';
    }
  };
}

function showAlert(type, msg) {
  const el = document.getElementById('clientes-alert');
  if (!el) return;
  el.textContent = msg;
  el.className = `alert ${type}`;
  if (!msg) el.className = 'alert';
}

function setBusy(form, busy) {
  form.setAttribute('aria-busy', busy);
  form.querySelectorAll('input, button').forEach(el => (el.disabled = busy));
}

const esc = (s = '') => s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const attr = (s = '') => esc(s).replace(/"/g, '&quot;');

