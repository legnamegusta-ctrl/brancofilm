// js/views/ordersView.js
import {
  getOrders, getOrderById, addOrder, updateOrder, deleteOrder,
  getCustomers, getCustomerById,
  getVehiclesForCustomer, getVehicleById, getServicos, getUsers,
  addPayment, listPayments, deletePayment, sumPayments,
  saveSignature, getSignatureURL
} from '../services/firestoreService.js';
import { listOrderPhotos, uploadOrderPhotos, deleteOrderPhoto } from '../storageService.js';
import { db, auth } from '../firebase-config.js';
import { Timestamp, collection as coll, addDoc, getDocs, query, where, orderBy, limit as limitFn } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const appContainer = document.getElementById('page-content');
const modalPlaceholder = document.getElementById('modal-placeholder');

export const renderOrdersView = async (param) => {
  if (param && param !== 'new') {
    return renderOrderDetail(param);
  }
  if (param === 'new') {
    return renderOrderDetail(null);
  }
  return renderOrdersList();
};

async function renderOrdersList() {
  const orders = await getOrders();
  const customerCache = {};
  const vehicleCache = {};
  for (const o of orders) {
    if (!customerCache[o.customerId]) {
      customerCache[o.customerId] = (await getCustomerById(o.customerId))?.name || '-';
    }
    o.customerName = customerCache[o.customerId];
    if (o.vehicleId && !vehicleCache[o.vehicleId]) {
      const v = await getVehicleById(o.vehicleId);
      vehicleCache[o.vehicleId] = v?.plate || v?.model || '';
    }
    o.vehicleLabel = vehicleCache[o.vehicleId];
  }
  window.setPageHeader({
    title: 'Ordens',
    breadcrumbs: ['Operação', 'Ordens'],
    actions: [{ id: 'btnNewOrder', label: 'Nova OS' }]
  });
  appContainer.innerHTML = `
    <div class="card container-md mb-md">
      <div class="input-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
        </svg>
        <input id="search" class="input" type="search" placeholder="Buscar..." />
      </div>
    </div>
    <div id="orders-list"></div>
  `;

  document.getElementById('btnNewOrder').onclick = () => location.hash = '#orders/new';
  const search = document.getElementById('search');
  const render = () => {
    const q = search.value.trim().toLowerCase();
    const filtered = orders.filter(o =>
      (o.customerName || '').toLowerCase().includes(q) ||
      ((o.items && o.items[0] && o.items[0].name) || '').toLowerCase().includes(q)
    );
    renderOrdersTable(filtered);
  };
  search.addEventListener('input', render);
  render();
}
function renderOrdersTable(list) {
  const body = document.getElementById('orders-list');
  body.innerHTML = list.map(o => {
    const svc = (o.items && o.items[0] && o.items[0].name) || '';
    const plate = o.vehicleLabel ? ' • ' + esc(o.vehicleLabel) : '';
    const statusMap = { novo: 'info', em_andamento: 'warning', concluido: 'success', cancelado: 'danger' };
    return `
      <div class="cell" data-open="${o.id}">
        <div class="cell__left">
          <span class="cell__title">${esc(o.customerName || o.customerId)}${plate}</span>
          <span class="cell__desc">${esc(svc)} • ${formatDate(o.scheduledStart)}</span>
        </div>
        <div class="cell__right">
          <span class="badge badge--${statusMap[o.status]||'info'}">${o.status}</span>
          <span class="cell__value">${formatBRL(Number(o.total)||0)}</span>
        </div>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </div>
    `;
  }).join('') || '<p class="muted">Nenhuma OS</p>';
  body.onclick = e => {
    const open = e.target.closest('[data-open]');
    if (open) {
      location.hash = `#orders/${open.dataset.open}`;
    }
  };
}
async function renderOrderDetail(orderId) {
  const isNew = !orderId;
  let order = isNew ? null : await getOrderById(orderId);
  const clients = await getCustomers();
  const servicos = await getServicos();
  let vehicles = [];
  if (order?.customerId) {
    vehicles = await getVehiclesForCustomer(order.customerId);
  }
  let users = [];
  const role = window.sessionState?.role;
  if (role === 'admin') {
    users = await getUsers();
  }

  const itemsSet = new Set(order?.items?.map(i => i.servicoId));
  window.setPageHeader({
    title: isNew ? 'Nova OS' : 'Ordem',
    breadcrumbs: ['Operação', '<a href="#orders">Ordens</a>', isNew ? 'Nova' : orderId]
  });
  appContainer.innerHTML = `
    <div class="grid-2">
      <div id="order-sections">
        <section class="card print-card">
          <form id="order-form" class="grid" aria-busy="false">
        <label>Cliente*
          <select id="oCustomer" required>
            <option value="">—</option>
            ${clients.map(c=>`<option value="${c.id}" ${order?.customerId===c.id?'selected':''}>${esc(c.name||'-')}</option>`).join('')}
          </select>
        </label>
        <label>Veículo*
          <select id="oVehicle" required>
            <option value="">—</option>
            ${vehicles.map(v=>`<option value="${v.id}" ${order?.vehicleId===v.id?'selected':''}>${esc(v.model||v.plate||'-')}</option>`).join('')}
          </select>
        </label>
        <fieldset class="grid" id="oServices">
          <legend>Serviços*</legend>
          ${servicos.map(s=>`
            <label class="checkbox"><input type="checkbox" value="${s.id}" data-name="${attr(s.name)}" data-price="${Number(s.price)||0}" ${itemsSet.has(s.id)?'checked':''}/> ${esc(s.name)} (R$ ${(Number(s.price)||0).toFixed(2)})</label>
          `).join('')}
        </fieldset>
        <label>Desconto <input id="oDiscount" type="number" min="0" step="0.01" value="${order?.discount||0}" /></label>
        <div>Total: <span id="oTotal">R$ ${(Number(order?.total)||0).toFixed(2)}</span></div>
        <label>Status
          <select id="oStatus">
            ${['novo','em_andamento','concluido','cancelado'].map(st=>`<option value="${st}" ${order?.status===st?'selected':''}>${st}</option>`).join('')}
          </select>
        </label>
        ${role==='admin'?`<label>Responsável
          <select id="oAssigned">
            <option value="">—</option>
            ${users.map(u=>`<option value="${u.id}" ${order?.assignedTo===u.id?'selected':''}>${esc(u.email||u.displayName||u.id)}</option>`).join('')}
          </select>
        </label>`:''}
        <label>Notas <textarea id="oNotes">${esc(order?.notes||'')}</textarea></label>
        <label>Início <input id="oStart" type="datetime-local" value="${toLocal(order?.scheduledStart)||''}" /></label>
        <label>Fim <input id="oEnd" type="datetime-local" value="${toLocal(order?.scheduledEnd)||''}" /></label>
        <div class="card-actions">
          <button class="btn">${isNew?'Criar':'Salvar'}</button>
          ${!isNew?'<button type="button" id="oDelete" class="link">Excluir</button>':''}
          <button type="button" id="oBack" class="link">Voltar</button>
          ${!isNew?'<button type="button" id="oSendMail" class="link">Enviar e-mail</button>':''}
          ${!isNew?'<button type="button" id="oPrint" class="link no-print">Imprimir</button>':''}
          ${!isNew?'<button type="button" id="oCSV" class="link">CSV</button>':''}
        </div>
          </form>
        </section>
        ${!isNew?`
      <section class="card mt no-print"><h3>Pagamentos</h3>
        <div id="payments-list"></div>
        <form id="payment-form" class="grid">
          <input type="number" step="0.01" min="0" id="payAmount" placeholder="Valor" required />
          <select id="payMethod">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
            <option value="outro">Outro</option>
          </select>
          <button class="btn">Adicionar</button>
        </form>
        <div id="payment-totals" class="mt"></div>
      </section>
      <section class="card mt no-print"><h3>Assinatura</h3>
        <canvas id="signCanvas" width="300" height="150" style="border:1px solid #ccc;"></canvas>
        <div class="card-actions">
          <button type="button" id="signClear" class="btn">Limpar</button>
          <button type="button" id="signSave" class="btn">Salvar</button>
        </div>
        <img id="signImg" alt="Assinatura" style="max-width:300px;display:none;" />
      </section>
      <section class="card mt no-print"><h3>Histórico</h3><ul id="history-list"></ul></section>
      `:''}
      </div>
      <aside class="card" id="order-summary">
        <h3>Resumo</h3>
        <dl>
          <dt>Subtotal</dt><dd id="sum-subtotal">R$ 0,00</dd>
          <dt>Desconto</dt><dd id="sum-discount">R$ 0,00</dd>
          <dt>Pago</dt><dd id="sum-paid">R$ 0,00</dd>
          <dt>Aberto</dt><dd id="sum-open">R$ 0,00</dd>
        </dl>
      </aside>
    </div>
  `;

  document.getElementById('oCustomer').onchange = async e => {
    const cid = e.target.value;
    const vs = cid ? await getVehiclesForCustomer(cid) : [];
    document.getElementById('oVehicle').innerHTML =
      '<option value="">—</option>' + vs.map(v=>`<option value="${v.id}">${esc(v.model||v.plate||'-')}</option>`).join('');
  };

  document.getElementById('oServices').addEventListener('change', calcTotal);
  document.getElementById('oDiscount').addEventListener('input', calcTotal);
  calcTotal();

  document.getElementById('oBack').onclick = () => { location.hash = '#orders'; };
  if (!isNew) {
    document.getElementById('oDelete').onclick = async () => {
      if (confirm('Excluir OS?')) { await deleteOrder(orderId); location.hash = '#orders'; }
    };
    document.getElementById('oPrint').onclick = () => window.print();
    document.getElementById('oCSV').onclick = () => exportCSV(orderId, order);
    document.getElementById('oSendMail').onclick = async () => {
      const customer = clients.find(c=>c.id===document.getElementById('oCustomer').value) || {};
      try {
        await addDoc(coll(db, 'mail'), {
          to: [customer.email || ''],
          message: { subject: 'Confirmação de agendamento', text: 'Sua OS foi agendada.' }
        });
        alert('Email enfileirado');
      } catch(err) { alert('Falha ao enfileirar email'); }
    };
    loadHistory(orderId);
  }

  document.getElementById('order-form').onsubmit = async ev => {
    ev.preventDefault();
    const form = ev.currentTarget;
    form.setAttribute('aria-busy','true');
    const customerId = document.getElementById('oCustomer').value;
    const vehicleId = document.getElementById('oVehicle').value;
    const discount = Number(document.getElementById('oDiscount').value)||0;
    const status = document.getElementById('oStatus').value;
    const notes = document.getElementById('oNotes').value.trim();
    const startVal = document.getElementById('oStart').value;
    const endVal   = document.getElementById('oEnd').value;
    const assignedTo = role==='admin' ? (document.getElementById('oAssigned').value || null) : (order?.assignedTo || null);
    const items = Array.from(document.querySelectorAll('#oServices input:checked')).map(inp => ({
      servicoId: inp.value,
      name: inp.dataset.name,
      price: Number(inp.dataset.price)
    }));
    const subtotal = items.reduce((s,i)=>s+i.price,0);
    const total = Math.max(0, subtotal - discount);
    if(!customerId || !vehicleId || items.length===0){ form.removeAttribute('aria-busy'); return; }
    const data = {
      customerId,
      vehicleId,
      items,
      discount,
      total,
      status,
      notes,
      assignedTo,
      scheduledStart: startVal ? Timestamp.fromDate(new Date(startVal)) : null,
      scheduledEnd: endVal ? Timestamp.fromDate(new Date(endVal)) : null
    };
    let newId = orderId;
    if (isNew) newId = await addOrder(data); else await updateOrder(orderId, data);
    form.removeAttribute('aria-busy');
    location.hash = `#orders/${newId}`;
  };
  if (!isNew) {
    initPhotos(orderId);
    initPayments(orderId);
    initSignature(orderId);
  }
}

