import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';
import { formatTitleCase } from '../utils/formatters.js';
import printerService from '../services/printer.js';

export class ClientModule {
    constructor() {
        this.clients = [];
        this.filters = {
            search: '',
            type: 'all'
        };
        this.selectedIds = new Set(); // Selection State
        this.currentClientPhotoBase64 = '';
        // Mock data similar to screenshot if storage is empty
        this.mockData = [];
    }

    async init(containerId, params = {}) {
        this.containerId = containerId;

        // Check if storage is empty. If so, seed it with mock data so edits persist.
        const stored = storage.getClients();

        this.clients = stored.reverse();


        this.render();

        // Handle Params for Deep Linking
        if (params.clientId) {
            const client = this.clients.find(c => String(c.id) === String(params.clientId));
            if (client) {
                setTimeout(() => this.openModal(client, 'edit'), 300);
            }
        } else if (params.action === 'new') {
            setTimeout(() => this.openModal(null, 'create'), 300);
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const allSelected = this.clients.length > 0 && this.selectedIds.size === this.clients.length;
        const hasSelection = this.selectedIds.size > 0;

        container.innerHTML = `
        <div class="flex flex-col h-full animate-fade-in relative z-0">
            <!-- Top Controls Bar -->
            <div class="bg-white p-2 md:p-3 rounded-t-lg border-b border-gray-200 flex flex-wrap gap-2 items-center justify-between shadow-sm sticky top-0 z-20">
                
                <!-- New Client Button -->
                <button id="btn-new-client" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded text-xs uppercase shadow-sm flex items-center gap-2 transition-colors">
                     <i data-feather="plus" class="w-4 h-4"></i> Novo Cliente
                </button>

                <!-- Bulk Selection Action -->
                ${hasSelection ? `
                    <button id="btn-bulk-delete" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded text-xs uppercase shadow-sm flex items-center gap-2 transition-colors animate-fade-in">
                        <i data-feather="trash-2" class="w-4 h-4"></i> Excluir (${this.selectedIds.size})
                    </button>
                ` : ''}

                <!-- Filters -->
                <div class="flex flex-1 gap-2 overflow-x-auto items-center ${hasSelection ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="relative">
                        <i data-feather="search" class="w-3 h-3 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="client-search" value="${this.filters.search || ''}" placeholder="Nome, CPF/CNPJ, Tel..." class="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 w-64 focus:outline-none focus:border-unitech-primary">
                    </div>
                    
                    <select id="filter-client-type" class="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-unitech-primary bg-white">
                        <option value="all" ${this.filters.type === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="client_retail" ${this.filters.type === 'client_retail' ? 'selected' : ''}>Cliente (Varejo)</option>
                        <option value="client_wholesale" ${this.filters.type === 'client_wholesale' ? 'selected' : ''}>Cliente (Atacado)</option>
                        <option value="tech" ${this.filters.type === 'tech' ? 'selected' : ''}>Técnico</option>
                        <option value="supplier" ${this.filters.type === 'supplier' ? 'selected' : ''}>Fornecedor</option>
                        <option value="creditor" ${this.filters.type === 'creditor' ? 'selected' : ''}>Credor</option>
                    </select>

                     <select class="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-unitech-primary bg-white">
                        <option>20 Itens</option>
                        <option>50 Itens</option>
                        <option>100 Itens</option>
                    </select>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 border-l border-gray-200 pl-2">
                     <button id="btn-print-clients" class="p-2 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100" title="Imprimir"><i data-feather="printer" class="w-4 h-4"></i></button>
                     <button id="btn-export-clients" class="p-2 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100" title="Exportar"><i data-feather="download" class="w-4 h-4"></i></button>
                     <button class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded shadow-sm"><i data-feather="filter" class="w-4 h-4"></i></button>
                </div>
            </div>

            <!-- Table Container (Desktop) -->
            <div class="hidden md:flex bg-white flex-1 overflow-hidden relative shadow-sm rounded-b-lg flex-col">
                <div class="overflow-auto absolute inset-0">
                    <table class="w-full text-left text-xs text-gray-600">
                        <thead class="bg-gray-50 border-b border-gray-200 uppercase font-bold text-gray-500 sticky top-0 z-10">
                            <tr>
                                <th class="p-3 w-10 text-center">
                                    <input type="checkbox" id="check-all-clients" ${allSelected ? 'checked' : ''} class="cursor-pointer">
                                </th>
                                <th class="p-3 w-16 text-center hidden md:table-cell">#</th>
                                <th class="p-3">Nome <i data-feather="arrow-up" class="w-3 h-3 inline"></i></th>
                                <th class="p-3 hidden md:table-cell">Email</th>
                                <th class="p-3 hidden md:table-cell">Telefone</th>
                                <th class="p-3 hidden md:table-cell">Celular</th>
                                <th class="p-3 hidden md:table-cell">Documento</th>
                                <th class="p-3 w-24 md:w-32 text-center text-[10px] md:text-xs">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${this.renderRows()}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Mobile Cards (Mobile) -->
            <div class="md:hidden flex-1 overflow-y-auto space-y-3 p-2 pb-20">
                ${this.renderMobileCards()}
            </div>
            
            <!-- Footer Paginator -->
            <!-- ... -->


            <!-- Footer Paginator -->
            <div class="bg-white border-t border-gray-200 p-1 md:p-2 text-[10px] md:text-xs hidden md:flex justify-between items-center text-gray-500 mt-0 rounded-b-lg">
                 <div class="flex gap-1">
                    <button class="px-2 py-1 border rounded hover:bg-gray-50">1</button>
                    <button class="px-2 py-1 border rounded hover:bg-gray-50 hidden md:block">2</button>
                    <button class="px-2 py-1 border rounded hover:bg-gray-50 hidden md:block">3</button>
                    <button class="px-2 py-1 border rounded hover:bg-gray-50">Prox</button>
                </div>
                <span>${this.clients.length} Clientes</span>
            </div>

             ${this.renderClientModal()}
        </div>
        `;

        if (window.feather) window.feather.replace();
        this.attachEvents();
    }

    getFilteredClients() {
        let filtered = this.clients;

        // Filter by Type
        if (this.filters.type && this.filters.type !== 'all') {
            if (this.filters.type === 'client_retail') {
                // category is client (or empty/null which implies client) AND type is retail (or empty/null which implies retail)
                filtered = filtered.filter(c => (c.category === 'client' || !c.category) && (c.type === 'retail' || !c.type));
            } else if (this.filters.type === 'client_wholesale') {
                filtered = filtered.filter(c => (c.category === 'client' || !c.category) && c.type === 'wholesale');
            } else {
                filtered = filtered.filter(c => c.category === this.filters.type);
            }
        }

        // Filter by Search (Name, Phone, Doc, Email)
        const term = this.filters.search.toLowerCase();
        if (term) {
            filtered = filtered.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.email && c.email.toLowerCase().includes(term)) ||
                (c.phone && c.phone.includes(term)) ||
                (c.mobile && c.mobile.includes(term)) ||
                (c.document && c.document.includes(term)) ||
                (String(c.id).includes(term))
            );
        }

