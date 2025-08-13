// js/views/servicosView.js
import { getServicos, addServico, getServicoById, updateServico, deleteServico } from '../services/firestoreService.js';

const appContainer = document.getElementById('app-container');
const modalPlaceholder = document.getElementById('modal-placeholder');

export const renderServicosView = async () => {
  const servicos = await getServicos();
  appContainer.innerHTML = `
    <section class="card">
      <h2>Serviços</h2>
      <form id="form-servico" class="grid mt">
        <label>Nome <input id="sName" required /></label>
        <label>Preço (R$) <input id="sPrice" type="number" min="0" step="0.01" required /></label>
        <button class="btn">Adicionar</button>
      </form>

      <div class="grid-2 mt">
        ${servicos.map(s => `
          <div class="card">
            <div class="card-header">${esc(s.name || '-')}</div>
            <div class="card-body">
              <p><b>Preço:</b> R$ ${(Number(s.price)||0).toFixed(2)}</p>
            </div>
            <div class="card-actions">
              <button class="btn" data-edit="${s.id}">Editar</button>
              <button class="link" data-del="${s.id}">Excluir</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  document.getElementById('form-servico').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('sName').value.trim();
    const price = Number(document.getElementById('sPrice').value);
    if (!name) return;
    await addServico(name, price);
    renderServicosView();
  };

  appContainer.onclick = async (e) => {
    const btnEdit = e.target.closest('button[data-edit]');
    const btnDel  = e.target.closest('button[data-del]');
    if (btnDel) {
      if (confirm('Excluir serviço?')) {
        await deleteServico(btnDel.dataset.del).catch(()=>{});
        renderServicosView();
      }
    } else if (btnEdit) {
      const id = btnEdit.dataset.edit;
      const s = await getServicoById(id);
      openEditModal(s);
    }
  };
};

function openEditModal(servico) {
  modalPlaceholder.innerHTML = `
    <div class="card" style="position:fixed;inset:0;max-width:480px;margin:40px auto;background:#fff;z-index:50">
      <div class="card-header">Editar serviço</div>
      <div class="card-body">
        <form id="form-edit-servico" class="grid">
          <label>Nome <input id="esName" value="${attr(servico.name||'')}" required /></label>
          <label>Preço (R$) <input id="esPrice" type="number" min="0" step="0.01" value="${Number(servico.price)||0}" required /></label>
          <div class="card-actions">
            <button class="btn">Salvar</button>
            <button type="button" class="link" id="closeModal">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('form-edit-servico').onsubmit = async (e) => {
    e.preventDefault();
    const name  = document.getElementById('esName').value.trim();
    const price = Number(document.getElementById('esPrice').value);
    await updateServico(servico.id, { name, price });
    closeModal();
    renderServicosView();
  };
}

function closeModal(){ modalPlaceholder.innerHTML=''; }
const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr = (s='') => esc(s).replace(/"/g,'&quot;');
