// js/views/agendaView.js

import { getServiceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder, getServiceOrderById, getCustomers, getVehiclesForCustomer, getServicos } from '../services/firestoreService.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const appContainer = document.getElementById('app-container');
const modalPlaceholder = document.getElementById('modal-placeholder');
let calendar; // Manter a instância do calendário acessível

export const renderAgendaView = async () => {
    appContainer.innerHTML = `
        <section>
            <h2>Agenda de Serviços</h2>
            <div id="calendar-container"></div>
        </section>
    `;

    const calendarEl = document.getElementById('calendar-container');
    const events = await getServiceOrders();

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // Visão inicial
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'pt-br', // Traduz para o português
        editable: true, // Permite arrastar e redimensionar
        selectable: true, // Permite selecionar horários
        events: events,

        // --- EVENTOS DO CALENDÁRIO ---

        // Disparado ao clicar em um horário vago
        select: (info) => {
            showServiceOrderModal({ start: info.start, end: info.end });
        },

        // Disparado ao clicar em um evento existente
        eventClick: async (info) => {
            const orderDetails = await getServiceOrderById(info.event.id);
            showServiceOrderModal(orderDetails);
        },

        // Disparado após arrastar um evento para uma nova data/hora
        eventDrop: async (info) => {
            if (!confirm("Tem certeza que deseja reagendar este serviço?")) {
                info.revert(); // Desfaz a ação se o usuário cancelar
                return;
            }
            const dataToUpdate = {
                start: Timestamp.fromDate(info.event.start),
                end: Timestamp.fromDate(info.event.end),
            };
            await updateServiceOrder(info.event.id, dataToUpdate);
        }
    });

    calendar.render();
};


// --- MODAL DE ORDEM DE SERVIÇO ---
async function showServiceOrderModal(data) {
    const isEditing = data.id !== undefined;
    const modalTitle = isEditing ? 'Editar Agendamento' : 'Novo Agendamento';

    // Pré-carrega os dados necessários para os menus dropdown
    const customers = await getCustomers();
    const services = await getServicos();

    const customerOptions = customers.map(c => `<option value="${c.id}" ${isEditing && data.customer.id === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    const servicesOptions = services.map(s => `<option value="${s.id}" data-price="${s.price}">${s.name}</option>`).join('');

    const modalHtml = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <div class="modal-header"><h2>${modalTitle}</h2><button class="modal-close-btn">&times;</button></div>
                <form id="order-form">
                    <div class="form-group">
                        <label for="customer-select">Cliente</label>
                        <select id="customer-select" required>${customerOptions}</select>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-select">Veículo</label>
                        <select id="vehicle-select" required><option value="">Selecione um cliente primeiro</option></select>
                    </div>
                    <div class="form-group">
                        <label for="services-select">Serviços</label>
                        <select id="services-select" multiple style="height: 120px;">${servicesOptions}</select>
                    </div>
                    <div class="form-group">
                        <label for="order-start">Início</label>
                        <input type="datetime-local" id="order-start" required>
                    </div>
                    <div class="form-group">
                        <label for="order-end">Fim</label>
                        <input type="datetime-local" id="order-end" required>
                    </div>
                    <div class="form-group">
                        <label for="order-status">Status</label>
                        <select id="order-status">
                            <option value="Agendado">Agendado</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Pronto para Retirada">Pronto para Retirada</option>
                            <option value="Finalizado">Finalizado</option>
                            <option value="Pago">Pago</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        ${isEditing ? `<button type="button" id="delete-order-btn" class="btn btn-danger">Excluir</button>` : ''}
                        <button type="button" class="btn btn-secondary modal-cancel-btn">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${isEditing ? 'Salvar' : 'Agendar'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    modalPlaceholder.innerHTML = modalHtml;

    // --- LÓGICA DO MODAL ---
    const customerSelect = document.getElementById('customer-select');
    const vehicleSelect = document.getElementById('vehicle-select');
    const startInput = document.getElementById('order-start');
    const endInput = document.getElementById('order-end');
    const statusSelect = document.getElementById('order-status');

    // Função para carregar veículos quando um cliente é selecionado
    const loadVehicles = async (customerId) => {
        const vehicles = await getVehiclesForCustomer(customerId);
        vehicleSelect.innerHTML = vehicles.map(v => `<option value="${v.id}">${v.make} ${v.model} - ${v.plate}</option>`).join('');
    };

    // Preenche os campos se estiver editando
    if (isEditing) {
        await loadVehicles(data.customer.id);
        vehicleSelect.value = data.vehicle.id;
        // Seleciona os serviços que já estavam na O.S.
        data.services.forEach(service => {
            const option = document.querySelector(`#services-select option[value="${service.id}"]`);
            if (option) option.selected = true;
        });
        statusSelect.value = data.status;
    } else if (customers.length > 0) {
        // Se for novo agendamento, carrega os veículos do primeiro cliente da lista
        loadVehicles(customerSelect.value);
    }

    // Formata as datas para o input datetime-local
    const formatDateTimeLocal = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    startInput.value = formatDateTimeLocal(isEditing ? data.start.toDate() : data.start);
    endInput.value = formatDateTimeLocal(isEditing ? data.end.toDate() : data.end);
    
    // Listeners do modal
    customerSelect.addEventListener('change', () => loadVehicles(customerSelect.value));
    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.querySelector('.modal-cancel-btn').addEventListener('click', closeModal);

    if (isEditing) {
        document.getElementById('delete-order-btn').addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja excluir este agendamento?')) {
                await deleteServiceOrder(data.id);
                closeModal();
                calendar.refetchEvents();
            }
        });
    }

    document.getElementById('order-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Coleta os dados dos serviços selecionados
        const selectedServices = Array.from(document.getElementById('services-select').selectedOptions)
            .map(opt => ({ id: opt.value, name: opt.text, price: Number(opt.dataset.price) }));
        
        // Coleta os dados do cliente e veículo selecionados
        const selectedCustomerOption = customerSelect.options[customerSelect.selectedIndex];
        const selectedVehicleOption = vehicleSelect.options[vehicleSelect.selectedIndex];

        const orderData = {
            customer: { id: selectedCustomerOption.value, name: selectedCustomerOption.text },
            vehicle: { id: selectedVehicleOption.value, model: selectedVehicleOption.text.split(' - ')[0] },
            services: selectedServices,
            totalAmount: selectedServices.reduce((sum, s) => sum + s.price, 0),
            start: Timestamp.fromDate(new Date(startInput.value)),
            end: Timestamp.fromDate(new Date(endInput.value)),
            status: statusSelect.value,
        };

        if (isEditing) {
            await updateServiceOrder(data.id, orderData);
        } else {
            await addServiceOrder(orderData);
        }

        closeModal();
        renderAgendaView(); // Recarrega a view para mostrar o novo evento
    });
}

function closeModal() {
    modalPlaceholder.innerHTML = '';
}