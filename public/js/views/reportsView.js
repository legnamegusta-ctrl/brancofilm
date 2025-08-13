import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getOrdersFinished, countOrdersByStatus, getCycleDurations } from '../services/firestoreService.js';

export async function renderReportsView() {
  const container = document.getElementById('page-content');
  container.innerHTML = `
    <h2>Relatórios</h2>
    <div class="tabs">
      <button id="tab-fin" class="btn btn-secondary">Financeiro</button>
      <button id="tab-op" class="btn btn-secondary">Operacional</button>
    </div>
    <section id="report-content" aria-live="polite" class="mt"></section>
  `;

  document.getElementById('tab-fin').addEventListener('click', () => loadFinanceiro());
  document.getElementById('tab-op').addEventListener('click', () => loadOperacional());
  loadFinanceiro();
}

async function loadFinanceiro() {
  const area = document.getElementById('report-content');
  area.innerHTML = '<p class="skeleton">Carregando...</p>';
  const to = Timestamp.now();
  const from = Timestamp.fromDate(new Date(Date.now() - 7*86400000));
  const orders = await getOrdersFinished({ from, to });
  if (!orders.length) {
    area.innerHTML = '<p>Nenhuma OS concluída.</p>';
    return;
  }
  const totals = {};
  orders.forEach(o => {
    const day = o.closedAt?.toDate().toISOString().slice(0,10);
    if (!totals[day]) totals[day] = { count:0, subtotal:0, discount:0, total:0 };
    totals[day].count++;
    totals[day].subtotal += Number(o.subtotal || 0);
    totals[day].discount += Number(o.discount || 0);
    totals[day].total += Number(o.total || 0);
  });
  let html = '<table class="table"><thead><tr><th>Dia</th><th>Qtd</th><th>Subtotal</th><th>Desc.</th><th>Total</th></tr></thead><tbody>';
  Object.entries(totals).forEach(([day,val]) => {
    html += `<tr><td>${day}</td><td>${val.count}</td><td>${val.subtotal.toFixed(2)}</td><td>${val.discount.toFixed(2)}</td><td>${val.total.toFixed(2)}</td></tr>`;
  });
  html += '</tbody></table><button id="fin-csv" class="btn btn-primary mt">Exportar CSV</button>';
  area.innerHTML = html;
  document.getElementById('fin-csv').addEventListener('click', () => {
    const rows = [['dia','qtd','subtotal','desconto','total']];
    Object.entries(totals).forEach(([d,v])=>rows.push([d,v.count,v.subtotal,v.discount,v.total]));
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'financeiro.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

async function loadOperacional() {
  const area = document.getElementById('report-content');
  area.innerHTML = '<p class="skeleton">Carregando...</p>';
  const to = Timestamp.now();
  const from = Timestamp.fromDate(new Date(Date.now() - 7*86400000));
  const status = await countOrdersByStatus({ from, to });
  const cycle = await getCycleDurations({ from, to });
  let html = '<div class="grid">';
  Object.entries(status).forEach(([st,q])=>{
    html += `<span class="badge ${st}">${st}: ${q}</span>`;
  });
  html += `</div><p class="mt">Tempo médio: ${(cycle.avg/3600000).toFixed(2)}h</p>`;
  html += '<button id="op-csv" class="btn btn-primary mt">Exportar CSV</button>';
  area.innerHTML = html;
  document.getElementById('op-csv').addEventListener('click', () => {
    const rows = [['status','quantidade']];
    Object.entries(status).forEach(([st,q])=>rows.push([st,q]));
    rows.push(['tempo_medio_horas',(cycle.avg/3600000).toFixed(2)]);
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'operacional.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
