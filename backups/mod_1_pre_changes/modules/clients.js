import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';
import { formatTitleCase } from '../utils/formatters.js';

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

                <!-- Filters (Hidden when selecting? Optional, keeping visible for now) -->
                <div class="flex flex-1 gap-2 overflow-x-auto items-center ${hasSelection ? 'opacity-50 pointer-events-none' : ''}">
                    <input type="text" placeholder="Nome do Cliente" class="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 w-48 focus:outline-none focus:border-unitech-primary">
                    <input type="text" placeholder="Telefone ou Celular" class="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 w-40 focus:outline-none focus:border-unitech-primary">
                    <input type="text" placeholder="CNPJ ou CPF" class="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 w-40 focus:outline-none focus:border-unitech-primary">
                    
                    <select class="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-unitech-primary bg-white">
                        <option>Tipo Cliente</option>
                        <option>Varejo</option>
                        <option>Atacado</option>
                    </select>

                     <select class="border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-unitech-primary bg-white">
                        <option>20 Itens</option>
                        <option>50 Itens</option>
                        <option>100 Itens</option>
                    </select>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 border-l border-gray-200 pl-2">
                     <button class="p-2 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100" title="Imprimir"><i data-feather="printer" class="w-4 h-4"></i></button>
                     <button class="p-2 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100" title="Exportar"><i data-feather="download" class="w-4 h-4"></i></button>
                     <button class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded shadow-sm"><i data-feather="filter" class="w-4 h-4"></i></button>
                </div>
            </div>

            <!-- Table Container -->
            <div class="bg-white flex-1 overflow-hidden relative shadow-sm rounded-b-lg">
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

    renderRows() {
        if (this.clients.length === 0) {
            return `<tr><td colspan="8" class="p-8 text-center text-gray-400">Nenhum cliente encontrado.</td></tr>`;
        }
        return this.clients.map((c, index) => {
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
        // Photo Upload
        document.getElementById('client-photo-camera')?.addEventListener('change', (e) => this.handleClientPhotoUpload(e));
        document.getElementById('client-photo-gallery')?.addEventListener('change', (e) => this.handleClientPhotoUpload(e));

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

