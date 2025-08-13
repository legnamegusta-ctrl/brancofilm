const appContainer = document.getElementById('page-content');

export function renderUiKitView() {
  appContainer.innerHTML = `
    <section class="card">
      <h2>UI Kit</h2>
      <div class="stack gap-md mt-md">
        <div>
          <h3>Buttons</h3>
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-secondary">Secondary</button>
          <button class="btn btn-ghost">Ghost</button>
          <button class="btn btn-danger">Danger</button>
          <button class="btn btn-primary loading" disabled><span class="spinner"></span></button>
        </div>
        <div>
          <h3>Badges</h3>
          <span class="badge info">Novo</span>
          <span class="badge warning">Em andamento</span>
          <span class="badge success">Concluído</span>
          <span class="badge danger">Cancelado</span>
        </div>
        <div>
          <h3>Inputs</h3>
          <input class="input" placeholder="Normal">
          <input class="input mt-sm" disabled value="Disabled">
        </div>
      </div>
    </section>
  `;
}

