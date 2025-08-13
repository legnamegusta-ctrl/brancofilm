// js/views/quotePublicView.js
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore();
const appContainer = document.getElementById('page-content');

export async function renderQuotePublicView(token) {
  const ref = doc(db, 'quotes_public', token);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    appContainer.innerHTML = '<section class="card"><p>Orçamento não encontrado.</p></section>';
    return;
  }
  const q = snap.data();
  appContainer.innerHTML = `
    <section class="card">
      <h2>Orçamento</h2>
      <pre>${JSON.stringify(q, null, 2)}</pre>
      <div class="card-actions">
        <button id="btnAccept" class="btn">Aceitar</button>
        <button id="btnReject" class="btn btn-danger">Rejeitar</button>
      </div>
      <div id="quote-msg" class="mt"></div>
    </section>
  `;
  document.getElementById('btnAccept').onclick = () => decide('accept');
  document.getElementById('btnReject').onclick = () => decide('reject');
  async function decide(action) {
    try {
      const url = action === 'accept' ? '/acceptQuote' : '/rejectQuote';
      const res = await fetch(`${url}?token=${token}`, { method: 'POST' });
      if(res.ok) document.getElementById('quote-msg').textContent = 'Registrado';
      else document.getElementById('quote-msg').textContent = 'Falha';
    } catch(e){ document.getElementById('quote-msg').textContent = 'Erro'; }
  }
}
