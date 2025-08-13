// js/views/clientesView.js

import { 
    getCustomers, 
    getCustomerById, 
    addCustomer, 
    updateCustomer,
    getVehiclesForCustomer,
    addVehicle,
    deleteVehicle
} from '../services/firestoreService.js';

const appContainer = document.getElementById('app-container');
const modalPlaceholder = document.getElementById('modal-placeholder');

// --- RENDERIZADOR PRINCIPAL ---
// Decide se mostra a lista de clientes ou os detalhes de um
export const renderClientesView = (customerId) => {
    if (customerId) {
        renderCustomerDetail(customerId);
    } else {
        renderCustomerList();
    }
};

// --- RENDERIZADOR DA LISTA DE CLIENTES ---
async function renderCustomerList() {
    const customers = await getCustomers();
    const customerCardsHtml = customers.map(customer => `
        <div class="card">
            <div class="card-header">${customer.name}</div>
            <div class="card-body">
                <p><strong>Telefone:</strong> ${customer.phone || 'Não informado'}</p>
                <p><strong>Email:</strong> ${customer.email || 'Não informado'}</p>
            </div>
            <div class="card-actions">
                <a href="#clientes/${customer.id}" class="btn btn-primary">Ver Detalhes</a>
            </div>
        </div>
    `).join('');

    appContainer.innerHTML = `
        <section>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>Meus Clientes</h2>
                <button id="add-customer-btn" class="btn btn-primary">Adicionar Cliente</button>
            </div>
            <div class="card-list">${customerCardsHtml}</div>
        </section>
    `;

    document.getElementById('add-customer-btn').addEventListener('click', () => showCustomerModal());
}

// --- RENDERIZADOR DOS DETALHES DO CLIENTE E SEUS VEÍCULOS ---
async function renderCustomerDetail(customerId) {
    const customer = await getCustomerById(customerId);
    const vehicles = await getVehiclesForCustomer(customerId);

    if (!customer) {
        appContainer.innerHTML = '<h2>Cliente não encontrado</h2>';
        return;
    }

    const vehiclesHtml = vehicles.map(v => `
        <li class="card" style="flex-direction: row; justify-content: space-between; align-items: center;">
            <span><strong>${v.make} ${v.model}</strong> - Placa: ${v.plate}</span>
            <button class="btn btn-danger delete-vehicle-btn" data-id="${v.id}">Excluir</button>
        </li>
    `).join('');

    appContainer.innerHTML = `
        <section>
            <a href="#clientes" class="btn btn-secondary" style="margin-bottom: 1rem;">&larr; Voltar para a Lista</a>
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${customer.name}</span>
                    <button class="btn btn-secondary" id="edit-customer-btn">Editar Cliente</button>
                </div>
                <div class="card-body">
                    <p><strong>Telefone:</strong> ${customer.phone || 'Não informado'}</p>
                    <p><strong>Email:</strong> ${customer.email || 'Não informado'}</p>
                </div>
            </div>
        </section>

        <section style="margin-top: 2rem;">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>Veículos Cadastrados</h2>
                <button id="add-vehicle-btn" class="btn btn-primary">Adicionar Veículo</button>
            </div>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 1rem;">${vehiclesHtml || '<p>Nenhum veículo cadastrado.</p>'}</ul>
        </section>
    `;
    
    // Listeners da página de detalhes
    document.getElementById('edit-customer-btn').addEventListener('click', () => showCustomerModal(customer));
    document.getElementById('add-vehicle-btn').addEventListener('click', () => showVehicleModal(customerId));
    document.querySelectorAll('.delete-vehicle-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Tem certeza que deseja excluir este veículo?')) {
                await deleteVehicle(e.target.dataset.id);
                renderCustomerDetail(customerId); // Recarrega a view
            }
        });
    });
}


// --- MODAIS ---

// Modal para Adicionar/Editar Cliente
function showCustomerModal(customer = null) {
    const isEditing = customer !== null;
    const modalHtml = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <form id="customer-form">
                    <div class="form-group"><label for="customer-name">Nome</label><input type="text" id="customer-name" value="${isEditing ? customer.name : ''}" required></div>
                    <div class="form-group"><label for="customer-phone">Telefone</label><input type="tel" id="customer-phone" value="${isEditing ? customer.phone : ''}"></div>
                    <div class="form-group"><label for="customer-email">Email</label><input type="email" id="customer-email" value="${isEditing ? customer.email : ''}"></div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel-btn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${isEditing ? 'Salvar' : 'Adicionar'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    modalPlaceholder.innerHTML = modalHtml;

    document.getElementById('customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            email: document.getElementById('customer-email').value,
        };
        if (isEditing) {
            await updateCustomer(customer.id, data);
            renderCustomerDetail(customer.id);
        } else {
            await addCustomer(data);
            renderCustomerList();
        }
        closeModal();
    });

    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
}

// Modal para Adicionar Veículo
function showVehicleModal(customerId) {
    const modalHtml = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Adicionar Novo Veículo</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <form id="vehicle-form">
                    <div class="form-group"><label for="vehicle-plate">Placa</label><input type="text" id="vehicle-plate" required></div>
                    <div class="form-group"><label for="vehicle-make">Montadora</label><input type="text" id="vehicle-make"></div>
                    <div class="form-group"><label for="vehicle-model">Modelo</label><input type="text" id="vehicle-model"></div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel-btn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Adicionar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    modalPlaceholder.innerHTML = modalHtml;
    
    document.getElementById('vehicle-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            plate: document.getElementById('vehicle-plate').value,
            make: document.getElementById('vehicle-make').value,
            model: document.getElementById('vehicle-model').value,
            customerId: customerId // Vincula o veículo ao cliente
        };
        await addVehicle(data);
        closeModal();
        renderCustomerDetail(customerId); // Recarrega os detalhes do cliente
    });

    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
}

function closeModal() {
    modalPlaceholder.innerHTML = '';
}