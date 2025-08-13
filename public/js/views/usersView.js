import { getUsers, updateUserRole, toggleUserActive } from '../services/firestoreService.js';

export async function renderUsersView() {
  const container = document.getElementById('app-container');
  container.innerHTML = '<h2>Usuários</h2><p class="skeleton">Carregando...</p>';
  const users = await getUsers();
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `<thead><tr><th>Email</th><th>Nome</th><th>Papel</th><th>Ativo</th></tr></thead><tbody></tbody>`;
  const tbody = table.querySelector('tbody');
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.email || ''}</td>
      <td>${u.displayName || ''}</td>
      <td>
        <select data-role="${u.id}">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </td>
      <td><input type="checkbox" data-active="${u.id}" ${u.active ? 'checked' : ''}></td>
    `;
    tbody.appendChild(tr);
  });
  container.innerHTML = '<h2>Usuários</h2>';
  container.appendChild(table);

  container.addEventListener('change', (e) => {
    if (e.target.matches('select[data-role]')) {
      const uid = e.target.dataset.role;
      updateUserRole(uid, e.target.value);
    }
    if (e.target.matches('input[data-active]')) {
      const uid = e.target.dataset.active;
      toggleUserActive(uid, e.target.checked);
    }
  });
}
