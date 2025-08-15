// js/views/agendaView.js
import { getOrders, addOrder, updateOrder, getCustomers, getCustomerById, getVehiclesForCustomer, getServicos, getVehicleById, hasScheduleConflict } from '../services/firestoreService.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const modalPlaceholder = document.getElementById('modal-placeholder');
let calendar;

export const renderAgendaView = async () => {
  window.setPageHeader({
    title: 'Agenda',
    breadcrumbs: ['Operação', 'Agenda'],
    filters: `
      <div class="segmented" id="agView">
        <button class="segmented__item segmented__item--active" data-view="dayGridMonth">Mês</button>
        <button class="segmented__item" data-view="timeGridDay">Dia</button>
      </div>
      <div class="grid">
        <input id="searchAgenda" placeholder="Cliente ou placa" />
        <input type="date" id="agFrom" />
        <input type="date" id="agTo" />
      </div>`
  });
  const root = document.getElementById('page-content');
  root.innerHTML = '<div id="calendar"></div>';
  const calendarEl = document.getElementById('calendar');

  let events = [];
  const orderMap = {};
  try {
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
    events = orders.filter(o=>o.scheduledStart).map(o => {
      orderMap[o.id] = o;
      return {
        id: o.id,
        title: `${customers[o.customerId] || ''} - ${vehicles[o.vehicleId] || ''}`,
        start: o.scheduledStart.seconds ? new Date(o.scheduledStart.seconds*1000) : o.scheduledStart,
        end: o.scheduledEnd?.seconds ? new Date(o.scheduledEnd.seconds*1000) : (o.scheduledEnd || null),
        classNames: [o.status],
        extendedProps: { customerId: o.customerId, vehicleId: o.vehicleId, customerName: customers[o.customerId]||'', plate: vehicles[o.vehicleId]||'' }
      };
    });
  } catch(err) {
    console.error(err);
  }

  const FC = window.FullCalendar;
  if (!FC || !FC.Calendar) throw new Error('FullCalendar não carregado — verifique CDNs e ordem dos scripts.');
  calendar = new FC.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    headerToolbar: { left: 'title', right: 'today prev,next' },
    buttonText: { today: 'Hoje', month: 'Mês', day: 'Dia' },
    navLinks: true,
    selectable: true,
    height: 'auto',
    events,
    editable: true,
    eventContent: info => {
      const st = info.event.classNames[0];
      const map = { novo: 'info', em_andamento: 'warning', concluido: 'success', cancelado: 'danger' };
      return { html: `<span class="badge badge--${map[st]||'info'}">${st}</span> ${esc(info.event.title)}` };
    },
    dateClick: info => openSheet(null, info.date),
    eventClick: info => openSheet(orderMap[info.event.id]),
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
  const viewSwitch = document.getElementById('agView');
  viewSwitch.onclick = e => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    calendar.changeView(btn.dataset.view);
    viewSwitch.querySelectorAll('button').forEach(b => b.classList.toggle('segmented__item--active', b === btn));
  };
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

async function openSheet(order=null, startDate=null) {
  const clients = await getCustomers();
  const servicos = await getServicos();
  const start = order ? (order.scheduledStart.seconds ? new Date(order.scheduledStart.seconds*1000) : order.scheduledStart) : startDate;
  const end = order?.scheduledEnd ? (order.scheduledEnd.seconds ? new Date(order.scheduledEnd.seconds*1000) : order.scheduledEnd) : null;
  modalPlaceholder.innerHTML = `
    <div class="sheet" id="agendaSheet">
      <div class="sheet__overlay" id="aOverlay"></div>
      <div class="sheet__panel">
        <div class="sheet__handle"></div>
        <h2 class="sheet__title">${order?'Editar agendamento':'Novo agendamento'}</h2>
        <form id="agenda-form" class="grid">
          <label>Cliente*
            <select id="aCustomer" required>
              <option value="">—</option>
              ${clients.map(c=>`<option value="${c.id}" ${order?.customerId===c.id?'selected':''}>${esc(c.name||'-')}</option>`).join('')}
            </select>
          </label>
          <label>Veículo*
            <select id="aVehicle" required><option value="">—</option></select>
          </label>
          <label>Serviço*
            <select id="aService" required>
              <option value="">—</option>
              ${servicos.map(s=>`<option value="${s.id}" data-name="${attr(s.name)}" data-price="${Number(s.price)||0}" ${order?.items?.[0]?.servicoId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}
            </select>
          </label>
          <label>Início* <input id="aStart" type="datetime-local" required value="${start?toLocal(start):''}" /></label>
          <label>Fim <input id="aEnd" type="datetime-local" value="${end?toLocal(end):''}" /></label>
          <label>Notas <textarea id="aNotes">${esc(order?.notes||'')}</textarea></label>
          <div class="sheet__actions">
            <button type="button" class="btn btn-ghost" id="aCancel">Cancelar</button>
            <button class="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  const customerSelect = document.getElementById('aCustomer');
  customerSelect.onchange = async e => {
    const vs = await getVehiclesForCustomer(e.target.value);
    document.getElementById('aVehicle').innerHTML = '<option value="">—</option>' + vs.map(v=>`<option value="${v.id}" ${order?.vehicleId===v.id?'selected':''}>${esc(v.model||v.plate||'-')}</option>`).join('');
  };
  if(order?.customerId) customerSelect.dispatchEvent(new Event('change'));
  document.getElementById('aOverlay').onclick = closeModal;
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
      discount: order?.discount || 0,
      total: item.price,
      status: order?.status || 'novo',
      notes: document.getElementById('aNotes').value.trim(),
      scheduledStart: Timestamp.fromDate(new Date(document.getElementById('aStart').value)),
      scheduledEnd: document.getElementById('aEnd').value ? Timestamp.fromDate(new Date(document.getElementById('aEnd').value)) : null
    };
    const conflict = await hasScheduleConflict({ customerId: data.customerId, vehicleId: data.vehicleId, start: data.scheduledStart.toDate(), end: data.scheduledEnd?.toDate(), excludeOrderId: order?.id });
    if (conflict) { showToast('Conflito de agenda'); return; }
    if (order) {
      await updateOrder(order.id, data);
    } else {
      const id = await addOrder(data);
      window.dispatchEvent(new Event('orders:changed'));
      closeModal();
      renderAgendaView();
      location.hash = `#orders/${id}`;
      return;
    }
    window.dispatchEvent(new Event('orders:changed'));
    closeModal();
    renderAgendaView();
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

