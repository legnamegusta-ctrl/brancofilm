// js/views/agendaView.js
import { getServiceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder, getCustomers, getServicos } from '../services/firestoreService.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const appContainer = document.getElementById('app-container');
const modalPlaceholder = document.getElementById('modal-placeholder');
let calendar;

export const renderAgendaView = async () => {
  appContainer.innerHTML = `
    <section>
      <h2>Agenda de Serviços</h2>
      <div id="calendar-container" class="card" style="padding:8px"></div>
      <div class="mt"><button class="btn" id="btnNewEvent">Novo agendamento</button></div>
    </section>
  `;

  const { Calendar } = window; // FullCalendar já está no index.html
  const orders = await getServiceOrders();
  const events = orders.map(o => ({
    id: o.id,
    title: o.title || 'Serviço',
    start: o.start?.seconds ? new Date(o.start.seconds*1000) : (o.start || null),
    end:   o.end?.seconds   ? new Date(o.end.seconds*1000)   : (o.end   || null),
  }));

  const el = document.getElementById('calendar-container');
  calendar = new Calendar(el, {
    initialView: 'dayGridMonth',
    height: 'auto',
    events,
    eventClick: (info) => openEventModal({ ...orders.find(o=>o.id===info.event.id), id: info.event.id }),
  });
  calendar.render();

  document.getElementById('btnNewEvent').onclick = () => openEventModal(null);
};

async function openEventModal(order) {
  const clients  = await getCustomers();
  const servicos = await getServicos();
  const isEditing = !!order;
  const startISO = toLocalValue(order?.start);
  const endISO   = toLocalValue(order?.end);

  modalPlaceholder.innerHTML = `
    <div class="card" style="position:fixed;inset:0;max-width:560px;margin:24px auto;background:#fff;z-index:50;overflow:auto">
      <div class="card-header">${isEditing ? 'Editar' : 'Novo'} agendamento</div>
      <div class="card-body">
        <form id="form-event" class="grid">
          <label>Título <input id="eTitle" value="${attr(order?.title||'')}" required /></label>
          <label>Cliente
            <select id="eCustomer">
              <option value="">— selecione —</option>
              ${clients.map(c=>`<option value="${c.id}" ${order?.customerId===c.id?'selected':''}>${esc(c.name||'-')}</option>`).join('')}
            </select>
          </label>
          <label>Serviço
            <select id="eServico">
              <option value="">— selecione —</option>
              ${servicos.map(s=>`<option value="${s.id}" ${order?.servicoId===s.id?'selected':''}>${esc(s.name||'-')}</option>`).join('')}
            </select>
          </label>
          <label>Início <input id="eStart" type="datetime-local" value="${startISO||''}" required /></label>
          <label>Fim <input id="eEnd" type="datetime-local" value="${endISO||''}" /></label>
          <div class="card-actions">
            <button class="btn">${isEditing ? 'Salvar' : 'Criar'}</button>
            ${isEditing ? '<button type="button" id="eDelete" class="link">Excluir</button>' : ''}
            <button type="button" id="eCancel" class="link">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('eCancel').onclick = closeModal;
  if (isEditing) {
    document.getElementById('eDelete').onclick = async () => {
      if (confirm('Excluir agendamento?')) {
        await deleteServiceOrder(order.id).catch(()=>{});
        closeModal(); renderAgendaView();
      }
    };
  }

  document.getElementById('form-event').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('eTitle').value.trim(),
      customerId: document.getElementById('eCustomer').value || null,
      servicoId:  document.getElementById('eServico').value || null,
      start: fromLocalValue(document.getElementById('eStart').value),
      end:   fromLocalValue(document.getElementById('eEnd').value) || null,
    };
    if (isEditing) await updateServiceOrder(order.id, data);
    else await addServiceOrder(data);
    closeModal(); renderAgendaView();
  };
}

function toLocalValue(v){ if(!v) return ''; const d=v.seconds?new Date(v.seconds*1000):new Date(v); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function fromLocalValue(s){ if(!s) return null; return Timestamp.fromDate(new Date(s)); }
function closeModal(){ modalPlaceholder.innerHTML=''; }
const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr = (s='') => esc(s).replace(/"/g,'&quot;');
