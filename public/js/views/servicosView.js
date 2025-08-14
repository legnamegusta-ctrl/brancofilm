// js/views/servicosView.js
import { getServicos, addServico, getServicoById, updateServico, deleteServico } from '../services/firestoreService.js';

const appContainer = document.getElementById('page-content');
const modalPlaceholder = document.getElementById('modal-placeholder');
let servicos = [];

export const renderServicosView = async () => {
  servicos = await getServicos();
  setPageHeader({
    title: 'Serviços',
    breadcrumbs: ['Cadastros', 'Serviços'],
    actions: [{ id: 'header-new-servico', label: 'Novo serviço' }]
  });
  appContainer.innerHTML = `
    <div class="card" style="max-width:520px;margin-bottom:var(--space-6);">
      <div id="s-alert" class="alert" aria-live="polite"></div>
      <form id="form-servico" class="stack" aria-busy="false">
        <div class="form-row">
          <label for="sName">Nome*</label>
          <input id="sName" class="input" required />
        </div>
        <div class="form-row">
          <label for="sPrice">Preço*</label>
          <input id="sPrice" class="input" type="number" min="0" step="0.01" required />
        </div>
        <div class="form-row" style="justify-content:flex-end;">
          <button class="btn btn-primary">Adicionar</button>
        </div>
      </form>
    </div>

    <div class="card" style="max-width:520px;margin-bottom:var(--space-6);">
      <div class="input-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
        </svg>
        <input id="sSearch" class="input" type="search" placeholder="Buscar por nome" />
      </div>
    </div>

    <div class="card">
      <table class="table compact listrada">
        <thead><tr><th>Nome</th><th>Preço</th><th></th></tr></thead>
        <tbody id="servicos-list"></tbody>
      </table>
    </div>
  `;
  document.getElementById('form-servico').onsubmit = onAddServico;
  document.getElementById('sSearch').addEventListener('input', renderList);
  document.getElementById('header-new-servico').onclick = () => document.getElementById('sName').focus();
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
  const body = document.getElementById('servicos-list');
  const filtered = term ? servicos.filter(s => (s.name||'').toLowerCase().includes(term)) : servicos;
  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="3"><div class="empty-state"><svg viewBox='0 0 24 24' fill='currentColor' xmlns='http://www.w3.org/2000/svg'><path d='M12 2a10 10 0 100 20 10 10 0 000-20zM2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm11 5v-2h-2v2h2zm0-4V7h-2v6h2z'/></svg><p>Nenhum serviço.</p><button id='empty-servico' class='btn btn-primary'>Adicionar serviço</button></div></td></tr>`;
    document.getElementById('empty-servico').onclick = () => document.getElementById('sName').focus();
    return;
  }
  body.innerHTML = filtered.map(s => `
    <tr>
      <td>${esc(s.name||'-')}</td>
      <td>R$ ${(Number(s.price)||0).toFixed(2)}</td>
      <td>
        <button class="btn btn-secondary" data-edit="${s.id}">Editar</button>
        <button class="link" data-del="${s.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
  body.onclick = onListClick;
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

