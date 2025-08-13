// js/main.js

import { navigate } from './router.js';

// Função que inicia tudo
const main = () => {
    // Ouve o evento de mudança de hash na URL
    window.addEventListener('hashchange', navigate);

    // Navega para a rota inicial quando a página carrega
    navigate();
};

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', main);