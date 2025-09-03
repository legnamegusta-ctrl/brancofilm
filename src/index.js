const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.post('/contact', (req, res) => {
  console.log('Contato recebido:', req.body);
  res.status(200).send({ message: 'Contato enviado' });
});

app.post('/schedule', (req, res) => {
  console.log('Agendamento recebido:', req.body);
  res.status(200).send({ message: 'Agendamento enviado' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
