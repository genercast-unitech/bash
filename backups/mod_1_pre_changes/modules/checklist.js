import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';
import { anatelService } from '../services/anatel.js';

export class ChecklistModule {
    constructor() {
        this.items = [
            { id: 'screen', label: 'Tela/Touch', status: true, observation: '' },
            { id: 'battery', label: 'Bateria/Carga', status: true, observation: '' },
            { id: 'audio', label: 'Áudio/Microfone', status: true, observation: '' },
            { id: 'camera', label: 'Câmeras/FaceID', status: true, observation: '' },
            { id: 'housing', label: 'Carcaça/Vidro', status: true, observation: '' },
            { id: 'buttons', label: 'Botões Físicos', status: true, observation: '' },
            { id: 'wifi', label: 'Wi-Fi/Rede', status: true, observation: '' },
            { id: 'sensor', label: 'Sensores', status: true, observation: '' }
        ];
        this.timerInterval = null;
        this.seconds = 0;
        this.view = 'list'; // 'list' | 'create'
        this.filters = {
            status: '',
            search: '',
            date: ''
        };
        this.viewMode = 'create'; // create, edit, view
        this.currentId = null;
        this.selectedIds = new Set(); // Selection Logic
        this.equipmentPhotos = []; // Photos array
        this.accessories = []; // Accessories array
        this.mockClients = [];
    }

    async init(containerId, params = {}) {
        this.containerId = containerId;

        // Handle Params
        if (params.filter) {
            this.applyFilterFromParams(params.filter);
            this.view = 'list';
        } else if (params.view) {
            this.view = params.view;
        } else if (params.osId) {
            this.view = 'detail';
            this.currentId = params.osId;
        } else {
            // Default Reset: If no params (sidebar click), always go to list
            this.view = 'list';
            this.currentId = null; // Clear selection
            this.viewMode = 'create';
        }

        this.render();
    }

    applyFilterFromParams(filter) {
        if (filter === 'overdue') this.filters.status = 'vencidas';
        if (filter === 'today') this.filters.status = 'hoje';
        if (filter === 'tomorrow') this.filters.status = 'amanha';
        if (filter === 'ontime') this.filters.status = 'noprazo';
        if (filter === 'priority-alta') this.filters.status = 'p-alta';
        if (filter === 'priority-normal') this.filters.status = 'p-normal';
        if (filter === 'priority-baixa') this.filters.status = 'p-baixa';
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (this.view === 'list') {
            container.innerHTML = this.renderList();
            this.attachListEvents();
        } else if (this.view === 'detail') {
            container.innerHTML = this.renderDetailChecklist();

            // Render Pattern if exists
            const os = storage.getChecklists().find(item => item.id == this.currentId);
            if (os?.deviceInfo?.pattern) {
                this.renderSavedPattern(os.deviceInfo.pattern);
            }

            // Attach events for detail view
            document.getElementById('btn-back-detail')?.addEventListener('click', () => {
                this.view = 'list';
                this.render();
            });
            document.getElementById('btn-print-detail')?.addEventListener('click', () => {
                window.print();
            });

        } else {
            container.innerHTML = this.renderCreate();
            this.attachCreateEvents();
        }

        if (window.feather) window.feather.replace();
    }

    // --- LIST VIEW ---

