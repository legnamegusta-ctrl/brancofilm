// js/views/agendaView.js
import { getOrders, addOrder, updateOrder, getCustomers, getCustomerById, getVehiclesForCustomer, getServicos, getVehicleById, hasScheduleConflict } from '../services/firestoreService.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const appContainer = document.getElementById('page-content');
const modalPlaceholder = document.getElementById('modal-placeholder');
let calendar;

export const renderAgendaView = async () => {
  window.setPageHeader({
    title: 'Agenda',
    breadcrumbs: ['Operação', 'Agenda'],
    filters: `
      <div class="grid">
        <input id="searchAgenda" placeholder="Cliente ou placa" />
        <input type="date" id="agFrom" />
        <input type="date" id="agTo" />
      </div>`
  });
  appContainer.innerHTML = `
    <section class="card container-lg">
      <div>
        <button class="btn" id="viewMonth">Mês</button>
        <button class="btn" id="viewWeek">Semana</button>
        <button class="btn" id="viewDay">Dia</button>
      </div>
      <div id="calendar-container" style="padding:8px"></div>
      <div class="mt"><button class="btn" id="btnNewEvent">Novo agendamento</button></div>
    </section>
  `;
  const orders = await getOrders();
  const customers = {};
  const vehicles = {};
  for (const o of orders) {
    if (!customers[o.customerId]) {
      customers[o.customerId] = (await getCustomerById(o.customerId))?.name || '';
    }
    if (o.vehicleId && !vehicles[o.vehicleId]) {
      vehicles[o.vehicleId] = (await getVehicleById(o.vehicleId))?.plate || '';
    }
  }
  const events = orders.filter(o=>o.scheduledStart).map(o => ({
    id: o.id,
    title: `${customers[o.customerId] || ''} - ${vehicles[o.vehicleId] || ''}`,
    start: o.scheduledStart.seconds ? new Date(o.scheduledStart.seconds*1000) : o.scheduledStart,
    end: o.scheduledEnd?.seconds ? new Date(o.scheduledEnd.seconds*1000) : (o.scheduledEnd || null),
    classNames: [o.status],
    extendedProps: { customerId: o.customerId, vehicleId: o.vehicleId, customerName: customers[o.customerId]||'', plate: vehicles[o.vehicleId]||'' }
  }));
  const { Calendar } = window;
  calendar = new Calendar(document.getElementById('calendar-container'), {
    initialView: 'dayGridMonth',
    selectable: true,
    height: 'auto',
    events,
    editable: true,
    select: info => openNewModal(info.start, info.end),
    dateClick: info => openNewModal(info.date),
    eventClick: info => { location.hash = `#orders/${info.event.id}`; },
    eventDrop: async info => {
      const ev = info.event;
      const st = ev.start;
      const en = ev.end;
      const { customerId, vehicleId } = ev.extendedProps;
      const conflict = await hasScheduleConflict({ customerId, vehicleId, start: st, end: en, excludeOrderId: ev.id });
      if (conflict) { showToast('Conflito de agenda'); info.revert(); return; }
      await updateOrder(ev.id, {
        scheduledStart: Timestamp.fromDate(st),
        scheduledEnd: en ? Timestamp.fromDate(en) : null
      });
      window.dispatchEvent(new Event('orders:changed'));
    },
    eventResize: async info => {
      const ev = info.event;
      const st = ev.start;
      const en = ev.end;
      const { customerId, vehicleId } = ev.extendedProps;
      const conflict = await hasScheduleConflict({ customerId, vehicleId, start: st, end: en, excludeOrderId: ev.id });
      if (conflict) { showToast('Conflito de agenda'); info.revert(); return; }
      await updateOrder(ev.id, {
        scheduledStart: Timestamp.fromDate(st),
        scheduledEnd: en ? Timestamp.fromDate(en) : null
      });
      window.dispatchEvent(new Event('orders:changed'));
    }
  });
  calendar.render();
  document.getElementById('btnNewEvent').onclick = () => openNewModal();
  document.getElementById('viewMonth').onclick = ()=>calendar.changeView('dayGridMonth');
  document.getElementById('viewWeek').onclick = ()=>calendar.changeView('timeGridWeek');
  document.getElementById('viewDay').onclick = ()=>calendar.changeView('timeGridDay');
  const search = document.getElementById('searchAgenda');
  const fromInput = document.getElementById('agFrom');
  const toInput = document.getElementById('agTo');
  const applyFilters = () => {
    const t = search.value.toLowerCase();
    const from = fromInput.value ? new Date(fromInput.value) : null;
    const to = toInput.value ? new Date(toInput.value) : null;
    calendar.getEvents().forEach(ev => {
      const { customerName, plate } = ev.extendedProps;
      const matchText = customerName.toLowerCase().includes(t) || plate.toLowerCase().includes(t);
      const st = ev.start;
      const matchDate = (!from || st >= from) && (!to || st <= to);
      ev.setProp('display', matchText && matchDate ? 'auto' : 'none');
    });
  };
  search.oninput = applyFilters;
  fromInput.onchange = applyFilters;
  toInput.onchange = applyFilters;
};

