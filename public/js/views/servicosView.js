// js/views/servicosView.js

import { getServicos, addServico, getServicoById, updateServico, deleteServico } from '../services/firestoreService.js';

const appContainer = document.getElementById('app-container');
const modalPlaceholder = document.getElementById('modal-placeholder');

export const renderServicosView = async () => {
    const servicos = await getServicos();

    const servicosCardsHtml = servicos.map(servico => `
        <div class="card">
            <div class="card-header">${servico.name}</div>
            <div class="card-body">
                <p><strong>Preço:</strong> R$ ${servico.price.toFixed(2)}</p>
                </div>
            <div class="card-actions">
                <button class="btn btn-secondary edit-btn" data-id="${servico.id}">Editar</button>
                <button class="btn btn-danger delete-btn" data-id="${servico.id}">Excluir</button>
            </div>
        </div>
    `).join('');

    const viewHtml = `
        <section>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>Catálogo de Serviços</h2>
                <button id="add-servico-btn" class="btn btn-primary">Adicionar Serviço</button>
            </div>
            <div class="card-list">
                ${servicosCardsHtml}
            </div>
        </section>
    `;

    appContainer.innerHTML = viewHtml;
    addEventListeners();
};

const addEventListeners = () => {
    document.getElementById('add-servico-btn').addEventListener('click', () => {
        showServicoModal(); 
    });

    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const servico = await getServicoById(id);
            showServicoModal(servico);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Tem certeza que deseja excluir este serviço?')) {
                await deleteServico(id);
                renderServicosView();
            }
        });
    });
};

const showServicoModal = (servico = null) => {
    const isEditing = servico !== null;
    const modalTitle = isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço';
    const buttonText = isEditing ? 'Salvar Alterações' : 'Adicionar';

    const modalHtml = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${modalTitle}</h2>
                    <button class="modal-close-btn">&times;</button>
                </div>
                <form id="servico-form">
                    <div class="form-group">
                        <label for="servico-nome">Nome do Serviço</label>
                        <input type="text" id="servico-nome" value="${isEditing ? servico.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="servico-preco">Preço (R$)</label>
                        <input type="number" id="servico-preco" value="${isEditing ? servico.price : ''}" required>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel-btn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${buttonText}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    modalPlaceholder.innerHTML = modalHtml;

    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    document.getElementById('servico-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('servico-nome').value;
        const preco = document.getElementById('servico-preco').value;
        // Variável 'comissao' não é mais necessária aqui
        
        const data = { name: nome, price: Number(preco) };

        if (isEditing) {
            await updateServico(servico.id, data);
        } else {
            // Chamada da função simplificada
            await addServico(nome, preco);
        }

        closeModal();
        renderServicosView();
    });
};

const closeModal = () => {
    modalPlaceholder.innerHTML = '';
};