    renderList() {
        const checklists = storage.getChecklists();
        const today = new Date().toLocaleDateString('en-CA');
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toLocaleDateString('en-CA');

        // 1. Filtering Logic
        let filtered = checklists;

        // General Search (ID or Client)
        if (this.filters.search) {
            const term = this.filters.search.toLowerCase();
            filtered = filtered.filter(c =>
                (c.id && c.id.toString().toLowerCase().includes(term)) ||
                (c.client && c.client.toLowerCase().includes(term)) ||
                (c.device && c.device.toLowerCase().includes(term))
            );
        }

        // Specific Column Filters
        if (this.filters.status && this.filters.status !== 'Todos') {
            // Handle predefined keyword filters vs raw status text
            if (['vencidas', 'hoje', 'amanha', 'noprazo', 'p-alta', 'p-normal', 'p-baixa'].includes(this.filters.status)) {
                if (this.filters.status === 'vencidas') filtered = filtered.filter(c => c.deadline && c.deadline < today && c.status !== 'closed');
                else if (this.filters.status === 'hoje') filtered = filtered.filter(c => {
                    const created = c.date ? new Date(c.date).toLocaleDateString('en-CA') : '';
                    return (c.deadline === today || created === today) && c.status !== 'closed';
                });
                else if (this.filters.status === 'amanha') filtered = filtered.filter(c => c.deadline === tomorrow && c.status !== 'closed');
                else if (this.filters.status === 'noprazo') filtered = filtered.filter(c => (!c.deadline || c.deadline > today) && c.status !== 'closed');
                else if (this.filters.status === 'p-alta') filtered = filtered.filter(c => c.priority === 'Alta');
                else if (this.filters.status === 'p-normal') filtered = filtered.filter(c => c.priority === 'Normal' || c.priority === 'Média');
                else if (this.filters.status === 'p-baixa') filtered = filtered.filter(c => c.priority === 'Baixa');
            } else {
                filtered = filtered.filter(c => c.status && c.status.toLowerCase().includes(this.filters.status.toLowerCase()));
            }
        }

        if (this.filters.client) {
            filtered = filtered.filter(c => c.client && c.client.toLowerCase().includes(this.filters.client.toLowerCase()));
        }
        if (this.filters.technician) {
            filtered = filtered.filter(c => c.technician && c.technician.toLowerCase().includes(this.filters.technician.toLowerCase()));
        }

        // Ensure most recent first
        filtered = [...filtered].reverse();

        // Mock System Totals
        const totalProducts = 756.00;
        const totalServices = 1883.00;
        const totalDiscount = 13.50;
        const totalFinal = 2626.30;

        const hasSelection = this.selectedIds.size > 0;
        const allSelected = filtered.length > 0 && this.selectedIds.size === filtered.length;

        // ... rest of header ...

        return `
            <div class="flex flex-col h-full animate-fade-in space-y-2">
                <!-- Header / Controls -->
                <div class="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
                    
                    <!-- Top Row: Buttons -->
                    <div class="flex flex-wrap justify-between items-center gap-2">
                         <div class="flex gap-2">
                            <button class="bg-unitech-success text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm hover:opacity-90 flex items-center gap-2" id="btn-new-os">
                                <i data-feather="plus" class="w-4 h-4"></i> Nova O.S
                            </button>
                             <div class="relative">
                                <i data-feather="search" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                <input type="text" id="filter-global" value="${this.filters.search || ''}" placeholder="Buscar ID, Cliente..." class="pl-10 pr-4 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-unitech-primary w-64">
                             </div>
                            ${hasSelection ? `
                                <button id="btn-bulk-delete-os" class="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold shadow-sm flex items-center gap-2 animate-fade-in transition-colors">
                                    <i data-feather="trash-2" class="w-4 h-4"></i> Excluir (${this.selectedIds.size})
                                </button>
                            ` : ''}
                         </div>

                         <div class="flex gap-2 text-xs text-gray-500">
                             <div class="px-2 py-1 bg-gray-50 rounded border border-gray-200">
                                 <span class="font-bold">Desc. Prod/Serv:</span> R$ ${totalProducts.toFixed(2)}
                             </div>
                              <div class="px-2 py-1 bg-gray-50 rounded border border-gray-200">
                                 <span class="font-bold">Total:</span> R$ ${totalFinal.toFixed(2)}
                             </div>
                         </div>
                    </div>

                    <!-- Filters Grid -->
                    <div class="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs ${hasSelection ? 'opacity-50 pointer-events-none' : ''}">
                        <input type="text" id="filter-status" value="${this.filters.status === 'Todos' || this.filters.status === 'all' || ['vencidas', 'hoje', 'amanha', 'noprazo'].includes(this.filters.status) ? '' : (this.filters.status || '')}" placeholder="Status" class="border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-unitech-primary">
                        <input type="text" id="filter-client" value="${this.filters.client || ''}" placeholder="Cliente" class="border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-unitech-primary">
                         <input type="text" id="filter-attendant" placeholder="Atendente" class="border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-unitech-primary">
                         <input type="text" id="filter-technician" value="${this.filters.technician || ''}" placeholder="Técnico" class="border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-unitech-primary">
                         <input type="text" placeholder="Prioridade" class="border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-unitech-primary">
                          <input type="text" placeholder="Prazo: --/--/----" class="border border-gray-300 rounded px-2 py-1 text-gray-900 focus:outline-none focus:border-unitech-primary">
                    </div>
                </div>

                <!-- Table Container -->
                <div class="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 overflow-hidden flex flex-col relative">
                    <div class="overflow-x-auto absolute inset-0">
                        <table class="w-full text-left text-xs text-gray-600">
                            <thead class="bg-gray-100 border-b border-gray-200 uppercase font-bold text-gray-500 sticky top-0 z-10">
                                <tr>
                                    <th class="p-3 w-10 text-center">
                                        <input type="checkbox" id="check-all-os" ${allSelected ? 'checked' : ''} class="cursor-pointer">
                                    </th>
                                    <th class="p-3 w-24 text-center"># / Status</th>
                                    <th class="p-3 w-32">Prioridade</th>
                                    <th class="p-3">Cliente / Atendente</th>
                                    <th class="p-3 w-40">Técnico</th>
                                    <th class="p-3 w-32">Entrada</th>
                                    <th class="p-3 w-32">Prazo</th>
                                    <th class="p-3 w-24 text-right">Produtos</th>
                                    <th class="p-3 w-24 text-right">Serviços</th>
                                    <th class="p-3 w-24 text-right">Valor</th>
                                    <th class="p-3 w-40 text-center">Situação</th>
                                    <th class="p-3 w-24 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                                ${filtered.length > 0 ? filtered.map(os => this.renderRow(os)).join('') : `
                                    <tr><td colspan="12" class="p-8 text-center text-gray-400">Nenhuma Ordem de Serviço encontrada.</td></tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
                 <!-- Footer Paginator -->
                 <div class="bg-white border-t border-gray-200 p-2 text-xs flex justify-between items-center text-gray-500">
                    <span>Exibindo ${filtered.length} registros</span>
                    <div class="flex gap-1">
                        <button class="px-2 py-1 border rounded hover:bg-gray-50">1</button>
                        <button class="px-2 py-1 border rounded hover:bg-gray-50">2</button>
                        <button class="px-2 py-1 border rounded hover:bg-gray-50">3</button>
                    </div>
                 </div>
            </div>
        `;
    }

    renderRow(os) {
        // Mock data filling
        const id = os.id || 'OS-000';
        const client = os.client || 'Cliente Desconhecido';
        const technician = os.technician || 'Não Definido';
        const attendant = os.attendant || 'Recepcionista';
        // Financials from OS object
        const valProd = (os.valProd || 0).toFixed(2);
        const valServ = (os.valServ || 0).toFixed(2);
        const valTotal = (os.valTotal || 0).toFixed(2);
        // Helper date parser
        const parseDate = (dateStr) => {
            if (!dateStr) return '---';
            try {
                // Check if already in PT-BR format (simple heuristic)
                if (dateStr.includes('/')) return dateStr;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr; // Return original if invalid
                return d.toLocaleDateString('pt-BR');
            } catch (e) { return dateStr; }
        };

        const entryDate = parseDate(os.date);
        const deadline = parseDate(os.deadline);

        // Status Logic
        const status = os.status || 'Entrada';
        let statusBadge = '';
        if (status === 'Entrada') statusBadge = '<span class="px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-bold uppercase">Entrada</span>';
        else if (status === 'vencido') statusBadge = '<span class="px-2 py-1 bg-red-500 text-white rounded text-[10px] font-bold uppercase">Vencido</span>';
        else if (status === 'finished') statusBadge = '<span class="px-2 py-1 bg-green-500 text-white rounded text-[10px] font-bold uppercase">Concluído</span>';
        else statusBadge = '<span class="px-2 py-1 bg-gray-500 text-white rounded text-[10px] font-bold uppercase">Pendente</span>';

        // Deadline Badge logic
        // Use generic comparison for robustness
        let deadlineDate = new Date();
        try { deadlineDate = new Date(os.deadline); } catch (e) { }

        const today = new Date();
        let deadlineBadge = `<span class="text-green-600 font-bold">No Prazo</span>`;
        if (os.deadline && !isNaN(deadlineDate.getTime()) && deadlineDate < today) {
            deadlineBadge = `<span class="px-1 py-0.5 bg-red-500 text-white rounded text-[9px] uppercase font-bold">Vencido</span>`;
        }

        // Priority Badge - Fixed
        let priorityVal = os.priority || 'Normal';

        // Override priority to Realizada if situation is Realizado
        const situation = (os.situation || '').toUpperCase();
        if (situation === 'REALIZADO') {
            priorityVal = 'Realizada';
        }

        let priorityClass = 'bg-gray-100 text-gray-700 border-gray-200';

        if (priorityVal === 'Alta') priorityClass = 'bg-red-100 text-red-700 border-red-200';
        else if (priorityVal === 'Média') priorityClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
        else if (priorityVal === 'Baixa') priorityClass = 'bg-green-100 text-green-700 border-green-200';
        else if (priorityVal === 'Realizada') priorityClass = 'bg-gray-50 text-gray-400 border-gray-100';

        const priority = priorityVal === 'Realizada' ? 'Sem Prioridade' : `${priorityVal} Prioridade`;

        const isSelected = this.selectedIds.has(String(id));

        return `
            <tr class="hover:bg-blue-50/30 transition-colors group border-l-2 border-transparent hover:border-unitech-primary ${isSelected ? 'bg-blue-50 border-unitech-primary' : ''}">
                <td class="p-3 text-center align-middle">
                    <input type="checkbox" class="os-check cursor-pointer" data-id="${id}" ${isSelected ? 'checked' : ''}>
                </td>
                
                <!-- ID & Badge -->
                <td class="p-3 text-center align-middle">
                    <div class="flex flex-col gap-1 items-center">
                        ${statusBadge}
                        <span class="font-mono font-bold text-gray-700">#${String(id).replace('CHK-', '')}</span>
                    </div>
                </td>
                
                <!-- Priority -->
                 <td class="p-3 align-middle">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold border ${priorityClass} uppercase tracking-tighter">${priority}</span>
                </td>

                <!-- Client / Attendant -->
                <td class="p-3 align-middle">
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-800 text-sm truncate max-w-[150px]" title="${client}">${client}</span>
                        <span class="text-[10px] text-gray-400 uppercase tracking-wide">${attendant}</span>
                    </div>
                </td>

                <!-- Technician -->
                <td class="p-3 align-middle">
                    <div class="flex items-center gap-2">
                         <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                             ${technician.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                         </div>
                         <span class="text-xs text-gray-600">${technician}</span>
                    </div>
                </td>

                <!-- Entry -->
                 <td class="p-3 align-middle">
                    <span class="text-xs text-gray-600">${entryDate}</span>
                </td>

                <!-- Deadline -->
                <td class="p-3 align-middle">
                     <div class="flex flex-col gap-1">
                        ${deadlineBadge}
                        <span class="text-xs text-gray-500">${deadline}</span>
                    </div>
                </td>

                <!-- Financials -->
                <td class="p-3 text-right text-gray-500 font-mono">${valProd}</td>
                <td class="p-3 text-right text-gray-500 font-mono">${valServ}</td>
                <td class="p-3 text-right font-bold text-gray-700 font-mono">${valTotal}</td>

                 <!-- Situation (Workflow) -->
                <td class="p-3 text-center align-middle">
                     ${(() => {
                const situ = (os.situation || 'Pendente').toUpperCase();
                let color = 'bg-blue-100 text-blue-700 border-blue-200';

                if (['REALIZADO', 'AUTORIZADA', 'CONCLUÍDO', 'FINALIZADO', 'POSTAR CORREIOS'].includes(situ)) {
                    color = 'bg-green-100 text-green-700 border-green-200';
                } else if (['RECUSADA', 'SEM REPARO', 'ABANDONO', 'DESCARTE'].includes(situ)) {
                    color = 'bg-red-100 text-red-700 border-red-200';
                } else if (['PENDENTE', 'EM ANÁLISE', 'AGUARD. PEÇA', 'COMPRAR PEÇA'].includes(situ)) {
                    color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                }

                return `<span class="px-2 py-1 rounded border ${color} text-[10px] font-bold uppercase tracking-tight shadow-sm">${situ}</span>`;
            })()}
                </td>

                <!-- Actions -->
                <td class="p-3 text-center align-middle">
                     <div class="flex items-center justify-center gap-1">
                        <button class="btn-view-os p-1.5 hover:bg-blue-100 text-blue-600 rounded shadow-sm border border-gray-100 bg-white" title="Ver" data-id="${id}"><i data-feather="eye" class="w-3 h-3"></i></button>
                        <button class="btn-edit-os p-1.5 hover:bg-yellow-100 text-yellow-600 rounded shadow-sm border border-gray-100 bg-white" title="Editar" data-id="${id}"><i data-feather="edit-2" class="w-3 h-3"></i></button>
                         <button class="btn-print-os p-1.5 hover:bg-gray-100 text-gray-600 rounded shadow-sm border border-gray-100 bg-white" title="Imprimir" data-id="${id}"><i data-feather="printer" class="w-3 h-3"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }

    attachListEvents() {
        document.getElementById('btn-new-os').addEventListener('click', () => {
            this.view = 'create';
            this.viewMode = 'create';
            this.currentId = null;
            this.render();
        });

        // Select All
        document.getElementById('check-all-os')?.addEventListener('change', (e) => {
            const checked = e.target.checked;
            const checklists = storage.getChecklists(); // Should respect filters if possible, but simplicity for now
            if (checked) {
                checklists.forEach(c => this.selectedIds.add(String(c.id)));
            } else {
                this.selectedIds.clear();
            }
            this.render();
        });

        // Select Single Row
        document.querySelectorAll('.os-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) this.selectedIds.add(id);
                else this.selectedIds.delete(id);
                this.render();
            });
        });

        // Bulk Delete Button
        document.getElementById('btn-bulk-delete-os')?.addEventListener('click', () => {
            console.log('[Checklist] Bulk delete clicked, selected IDs:', Array.from(this.selectedIds));
            if (confirm(`Tem certeza que deseja excluir ${this.selectedIds.size} ordens de serviço?`)) {
                let deletedCount = 0;
                this.selectedIds.forEach(id => {
                    const result = storage.deleteChecklist(id);
                    console.log(`[Checklist] Delete ${id}:`, result);
                    if (result) deletedCount++;
                });
                console.log(`[Checklist] Deleted ${deletedCount} of ${this.selectedIds.size} items`);
                this.selectedIds.clear();
                this.render();
            }
        });

        // Edit
        document.querySelectorAll('.btn-edit-os').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentId = btn.dataset.id;
                this.viewMode = 'edit';
                this.view = 'create'; // Re-use create view
                this.render();
            });
        });

        // View
        document.querySelectorAll('.btn-view-os').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentId = btn.dataset.id;
                this.viewMode = 'view';
                this.view = 'detail'; // Use new detail view
                this.render();
            });
        });

        // Print
        document.querySelectorAll('.btn-print-os').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentId = btn.dataset.id;
                this.view = 'detail';
                this.render();
                setTimeout(() => window.print(), 500);
            });
        });

        // --- Filter Events ---

        const attachFilter = (id, field) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    this.filters[field] = e.target.value;
                    this.render();

                    // Restore Focus and Cursor
                    const newInput = document.getElementById(id);
                    if (newInput) {
                        newInput.focus();
                        const len = newInput.value.length;
                        newInput.setSelectionRange(len, len);
                    }
                });
            }
        };

        attachFilter('filter-global', 'search');
        attachFilter('filter-status', 'status');
        attachFilter('filter-client', 'client');
        attachFilter('filter-technician', 'technician');
    }

    // --- CREATE VIEW (Refined from original) ---

    // --- CREATE VIEW (Detailed "Cadastro de OS" Form) ---

    renderCreate() {
        const currentUser = auth.getUser();
        // Load photos and accessories from existing OS if editing
        if (this.viewMode === 'edit' && this.currentId) {
            const list = storage.getChecklists();
            const os = list.find(item => item.id == this.currentId);

            // Photos
            if (os && os.equipmentDetails && os.equipmentDetails.photos) {
                this.equipmentPhotos = [...os.equipmentDetails.photos];
            } else {
                this.equipmentPhotos = [];
            }

            // Accessories
            if (os && os.equipmentDetails && os.equipmentDetails.accessories) {
                this.accessories = [...os.equipmentDetails.accessories];
            } else {
                this.accessories = [];
            }
        } else {
            // Reset for new OS
            this.equipmentPhotos = [];
            this.accessories = [];
        }

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
        <div class="flex flex-col h-full animate-fade-in space-y-4 relative">
            <!-- Header -->
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                 <div class="flex items-center gap-3">
                    <button class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500" id="back-to-list">
                         <i data-feather="arrow-left" class="w-5 h-5"></i>
                    </button>
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Cadastro de OS</h2>
                        <ul class="flex gap-2 text-xs text-gray-500">
                             <li>Painel</li>
                             <li>/</li>
                             <li>Os</li>
                             <li>/</li>
                             <li>Adicionar</li>
                        </ul>
                    </div>
                 </div>
                 <div class="flex gap-2">
                     <button class="p-2 hover:bg-gray-100 text-blue-600 rounded"><i data-feather="help-circle" class="w-5 h-5"></i></button>
                 </div>
            </div>

            ${this.renderClientModal()}

            <!-- Main Form Card -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex-1 overflow-y-auto">
                <h3 class="font-bold text-gray-700 border-b border-gray-100 pb-2 mb-6 text-sm">Detalhes da OS</h3>

                <!-- Status Panel -->
                <div class="flex justify-center mb-10">
                    <div id="status-panel-container" class="px-8 py-3 rounded-full border-2 border-gray-100 bg-gray-50 flex items-center gap-3 transition-all duration-300 shadow-sm">
                        <div id="status-dot" class="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Situação:</span>
                        <span id="os-status-banner" class="text-lg font-black text-gray-700 uppercase">Pendente</span>
                    </div>
                </div>

                <form id="checklist-form" class="space-y-6">
                    <!-- Row 1: Selects -->
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div class="form-group">
                            <label class="block text-xs font-bold text-gray-600 mb-1">Origem Cliente</label>
                            <select class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                <option>----</option>
                                <option>Balcão</option>
                                <option>WhatsApp</option>
                            </select>
                        </div>
                         <div class="form-group">
                            <label class="block text-xs font-bold text-gray-600 mb-1">Garantia</label>
                            <select class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                <option>----</option>
                                <option>Sim</option>
                                <option>Não</option>
                            </select>
                        </div>
                        <div class="form-group">
                             <label class="block text-xs font-bold text-gray-600 mb-1">Técnico</label>
                            <select id="os-technician" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none bg-white">
                                <option value="">Selecione um Técnico...</option>
                                                                ${(() => {
                                    // 1. Get internal users with relevant roles
                                    const internalTechs = storage.getUsers()
                                        .filter(u => ['tech', 'admin', 'ceo', 'manager', 'master'].includes(u.role))
                                        .map(u => u.name);
                                    
                                    // 2. Get external technicians from Clientes module (Category: tech)
                                    const externalTechs = storage.getClients()
                                        .filter(c => c.category === 'tech')
                                        .map(c => c.name);
                                    
                                    // 3. Unique list
                                    const allTechs = [...new Set([...internalTechs, ...externalTechs])].sort();
                                    
                                    return allTechs.map(name => `<option value="${name}">${name}</option>`).join('');
                                })()}
                            </select>
                        </div>
                         <div class="form-group">
                             <label class="block text-xs font-bold text-gray-600 mb-1">Situação</label>
                             <select id="os-situation" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                 <option>Pendente</option>
                                 <option>Em Análise</option>
                                 <option>Enviar p/ Cliente</option>
                                 <option>Aguard. Resposta</option>
                                 <option>Terceirizado</option>
                                 <option>Comprar Peça</option>
                                 <option>Aguard. Peça</option>
                                 <option>Recusada</option>
                                 <option>Sem Reparo</option>
                                 <option>Autorizada</option>
                                 <option>Testes Finais</option>
                                 <option>Postar Correios</option>
                                 <option>Realizado</option>
                                 <option>Abandono</option>
                                 <option>Descarte</option>
                                 <option>Qualidade</option>
                             </select>
                         </div>
                         <div class="form-group">
                              <label class="block text-xs font-bold text-gray-600 mb-1">Status</label>
                             <select id="os-status" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none bg-green-50 text-green-700 font-bold">
                                 <option>Entrada</option>
                                 <option>Orçamento</option>
                                 <option>Aberto</option>
                                 <option>Garantia</option>
                                 <option>Andamento</option>
                                 <option>Concluído</option>
                                 <option>Faturado</option>
                                 <option>Finalizado</option>
                             </select>
                         </div>
                     </div>

                    <!-- Row 2: Client -->
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div class="md:col-span-12 lg:col-span-8 relative">
                             <label class="block text-xs font-bold text-gray-600 mb-1">Cliente</label>
                             <input type="text" id="client-name" class="input-field w-full border border-gray-300 rounded p-2 text-sm !text-gray-800 focus:ring-2 focus:ring-unitech-primary outline-none" placeholder="" autocomplete="off">
                             <div id="client-suggestions" class="hidden absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg rounded-b-md max-h-60 overflow-y-auto mt-1 z-50"></div>
                        </div>
                        <div class="md:col-span-12 lg:col-span-2 flex items-end">
                             <button type="button" id="btn-add-client" class="w-full h-[40px] bg-green-500 hover:bg-green-600 text-white font-bold rounded-md shadow-sm flex items-center justify-center gap-2 transition-all hover:shadow-md mb-[1px]">
                                <i data-feather="plus" class="w-4 h-4"></i> Novo Cliente
                             </button>
                        </div>
                         <div class="md:col-span-6 lg:col-span-2">
                              <label class="block text-xs font-bold text-gray-600 mb-1">Tipo O.S</label>
                             <select class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                <option>Garantia</option>
                                <option>Cliente</option>
                                <option>Contrato</option>
                                <option>Parceiro</option>
                                <option>Fornecedor</option>
                                <option>Fabricante</option>
                                <option>Remoto</option>
                                <option>Visita</option>
                            </select>
                        </div>
                    </div>

                    <!-- Row 3: Details -->
                     <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div class="form-group">
                            <label class="block text-xs font-bold text-gray-600 mb-1">Entrada</label>
                            <input type="datetime-local" value="${today}T${now}" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-unitech-primary outline-none">
                        </div>
                         <div class="form-group">
                            <label class="block text-xs font-bold text-gray-600 mb-1">Prazo</label>
                             <input type="date" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-unitech-primary outline-none">
                        </div>
                         <div class="form-group">
                             <label class="block text-xs font-bold text-gray-600 mb-1">Prioridade</label>
                             <label class="block text-xs font-bold text-gray-600 mb-1">Prioridade</label>
                            <select id="os-priority" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                <option>Normal</option>
                                <option>Alta</option>
                                <option>Baixa</option>
                                <option>Realizada</option>
                            </select>
                        </div>
                         <div class="form-group">
                             <label class="block text-xs font-bold text-gray-600 mb-1">Filial</label>
                             <input type="text" value="${storage.getSettings().companyName || '---'}" disabled class="input-field w-full border border-gray-100 bg-gray-50 rounded p-2 text-sm text-gray-400">
                        </div>
                         <div class="form-group">
                             <label class="block text-xs font-bold text-gray-600 mb-1">Atendente</label>
                             <input type="text" value="${currentUser.name || '---'}" disabled class="input-field w-full border border-gray-100 bg-gray-50 rounded p-2 text-sm text-gray-400">
                        </div>
                    </div>

                     <!-- Row 4: Financials (New) -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-6">
                         <div>
                             <label class="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">Valor Peças <i data-feather="package" class="w-3 h-3 text-gray-400"></i></label>
                             <div class="flex items-center w-full border border-gray-300 rounded focus-within:ring-2 focus-within:ring-unitech-primary bg-white overflow-hidden">
                                <span class="pl-3 text-gray-500 text-sm font-medium">R$</span>
                                <input type="number" id="os-val-prod" step="0.01" class="w-full p-2 text-sm text-gray-900 outline-none border-none focus:ring-0 bg-transparent" placeholder="0,00">
                             </div>
                         </div>
                         <div>
                             <label class="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">Valor Serviços <i data-feather="tool" class="w-3 h-3 text-gray-400"></i></label>
                             <div class="flex items-center w-full border border-gray-300 rounded focus-within:ring-2 focus-within:ring-unitech-primary bg-white overflow-hidden">
                                <span class="pl-3 text-gray-500 text-sm font-medium">R$</span>
                                <input type="number" id="os-val-serv" step="0.01" class="w-full p-2 text-sm text-gray-900 outline-none border-none focus:ring-0 bg-transparent" placeholder="0,00">
                             </div>
                         </div>
                         <div>
                             <label class="block text-xs font-bold text-gray-600 mb-1">Valor Total</label>
                             <div class="flex items-center w-full border border-gray-200 rounded bg-gray-100 overflow-hidden">
                                <span class="pl-3 text-gray-500 text-sm font-bold">R$</span>
                                <input type="number" id="os-val-total" disabled class="w-full p-2 text-sm text-gray-700 font-bold outline-none border-none bg-transparent" value="0.00">
                             </div>
                         </div>
                    </div>

                    <!-- NEW: Technical Equipment Details -->
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                        <h4 class="text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-2"><i data-feather="tool" class="w-4 h-4"></i> Detalhes Técnicos do Equipamento</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-600 mb-1">Marca</label>
                                <input type="text" id="equip-brand" list="brand-suggestions" class="input-field w-full border border-gray-300 rounded p-2 text-sm !text-gray-800 outline-none focus:border-blue-500 bg-white" placeholder="Ex: Samsung">
                                <datalist id="brand-suggestions"></datalist>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-600 mb-1">Modelo</label>
                                <input type="text" id="equip-type" list="model-suggestions" class="input-field w-full border border-gray-300 rounded p-2 text-sm !text-gray-800 outline-none focus:border-blue-500 bg-white" placeholder="Ex: Galaxy S23">
                                <datalist id="model-suggestions">
                                    <option value="iPhone 15 Pro">
                                    <option value="iPhone 14">
                                    <option value="iPhone 13">
                                    <option value="Galaxy S23 Ultra">
                                    <option value="Galaxy S22">
                                    <option value="Galaxy A54">
                                    <option value="Redmi Note 12">
                                    <option value="Poco X5">
                                    <option value="Moto G84">
                                    <option value="Moto Edge 40">
                                </datalist>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-600 mb-1">Cor</label>
                                <input type="text" id="equip-color" list="color-suggestions" class="input-field w-full border border-gray-300 rounded p-2 text-sm !text-gray-800 outline-none focus:border-blue-500 bg-white" placeholder="Ex: Preto">
                                <datalist id="color-suggestions">
                                    <option value="Preto">
                                    <option value="Branco">
                                    <option value="Prata">
                                    <option value="Dourado">
                                    <option value="Azul">
                                    <option value="Verde">
                                    <option value="Vermelho">
                                    <option value="Rosa">
                                    <option value="Roxo">
                                    <option value="Grafite">
                                </datalist>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-3 mb-3">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-600 mb-1">Problema Relatado</label>
                                <textarea id="equip-problem" rows="2" class="input-field w-full border border-gray-300 rounded p-2 text-sm !text-gray-800 outline-none focus:border-blue-500 bg-white" placeholder="Descreva o problema relatado pelo cliente..."></textarea>
                            </div>
                        </div>
                        <div class="border-t border-blue-300 pt-3">
                            <label class="block text-[10px] font-bold text-gray-600 mb-2 flex items-center gap-1">
                                <i data-feather="camera" class="w-3 h-3"></i> Fotos do Aparelho
                            </label>
                            <div class="flex gap-2 mb-2">
                                <input type="file" id="equip-photos" accept="image/*" capture="environment" multiple class="hidden">
                                <button type="button" id="btn-capture-photo" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 uppercase tracking-wide">
                                    <i data-feather="camera" class="w-4 h-4"></i> Tirar Foto
                                </button>
                                <button type="button" id="btn-upload-photo" class="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[11px] font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 uppercase tracking-wide">
                                    <i data-feather="image" class="w-4 h-4"></i> Galeria
                                </button>
                            </div>
                            <div id="photo-preview-container" class="grid grid-cols-3 md:grid-cols-5 gap-2"></div>
                        </div>
                    </div>

                    <!-- NEW: Device Info & Security -->
                    <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <h4 class="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><i data-feather="smartphone" class="w-4 h-4"></i> Informações do Aparelho</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 mb-1">IMEI / Serial</label>
                                <input type="text" id="device-imei" class="input-field w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="15 dígitos" maxlength="15">
                                <div id="os-anatel-status" class="mt-2 min-h-[20px]"></div>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 mb-1">Senha (Numérica)</label>
                                <input type="text" id="device-pass" class="input-field w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="123456">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 mb-1">Padrão de Desbloqueio</label>
                                <input type="hidden" id="device-pattern" value="">
                                <div class="bg-white border border-gray-300 rounded p-3">
                                    <div id="pattern-lock-container" class="relative mx-auto" style="width: 150px; height: 150px;">
                                        <canvas id="pattern-canvas" width="150" height="150" class="absolute top-0 left-0 pointer-events-none"></canvas>
                                        <div id="pattern-grid" class="grid grid-cols-3 gap-4 relative z-10">
                                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                                                <div class="pattern-dot w-10 h-10 rounded-full border-4 border-blue-400 bg-white cursor-pointer hover:bg-blue-50 transition-all flex items-center justify-center text-xs font-bold text-gray-400" data-num="${num}">
                                                    ${num}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    <div class="mt-2 flex gap-2">
                                        <button type="button" id="clear-pattern" class="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded">
                                            Limpar
                                        </button>
                                        <div class="flex-1 text-xs text-gray-600 flex items-center justify-center" id="pattern-display">
                                            Desenhe o padrão
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- NEW: Accessories Section -->
                        <div class="mt-6 border-t border-gray-100 pt-4">
                            <h4 class="text-[10px] font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                                <i data-feather="plus-circle" class="w-3 h-3"></i> Acessórios
                            </h4>
                            <div class="flex gap-2 mb-3">
                                <input type="text" id="acc-input" class="flex-1 border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500" placeholder="Digite um acessório... (ex: Capa, Carregador)">
                                <button type="button" id="btn-add-acc" class="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors shadow-sm">
                                    <i data-feather="plus" class="w-4 h-4"></i> Acrescentar
                                </button>
                            </div>
                            <div id="acc-list" class="flex flex-wrap gap-2">
                                <!-- Tags will be rendered here -->
                            </div>
                        </div>
                    </div>

                    <!-- NEW: Interactive Checklist Grid -->
                    <div class="mb-6">
                        <h4 class="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><i data-feather="check-square" class="w-4 h-4"></i> Checklist de Entrada</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
                            ${this.items.map(item => `
                                <div class="checklist-item-container flex flex-col">
                                    <div class="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg hover:border-green-400 transition-all cursor-pointer select-none checklist-item-wrapper shadow-sm min-h-[60px]" data-item-id="${item.id}">
                                        <span class="text-xs font-bold text-gray-700 text-center">${item.label}</span>
                                        <input type="checkbox" id="chk-${item.id}" class="hidden checklist-toggle" checked>
                                    </div>
                                    <div id="obs-${item.id}" class="hidden mt-2 animate-fade-in z-10">
                                        <textarea 
                                            id="obs-text-${item.id}" 
                                            placeholder="Relate o problema..." 
                                            rows="2" 
                                            class="w-full text-[10px] text-gray-900 font-bold border border-red-300 rounded-md p-2 focus:ring-2 focus:ring-red-400 outline-none bg-red-50 shadow-inner resize-none"></textarea>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                     <!-- Row 5: TextAreas -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-0">
                         <div>
                             <label class="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">Relato Inicial <i data-feather="clipboard" class="w-3 h-3 text-gray-400"></i></label>
                             <textarea id="internal-notes" rows="4" class="w-full border border-gray-300 rounded p-3 text-sm text-gray-800 focus:ring-2 focus:ring-unitech-primary outline-none"></textarea>
                         </div>
                         <div>
                             <label class="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">Relato do Técnico <i data-feather="file-text" class="w-3 h-3 text-gray-400"></i></label>
                             <textarea id="technician-report" rows="4" class="w-full border border-gray-300 rounded p-3 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400" placeholder="Descreva o que foi feito no aparelho..."></textarea>
                         </div>
                    </div>

                    <!-- Footer Buttons -->
                    <div class="flex justify-center gap-4 pt-8 mt-6 border-t border-gray-100">
                        <button type="submit" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-10 rounded-lg shadow-lg flex items-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 uppercase tracking-wide text-sm">
                             <i data-feather="check" class="w-5 h-5"></i> Salvar & Continuar
                        </button>
                        <button type="button" id="btn-cancel" class="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3 px-8 rounded-lg shadow-sm flex items-center gap-2 transition-colors uppercase tracking-wide text-sm">
                             <i data-feather="corner-up-left" class="w-4 h-4"></i> Voltar
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;
    }


    renderClientModal() {
        return `
            <div id="client-modal" class="hidden fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50" style="z-index: 9999;">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                    <div class="flex justify-between items-center p-4 border-b border-gray-100">
                        <h3 class="text-lg font-bold text-gray-700">Adicionar Cliente</h3>
                        <button type="button" class="text-gray-400 hover:text-red-500" id="close-modal-x"><i data-feather="x" class="w-5 h-5"></i></button>
                    </div>
                    <div class="p-6 space-y-4">
                        <div class="form-group">
                            <label class="block text-xs font-bold text-gray-600 mb-1">Nome Completo<span class="text-red-500">*</span></label>
                            <input type="text" id="modal-name" class="input-field w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-unitech-primary outline-none">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Telefone<span class="text-red-500">*</span></label>
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
                                <label class="block text-xs font-bold text-gray-600 mb-1">Origem Cliente</label>
                                <select id="modal-origin" class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-700 focus:ring-2 focus:ring-unitech-primary outline-none">
                                    <option>Loja</option>
                                    <option>Indicação</option>
                                    <option>Google</option>
                                </select>
                            </div>
                             <div class="form-group">
                                <label class="block text-xs font-bold text-gray-600 mb-1">Cadastrado por<span class="text-red-500">*</span></label>
                                <input type="text" value="Ana Carla" disabled class="input-field w-full border border-gray-300 rounded p-2 text-sm text-gray-500 bg-gray-50">
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

    attachCreateEvents() {
        const backFn = () => {
            // Simply go back without blocking confirm for now to improve UX
            this.view = 'list';
            this.render();
        };

        // Back Button
        // Back Button
        const btnBack = document.getElementById('back-to-list');
        const btnCancel = document.getElementById('btn-cancel');

        if (btnBack) btnBack.addEventListener('click', backFn);
        if (btnCancel) btnCancel.addEventListener('click', backFn);

        // Populate if Editing/Viewing
        if (this.currentId) {
            this.populateForm();
            // Render photos after populating
            if (this.equipmentPhotos && this.equipmentPhotos.length > 0) {
                this.renderPhotoPreview();
            }
        }

        // --- Client Autocomplete Logic ---
        const clientInput = document.getElementById('client-name');
        const suggestionsBox = document.getElementById('client-suggestions');

        // Using this.mockClients instead of local variable

        // --- Model Events ---

        // Smart Brand/Model Suggestions
        const brandInput = document.getElementById('equip-brand');
        const modelInput = document.getElementById('equip-type');
        const modelDatalist = document.getElementById('model-suggestions');

        const brandModels = {
            'Apple': [
                // iPhones Recentes
                'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
                'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
                'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
                'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13',
                'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 Mini', 'iPhone 12',
                'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
                'iPhone SE (3ª Geração)', 'iPhone SE (2ª Geração)',

                // iPhones Antigos (Comuns em manutenção)
                'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
                'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
                'iPhone 6s Plus', 'iPhone 6s', 'iPhone 6 Plus', 'iPhone 6',

                // iPads
                'iPad Pro 12.9"', 'iPad Pro 11"', 'iPad Air (5ª Geração)', 'iPad Air (4ª Geração)',
                'iPad (10ª Geração)', 'iPad (9ª Geração)', 'iPad Mini 6',

                // Watches
                'Apple Watch Ultra 2', 'Apple Watch Ultra', 'Apple Watch Series 9', 'Apple Watch Series 8',
                'Apple Watch SE', 'Apple Watch Series 7', 'Apple Watch Series 6'
            ],
            'Samsung': [
                // Série S
                'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24',
                'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
                'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
                'Galaxy S21 Ultra', 'Galaxy S21+', 'Galaxy S21', 'Galaxy S21 FE',
                'Galaxy S20 Ultra', 'Galaxy S20+', 'Galaxy S20', 'Galaxy S20 FE',
                'Galaxy S10+', 'Galaxy S10', 'Galaxy S10e',

                // Série Fold/Flip
                'Galaxy Z Fold6', 'Galaxy Z Flip6',
                'Galaxy Z Fold5', 'Galaxy Z Flip5',
                'Galaxy Z Fold4', 'Galaxy Z Flip4',
                'Galaxy Z Fold3', 'Galaxy Z Flip3',

                // Série A (Muito Comum)
                'Galaxy A55', 'Galaxy A35', 'Galaxy A25', 'Galaxy A15', 'Galaxy A05s', 'Galaxy A05',
                'Galaxy A54', 'Galaxy A34', 'Galaxy A24', 'Galaxy A14', 'Galaxy A04s',
                'Galaxy A53', 'Galaxy A33', 'Galaxy A23', 'Galaxy A13', 'Galaxy A03s',
                'Galaxy A73', 'Galaxy A72', 'Galaxy A52s', 'Galaxy A52', 'Galaxy A32', 'Galaxy A12',
                'Galaxy A71', 'Galaxy A51', 'Galaxy A31', 'Galaxy A21s', 'Galaxy A11', 'Galaxy A01',

                // Série M
                'Galaxy M55', 'Galaxy M35', 'Galaxy M15',
                'Galaxy M54', 'Galaxy M34', 'Galaxy M14',
                'Galaxy M53', 'Galaxy M23', 'Galaxy M13',
                'Galaxy M62', 'Galaxy M52', 'Galaxy M32', 'Galaxy M12',

                // Tablets
                'Galaxy Tab S9 Ultra', 'Galaxy Tab S9', 'Galaxy Tab S9 FE',
                'Galaxy Tab S8', 'Galaxy Tab S7', 'Galaxy Tab A9+', 'Galaxy Tab A8'
            ],
            'Xiaomi': [
                // Linha Principal (Mi/Xiaomi)
                'Xiaomi 14 Ultra', 'Xiaomi 14',
                'Xiaomi 13 Ultra', 'Xiaomi 13 Pro', 'Xiaomi 13', 'Xiaomi 13 Lite',
                'Xiaomi 12T Pro', 'Xiaomi 12T', 'Xiaomi 12 Pro', 'Xiaomi 12',
                'Xiaomi 11T Pro', 'Xiaomi 11T', 'Mi 11 Ultra', 'Mi 11', 'Mi 11 Lite',

                // Redmi Note Series
                'Redmi Note 13 Pro+', 'Redmi Note 13 Pro', 'Redmi Note 13',
                'Redmi Note 12 Pro+', 'Redmi Note 12 Pro', 'Redmi Note 12S', 'Redmi Note 12',
                'Redmi Note 11 Pro', 'Redmi Note 11S', 'Redmi Note 11',
                'Redmi Note 10 Pro', 'Redmi Note 10S', 'Redmi Note 10',
                'Redmi Note 9 Pro', 'Redmi Note 9S', 'Redmi Note 9',
                'Redmi Note 8 Pro', 'Redmi Note 8',

                // Redmi Series (Entrada)
                'Redmi 13C', 'Redmi 12', 'Redmi 12C', 'Redmi 10C', 'Redmi 10', 'Redmi 9T', 'Redmi 9', 'Redmi 9A/9C',

                // POCO
                'Poco F6 Pro', 'Poco F6', 'Poco X6 Pro', 'Poco X6', 'Poco M6 Pro',
                'Poco F5 Pro', 'Poco F5', 'Poco X5 Pro', 'Poco X5',
                'Poco F4 GT', 'Poco F4', 'Poco X4 Pro', 'Poco M4 Pro',
                'Poco F3', 'Poco X3 Pro', 'Poco X3 NFC', 'Poco M3'
            ],
            'Motorola': [
                // Linha G (Atual)
                'Moto G85', 'Moto G84', 'Moto G54', 'Moto G34', 'Moto G24', 'Moto G24 Power', 'Moto G04',
                // Linha G (Gerações Anteriores)
                'Moto G73', 'Moto G53', 'Moto G23', 'Moto G13',
                'Moto G82', 'Moto G62', 'Moto G52', 'Moto G42', 'Moto G32', 'Moto G22',
                'Moto G60', 'Moto G60s', 'Moto G50', 'Moto G30', 'Moto G20', 'Moto G10',
                'Moto G9 Plus', 'Moto G9 Play', 'Moto G9 Power',
                'Moto G8 Plus', 'Moto G8 Power', 'Moto G8 Play',

                // Linha Edge
                'Edge 50 Ultra', 'Edge 50 Pro', 'Edge 50 Fusion',
                'Edge 40 Neo', 'Edge 40', 'Edge 30 Ultra', 'Edge 30 Pro', 'Edge 30 Fusion', 'Edge 30 Neo',
                'Edge 20 Pro', 'Edge 20', 'Edge 20 Lite',

                // Linha Razr
                'Razr 50 Ultra', 'Razr 50', 'Razr 40 Ultra', 'Razr 40',

                // Linha E
                'Moto E13', 'Moto E22', 'Moto E32', 'Moto E40', 'Moto E20', 'Moto E7 Power'
            ],
            'LG': [
                // K Series (Muito comum em manutenção)
                'K71', 'K62', 'K62+', 'K52', 'K42', 'K22',
                'K61', 'K51S', 'K41S',
                'K12+', 'K12 Prime', 'K12 Max',
                'K11+', 'K10', 'K9',

                // Outros
                'LG Velvet', 'LG Wing', 'LG G8X ThinQ', 'LG G8S ThinQ', 'LG G7 ThinQ'
            ],
            'Asus': [
                'Zenfone 11 Ultra', 'Zenfone 10', 'Zenfone 9', 'Zenfone 8', 'Zenfone 8 Flip',
                'ROG Phone 8 Pro', 'ROG Phone 8', 'ROG Phone 7 Ultimate', 'ROG Phone 7',
                'ROG Phone 6 Pro', 'ROG Phone 6', 'ROG Phone 5s', 'ROG Phone 5',
                'Zenfone Max Pro M2', 'Zenfone Max Pro M1', 'Zenfone 5Z', 'Zenfone 5'
            ],
            'Realme': [
                'Realme 12 Pro+', 'Realme 12 Pro', 'Realme 12+', 'Realme 12',
                'Realme 11 Pro+', 'Realme 11 Pro', 'Realme 11x', 'Realme 11',
                'Realme C67', 'Realme C55', 'Realme C53', 'Realme C51', 'Realme Note 50',
                'Realme GT3', 'Realme GT 2 Pro', 'Realme 9 Pro+', 'Realme 8 Pro'
            ],
            'Infinix': [
                'Infinix Note 40 Pro', 'Infinix Note 40', 'Infinix Note 30 5G', 'Infinix Note 30 Pro',
                'Infinix Hot 40i', 'Infinix Hot 40 Pro', 'Infinix Hot 30', 'Infinix Hot 30i',
                'Infinix Smart 8 Pro', 'Infinix Smart 8', 'Infinix Smart 7'
            ],
            'Positivo': [
                'Positivo Vision', 'Positivo Twist 5 Pro', 'Positivo Twist 5', 'Positivo Twist 4',
                'Positivo Motion', 'Positivo Tab'
            ],
            'Multilaser': [
                'Multilaser G Max 2', 'Multilaser F Max 2', 'Multilaser E Lite 2',
                'Multilaser G Pro 2', 'Multilaser H'
            ],
            'Lenovo': ['K14 Plus', 'K14', 'K13 Note', 'K13', 'K12 Note', 'Legion Phone Duel'],
            'Dell': ['Inspiron 15', 'Vostro 3510', 'G15', 'Alienware'],
            'HP': ['Pavilion 15', '250 G8', 'ProBook 440', 'Victus'],
            'Acer': ['Aspire 5', 'Nitro 5', 'Predator Helios', 'Swift 3'],
            'Sony': ['Xperia 1 V', 'Xperia 5 V', 'Xperia 10 V', 'Xperia Pro-I'],
            'Philco': ['Hit P10', 'Hit P12', 'Hit P13', 'Hit P8']
        };

        // Global Text Formatting is now handled in main.js via autoCorrectInput


        // Special Case: Serial Number -> Uppercase
        const serialInput = document.getElementById('equip-serial');
        if (serialInput) {
            serialInput.addEventListener('blur', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        if (brandInput && modelDatalist) {
            // Populate Brand Suggestions
            if (brandInput.list) {
                brandInput.list.innerHTML = Object.keys(brandModels).map(b => `<option value="${b}">`).join('');
            }

            // Listener for input/change
            const updateModels = () => {
                const val = brandInput.value.trim();
                // Find matching brand key case-insensitive
                const brandKey = Object.keys(brandModels).find(k => k.toLowerCase() === val.toLowerCase());

                if (brandKey) {
                    const models = brandModels[brandKey];
                    modelDatalist.innerHTML = models.map(m => `<option value="${m}">`).join('');
                    if (modelInput) modelInput.placeholder = `Selecione um modelo ${brandKey}...`;
                } else {
                    // Default popular models if brand not found or empty
                    modelDatalist.innerHTML = `
                        <option value="iPhone 14">
                        <option value="Galaxy S23">
                        <option value="Redmi Note 12">
                        <option value="Moto G54">
                     `;
                    if (modelInput) modelInput.placeholder = "Ex: Galaxy S23";
                }
            };

            brandInput.addEventListener('change', updateModels);
            brandInput.addEventListener('input', updateModels); // Real-time update
        }

        const modal = document.getElementById('client-modal');
        const closeModal = () => modal.classList.add('hidden');
        const openModal = () => modal.classList.remove('hidden');

        document.getElementById('btn-add-client').addEventListener('click', openModal);
        document.getElementById('close-modal-x').addEventListener('click', closeModal);
        document.getElementById('close-modal-btn').addEventListener('click', closeModal);

                        document.getElementById('save-client-btn').addEventListener('click', async () => {
            const name = (document.getElementById('modal-name')?.value || 'CONSUMIDOR FINAL').toUpperCase();
            const phone = document.getElementById('modal-phone')?.value || '';
            const mobile = document.getElementById('modal-cell')?.value || '';
            const documentId = document.getElementById('modal-doc')?.value || '';
            const zip = document.getElementById('modal-cep')?.value || '';
            const origin = document.getElementById('modal-origin')?.value || 'Loja';
            let email = (document.getElementById('modal-email')?.value || '').trim();
            
            try {
                const clientData = {
                    id: storage.getNextClientId(),
                    name,
                    phone,
                    mobile,
                    email: email || undefined,
                    document: documentId,
                    zip,
                    origin,
                    category: 'client',
                    tenantId: auth.getUser()?.tenantId || 'master',
                    createdAt: new Date().toISOString()
                };

                const result = await storage.addClient(clientData);
                
                if (result) {
                    const clientInput = document.getElementById('client-name');
                    if (clientInput) clientInput.value = name;
                    
                    const modal = document.getElementById('client-modal');
                    if (modal) modal.classList.add('hidden');
                    
                    const suggestionsBox = document.getElementById('client-suggestions');
                    if (suggestionsBox) suggestionsBox.classList.add('hidden');
                    
                    alert('Cliente "' + name + '" salvo com sucesso no sistema!');
                } else {
                    toastService.error('Erro ao salvar cliente. Verifique o console.');
                }
            } catch (error) {
                console.error('Error saving client from OS modal:', error);
                toastService.error('Erro ao salvar cliente: ' + error.message);
            }
        });

        clientInput.addEventListener('input', (e) => {
            const val = e.target.value.toUpperCase();
            if (val.length < 1) {
                suggestionsBox.classList.add('hidden');
                return;
            }

            // Combine storage clients with mock clients (if needed, or just use storage)
            const realClients = storage.getClients();
            // Merge or just use real. Let's prioritize real clients. 
            // If storage is empty, maybe fallback? But clients.js seeds storage, so it should be fine.

            const matches = realClients.filter(c => c.name && c.name.toUpperCase().includes(val));

            if (matches.length > 0) {
                suggestionsBox.innerHTML = matches.map(c => `
                    <div class="p-2 hover:bg-gray-100 cursor-pointer text-xs text-gray-700 border-b border-gray-100 last:border-0 suggestion-item" data-name="${c.name}" data-phone="${c.phone || c.mobile || ''}">
                        <span class="font-bold">${c.name}</span> <span class="text-gray-400 mx-1">|</span> Tel: ${c.phone || c.mobile || '--'}
                    </div>
                 `).join('');
                suggestionsBox.classList.remove('hidden');

                document.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        clientInput.value = item.dataset.name;
                        suggestionsBox.classList.add('hidden');
                    });
                });
            } else {
                suggestionsBox.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!clientInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.classList.add('hidden');
            }
        });

        // Financial Auto-calculation
        const valProdInput = document.getElementById('os-val-prod');
        const valServInput = document.getElementById('os-val-serv');
        const valTotalInput = document.getElementById('os-val-total');

        const calculateTotal = () => {
            const valProd = parseFloat(valProdInput.value) || 0;
            const valServ = parseFloat(valServInput.value) || 0;
            valTotalInput.value = (valProd + valServ).toFixed(2);
        };

        valProdInput.addEventListener('input', calculateTotal);
        valServInput.addEventListener('input', calculateTotal);

        // --- Anatel IMEI Check ---
        const imeiInput = document.getElementById('device-imei');
        if (imeiInput) {
            imeiInput.addEventListener('blur', async (e) => {
                const imei = e.target.value.replace(/\D/g, '');
                const statusContainer = document.getElementById('os-anatel-status');

                if (imei.length < 15) {
                    statusContainer.innerHTML = '';
                    return;
                }

                // Show Loading
                statusContainer.innerHTML = `
                    <div class="flex items-center gap-2 text-blue-600 text-xs animate-pulse">
                        <i data-feather="loader" class="w-3 h-3 animate-spin"></i> Consultando Anatel...
                    </div>
                `;
                if (window.feather) window.feather.replace();

                try {
                    const result = await anatelService.checkIMEI(imei);

                    if (result.status === 'clean') {
                        statusContainer.innerHTML = `
                            <div class="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                <i data-feather="check-circle" class="w-4 h-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold uppercase leading-none">IMEI Regular</p>
                                    <p class="text-[8px] opacity-75 leading-none mt-0.5">Sem restrições na base Anatel</p>
                                </div>
                            </div>
                        `;
                    } else if (result.status === 'blocked') {
                        statusContainer.innerHTML = `
                            <div class="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded border border-red-100 animate-shake">
                                <i data-feather="alert-triangle" class="w-4 h-4"></i>
                                <div>
                                    <p class="text-[10px] font-bold uppercase leading-none">Bloqueado / Roubo</p>
                                    <p class="text-[8px] opacity-75 leading-none mt-0.5">${result.message}</p>
                                </div>
                            </div>
                        `;
                        // Optional: Alert the user loudly
                        alert('⚠️ ALERTA: Este IMEI consta como ROUBADO/FURTADO na base da Anatel!');
                    } else {
                        statusContainer.innerHTML = `
                            <div class="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-100">
                                <i data-feather="info" class="w-4 h-4"></i>
                                <span class="text-[10px] font-bold">${result.message}</span>
                            </div>
                        `;
                    }
                    if (window.feather) window.feather.replace();

                } catch (error) {
                    console.error('Anatel Check Error:', error);
                    statusContainer.innerHTML = `
                        <div class="text-xs text-red-500">Erro na consulta. Tente novamente.</div>
                    `;
                }
            });
        }

        // --- Status Banner Logic ---
        const updateStatusBanner = () => {
            const situation = document.getElementById('os-situation')?.value || 'PENDENTE';
            const banner = document.getElementById('os-status-banner');
            const container = document.getElementById('status-panel-container');
            const dot = document.getElementById('status-dot');

            if (banner && container && dot) {
                banner.textContent = situation.toUpperCase();

                // Reset classes
                container.className = 'px-8 py-3 rounded-full border-2 flex items-center gap-3 transition-all duration-300 shadow-sm';
                dot.className = 'w-3 h-3 rounded-full';
                banner.className = 'text-lg font-black uppercase';

                if (['REALIZADO', 'AUTORIZADA', 'CONCLUÍDO', 'FINALIZADO', 'POSTAR CORREIOS'].includes(situation.toUpperCase())) {
                    container.classList.add('bg-green-50', 'border-green-200');
                    dot.classList.add('bg-green-500', 'animate-pulse');
                    banner.classList.add('text-green-700');
                } else if (['RECUSADA', 'SEM REPARO', 'ABANDONO', 'DESCARTE'].includes(situation.toUpperCase())) {
                    container.classList.add('bg-red-50', 'border-red-200');
                    dot.classList.add('bg-red-500');
                    banner.classList.add('text-red-700');
                } else {
                    container.classList.add('bg-blue-50', 'border-blue-100');
                    dot.classList.add('bg-blue-500');
                    banner.classList.add('text-blue-700');
                }

                // Auto-set Priority to Realizada if Realizado (REMOVED - Invalid Enum)
                /*
                if (situation.toUpperCase() === 'REALIZADO') {
                    const prioritySelect = document.getElementById('os-priority');
                    if (prioritySelect) {
                        prioritySelect.value = 'Realizada';
                    }
                }
                */
            }
        };

        const sitSelect = document.getElementById('os-situation');
        if (sitSelect) {
            sitSelect.addEventListener('change', updateStatusBanner);
            // Initial run with a small delay to ensure DOM and data are ready
            setTimeout(updateStatusBanner, 100);
        }

        // Photo Capture Functionality
        const photoInput = document.getElementById('equip-photos');
        const btnCapturePhoto = document.getElementById('btn-capture-photo');
        const btnUploadPhoto = document.getElementById('btn-upload-photo');
        const photoPreviewContainer = document.getElementById('photo-preview-container');

        // Store photos in memory
        if (!this.equipmentPhotos) this.equipmentPhotos = [];

        btnCapturePhoto?.addEventListener('click', () => {
            photoInput.setAttribute('capture', 'environment');
            photoInput.click();
        });

        btnUploadPhoto?.addEventListener('click', () => {
            photoInput.removeAttribute('capture');
            photoInput.click();
        });

        photoInput?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const photoData = event.target.result;
                        this.equipmentPhotos.push(photoData);
                        this.renderPhotoPreview();
                    };
                    reader.readAsDataURL(file);
                }
            });
            photoInput.value = ''; // Reset input
        });

        // Accessories Functionality
        const accInput = document.getElementById('acc-input');
        const btnAddAcc = document.getElementById('btn-add-acc');

        const addAcc = () => {
            const val = accInput.value.trim();
            if (val) {
                if (!this.accessories.includes(val)) {
                    this.accessories.push(val);
                    this.renderAccessories();
                }
                accInput.value = '';
                accInput.focus();
            }
        };

        btnAddAcc?.addEventListener('click', addAcc);
        accInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addAcc();
            }
        });

        // Initial render if editing
        if (this.accessories && this.accessories.length > 0) {
            this.renderAccessories();
        }

        // Pattern Lock Functionality
        this.initPatternLock();

        // Checklist Toggle Logic
        document.querySelectorAll('.checklist-item-wrapper').forEach(wrapper => {
            const itemId = wrapper.getAttribute('data-item-id');
            const checkbox = document.getElementById(`chk-${itemId}`);
            const obsContainer = document.getElementById(`obs-${itemId}`);

            // Toggle on card click
            wrapper.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });

            checkbox.addEventListener('change', () => {
                if (!checkbox.checked) {
                    // Desmarcado - mostrar observação e mudar para vermelho
                    wrapper.classList.remove('bg-green-50', 'border-green-200', 'hover:border-green-400');
                    wrapper.classList.add('border-red-300', 'bg-red-50', 'hover:border-red-400');
                    obsContainer.classList.remove('hidden');
                } else {
                    // Marcado - esconder observação e voltar ao verde
                    wrapper.classList.remove('border-red-300', 'bg-red-50', 'hover:border-red-400');
                    wrapper.classList.add('bg-green-50', 'border-green-200', 'hover:border-green-400');
                    obsContainer.classList.add('hidden');
                    // Limpar observação
                    const obsText = document.getElementById(`obs-text-${itemId}`);
                    if (obsText) obsText.value = '';
                }
            });
        });

        // Save
        document.getElementById('checklist-form').addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('[Checklist] Form submit triggered');
            try {
                const client = document.getElementById('client-name')?.value || 'CONSUMIDOR FINAL';
                const notes = document.getElementById('internal-notes')?.value || '';

                const valProd = parseFloat(document.getElementById('os-val-prod')?.value) || 0;
                const valServ = parseFloat(document.getElementById('os-val-serv')?.value) || 0;
                const valTotal = valProd + valServ;

                // Capture Equipment Technical Details
                const equipmentDetails = {
                    type: document.getElementById('equip-type')?.value || '',
                    brand: document.getElementById('equip-brand')?.value || '',
                    color: document.getElementById('equip-color')?.value || '',
                    problem: document.getElementById('equip-problem')?.value || '',
                    photos: this.equipmentPhotos || [],
                    accessories: this.accessories || []
                };

                console.log('[Checklist] Equipment photos being saved:', this.equipmentPhotos);
                console.log('[Checklist] Equipment details:', equipmentDetails);

                // Use equipment brand + model as device name
                const deviceModel = equipmentDetails.brand && equipmentDetails.type
                    ? `${equipmentDetails.brand} ${equipmentDetails.type}`
                    : (equipmentDetails.type || equipmentDetails.brand || 'Aparelho Genérico');

                // Capture Device Info (security info only now)
                const deviceImei = document.getElementById('device-imei')?.value || '';
                const devicePass = document.getElementById('device-pass')?.value || '';
                const devicePattern = document.getElementById('device-pattern')?.value || '';

                console.log('[Checklist] Device pattern captured:', devicePattern);

                // Capture Checklist Items
                const checklistItems = this.items.map(item => ({
                    id: item.id,
                    label: item.label,
                    status: document.getElementById(`chk-${item.id}`)?.checked || false,
                    observation: document.getElementById(`obs-text-${item.id}`)?.value || ''
                }));

                // Safe Date Retrieval
                let deadlineVal = '';
                const dateInput = document.querySelector('input[type="date"]');
                if (dateInput) deadlineVal = dateInput.value;
                if (!deadlineVal) {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    deadlineVal = d.toISOString().split('T')[0];
                }

                const checklist = {
                    id: storage.getNextOSId(),
                    date: new Date().toISOString(),
                    deadline: deadlineVal,
                    device: deviceModel,
                    deviceInfo: {
                        model: deviceModel,
                        imei: deviceImei,
                        pass: devicePass,
                        pattern: devicePattern
                    },
                    equipmentDetails: equipmentDetails,
                    client,
                    items: checklistItems,
                    technician: document.getElementById('os-technician')?.value || '',
                    attendant: document.getElementById('os-attendant')?.value || '',
                    notes: notes,
                    valProd,
                    valServ,
                    valTotal,
                    status: document.getElementById('os-status')?.value || 'Entrada',
                    situation: document.getElementById('os-situation')?.value || 'Pendente',
                    priority: document.getElementById('os-priority')?.value || 'Normal',
                    report: document.getElementById('technician-report')?.value || '',
                };

                console.log('[Checklist] Data prepared:', checklist);

                if (this.currentId && this.viewMode === 'edit') {
                    checklist.id = this.currentId;
                    const existing = storage.getChecklists().find(c => c.id == this.currentId);
                    if (existing) checklist.date = existing.date;

                    console.log('[Checklist] Calling updateChecklist with:', checklist);
                    const result = storage.updateChecklist(checklist);
                    console.log('[Checklist] Update result:', result);

                    if (result) {
                        alert('Ordem de Serviço atualizada com sucesso!');
                    } else {
                        console.error('[Checklist] Update failed - check console for validation errors');
                        alert('Erro ao atualizar O.S. - verifique o console');
                        return;
                    }
                } else {
                    console.log('[Checklist] Calling addChecklist with:', checklist);
                    alert(`DEBUG: Salvando OS ID: ${checklist.id} | Cliente: ${checklist.client}`);
                    const result = storage.addChecklist(checklist);
                    console.log('[Checklist] Add result:', result);
                    alert(`DEBUG: Resultado do Salvamento: ${result}`);

                    if (result) {
                        alert('Ordem de Serviço criada com sucesso!');
                    } else {
                        console.error('[Checklist] Add failed - check console for validation errors');
                        alert('Erro ao criar O.S. - verifique o console');
                        return;
                    }
                }

                // Verify it was saved
                const allChecklists = storage.getChecklists();
                console.log('[Checklist] Current checklists in storage:', allChecklists);

                // Go back to list
                this.view = 'list';
                this.render();
            } catch (err) {
                console.error('[Checklist] Error saving:', err);
                const msg = err.message || 'Erro desconhecido';
                if (msg.includes('Erro de Validação')) {
                    alert(`⚠️ Não foi possível salvar: \n${msg}`);
                } else {
                    alert('Erro ao salvar O.S.: ' + msg);
                }
            }
        });
    }

    populateForm() {
        const titleEl = document.querySelector('h2.text-xl');
        if (titleEl) {
            titleEl.textContent = this.viewMode === 'edit' ? 'Editar OS' : 'Visualizar OS';
        }

        // Find existing data
        const list = storage.getChecklists();
        const os = list.find(item => item.id == this.currentId);

        if (!os) {
            console.warn("OS not found for populating form:", this.currentId);
            return;
        }

        document.getElementById('client-name').value = os.client || 'Cliente Mock';
        if (document.getElementById('internal-notes')) document.getElementById('internal-notes').value = os.notes || '';
        if (document.getElementById('technician-report')) document.getElementById('technician-report').value = os.report || '';

        // Populate Device Info if available (security info only)
        if (os.deviceInfo) {
            if (document.getElementById('device-imei')) document.getElementById('device-imei').value = os.deviceInfo.imei || '';
            if (document.getElementById('device-pass')) document.getElementById('device-pass').value = os.deviceInfo.pass || '';
            if (document.getElementById('device-pattern')) document.getElementById('device-pattern').value = os.deviceInfo.pattern || '';
        }

        // Populate Checklist Items
        if (os.items && Array.isArray(os.items)) {
            os.items.forEach(item => {
                const checkbox = document.getElementById(`chk-${item.id}`);
                const obsTextarea = document.getElementById(`obs-text-${item.id}`);
                const wrapper = document.querySelector(`[data-item-id="${item.id}"]`);
                const obsContainer = document.getElementById(`obs-${item.id}`);

                if (checkbox) {
                    checkbox.checked = item.status;

                    // If unchecked, show observation field and change colors
                    if (!item.status) {
                        wrapper?.classList.remove('bg-green-50', 'border-green-200', 'hover:border-green-400');
                        wrapper?.classList.add('border-red-300', 'bg-red-50', 'hover:border-red-400');
                        obsContainer?.classList.remove('hidden');
                    }
                }

                if (obsTextarea && item.observation) {
                    obsTextarea.value = item.observation;
                }
            });
        }

        // Populate Equipment Details
        if (os.equipmentDetails) {
            if (document.getElementById('equip-type')) document.getElementById('equip-type').value = os.equipmentDetails.type || '';
            if (document.getElementById('equip-brand')) document.getElementById('equip-brand').value = os.equipmentDetails.brand || '';
            if (document.getElementById('equip-color')) document.getElementById('equip-color').value = os.equipmentDetails.color || '';
            if (document.getElementById('equip-problem')) document.getElementById('equip-problem').value = os.equipmentDetails.problem || '';

            // Photos are loaded in renderCreate, no need to load again here
        }

        // Populate and render saved pattern
        if (os.deviceInfo && os.deviceInfo.pattern) {
            const patternInput = document.getElementById('device-pattern');
            if (patternInput) {
                patternInput.value = os.deviceInfo.pattern;
                // Render the pattern visually
                this.renderSavedPattern(os.deviceInfo.pattern);
            }
        }

        if (os.technician && document.getElementById('os-technician')) {
            document.getElementById('os-technician').value = os.technician;
        }

        if (os.attendant && document.getElementById('os-attendant')) {
            document.getElementById('os-attendant').value = os.attendant;
        }

        if (os.situation && document.getElementById('os-situation')) {
            document.getElementById('os-situation').value = os.situation;
        }

        if (os.status && document.getElementById('os-status')) {
            document.getElementById('os-status').value = os.status;
        }

        if (document.getElementById('os-priority')) {
            document.getElementById('os-priority').value = os.priority || 'Normal';
        }

        // Disable if View Mode (Legacy check, mostly handled by detail view now)
        if (this.viewMode === 'view') {
            document.querySelectorAll('#checklist-form input, #checklist-form select, #checklist-form textarea, #checklist-form button[type="submit"]').forEach(el => {
                el.disabled = true;
                el.classList.add('bg-gray-100', 'cursor-not-allowed');
            });
        }
    }

    renderDetailChecklist() {
        const list = storage.getChecklists();
        const os = list.find(item => item.id == this.currentId);

        if (!os) {
            return `<div class="p-8 text-center text-gray-500">Ordem de Serviço não encontrada</div>`;
        }

        // Format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            try {
                const d = new Date(dateStr);
                return d.toLocaleDateString('pt-BR');
            } catch {
                return dateStr;
            }
        };

        // Render checklist items
        const renderChecklistItems = () => {
            if (!os.items || os.items.length === 0) {
                return '<p class="text-xs text-gray-500">Nenhum teste registrado</p>';
            }
            return os.items.map(item => `
                <div class="flex flex-col p-2 bg-white border ${item.status ? 'border-gray-200' : 'border-red-200 bg-red-50'} rounded h-full justify-center">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-medium text-gray-700">${item.label}</span>
                        <span class="text-[10px] font-bold ${item.status ? 'text-green-600' : 'text-red-600'}">
                            ${item.status ? '✓ OK' : '✗ FALHA'}
                        </span>
                    </div>
                    ${item.observation ? `
                        <div class="mt-1 pt-1 border-t border-red-100 text-[10px] text-red-600 italic">
                            ${item.observation}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        };

        const settings = storage.getSettings();

        return `
        <div class="bg-white rounded-lg shadow-lg border border-gray-200 font-sans text-sm animate-fade-in p-8 print:p-0 print:shadow-none print:border-none">
            
            <!-- Toolbar (Hidden on Print) -->
            <div class="flex justify-between items-center mb-8 print:hidden">
                <div class="flex items-center gap-2">
                     <button id="btn-back-detail" class="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <i data-feather="arrow-left" class="w-4 h-4"></i> Voltar
                     </button>
                     <span class="text-gray-300">|</span>
                     <span class="font-bold text-gray-700">O.S #${os.id}</span>
                </div>
                <div class="flex gap-2">
                    <button id="btn-print-detail" class="bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 hover:bg-gray-800">
                        <i data-feather="printer" class="w-3 h-3"></i> Imprimir
                    </button>
                </div>
            </div>

            <!-- Printable Content -->
            <div class="space-y-6">
                
                <!-- Header -->
                <div class="flex justify-between border-b pb-4">
                    <div class="flex gap-4">
                        <div class="w-auto h-16 flex items-center justify-center overflow-hidden">
                            <img src="/src/assets/logo.png" class="h-16 w-auto object-contain">
                        </div>
                        <div>
                            <h1 class="font-bold text-lg text-gray-800">${settings.companyName || 'UniTech Cellular'}</h1>
                            <p class="text-xs text-gray-500">CNPJ: ${settings.cnpj || '00.000.000/0001-00'}</p>
                            <p class="text-xs text-gray-500">${settings.address || 'Endereço não configurado'}</p>
                            <p class="text-xs text-gray-500">${settings.phone || '(00) 00000-0000'} - ${settings.email || ''}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-bold text-gray-500 mb-1">Status: <span class="text-blue-600 uppercase">${os.status || 'ENTRADA'}</span></div>
                        <div class="text-xs text-gray-500">#Ordem: <span class="font-bold text-gray-800">${os.id}</span></div>
                        <div class="text-xs text-gray-500">Entrada: ${formatDate(os.date)}</div>
                        <div class="text-xs text-gray-500">Prazo: ${formatDate(os.deadline)}</div>
                        <div class="text-xs text-blue-600 font-bold uppercase tracking-tight">Técnico: ${os.technician || 'Não Definido'}</div>
                        <div class="text-[10px] text-gray-500 font-medium">Atendente: ${os.attendant || 'Nenhum'}</div>
                    </div>
                </div>

                <!-- Client Info -->
                <div class="bg-gray-50 p-4 rounded border border-gray-100">
                    <h3 class="font-bold text-gray-700 mb-2">Cliente: ${os.client || 'CONSUMIDOR FINAL'}</h3>
                </div>

                <!-- Device Info -->
                ${os.deviceInfo ? `
                <div class="bg-blue-50 p-4 rounded border border-blue-100">
                    <h4 class="font-bold text-gray-700 text-xs mb-3 flex items-center gap-2">
                        <i data-feather="smartphone" class="w-4 h-4"></i> Informações do Aparelho
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                        <div>
                            <span class="font-bold">Modelo:</span> ${os.deviceInfo.model || os.device || 'N/A'}
                        </div>
                        <div>
                            <span class="font-bold">IMEI/Serial:</span> ${os.deviceInfo.imei || 'N/A'}
                        </div>
                        <div>
                            <span class="font-bold">Senha:</span> ${os.deviceInfo.pass || 'N/A'}
                        </div>
                        <div>
                            <span class="font-bold">Padrão:</span> ${os.deviceInfo.pattern ? `
                                <div class="flex flex-col gap-2">
                                    <div class="inline-flex items-center gap-1 bg-blue-100 px-2 py-1 rounded w-fit">
                                        <i data-feather="lock" class="w-3 h-3"></i>
                                        <span class="font-mono">${os.deviceInfo.pattern}</span>
                                    </div>
                                    <!-- Pattern Drawing -->
                                    <div class="bg-white border border-gray-200 rounded p-2 w-fit print:border-none">
                                        <div id="print-pattern-container" class="relative" style="width: 100px; height: 100px;">
                                            <canvas id="pattern-canvas" width="100" height="100" class="absolute top-0 left-0 pointer-events-none"></canvas>
                                            <div id="pattern-grid" class="grid grid-cols-3 gap-2 relative z-10">
                                                ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                                                    <div class="pattern-dot w-6 h-6 rounded-full border-2 border-blue-400 bg-white flex items-center justify-center text-[8px] font-bold text-gray-400" data-num="${num}">
                                                        ${num}
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : 'N/A'}
                        </div>
                    </div>
                </div>
                ` : `
                <div class="bg-blue-50 p-4 rounded border border-blue-100">
                    <h4 class="font-bold text-gray-700 text-xs mb-2">Aparelho: ${os.device || 'Não especificado'}</h4>
                </div>
                `}

                <!-- Equipment Technical Details -->
                ${os.equipmentDetails && (os.equipmentDetails.type || os.equipmentDetails.brand || os.equipmentDetails.problem) ? `
                <div class="bg-yellow-50 p-4 rounded border border-yellow-200">
                    <h4 class="font-bold text-gray-700 text-xs mb-3 flex items-center gap-2">
                        <i data-feather="tool" class="w-4 h-4"></i> Detalhes Técnicos do Equipamento
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-gray-600 mb-3">
                        <div>
                            <span class="font-bold">Marca:</span> ${os.equipmentDetails.brand || 'N/A'}
                        </div>
                        <div>
                            <span class="font-bold">Modelo:</span> ${os.equipmentDetails.type || 'N/A'}
                        </div>
                        <div>
                            <span class="font-bold">Cor:</span> ${os.equipmentDetails.color || 'N/A'}
                        </div>
                    </div>
                    ${os.equipmentDetails.problem ? `
                    <div class="text-xs text-gray-600 mt-2 pt-2 border-t border-yellow-300">
                        <span class="font-bold">Problema Relatado:</span>
                        <p class="mt-1 whitespace-pre-wrap">${os.equipmentDetails.problem}</p>
                    </div>
                    ` : ''}
                    
                    ${os.equipmentDetails.accessories && os.equipmentDetails.accessories.length > 0 ? `
                    <div class="mt-3 pt-3 border-t border-yellow-300">
                        <span class="font-bold text-xs text-gray-700 mb-2 block flex items-center gap-1">
                            <i data-feather="plus-circle" class="w-3 h-3"></i> Acessórios:
                        </span>
                        <div class="flex flex-wrap gap-2">
                            ${os.equipmentDetails.accessories.map(acc => `
                                <span class="bg-white px-2 py-0.5 rounded border border-yellow-300 text-[10px] font-bold text-gray-700">${acc}</span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    ${os.equipmentDetails.photos && os.equipmentDetails.photos.length > 0 ? `
                    <div class="mt-3 pt-3 border-t border-yellow-300">
                        <span class="font-bold text-xs text-gray-700 mb-2 block flex items-center gap-1">
                            <i data-feather="camera" class="w-3 h-3"></i> Fotos do Aparelho (${os.equipmentDetails.photos.length})
                        </span>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                            ${os.equipmentDetails.photos.map((photo, idx) => `
                                <img src="${photo}" class="w-full h-32 object-contain bg-gray-100 rounded border border-gray-300 cursor-pointer hover:opacity-75 transition-opacity" 
                                     alt="Foto ${idx + 1}" 
                                     onclick="window.open('${photo}', '_blank')">
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Checklist Tests -->
                <div class="border-b pb-4">
                    <h4 class="font-bold text-gray-700 text-xs mb-3 flex items-center gap-2">
                        <i data-feather="check-square" class="w-4 h-4"></i> Testes Realizados
                    </h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                        ${renderChecklistItems()}
                    </div>
                </div>

                <!-- Reports & Notes -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-gray-200 rounded p-4">
                        <h4 class="font-bold text-gray-700 text-xs mb-2">Relato do Cliente</h4>
                        <p class="text-xs text-gray-600 whitespace-pre-wrap">${os.report || 'Nenhum relato registrado'}</p>
                    </div>
                    <div class="border border-gray-200 rounded p-4">
                        <h4 class="font-bold text-gray-700 text-xs mb-2">Observações Internas</h4>
                        <p class="text-xs text-gray-600 whitespace-pre-wrap">${os.notes || 'Nenhuma observação'}</p>
                    </div>
                </div>

                <!-- Financial Summary -->
                <div class="bg-green-50 border border-green-200 rounded p-4">
                    <h4 class="font-bold text-gray-700 text-xs mb-3">Resumo Financeiro</h4>
                    <div class="grid grid-cols-3 gap-4 text-xs">
                        <div>
                            <span class="text-gray-600">Peças:</span>
                            <span class="font-bold text-gray-800 ml-2">R$ ${(os.valProd || 0).toFixed(2)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Serviços:</span>
                            <span class="font-bold text-gray-800 ml-2">R$ ${(os.valServ || 0).toFixed(2)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Total:</span>
                            <span class="font-bold text-green-600 ml-2 text-base">R$ ${(os.valTotal || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                </div>

                <!-- Legal Disclaimer & Contract -->
                <div class="mt-8 border-t-2 border-gray-800 pt-4">
                    <h4 class="font-bold text-gray-800 text-sm uppercase mb-2 text-center">Termos de Responsabilidade e Garantia</h4>
                    
                    <div class="text-[10px] text-gray-600 text-justify space-y-2 leading-tight">
                        <p>
                            <span class="font-bold text-gray-800">1. RESPONSABILIDADE CRIMINAL E PROCEDÊNCIA:</span> 
                            O cliente declara, sob as penas da Lei, que o equipamento entregue é de sua legítima propriedade e origem lícita. A <span class="font-bold">UNITEC</span> reserva-se o direito de consultar o IMEI junto aos órgãos competentes. Caso seja detectada restrição de roubo, furto ou extravio, a unidade colaborará irrestritamente com as autoridades policiais, fornecendo os dados cadastrais do portador para as devidas averiguações.
                        </p>

                        <p>
                            <span class="font-bold text-gray-800">2. AUTORIZAÇÃO DE REPARO E RISCOS:</span> 
                            Para aparelhos entregues desligados, sem carga, travados ou sem imagem (tela preta), o cliente reconhece que não foi possível realizar a conferência prévia de todas as funcionalidades (câmeras, sensores, áudio, wi-fi, etc.). Desta forma, assume o risco de defeitos pré-existentes ocultos que possam se manifestar após a abertura técnica ou restabelecimento de energia, isentando a contratada de responsabilidade sobre tais falhas secundárias.
                        </p>

                        <p>
                            <span class="font-bold text-gray-800">3. PRAZO DE ABANDONO (ART. 1.275 CC):</span> 
                            O cliente tem o prazo de 90 (noventa) dias para retirar o aparelho após a comunicação de "PRONTO" ou "ORÇAMENTO RECUSADO". Decorrido este prazo, o silêncio e inércia caracterizarão <span class="font-bold">ABANDONO DO BEM</span>, nos termos do Art. 1.275, inciso III do Código Civil Brasileiro, autorizando a empresa a dar o destino que lhe convier (venda, descarte ou doação) para custeio de peças, serviços de armazenamento e mão de obra, sem direito a indenização posterior.
                        </p>

                        <p>
                            <span class="font-bold text-gray-800">4. PERDA DE GARANTIA (CDC):</span> 
                            A garantia legal de 90 dias cobre exclusivamente defeitos de fabricação da peça substituída ou vício do serviço executado. A garantia será <span class="font-bold text-red-600 uppercase">AUTOMATICAMENTE ANULADA</span> se constatado: (a) Quedas, trincas ou amassados posteriores; (b) Contato com líquidos ou oxidação (mesmo em aparelhos IP67/IP68, pois a vedação original é violada no reparo); (c) Rompimento do selo de garantia da loja; (d) Intervenção de terceiros ou tentativa de reparo por conta própria.
                        </p>

                        <p>
                            <span class="font-bold text-gray-800">5. DADOS E LGPD:</span> 
                            A responsabilidade pelo backup de dados (fotos, contatos, arquivos) é exclusiva do cliente. A <span class="font-bold">UNITEC</span> não se responsabiliza por eventual perda de dados durante procedimentos de software ou reparos em placa. Os dados cadastrais coletados serão utilizados estritamente para gestão da ordem de serviço e comunicação com o cliente, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
                        </p>
                    </div>

                    <!-- Signatures -->
                    <div class="grid grid-cols-2 gap-8 mt-12 mb-4">
                        <div class="text-center">
                            <div class="border-b border-gray-400 mb-2 w-3/4 mx-auto"></div>
                            <p class="font-bold text-xs text-gray-800 uppercase">${os.client || 'Cliente'}</p>
                            <p class="text-[10px] text-gray-500">Assinatura do Cliente</p>
                             <p class="text-[9px] text-gray-400 mt-1">CPF: __________________________</p>
                        </div>
                        <div class="text-center">
                            <div class="border-b border-gray-400 mb-2 w-3/4 mx-auto"></div>
                            <p class="font-bold text-xs text-gray-800 uppercase">UniTech - ${os.technician || 'Técnico Responsável'}</p>
                            <p class="text-[10px] text-gray-500">Visto da Loja</p>
                             <p class="text-[9px] text-gray-400 mt-1">${new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                    
                    <div class="text-center border-t border-gray-200 pt-2">
                         <p class="text-[9px] text-gray-400 font-mono">Documento gerado eletronicamente em ${new Date().toLocaleString('pt-BR')} | ID Verificador: ${os.id}-${Math.floor(Math.random() * 10000)}</p>
                    </div>
                </div>

            </div>
        </div>
        `;
    }

    renderPhotoPreview() {
        const container = document.getElementById('photo-preview-container');
        if (!container) return;

        container.innerHTML = this.equipmentPhotos.map((photo, index) => `
            <div class="relative group">
                <img src="${photo}" class="w-full h-32 object-contain bg-gray-100 rounded border border-gray-300" alt="Foto ${index + 1}">
                <button type="button" 
                    class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onclick="checklistModule.removePhoto(${index})">
                    <span class="text-xs font-bold">×</span>
                </button>
            </div>
        `).join('');

        if (window.feather) window.feather.replace();
    }

    initPatternLock() {
        const canvas = document.getElementById('pattern-canvas');
        const ctx = canvas?.getContext('2d');
        const dots = document.querySelectorAll('.pattern-dot');
        const patternInput = document.getElementById('device-pattern');
        const patternDisplay = document.getElementById('pattern-display');
        const clearBtn = document.getElementById('clear-pattern');

        if (!canvas || !ctx || !dots.length) return;

        let pattern = [];
        let isDrawing = false;
        let currentPos = { x: 0, y: 0 };

        const getDotPosition = (dot) => {
            const rect = dot.getBoundingClientRect();
            const containerRect = canvas.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2 - containerRect.left,
                y: rect.top + rect.height / 2 - containerRect.top
            };
        };

        const drawLine = (from, to, isTemp = false) => {
            ctx.strokeStyle = isTemp ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        };

        const redrawPattern = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < pattern.length - 1; i++) {
                const from = getDotPosition(dots[pattern[i] - 1]);
                const to = getDotPosition(dots[pattern[i + 1] - 1]);
                drawLine(from, to);
            }
        };

        const updateDisplay = () => {
            if (pattern.length === 0) {
                patternDisplay.textContent = 'Desenhe o padrão';
                patternInput.value = '';
            } else {
                patternDisplay.textContent = `Padrão: ${pattern.join('-')}`;
                patternInput.value = pattern.join('-');
            }
        };

        const clearPattern = () => {
            pattern = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            dots.forEach(dot => {
                dot.classList.remove('bg-blue-500', 'border-blue-600', 'text-white');
                dot.classList.add('bg-white', 'border-blue-400', 'text-gray-400');
            });
            updateDisplay();
        };

        const addDot = (dotNum) => {
            if (!pattern.includes(dotNum)) {
                pattern.push(dotNum);
                const dot = dots[dotNum - 1];
                dot.classList.remove('bg-white', 'border-blue-400', 'text-gray-400');
                dot.classList.add('bg-blue-500', 'border-blue-600', 'text-white');

                if (pattern.length > 1) {
                    const from = getDotPosition(dots[pattern[pattern.length - 2] - 1]);
                    const to = getDotPosition(dot);
                    drawLine(from, to);
                }
                updateDisplay();
            }
        };

        // Mouse events
        dots.forEach((dot, index) => {
            const dotNum = index + 1;

            dot.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDrawing = true;
                clearPattern();
                addDot(dotNum);
            });

            dot.addEventListener('mouseenter', () => {
                if (isDrawing) {
                    addDot(dotNum);
                }
            });
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDrawing && pattern.length > 0) {
                const rect = canvas.getBoundingClientRect();
                currentPos = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                redrawPattern();
                const lastDot = dots[pattern[pattern.length - 1] - 1];
                const from = getDotPosition(lastDot);
                drawLine(from, currentPos, true);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDrawing) {
                isDrawing = false;
                redrawPattern();
            }
        });

        // Touch events for mobile
        dots.forEach((dot, index) => {
            const dotNum = index + 1;

            dot.addEventListener('touchstart', (e) => {
                e.preventDefault();
                isDrawing = true;
                clearPattern();
                addDot(dotNum);
            });
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (isDrawing) {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                // Check if touching any dot
                dots.forEach((dot, index) => {
                    const dotRect = dot.getBoundingClientRect();
                    const dotX = dotRect.left + dotRect.width / 2 - rect.left;
                    const dotY = dotRect.top + dotRect.height / 2 - rect.top;
                    const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));

                    if (distance < 25) {
                        addDot(index + 1);
                    }
                });

                currentPos = { x, y };
                redrawPattern();
                if (pattern.length > 0) {
                    const lastDot = dots[pattern[pattern.length - 1] - 1];
                    const from = getDotPosition(lastDot);
                    drawLine(from, currentPos, true);
                }
            }
        });

        canvas.addEventListener('touchend', () => {
            if (isDrawing) {
                isDrawing = false;
                redrawPattern();
            }
        });

        clearBtn?.addEventListener('click', clearPattern);
    }

    renderSavedPattern(patternString) {
        if (!patternString) return;

        const canvas = document.getElementById('pattern-canvas');
        const ctx = canvas?.getContext('2d');
        const dots = document.querySelectorAll('.pattern-dot');
        const patternDisplay = document.getElementById('pattern-display');

        if (!canvas || !ctx || !dots.length) return;

        const pattern = patternString.split('-').map(n => parseInt(n));

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update dots appearance
        dots.forEach((dot, index) => {
            const dotNum = index + 1;
            if (pattern.includes(dotNum)) {
                dot.classList.remove('bg-white', 'border-blue-400', 'text-gray-400');
                dot.classList.add('bg-blue-500', 'border-blue-600', 'text-white');
            }
        });

        // Draw lines
        const getDotPosition = (dot) => {
            const rect = dot.getBoundingClientRect();
            const containerRect = canvas.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2 - containerRect.left,
                y: rect.top + rect.height / 2 - containerRect.top
            };
        };

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (let i = 0; i < pattern.length - 1; i++) {
            const from = getDotPosition(dots[pattern[i] - 1]);
            const to = getDotPosition(dots[pattern[i + 1] - 1]);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }

        // Update display
        if (patternDisplay) {
            patternDisplay.textContent = `Padrão: ${patternString}`;
        }
    }

    removePhoto(index) {
        this.equipmentPhotos.splice(index, 1);
        this.renderPhotoPreview();
    }

    renderAccessories() {
        const container = document.getElementById('acc-list');
        if (!container) return;

        container.innerHTML = this.accessories.map((acc, index) => `
            <div class="flex items-center gap-2 bg-blue-50 text-blue-700 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm animate-scale-in group">
                <i data-feather="tag" class="w-3 h-3 text-blue-400"></i>
                <span>${acc}</span>
                <button type="button" class="text-blue-300 hover:text-red-500 transition-colors ml-1" onclick="window.checklistModule.removeAccessory(${index})">
                    <i data-feather="x" class="w-3 h-3"></i>
                </button>
            </div>
        `).join('');

        if (window.feather) window.feather.replace();
    }

    removeAccessory(index) {
        this.accessories.splice(index, 1);
        this.renderAccessories();
    }
}