async function openNewModal(start=null, end=null) {
  const clients = await getCustomers();
  const servicos = await getServicos();
  modalPlaceholder.innerHTML = `
    <div class="modal"><div class="card">
      <div class="card-header">Novo agendamento</div>
      <div class="card-body">
        <form id="agenda-form" class="grid">
          <label>Cliente*
            <select id="aCustomer" required>
              <option value="">—</option>
              ${clients.map(c=>`<option value="${c.id}">${esc(c.name||'-')}</option>`).join('')}
            </select>
          </label>
          <label>Veículo*
            <select id="aVehicle" required><option value="">—</option></select>
          </label>
          <label>Serviço*
            <select id="aService" required>
              <option value="">—</option>
              ${servicos.map(s=>`<option value="${s.id}" data-name="${attr(s.name)}" data-price="${Number(s.price)||0}">${esc(s.name)}</option>`).join('')}
            </select>
          </label>
          <label>Início* <input id="aStart" type="datetime-local" required value="${start?toLocal(start):''}" /></label>
          <label>Fim <input id="aEnd" type="datetime-local" value="${end?toLocal(end):''}" /></label>
          <label>Notas <textarea id="aNotes"></textarea></label>
          <div class="card-actions">
            <button class="btn">Criar</button>
            <button type="button" class="link" id="aCancel">Cancelar</button>
          </div>
        </form>
      </div>
    </div></div>
  `;
  document.getElementById('aCustomer').onchange = async e => {
    const vs = await getVehiclesForCustomer(e.target.value);
    document.getElementById('aVehicle').innerHTML =
      '<option value="">—</option>' + vs.map(v=>`<option value="${v.id}">${esc(v.model||v.plate||'-')}</option>`).join('');
  };
  document.getElementById('aCancel').onclick = closeModal;
  document.getElementById('agenda-form').onsubmit = async e => {
    e.preventDefault();
    const serviceSelect = document.getElementById('aService');
    const opt = serviceSelect.selectedOptions[0];
    const item = { servicoId: serviceSelect.value, name: opt.dataset.name, price: Number(opt.dataset.price) };
    const data = {
      customerId: document.getElementById('aCustomer').value,
      vehicleId: document.getElementById('aVehicle').value,
      items: [item],
      discount: 0,
      total: item.price,
      status: 'novo',
      notes: document.getElementById('aNotes').value.trim(),
      scheduledStart: Timestamp.fromDate(new Date(document.getElementById('aStart').value)),
      scheduledEnd: document.getElementById('aEnd').value ? Timestamp.fromDate(new Date(document.getElementById('aEnd').value)) : null
    };
    const conflict = await hasScheduleConflict({ customerId: data.customerId, vehicleId: data.vehicleId, start: data.scheduledStart.toDate(), end: data.scheduledEnd?.toDate() });
    if (conflict) { showToast('Conflito de agenda'); return; }
    const id = await addOrder(data);
    window.dispatchEvent(new Event('orders:changed'));
    closeModal();
    renderAgendaView();
    location.hash = `#orders/${id}`;
  };
}

function closeModal(){ modalPlaceholder.innerHTML=''; }

const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr = (s='') => esc(s).replace(/"/g,'&quot;');

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 4000);
}

function toLocal(d){ if(!d) return ''; const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }

