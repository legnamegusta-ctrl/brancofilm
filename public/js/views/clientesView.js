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

const appContainer = document.getElementById('page-content');
const PAGE_SIZE = 6;
let customers = [];
let lastId = null;

export const renderClientesView = async (maybeId) => {
  if (maybeId) return renderCustomerDetail(maybeId);

  customers = [];
  lastId = null;

  setPageHeader({
    title: 'Clientes',
    breadcrumbs: ['Cadastros', 'Clientes'],
    actions: [{ id: 'header-new-customer', label: 'Novo cliente' }]
  });

  appContainer.innerHTML = `
    <div class="card container-md mb-lg">
      <div id="clientes-alert" class="alert" aria-live="polite"></div>
      <form id="form-new-customer" class="form-grid" aria-busy="false">
        <div class="form-row full">
          <label for="cName">Nome*</label>
          <input id="cName" class="input" type="text" required />
        </div>
        <div class="form-row">
          <label for="cPhone">Telefone*</label>
          <input id="cPhone" class="input" type="tel" required />
        </div>
        <div class="form-row">
          <label for="cEmail">Email</label>
          <input id="cEmail" class="input" type="email" />
        </div>
        <div class="form-row actions full">
          <button type="reset" class="btn btn-ghost">Limpar</button>
          <button class="btn btn-primary">Adicionar</button>
        </div>
      </form>
    </div>

    <div class="card container-md mb-lg">
      <div class="flex gap-sm">
        <div class="input-icon" style="flex:1;">
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
          </svg>
          <input id="search" class="input" type="search" placeholder="Buscar por nome, telefone ou email…" />
        </div>
        <select id="sort" class="input">
          <option value="date">Mais recentes</option>
          <option value="name">A–Z</option>
        </select>
      </div>
    </div>

    <div class="card">
      <table class="table compact listrada sticky">
        <thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Ações</th></tr></thead>
        <tbody id="customers-list"></tbody>
      </table>
    </div>
    <button class="btn btn-secondary mt-md mx-auto" id="load-more" hidden>Carregar mais</button>
  `;

  document.getElementById('form-new-customer').onsubmit = onAddCustomer;
  document.getElementById('search').addEventListener('input', renderCustomerList);
  document.getElementById('sort').addEventListener('change', renderCustomerList);
  document.getElementById('load-more').onclick = () => loadCustomers();
  document.getElementById('header-new-customer').onclick = () => document.getElementById('cName').focus();

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
    container.innerHTML = `<tr><td colspan="4"><div class="empty-state"><svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm11 5v-2h-2v2h2zm0-4V7h-2v6h2z"/></svg><p>Nenhum cliente encontrado.</p><button id="empty-add" class="btn btn-primary">Adicionar</button></div></td></tr>`;
    document.getElementById('empty-add').onclick = () => document.getElementById('cName').focus();
    return;
  }

  container.innerHTML = list.map(renderCard).join('');

  list.forEach(c => updateVehicleBadge(c.id));
  container.onclick = onListClick;
}

function renderCard(c) {
  return `
    <tr data-id="${c.id}">
      <td>${esc(c.name || '-')} <span class="badge" data-badge="${c.id}">0</span></td>
      <td>${esc(c.phone || '-')}</td>
      <td>${esc(c.email || '-')}</td>
      <td>
        <button class="btn" data-act="open" data-id="${c.id}">Abrir</button>
        <button class="link" data-act="edit" data-id="${c.id}">Editar</button>
        <button class="link" data-act="del" data-id="${c.id}">Excluir</button>
      </td>
    </tr>
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
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const c = customers.find(x => x.id === id);
  if (!row || !c) return;
  row.innerHTML = `
    <td colspan="4">
      <form class="grid" data-edit="${id}" aria-busy="false">
        <label>Nome <input id="eName-${id}" value="${attr(c.name)}" required /></label>
        <label>Telefone <input id="ePhone-${id}" value="${attr(c.phone)}" required /></label>
        <label>Email <input id="eEmail-${id}" value="${attr(c.email || '')}" type="email" /></label>
        <div class="card-actions">
          <button class="btn">Salvar</button>
          <button type="button" class="link" data-cancel="${id}">Cancelar</button>
        </div>
      </form>
    </td>
  `;

  const form = row.querySelector('form');
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
  row.querySelector('input')?.focus();
}

async function renderCustomerDetail(customerId) {
  const c = await getCustomerById(customerId);
  if (!c) {
    appContainer.innerHTML = '<p class="card">Cliente não encontrado.</p>';
    return;
  }
  const vehicles = await getVehiclesForCustomer(customerId);
  setPageHeader({ title: esc(c.name || 'Cliente'), breadcrumbs: ['<a href="#clientes">Clientes</a>', esc(c.name || 'Cliente')] });

  appContainer.innerHTML = `
    <div class="card">
      <p class="muted">${esc(c.phone || '')}${c.email ? ' · ' + esc(c.email) : ''}</p>
      <div id="clientes-alert" class="alert" aria-live="polite"></div>

      <h3 class="mt">Veículos</h3>
      <form id="form-vehicle" class="form-grid mt" aria-busy="false" style="max-width:480px;">
        <div class="form-row">
          <label for="vPlate">Placa</label>
          <input id="vPlate" class="input" required />
        </div>
        <div class="form-row">
          <label for="vModel">Modelo</label>
          <input id="vModel" class="input" required />
        </div>
        <div class="form-row actions full">
          <button class="btn btn-primary">Adicionar veículo</button>
        </div>
      </form>

      <ul id="vehicles" class="list mt"></ul>
      <div class="card-actions mt">
        <button class="link" id="delCustomer">Excluir cliente</button>
      </div>
    </div>
  `;
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