        return filtered;
    }

    renderMobileCards() {
        const filtered = this.getFilteredClients();

        if (filtered.length === 0) {
            return `
                <div class="flex flex-col items-center gap-3 p-8 text-center bg-white rounded-lg border border-gray-100 opacity-60">
                    <i data-feather="users" class="w-8 h-8 text-gray-400"></i>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhum cliente encontrado</p>
                </div>
             `;
        }
        return filtered.map(c => {
            return `
            <div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100 relative group active:scale-[0.98] transition-transform">
                <div class="flex items-start gap-3">
                    <div class="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        ${c.photoUrl ? `<img src="${c.photoUrl}" class="w-full h-full object-cover">` : `<i data-feather="user" class="w-5 h-5 text-gray-300"></i>`}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                             <h4 class="font-bold text-slate-800 text-sm truncate pr-2">${c.name}</h4>
                             <span class="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">#${c.id}</span>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-2">
                            <span class="text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${c.category === 'supplier' ? 'bg-purple-50 text-purple-700 border-purple-100' : (c.category === 'creditor' ? 'bg-orange-50 text-orange-700 border-orange-100' : (c.category === 'tech' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'))}">
                                ${c.category === 'supplier' ? 'Fornecedor' : (c.category === 'creditor' ? 'Credor' : (c.category === 'tech' ? 'TÉCNICO' : 'Cliente'))}
                            </span>
                            ${c.mobile || c.phone ? `<span class="flex items-center gap-1 text-[10px] font-bold text-slate-500"><i data-feather="phone" class="w-3 h-3"></i> ${c.mobile || c.phone}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="mt-3 pt-3 border-t border-gray-50 flex justify-end gap-2">
                     <button class="btn-view h-8 w-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors" data-id="${c.id}"><i data-feather="eye" class="w-4 h-4 pointer-events-none"></i></button>
                     <button class="btn-edit h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors" data-id="${c.id}"><i data-feather="edit-2" class="w-4 h-4 pointer-events-none"></i></button>
                     <button class="btn-delete h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" data-id="${c.id}"><i data-feather="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                </div>
            </div>
             `;
        }).join('');
    }

    renderRows() {
        const filtered = this.getFilteredClients();

        if (filtered.length === 0) {
            return `<tr><td colspan="8" class="p-8 text-center text-gray-400">Nenhum cliente encontrado.</td></tr>`;
        }
        return filtered.map((c, index) => {
            const isSelected = this.selectedIds.has(String(c.id));
            return `
             <tr class="hover:bg-gray-50 transition-colors group animate-fade-in ${isSelected ? 'bg-gray-50' : ''} border-b border-gray-100 last:border-0" style="animation-delay: ${index * 50}ms; animation-fill-mode: both;">
                <td class="p-3 text-center">
                    <input type="checkbox" class="client-check cursor-pointer" data-id="${c.id}" ${isSelected ? 'checked' : ''} aria-label="Selecionar cliente ${c.name}">
                </td>
                <td class="p-3 text-center text-gray-600 font-bold text-xs hidden md:table-cell">${c.id}</td>
                <td class="p-3">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                            ${c.photoUrl ? `<img src="${c.photoUrl}" class="w-full h-full object-cover">` : `<i data-feather="user" class="w-4 h-4 text-gray-400"></i>`}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-bold text-gray-900 uppercase text-[11px] tracking-wide whitespace-normal break-words leading-tight max-w-[150px] md:max-w-none">${c.name}</span>
                            <div class="flex flex-wrap gap-1 mt-0.5 items-center">
                                <span class="text-[10px] text-gray-500 font-mono md:hidden">#${c.id}</span>
                                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${c.category === 'supplier' ? 'bg-purple-100 text-purple-800 border-purple-200' : (c.category === 'creditor' ? 'bg-orange-100 text-orange-800 border-orange-200' : (c.category === 'tech' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'))} border">
                                    ${c.category === 'supplier' ? 'FORNECEDOR' : (c.category === 'creditor' ? 'CREDOR' : (c.category === 'tech' ? 'TÉCNICO' : 'CLIENTE'))}
                                </span>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="p-3 text-gray-700 font-medium hidden md:table-cell">${c.email || ''}</td>
                <td class="p-3 text-gray-700 font-medium hidden md:table-cell">${c.phone || ''}</td>
                <td class="p-3 text-gray-700 font-medium hidden md:table-cell">${c.mobile || c.phone || ''}</td>
                <td class="p-3 text-gray-700 font-medium hidden md:table-cell">${c.document || ''}</td>
                 <td class="p-1 text-center w-24 md:w-32">
                     <div class="flex items-center justify-end md:justify-center">
                        <button class="btn-view p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Visualizar" aria-label="Visualizar cliente" data-id="${c.id}"><i data-feather="eye" class="w-3.5 h-3.5"></i></button>
                        <button class="btn-edit p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-md transition-colors" title="Editar" aria-label="Editar cliente" data-id="${c.id}"><i data-feather="edit-2" class="w-3.5 h-3.5"></i></button>
                         <button class="btn-delete p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Excluir" aria-label="Excluir cliente" data-id="${c.id}"><i data-feather="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                </td>
            </tr>
        `}).join('');
    }

    renderClientModal() {
        const currentUser = auth.getUser();
        const userName = currentUser ? currentUser.name : 'Usuário Desconhecido';

        return `
            <div id="client-modal" class="hidden fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50" style="z-index: 9999;">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                    <div class="flex justify-between items-center p-4 border-b border-gray-100">
                        <h3 class="text-lg font-bold text-gray-700">Adicionar Cliente</h3>
                        <button type="button" class="text-gray-400 hover:text-red-500" id="close-modal-x"><i data-feather="x" class="w-5 h-5"></i></button>
                    </div>
                    <div class="p-6 space-y-4">
                        <!-- Photo Section -->
                        <div class="flex items-center gap-4 mb-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div id="client-photo-preview" class="w-16 h-16 bg-white rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shadow-sm">
                                <i data-feather="user" class="w-6 h-6 text-gray-300"></i>
                            </div>
                            <div class="flex-1">
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Foto de Perfil</label>
                                <div class="flex gap-2">
                                    <button type="button" onclick="document.getElementById('client-photo-camera').click()" class="bg-slate-900 hover:bg-black text-white text-[10px] font-black py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95">
                                        <i data-feather="camera" class="w-3 h-3"></i> CÂMERA
                                    </button>
                                    <button type="button" onclick="document.getElementById('client-photo-gallery').click()" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-black py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95">
                                        <i data-feather="image" class="w-3 h-3"></i> GALERIA
                                    </button>
                                </div>
                                <input type="file" id="client-photo-camera" accept="image/*" capture="environment" class="hidden">
                                <input type="file" id="client-photo-gallery" accept="image/*" class="hidden">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="block text-xs font-bold text-gray-600 mb-1">Nome Completo</label>
                            <input type="text" id="modal-name" class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-unitech-primary outline-none" placeholder="Ex: Consumidor Final">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Telefone</label>
                                <input type="text" id="modal-phone" class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-unitech-primary outline-none">
                            </div>
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Celular</label>
                                <input type="text" id="modal-cell" class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-unitech-primary outline-none">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="block text-xs font-bold text-gray-600 mb-1">E-mail</label>
                            <input type="email" id="modal-email" class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-unitech-primary outline-none">
                        </div>
                         <div class="grid grid-cols-2 gap-4">
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">CNPJ/CPF</label>
                                <input type="text" id="modal-doc" class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-unitech-primary outline-none">
                            </div>
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">CEP</label>
                                <input type="text" id="modal-cep" class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-unitech-primary outline-none">
                            </div>
                        </div>
                         <div class="grid grid-cols-2 gap-4">
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
                                <select id="modal-category" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                    <option value="client">Cliente</option>
                                    <option value="supplier">Fornecedor</option>
                                    <option value="creditor">Credor (Despesas)</option>
                                    <option value="tech">Técnico</option>
                                </select>
                            </div>
                            <div class="form-group" id="group-type">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Tipo de Tabela</label>
                                <select id="modal-type" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                    <option value="retail">Varejo</option>
                                    <option value="wholesale">Atacado</option>
                                </select>
                            </div>
                        </div>
                         <div class="grid grid-cols-2 gap-4">
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Origem Cliente</label>
                                <select id="modal-origin" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                    <option>Loja</option>
                                    <option>Indicação</option>
                                    <option>Google</option>
                                </select>
                            </div>
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Cadastrado por</label>
                                <input type="text" id="modal-registered-by" value="${userName}" disabled class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-500 bg-gray-50">
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200">
                        <button class="bg-orange-400 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded text-sm flex items-center gap-2">
                             <i data-feather="layout" class="w-4 h-4"></i> Completo
                        </button>
                        <div class="flex gap-2">
                             <button type="button" id="close-modal-btn" class="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded text-sm flex items-center gap-2">
                                <i data-feather="corner-up-left" class="w-4 h-4"></i> Voltar
                             </button>
                             <button type="button" id="save-client-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm flex items-center gap-2">
                                <i data-feather="user-plus" class="w-4 h-4"></i> Adicionar
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // --- Filters ---
        const searchInput = document.getElementById('client-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.render();
                // Maintain focus on input after render
                const newInp = document.getElementById('client-search');
                if (newInp) {
                    newInp.focus();
                    try {
                        newInp.setSelectionRange(newInp.value.length, newInp.value.length);
                    } catch (e) { } // ignore if type email/number etc
                }
            });
        }

        const typeFilter = document.getElementById('filter-client-type');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filters.type = e.target.value;
                this.render();
            });
        }

        // Photo Upload
        document.getElementById('client-photo-camera')?.addEventListener('change', (e) => this.handleClientPhotoUpload(e));
        document.getElementById('client-photo-gallery')?.addEventListener('change', (e) => this.handleClientPhotoUpload(e));

        // Print List
        document.getElementById('btn-print-clients')?.addEventListener('click', () => {
            let listToPrint = [];
            if (this.selectedIds.size > 0) {
                listToPrint = this.clients.filter(c => this.selectedIds.has(String(c.id)));
            } else {
                listToPrint = this.getFilteredClients();
            }

            if (listToPrint.length === 0) {
                alert('Nenhum cliente para imprimir.');
                return;
            }

            const content = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="margin: 0;">Relatório de Clientes</h2>
                        <p style="margin: 5px 0; color: #666;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                        <p style="margin: 5px 0;">Total: ${listToPrint.length} registros</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="background: #f3f4f6; text-align: left;">
                                <th style="padding: 8px; border-bottom: 2px solid #ddd;">#</th>
                                <th style="padding: 8px; border-bottom: 2px solid #ddd;">Nome</th>
                                <th style="padding: 8px; border-bottom: 2px solid #ddd;">Categoria</th>
                                <th style="padding: 8px; border-bottom: 2px solid #ddd;">Telefone</th>
                                <th style="padding: 8px; border-bottom: 2px solid #ddd;">Email</th>
                                <th style="padding: 8px; border-bottom: 2px solid #ddd;">Documento</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${listToPrint.map(c => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px;">${c.id}</td>
                                    <td style="padding: 8px;">
                                        <strong>${c.name}</strong><br/>
                                        <span style="font-size: 10px; color: #666;">${c.origin || 'Loja'}</span>
                                    </td>
                                    <td style="padding: 8px;">${c.category === 'supplier' ? 'Fornecedor' : (c.category === 'creditor' ? 'Credor' : (c.category === 'tech' ? 'Técnico' : 'Cliente'))}</td>
                                    <td style="padding: 8px;">
                                        ${c.phone || ''} ${c.mobile ? (c.phone ? ' / ' : '') + c.mobile : ''}
                                    </td>
                                    <td style="padding: 8px;">${c.email || ''}</td>
                                    <td style="padding: 8px;">${c.document || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; text-align: center; color: #999;">
                        UniTech System - Controle Interno
                    </div>
                </div>
            `;
            printerService.openPrintWindow(content);
        });

        // Export CSV
        // Export PDF (via Print Dialog)
        document.getElementById('btn-export-clients')?.addEventListener('click', () => {
            let listToExport = [];
            if (this.selectedIds.size > 0) {
                listToExport = this.clients.filter(c => this.selectedIds.has(String(c.id)));
            } else {
                listToExport = this.getFilteredClients();
            }

            if (listToExport.length === 0) {
                alert('Nenhum dado para exportar.');
                return;
            }

            const content = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="margin: 0;">Exportação de Clientes</h2>
                        <p style="margin: 5px 0; color: #666;">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                        <p style="margin: 5px 0;">Total: ${listToExport.length} registros</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background: #f3f4f6; text-align: left;">
                                <th style="padding: 6px; border-bottom: 2px solid #ddd;">ID</th>
                                <th style="padding: 6px; border-bottom: 2px solid #ddd;">Nome</th>
                                <th style="padding: 6px; border-bottom: 2px solid #ddd;">Tipo/Categoria</th>
                                <th style="padding: 6px; border-bottom: 2px solid #ddd;">Contato</th>
                                <th style="padding: 6px; border-bottom: 2px solid #ddd;">Email</th>
                                <th style="padding: 6px; border-bottom: 2px solid #ddd;">Documento</th>
                                <th style="padding: 6px; border-bottom: 2px solid #ddd;">Endereço/Origem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${listToExport.map(c => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 6px;">${c.id}</td>
                                    <td style="padding: 6px;">
                                        <strong>${c.name}</strong>
                                    </td>
                                    <td style="padding: 6px;">
                                        ${c.category === 'supplier' ? 'Fornecedor' : (c.category === 'creditor' ? 'Credor' : (c.category === 'tech' ? 'Técnico' : 'Cliente'))}
                                        <br/><span style="color:#666; font-size:9px">${c.type === 'wholesale' ? 'Atacado' : 'Varejo'}</span>
                                    </td>
                                    <td style="padding: 6px;">
                                        ${c.phone || ''} <br/> ${c.mobile || ''}
                                    </td>
                                    <td style="padding: 6px;">${c.email || ''}</td>
                                    <td style="padding: 6px;">${c.document || ''}</td>
                                    <td style="padding: 6px;">
                                        ${c.zip || ''} <br/>
                                        <span style="color:#666; font-size:9px">${c.origin || 'Loja'}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; text-align: center; color: #999;">
                        UniTech System - Exportação PDF
                    </div>
                    <div style="text-align: center; margin-top: 10px; padding: 10px; background: #eee; border: 1px dashed #ccc; font-size: 12px;">
                        <strong>Dica:</strong> Na janela de impressão, escolha "Salvar como PDF" em Destino.
                    </div>
                </div>
            `;
            printerService.openPrintWindow(content);
        });

        // --- Actions in Table ---

        // Select All
        document.getElementById('check-all-clients')?.addEventListener('change', (e) => {
            const checked = e.target.checked;
            if (checked) {
                this.clients.forEach(c => this.selectedIds.add(String(c.id)));
            } else {
                this.selectedIds.clear();
            }
            this.render();
        });

        // Select Single Row
        document.querySelectorAll('.client-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) this.selectedIds.add(id);
                else this.selectedIds.delete(id);
                this.render();
            });
        });

        // Bulk Delete Button
        document.getElementById('btn-bulk-delete')?.addEventListener('click', () => {
            if (confirm(`Tem certeza que deseja excluir ${this.selectedIds.size} clientes selecionados?`)) {
                this.selectedIds.forEach(id => storage.deleteClient(id));
                // Update local list
                this.clients = this.clients.filter(c => !this.selectedIds.has(String(c.id)));
                this.selectedIds.clear();
                this.render();
            }
        });

        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-view').dataset.id;
                this.openModal(id, 'view');
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-edit').dataset.id;
                this.openModal(id, 'edit');
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-delete').dataset.id;
                if (confirm('Tem certeza que deseja excluir este cliente?')) {
                    storage.deleteClient(id);
                    // Remove from local list as well
                    this.clients = this.clients.filter(c => c.id != id);
                    this.render();
                }
            });
        });

        // --- Modal Events ---
        const modal = document.getElementById('client-modal');
        const closeModal = () => modal.classList.add('hidden');
        const openModal = () => {
            this.resetModal();
            modal.classList.remove('hidden');
        };

        const btnNew = document.getElementById('btn-new-client');
        if (btnNew) btnNew.addEventListener('click', () => {
            this.currentMode = 'create';
            openModal();
        });

        const btnCloseX = document.getElementById('close-modal-x');
        if (btnCloseX) btnCloseX.addEventListener('click', closeModal);

        const btnClose = document.getElementById('close-modal-btn');
        if (btnClose) btnClose.addEventListener('click', closeModal);

        const btnSave = document.getElementById('save-client-btn');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                try {
                    const rawName = document.getElementById('modal-name').value;
                    let name = formatTitleCase(rawName); // Corrected function call
                    if (!name) name = "CONSUMIDOR FINAL";

                    const phone = document.getElementById('modal-phone').value;
                    const emailInput = document.getElementById('modal-email').value;
                    const email = (emailInput === '' || emailInput === '---') ? undefined : emailInput;

                    // Prepare Clean Object using Schema Field Names
                    const clientData = {
                        id: this.currentId || storage.getNextClientId(),
                        name: name,
                        phone: phone,
                        mobile: document.getElementById('modal-cell').value,
                        email: email,
                        document: document.getElementById('modal-doc').value,
                        zip: document.getElementById('modal-cep').value,
                        category: document.getElementById('modal-category').value,
                        type: document.getElementById('modal-type').value || 'retail',
                        origin: document.getElementById('modal-origin').value,
                        photoUrl: this.currentClientPhotoBase64,
                        createdAt: new Date().toISOString()
                    };

                    if (this.currentMode === 'edit') {
                        storage.updateClient(clientData);
                        const idx = this.clients.findIndex(c => String(c.id) === String(clientData.id));
                        if (idx !== -1) this.clients[idx] = clientData;
                    } else {
                        storage.addClient(clientData);
                        this.clients.unshift(clientData);
                    }

                    this.render(); // Re-render table
                    closeModal();

                    if (window.toastService) {
                        window.toastService.success('Operação realizada com sucesso!');
                    } else {
                        alert('Operação realizada com sucesso!');
                    }
                } catch (error) {
                    console.error('[ClientModule] Save error:', error);
                    if (window.toastService) {
                        window.toastService.error(error.message);
                    } else {
                        alert('Erro ao salvar: ' + error.message);
                    }
                }
            });
        }

        // Global Text Formatting handled in main.js



    }

    handleClientPhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                window.toastService.warning('A imagem deve ter no máximo 5MB.');
                return;
            }

            const preview = document.getElementById('client-photo-preview');
            preview.innerHTML = '<div class="animate-spin text-unitech-primary"><i data-feather="loader" class="w-6 h-6"></i></div>';
            if (window.feather) feather.replace();

            const reader = new FileReader();
            reader.onload = (re) => {
                this.currentClientPhotoBase64 = re.target.result;
                preview.innerHTML = `<img src="${this.currentClientPhotoBase64}" class="w-full h-full object-cover">`;
            };
            reader.readAsDataURL(file);
        }
    }

    // formatName handled globally



    openModal(id, mode) {
        const client = this.clients.find(c => String(c.id) === String(id));
        if (!client) return;

        this.currentMode = mode;
        this.currentId = client.id;

        document.getElementById('modal-name').value = client.name;
        document.getElementById('modal-phone').value = client.phone;
        document.getElementById('modal-cell').value = client.mobile || '';
        document.getElementById('modal-email').value = client.email || '';
        document.getElementById('modal-doc').value = client.document || '';
        document.getElementById('modal-cep').value = client.zip || '';
        document.getElementById('modal-category').value = client.category || 'client';
        document.getElementById('modal-type').value = client.type || 'retail';
        document.getElementById('modal-origin').value = client.origin || 'Loja';

        this.currentClientPhotoBase64 = client.photoUrl || '';
        const preview = document.getElementById('client-photo-preview');
        if (preview) {
            if (client.photoUrl) {
                preview.innerHTML = `<img src="${client.photoUrl}" class="w-full h-full object-cover">`;
            } else {
                preview.innerHTML = '<i data-feather="user" class="w-6 h-6 text-gray-300"></i>';
                if (window.feather) feather.replace();
            }
        }

        const originSelect = document.getElementById('modal-origin');
        // Simple logic to match select option text if needed, or value if we updated select values
        // For now trusting it defaults or user selects

        const inputs = document.querySelectorAll('#client-modal input, #client-modal select');
        const saveBtn = document.getElementById('save-client-btn');
        const title = document.querySelector('#client-modal h3');
        const registeredByInput = document.getElementById('modal-registered-by');

        if (mode === 'view') {
            title.textContent = 'Visualizar Cliente';
            inputs.forEach(el => el.disabled = true);
            saveBtn.classList.add('hidden');
        } else {
            title.textContent = mode === 'edit' ? 'Editar Cliente' : 'Adicionar Cliente';
            inputs.forEach(el => el.disabled = false);
            // Re-disable readonly fields if any (like Cadastrado por)
            if (registeredByInput) registeredByInput.disabled = true;

            saveBtn.classList.remove('hidden');
            saveBtn.innerHTML = mode === 'edit' ? '<i data-feather="save" class="w-4 h-4"></i> Salvar' : '<i data-feather="user-plus" class="w-4 h-4"></i> Adicionar';
        }

        document.getElementById('client-modal').classList.remove('hidden');
    }

    resetModal() {
        this.currentId = null;
        document.querySelector('#client-modal h3').textContent = 'Adicionar Cliente';
        const inputs = document.querySelectorAll('#client-modal input:not([disabled]), #client-modal select');
        inputs.forEach(el => {
            el.value = '';
            el.disabled = false;
        });

        this.currentClientPhotoBase64 = '';
        const preview = document.getElementById('client-photo-preview');
        if (preview) {
            preview.innerHTML = '<i data-feather="user" class="w-6 h-6 text-gray-300"></i>';
            if (window.feather) feather.replace();
        }

        document.getElementById('save-client-btn').classList.remove('hidden');
        document.getElementById('save-client-btn').innerHTML = '<i data-feather="user-plus" class="w-4 h-4"></i> Adicionar';

        // Ensure registered by is set to current user even after reset
        const currentUser = auth.getUser();
        const registeredByInput = document.getElementById('modal-registered-by');
        if (registeredByInput) registeredByInput.value = currentUser ? currentUser.name : 'Usuário Desconhecido';
    }
}