async function loadHistory(orderId) {
  const q = query(
    coll(db, 'auditLogs'),
    where('collection','==','orders'),
    where('docId','==', orderId),
    orderBy('ts','desc'),
    limitFn(20)
  );
  const snap = await getDocs(q);
  const ul = document.getElementById('history-list');
  if (!ul) return;
  ul.innerHTML = snap.docs.map(d=>{
    const data = d.data();
    const date = data.ts?.toDate ? data.ts.toDate().toLocaleString() : '';
    return `<li>${esc(date)} - ${esc(data.actorEmail||'')} ${esc(data.action)}</li>`;
  }).join('') || '<li class="muted">Sem histórico</li>';
}

const summary = { subtotal:0, discount:0, paid:0 };
function updateSummaryDisplay() {
  const open = Math.max(0, summary.subtotal - summary.discount - summary.paid);
  const ss = document.getElementById('sum-subtotal');
  if (!ss) return;
  ss.textContent = 'R$ ' + summary.subtotal.toFixed(2);
  document.getElementById('sum-discount').textContent = 'R$ ' + summary.discount.toFixed(2);
  document.getElementById('sum-paid').textContent = 'R$ ' + summary.paid.toFixed(2);
  document.getElementById('sum-open').textContent = 'R$ ' + open.toFixed(2);
}

