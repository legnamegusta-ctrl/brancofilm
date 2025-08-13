// js/router.js

import { renderClientesView } from './views/clientesView.js';
import { renderServicosView } from './views/servicosView.js';
import { renderAgendaView } from './views/agendaView.js'; // IMPORTADO

const appContainer = document.getElementById('app-container');

// View temporária
const renderDashboardView = () => appContainer.innerHTML = '<h2>Dashboard</h2><p>Indicadores de performance aparecerão aqui.</p>';

const routes = {
    '#dashboard': renderDashboardView,
    '#agenda': renderAgendaView, // ATUALIZADO
    '#clientes': renderClientesView,
    '#servicos': renderServicosView
};

export const navigate = () => {
    const hash = window.location.hash || '#dashboard';
    const pathParts = hash.split('/');
    const mainPath = pathParts[0];
    const param = pathParts[1];

    const navLinks = document.querySelectorAll('#main-nav a');
    navLinks.forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`#main-nav a[href^="${mainPath}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    const renderFunction = routes[mainPath];

    if (renderFunction) {
        renderFunction(param); 
    } else {
        routes['#dashboard']();
    }
};