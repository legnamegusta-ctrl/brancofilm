// js/views/quotesView.js
import { getQuotes, getQuoteById, addQuote, updateQuote, deleteQuote, createPublicQuoteSnapshot, convertQuoteToOrder } from '../services/firestoreService.js';
import { auth } from '../firebase-config.js';

const appContainer = document.getElementById('page-content');

export async function renderQuotesView(param) {
  if (param) return renderQuoteDetail(param);
  const list = await getQuotes();
  appContainer.innerHTML = `<section class="card"><h2>Orçamentos</h2><button id="btnNewQuote" class="btn">Novo</button><ul id="quotes-list"></ul></section>`;
  const ul = document.getElementById('quotes-list');
  ul.innerHTML = list.map(q=>`<li><a href="#orcamentos/${q.id}">${q.id}</a> - ${q.status}</li>`).join('') || '<li class="muted">Nenhum orçamento</li>';
  document.getElementById('btnNewQuote').onclick = () => location.hash = '#orcamentos/new';
}

async function renderQuoteDetail(id) {
  const isNew = id === 'new';
  const quote = isNew ? { items:[] } : await getQuoteById(id);
  if (!quote) { appContainer.innerHTML = '<p class="muted">Não encontrado</p>'; return; }
  appContainer.innerHTML = `
    <section class="card">
      <h2>${isNew?'Novo':'Editar'} Orçamento</h2>
      <form id="quote-form" class="grid">
        <label>Cliente <input id="qCustomer" value="${quote.customerId||''}" /></label>
        <label>Veículo <input id="qVehicle" value="${quote.vehicleId||''}" /></label>
        <label>Total <input id="qTotal" type="number" step="0.01" value="${quote.total||0}" /></label>
        <label>Status
          <select id="qStatus">
            ${['rascunho','enviado','aceito','rejeitado','expirado'].map(s=>`<option value="${s}" ${quote.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </label>
        <div class="card-actions">
          <button class="btn">Salvar</button>
          ${!isNew?'<button type="button" id="btnDel" class="btn btn-danger">Excluir</button>':''}
          ${!isNew?'<button type="button" id="btnPub" class="btn">Gerar link público</button>':''}
          ${!isNew?'<button type="button" id="btnConv" class="btn">Converter em OS</button>':''}
        </div>
      </form>
    </section>
  `;
  const form = document.getElementById('quote-form');
  form.onsubmit = async e => {
    e.preventDefault();
    const data = {
      customerId: document.getElementById('qCustomer').value,
      vehicleId: document.getElementById('qVehicle').value,
      total: Number(document.getElementById('qTotal').value)||0,
      status: document.getElementById('qStatus').value
    };
    if (isNew) {
      const id = await addQuote(data);
      location.hash = `#orcamentos/${id}`;
    } else {
      await updateQuote(id, data);
      alert('Salvo');
    }
  };
  if (!isNew) {
    document.getElementById('btnDel').onclick = async ()=>{ if(confirm('Excluir?')){ await deleteQuote(id); location.hash='#orcamentos'; } };
    document.getElementById('btnPub').onclick = async ()=>{ const t = await createPublicQuoteSnapshot(id); prompt('Link', location.origin + '/#/q/' + t); };
    document.getElementById('btnConv').onclick = async ()=>{ const oid = await convertQuoteToOrder(id); if(oid) location.hash = `#orders/${oid}`; };
  }
}