function calcTotal() {
  const items = Array.from(document.querySelectorAll('#oServices input:checked')).map(i => Number(i.dataset.price));
  const discount = Number(document.getElementById('oDiscount').value)||0;
  const subtotal = items.reduce((s,v)=>s+v,0);
  const total = Math.max(0, subtotal - discount);
  summary.subtotal = subtotal;
  summary.discount = discount;
  document.getElementById('oTotal').textContent = 'R$ ' + total.toFixed(2);
  updateSummaryDisplay();
}

function exportCSV(id, order) {
  const lines = order.items.map(i=>`${i.name},${(Number(i.price)||0).toFixed(2)}`);
  lines.push(`Desconto,${(Number(order.discount)||0).toFixed(2)}`);
  lines.push(`Total,${(Number(order.total)||0).toFixed(2)}`);
  const blob = new Blob([lines.join('\n')], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `os-${id}.csv`;
  a.click();
}

function toLocal(ts){ if(!ts) return ''; const d=ts.seconds? new Date(ts.seconds*1000):new Date(ts); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
const formatBRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function formatDate(ts){ if(!ts) return ''; const d=ts.seconds? new Date(ts.seconds*1000):new Date(ts); return d.toLocaleDateString(); }
const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr = (s='') => esc(s).replace(/"/g,'&quot;');


async function initPhotos(orderId) {
  await loadPhotos(orderId);
  const drop = document.getElementById('photo-drop');
  const input = document.getElementById('photo-input');
  const selectBtn = document.getElementById('photo-select');
  const uploadList = document.getElementById('upload-list');

  const handle = files => {
    const arr = Array.from(files);
    const valid = [];
    for (const f of arr) {
      if (!['image/jpeg','image/png','image/webp'].includes(f.type)) {
        alert(f.type.includes('heic') ? 'HEIC não suportado' : 'Tipo inválido');
        continue;
      }
      if (f.size > 5*1024*1024) { alert('Tamanho excedido'); continue; }
      const item = document.createElement('div');
      item.className = 'upload-item';
      item.textContent = `${f.name} - 0%`;
      uploadList.appendChild(item);
      valid.push({file: f, el: item});
    }
    if (!valid.length) return;
    drop.classList.add('disabled');
    selectBtn.disabled = true;
    uploadOrderPhotos(orderId, valid.map(v=>v.file), { onProgress: (file,pct)=>{
      const it = valid.find(v=>v.file===file);
      if (it) it.el.textContent = `${file.name} - ${pct}%`;
    }}).then(()=>{ uploadList.innerHTML=''; loadPhotos(orderId); })
      .catch(()=>alert('Falha no upload'))
      .finally(()=>{ drop.classList.remove('disabled'); selectBtn.disabled=false; });
  };

  drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', ()=>drop.classList.remove('drag'));
  drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('drag'); handle(e.dataTransfer.files); });
  selectBtn.onclick = () => input.click();
  input.onchange = e => { handle(e.target.files); input.value=''; };
}

async function loadPhotos(orderId) {
  const grid = document.getElementById('photos-grid');
  const list = await listOrderPhotos(orderId);
  if (!list.length) { grid.innerHTML = '<p class="muted">Sem fotos</p>'; return; }
  grid.innerHTML = list.map(p=>`<figure><img src="${p.url}" alt="${esc(p.name)}"/><figcaption class="actions"><button class="link" data-view="${p.url}">Ver</button> <button class="link" data-del="${p.path}">Excluir</button></figcaption></figure>`).join('');
  grid.onclick = async e => {
    const view = e.target.closest('[data-view]');
    const del = e.target.closest('[data-del]');
    if (view) openPhotoModal(view.dataset.view);
    else if (del) { if(confirm('Excluir foto?')){ await deleteOrderPhoto(del.dataset.del); loadPhotos(orderId); } }
  };
}

async function initPayments(orderId) {
  const listEl = document.getElementById('payments-list');
  const totalsEl = document.getElementById('payment-totals');
  async function refresh() {
    const pays = await listPayments(orderId);
    listEl.innerHTML = pays.map(p=>`<div>${p.method}: R$ ${(Number(p.amount)||0).toFixed(2)} <button data-del="${p.id}" class="link">x</button></div>`).join('') || '<p class="muted">Nenhum pagamento</p>';
    const paid = sumPayments(pays);
    summary.paid = paid;
    const subtotal = summary.subtotal - summary.discount;
    const due = Math.max(0, subtotal - paid);
    totalsEl.textContent = `Total: R$ ${subtotal.toFixed(2)} | Pago: R$ ${paid.toFixed(2)} | Em aberto: R$ ${due.toFixed(2)}`;
    updateSummaryDisplay();
  }
  refresh();
  listEl.onclick = async e => {
    const del = e.target.closest('[data-del]');
    if (del && confirm('Excluir pagamento?')) {
      await deletePayment(orderId, del.dataset.del);
      refresh();
    }
  };
  document.getElementById('payment-form').onsubmit = async ev => {
    ev.preventDefault();
    const amount = Number(document.getElementById('payAmount').value)||0;
    const method = document.getElementById('payMethod').value;
    await addPayment(orderId, { amount, method });
    ev.target.reset();
    refresh();
  };
}

function initSignature(orderId) {
  const canvas = document.getElementById('signCanvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  canvas.addEventListener('mousedown', e=>{ drawing=true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY); });
  canvas.addEventListener('mousemove', e=>{ if(drawing){ ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke(); }});
  canvas.addEventListener('mouseup', ()=> drawing=false);
  canvas.addEventListener('mouseleave', ()=> drawing=false);
  document.getElementById('signClear').onclick = ()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); };
  document.getElementById('signSave').onclick = async ()=>{
    if(!navigator.onLine){ alert('Offline'); return; }
    canvas.toBlob(async blob=>{
      await saveSignature(orderId, blob, { uploadedBy: auth.currentUser.uid });
      const url = await getSignatureURL(orderId);
      const img = document.getElementById('signImg');
      img.src = url; img.style.display='block';
      alert('Salvo');
    });
  };
  getSignatureURL(orderId).then(url=>{ const img=document.getElementById('signImg'); img.src=url; img.style.display='block'; }).catch(()=>{});
}

function openPhotoModal(url) {
  modalPlaceholder.innerHTML = `<div class="modal"><div class="card"><img src="${url}" style="width:100%" alt="Foto"/><div class="card-actions"><button class="btn" id="closePhoto">Fechar</button></div></div></div>`;
  document.getElementById('closePhoto').onclick = closeModal;
  document.addEventListener('keydown', escClose);
}
function closeModal(){ modalPlaceholder.innerHTML=''; document.removeEventListener('keydown', escClose); }
function escClose(e){ if(e.key==='Escape') closeModal(); }
