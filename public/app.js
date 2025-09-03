document.getElementById('form-agenda').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    const res = await fetch('/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const msg = document.getElementById('agenda-msg');
    if (res.ok) {
      msg.textContent = 'Agendamento enviado! Entraremos em contato.';
      msg.classList.remove('hidden');
      e.target.reset();
    } else {
      msg.textContent = 'Falha ao enviar agendamento.';
      msg.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
});

document.getElementById('form-contato').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    const res = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const msg = document.getElementById('contato-msg');
    if (res.ok) {
      msg.textContent = 'Mensagem enviada!';
      msg.classList.remove('hidden');
      e.target.reset();
    } else {
      msg.textContent = 'Falha ao enviar mensagem.';
      msg.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
});
