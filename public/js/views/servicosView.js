// js/views/servicosView.js
import { getServicos, addServico, getServicoById, updateServico, deleteServico } from '../services/firestoreService.js';

const appContainer = document.getElementById('page-content');
const modalPlaceholder = document.getElementById('modal-placeholder');
let servicos = [];

export const renderServicosView = async () => {
  servicos = await getServicos();
  appContainer.innerHTML = `
    <section class="card">
      <h2>Serviços</h2>
      <div id="s-alert" class="alert" aria-live="polite"></div>
      <form id="form-servico" class="grid mt" aria-busy="false">
        <label>Nome* <input id="sName" required /></label>
        <label>Preço* <input id="sPrice" type="number" min="0" step="0.01" required /></label>
        <button class="btn">Adicionar</button>
      </form>
      <input id="sSearch" class="input mt" type="search" placeholder="Buscar por nome" />
      <div id="servicos-list" class="mt"></div>
    </section>
  `;
  document.getElementById('form-servico').onsubmit = onAddServico;
  document.getElementById('sSearch').addEventListener('input', renderList);
  renderList();
};

async function onAddServico(e) {
  e.preventDefault();
  const form = e.currentTarget;
  form.setAttribute('aria-busy','true');
  const name = document.getElementById('sName').value.trim();
  const price = Number(document.getElementById('sPrice').value);
  const alertBox = document.getElementById('s-alert');

  if (!name) { alertBox.textContent='Nome obrigatório'; form.removeAttribute('aria-busy'); return; }
  if (isNaN(price) || price < 0) { alertBox.textContent='Preço inválido'; form.removeAttribute('aria-busy'); return; }
  if (servicos.some(s => (s.name||'').toLowerCase() === name.toLowerCase())) {
    alertBox.textContent='Nome já existe';
    form.removeAttribute('aria-busy');
    return;
  }
  await addServico({ name, price });
  document.getElementById('sName').value='';
  document.getElementById('sPrice').value='';
  alertBox.textContent='Serviço adicionado';
  servicos = await getServicos();
  renderList();
  form.removeAttribute('aria-busy');
}

function renderList() {
  const term = document.getElementById('sSearch').value.toLowerCase();
  const listEl = document.getElementById('servicos-list');
  const filtered = term ? servicos.filter(s => (s.name||'').toLowerCase().includes(term)) : servicos;
  listEl.innerHTML = filtered.map(s => `
    <div class="simple-list-item">
      <div>
        <strong>${esc(s.name||'-')}</strong><br/>
        <small class="muted">R$ ${(Number(s.price)||0).toFixed(2)} • ${formatDate(s.createdAt)}</small>
      </div>
      <div>
        <button class="btn btn-sm" data-edit="${s.id}">Editar</button>
        <button class="link" data-del="${s.id}">Excluir</button>
      </div>
    </div>
  `).join('') || '<p class="muted">Nenhum serviço.</p>';
  listEl.onclick = onListClick;
}

function onListClick(e) {
  const del = e.target.closest('[data-del]');
  const edit = e.target.closest('[data-edit]');
  if (del) {
    if (confirm('Excluir serviço?')) {
      deleteServico(del.dataset.del).then(async () => {
        servicos = await getServicos();
        renderList();
      });
    }
  } else if (edit) {
    openEditModal(edit.dataset.edit);
  }
}

async function openEditModal(id) {
  const s = await getServicoById(id);
  modalPlaceholder.innerHTML = `
    <div class="modal"><div class="card">
      <div class="card-header">Editar serviço</div>
      <div class="card-body">
        <form id="edit-servico" class="grid">
          <label>Nome* <input id="esName" value="${attr(s.name||'')}" required /></label>
          <label>Preço* <input id="esPrice" type="number" min="0" step="0.01" value="${Number(s.price)||0}" required /></label>
          <div class="card-actions">
            <button class="btn">Salvar</button>
            <button type="button" class="link" id="closeModal">Cancelar</button>
          </div>
        </form>
      </div>
    </div></div>
  `;
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('edit-servico').onsubmit = async ev => {
    ev.preventDefault();
    const name = document.getElementById('esName').value.trim();
    const price = Number(document.getElementById('esPrice').value);
    await updateServico(id, { name, price });
    closeModal();
    servicos = await getServicos();
    renderList();
  };
}

function closeModal(){ modalPlaceholder.innerHTML=''; }
function formatDate(ts){ if(!ts) return ''; const d=ts.seconds? new Date(ts.seconds*1000):new Date(ts); return d.toLocaleDateString(); }
const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr = (s='') => esc(s).replace(/"/g,'&quot;');

