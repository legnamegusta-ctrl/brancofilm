// js/views/loginView.js
export function renderLoginView() {
  const root = document.getElementById('page-content');
  if (!root) throw new Error('#page-content não encontrado');
  root.innerHTML = `
    <div class="card container-sm">
      <h1 class="mb">Entrar</h1>
      <div id="auth-alert" class="alert" aria-live="polite"></div>
      <div id="tab-login" role="tabpanel">
        <form id="signin-form" class="grid mt" aria-busy="false">
          <label for="signin-email">Email</label>
          <input id="signin-email" class="input" type="email" required />
          <label for="signin-pass">Senha</label>
          <input id="signin-pass" class="input" type="password" required />
          <button class="btn btn-primary mt" style="width:100%;">Entrar</button>
        </form>
        <p class="mt-sm"><a id="link-reset" class="link" href="#">Esqueci</a></p>
      </div>
      <div id="tab-reset" role="tabpanel" hidden>
        <form id="reset-form" class="grid mt" aria-busy="false">
          <label for="reset-email">Email</label>
          <input id="reset-email" class="input" type="email" required />
          <div class="form-row actions full">
            <button type="button" class="link" id="back-to-login">Voltar</button>
            <button class="btn btn-primary">Enviar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}
