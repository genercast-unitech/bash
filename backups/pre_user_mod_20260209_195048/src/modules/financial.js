import { storage } from '../services/storage.js';
import { formatCurrency, formatDateTime } from '../utils/formatters.js';
import printerService from '../services/printer.js';

export class FinancialModule {
    constructor() {
        this.container = null;
        this.transactions = [];
        this.filteredTransactions = [];
        this.periodTransactions = []; // Data within the selected Date Range

        // Default to Current Month
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        this.startDate = firstDay.toISOString().split('T')[0];
        this.endDate = lastDay.toISOString().split('T')[0];

        this.activeTab = 'Todos';
        this.filters = {
            search: '',
            type: 'all', // 'all', 'revenue', 'expense'
            method: 'Todas',
            situation: 'Todos',
            category: 'Todas'
        };
    }

    async init(container, params = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) {
            console.error('Financial Module: Container not found');
            return;
        }

        // Apply incoming filters
        if (params.type) this.filters.type = params.type;
        if (params.situation) this.filters.situation = params.situation;
        if (params.category) this.filters.category = params.category;
        if (params.tab) this.activeTab = params.tab;

        await this.loadData();
    }

    async loadData() {
        this.transactions = storage.getTransactions();
        this.fixRefundedTransactions(); // Migration: Fix existing refunded transactions
        this.applyFilters();
        this.render();
    }

    fixRefundedTransactions() {
        // Migration: Update transactions from refunded sales to have status='refunded'
        const sales = storage.getSales();
        const refundedSales = sales.filter(s => s.status === 'refunded');

        let updated = 0;
        refundedSales.forEach(sale => {
            const transaction = this.transactions.find(t =>
                t.description && t.description.includes(`#${sale.id}`)
            );
            if (transaction && transaction.status !== 'refunded') {
                transaction.status = 'refunded';
                transaction.paid = false;
                storage.updateTransaction(transaction);
                updated++;
            }
        });

        if (updated > 0) {
            console.log(`✅ Fixed ${updated} refunded transaction(s)`);
            this.transactions = storage.getTransactions(); // Reload after updates
        }
    }

    applyFilters() {
        // 1. Period Filtering (Date Range)
        if (this.activeTab === 'Orçamentos') {
            const sales = storage.getSales();
            this.filteredTransactions = sales.filter(s => {
                const sDate = s.date.split('T')[0];
                return (s.status === 'quote' || s.status === 'converted') && sDate >= this.startDate && sDate <= this.endDate;
            }).map(q => ({
                id: q.id,
                description: `Cotação: ${q.items.length} itens`,
                category: 'Orçamento',
                person: q.clientName || 'Consumidor Final',
                seller: q.sellerName,
                method: 'Orçamento',
                type: 'revenue',
                finalValue: q.total || 0,
                dueDate: q.date,
                status: q.status,
                paid: false,
                metadata: { time: new Date(q.date).toLocaleTimeString('pt-BR') },
                isQuote: true // Flag
            })).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

            return; // Skip normal logic
        }

        this.periodTransactions = this.transactions.filter(t => {
            if (!t.dueDate) return false;
            const tDate = t.dueDate.split('T')[0];
            return tDate >= this.startDate && tDate <= this.endDate;
        });

        const searchLower = this.filters.search.toLowerCase();
        // 2. View Filtering (Tabs, Search, Category, Type)
        this.filteredTransactions = this.periodTransactions.filter(t => {
            const matchesTab = this.activeTab === 'Todos' ||
                (this.activeTab === 'Recebimentos' && t.type === 'revenue') ||
                (this.activeTab === 'Despesas Fixas' && t.type === 'expense' && t.isFixed) || // Keeping internal ID as 'Despesas Fixas' for logic if needed, but UI text will change. Actually, logic relies on string.
                (this.activeTab === 'Despesas' && t.type === 'expense') || // Handling the rename
                (this.activeTab === 'Pessoal' && t.category === 'Retirada Pessoal') ||
                (this.activeTab === 'Impostos' && t.category === 'Impostos') ||
                (this.activeTab === 'Transferências' && t.category === 'Transferência');

            const matchesSearch = !this.filters.search ||
                t.description.toLowerCase().includes(searchLower) ||
                t.person.toLowerCase().includes(searchLower) ||
                (t.id && t.id.toString().toLowerCase().includes(searchLower)); // Ensure ID is searched as string

            const matchesMethod = this.filters.method === 'Todas' || t.method === this.filters.method;
            const matchesSituation = this.filters.situation === 'Todos' ||
                (this.filters.situation === 'Pago' && t.paid) ||
                (this.filters.situation === 'Pendente' && !t.paid) ||
                (this.filters.situation === 'Estornado' && t.status === 'refunded');

            const matchesCategory = this.filters.category === 'Todas' || t.category === this.filters.category;

            const matchesType = this.filters.type === 'all' ||
                (this.filters.type === 'revenue' && t.type === 'revenue') ||
                (this.filters.type === 'expense' && t.type === 'expense');

            return matchesTab && matchesSearch && matchesMethod && matchesSituation && matchesCategory && matchesType;
        }).sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.dueDate).getTime();
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.dueDate).getTime();

            if (timeB !== timeA) return timeB - timeA;

            // Absolute fallback for consistency (IDs)
            return b.id.toString().localeCompare(a.id.toString());
        });
    }

    render() {
        const stats = this.calculateSummary();

        const badgeClass = (growth) => {
            if (!growth) return 'text-gray-400';
            return growth >= 0
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
        };

        const getBadge = (growth) => {
            // Mocking growth for now as requested to be 0
            return `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeClass(0)} flex items-center gap-1">
                <i data-feather="${growth >= 0 ? 'trending-up' : 'trending-down'}" class="w-3 h-3"></i> 0%
             </span>`;
        };

        this.container.innerHTML = `
            <div class="flex flex-col min-h-full space-y-6 font-sans text-gray-800 pb-12">
                <!-- Header / Filters -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <!-- Date Range & Search Type -->
                        <div class="flex flex-wrap items-center gap-4">
                            <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                <div class="flex flex-col">
                                    <label class="text-[10px] uppercase font-bold text-gray-400 ml-1">Data Inicial</label>
                                    <input type="date" id="fin-date-start" value="${this.startDate}" class="bg-transparent text-sm font-bold text-gray-700 outline-none p-1 pointer-events-auto cursor-pointer">
                                </div>
                                <span class="text-gray-300">
                                    <i data-feather="arrow-right" class="w-4 h-4"></i>
                                </span>
                                <div class="flex flex-col">
                                    <label class="text-[10px] uppercase font-bold text-gray-400 ml-1">Data Final</label>
                                    <input type="date" id="fin-date-end" value="${this.endDate}" class="bg-transparent text-sm font-bold text-gray-700 outline-none p-1 pointer-events-auto cursor-pointer">
                                </div>
                            </div>

                            <div class="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 h-full">
                                <div class="flex flex-col min-w-[120px]">
                                    <label class="text-[10px] uppercase font-bold text-gray-400 ml-1">Buscar Por</label>
                                    <select id="fin-search-type" class="bg-transparent text-sm font-bold text-gray-700 outline-none p-1 pointer-events-auto cursor-pointer border-none appearance-none">
                                        <option value="all" ${this.filters.type === 'all' ? 'selected' : ''}>Todos os Tipos</option>
                                        <option value="revenue" ${this.filters.type === 'revenue' ? 'selected' : ''}>Recebimentos</option>
                                        <option value="expense" ${this.filters.type === 'expense' ? 'selected' : ''}>Despesas</option>
                                    </select>
                                </div>
                                <div class="h-8 w-[1px] bg-gray-200 mx-1"></div>
                                <button id="fin-btn-filter-trigger" class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-blue-500/20 shadow-lg flex items-center justify-center" title="Buscar / Gerar Relatório">
                                    <i data-feather="search" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Main Actions -->
                        <div class="flex gap-3">
                            <button onclick="window.financialModule.openNewTransaction('revenue')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5">
                                <i data-feather="arrow-up-circle" class="w-4 h-4"></i>
                                NOVA RECEITA
                            </button>
                            <button onclick="window.financialModule.openNewTransaction('expense')" class="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 hover:-translate-y-0.5">
                                <i data-feather="arrow-down-circle" class="w-4 h-4"></i>
                                NOVA DESPESA
                            </button>
                        </div>
                    </div>

                    <!-- Secondary Filters -->
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="relative group">
                            <i data-feather="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                            <input type="text" id="fin-search-client" placeholder="Buscar por Cliente, ID, Fornecedor ou Descrição..." value="${this.filters.search}" 
                                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-100 placeholder-gray-400 transition-all">
                        </div>
                        
                        <div class="relative">
                            <select id="fin-filter-category" class="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100">
                                <option value="Todas">Todas Categorias</option>
                                <!-- Populated dynamically -->
                            </select>
                           <i data-feather="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"></i>
                        </div>

                        <div class="relative">
                            <select id="fin-filter-situation" class="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100">
                                <option value="Todos" ${this.filters.situation === 'Todos' ? 'selected' : ''}>Todas Situações</option>
                                <option value="Pago" ${this.filters.situation === 'Pago' ? 'selected' : ''}>Pago / Recebido</option>
                                <option value="Pendente" ${this.filters.situation === 'Pendente' ? 'selected' : ''}>Pendente</option>
                                <option value="Estornado" ${this.filters.situation === 'Estornado' ? 'selected' : ''}>Estornado</option>
                            </select>
                           <i data-feather="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"></i>
                        </div>

                        <div class="relative">
                            <select id="fin-filter-method" class="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium text-gray-700 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-100">
                                <option value="Todas">Todas Formas</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="PIX">PIX</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Cartão de Débito">Cartão de Débito</option>
                            </select>
                            <i data-feather="printer" onclick="window.financialModule.printReport()" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-blue-600 cursor-pointer hidden md:block" title="Imprimir Relatório Rápido"></i>
                        </div>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <!-- Cards content similar to before... -->
                    <div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-xl shadow-gray-900/20 relative overflow-hidden">
                         <div class="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-16 translate-x-10 pointer-events-none"></div>
                         <p class="text-xs uppercase font-bold text-gray-400 mb-2 flex items-center gap-2"><i data-feather="dollar-sign" class="w-4 h-4 text-emerald-400"></i> Saldo em Caixa</p>
                         <p class="text-3xl font-black mb-1">${formatCurrency(stats.balance)}</p>
                         <div class="flex items-center justify-between">
                            <p class="text-[10px] text-gray-400">Total Líquido</p>
                            ${getBadge(stats.balanceGrowth)}
                         </div>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative group overflow-hidden">
                        <div class="absolute inset-y-0 left-0 w-1 bg-emerald-500 rounded-l-2xl"></div>
                        <p class="text-xs uppercase font-bold text-gray-400 mb-3 relative z-10">Recebimentos</p>
                        <p class="text-2xl font-black text-gray-800 mb-1 relative z-10">R$ ${stats.paidRevenue.toFixed(2)}</p>
                        <div class="flex items-center justify-between relative z-10">
                             <span class="text-xs text-gray-400 font-medium">Pendente: <span class="text-orange-500 font-bold">R$ ${stats.pendingRevenue.toFixed(2)}</span></span>
                             ${getBadge(stats.revenueGrowth)}
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative group overflow-hidden">
                        <div class="absolute inset-y-0 left-0 w-1 bg-rose-500 rounded-l-2xl"></div>
                        <p class="text-xs uppercase font-bold text-gray-400 mb-3 relative z-10">Despesas</p>
                        <p class="text-2xl font-black text-gray-800 mb-1 relative z-10">R$ ${stats.paidExpenses.toFixed(2)}</p>
                        <div class="flex items-center justify-between relative z-10">
                             <span class="text-xs text-gray-400 font-medium">Pendente: <span class="text-orange-500 font-bold">R$ ${stats.pendingExpenses.toFixed(2)}</span></span>
                             ${getBadge(stats.expensesGrowth)}
                        </div>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative group overflow-hidden">
                        <div class="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-l-2xl"></div>
                         <p class="text-xs uppercase font-bold text-gray-400 mb-3 relative z-10">Lucro / Margem</p>
                         <p class="text-2xl font-black ${stats.margin >= 0 ? 'text-blue-600' : 'text-red-600'} mb-1 relative z-10">${formatCurrency(stats.margin)}</p>
                         <p class="text-xs text-gray-400">Resultado do Período</p>
                    </div>

                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center">
                         <div class="flex justify-between items-center mb-2 border-b border-gray-50 pb-2">
                            <span class="text-xs font-bold text-gray-500">Juros</span>
                            <span class="text-xs font-black text-gray-800">${formatCurrency(stats.interestPaid)}</span>
                         </div>
                          <div class="flex justify-between items-center">
                            <span class="text-xs font-bold text-gray-500">Taxas</span>
                            <span class="text-xs font-black text-gray-800">${formatCurrency(stats.taxesPaid)}</span>
                         </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="sticky top-0 z-30 flex flex-wrap gap-2 bg-gray-100 backdrop-blur-md p-2 rounded-xl border border-white/50 shadow-sm mb-2 transition-all">
                    ${['Todos', 'Recebimentos', 'Despesas', 'Pessoal', 'Impostos', 'Transferências', 'Orçamentos'].map(tab => `
                        <button onclick="window.financialModule.setTab('${tab}')" 
                            class="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                            ${this.activeTab === tab
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10 scale-100'
                : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}">
                            ${tab}
                        </button>
                    `).join('')}
                </div>

                <!-- Table (Desktop) -->
                <div class="hidden md:flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex-col min-h-[500px]">
                    <div class="overflow-auto custom-scrollbar flex-1 h-0 min-h-[400px]"> <!-- Fixed height wrapper -->
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th class="p-2 text-xs font-black text-gray-400 uppercase tracking-wider">ID</th>
                                    <th class="p-2 text-xs font-black text-gray-400 uppercase tracking-wider">Detalhes do Lançamento</th>
                                    <!-- Merged Entidade into Detalhes -->
                                    <th class="p-2 text-center text-xs font-black text-gray-400 uppercase tracking-wider hidden md:table-cell">Info Pgto</th>
                                    <th class="p-2 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Valor Final</th>
                                    <th class="p-2 text-center text-xs font-black text-gray-400 uppercase tracking-wider hidden md:table-cell">Vencimento</th>
                                    <th class="p-2 text-center text-xs font-black text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                                    <th class="p-2 text-right text-xs font-black text-gray-400 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                ${this.renderTableRows()}
                            </tbody>
                        </table>
                        ${this.filteredTransactions.length === 0 ? `
                            <div class="flex flex-col items-center justify-center h-64 text-center">
                                <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <i data-feather="inbox" class="w-8 h-8 text-gray-300"></i>
                                </div>
                                <p class="text-sm font-bold text-gray-500">Nenhum lançamento encontrado</p>
                                <p class="text-xs text-gray-400 mt-1">Tente ajustar os filtros ou selecionar outro período</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Cards (Mobile) -->
                <div class="md:hidden flex-1 overflow-y-auto space-y-3 pb-20 custom-scrollbar">
                    ${this.renderMobileCards()}
                </div>
            </div>

            <!-- Modal Overlay -->
            <div id="fin-modal-overlay" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center opacity-0 transition-opacity">
                <!-- Modal Content Container -->
                <div id="fin-modal-content" class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all scale-95 opacity-0">
                    <!-- Dynamic Content -->
                </div>
            </div>
            
            <style>
                #fin-modal-overlay:not(.hidden) { opacity: 1; }
                #fin-modal-overlay:not(.hidden) #fin-modal-content { transform: scale(100%); opacity: 1; }
            </style>
        `;

        this.attachEvents();
        this.populateCategoryFilter();
        if (window.feather) window.feather.replace();
    }

    renderMobileCards() {
        if (this.filteredTransactions.length === 0) {
            return `
                <div class="flex flex-col items-center gap-3 p-8 text-center bg-white rounded-xl border border-gray-100 opacity-60">
                    <i data-feather="inbox" class="w-8 h-8 text-gray-400"></i>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhum lançamento</p>
                </div>
             `;
        }
        return this.filteredTransactions.map(t => {
            const isRevenue = t.type === 'revenue';
            const typeColor = isRevenue ? 'text-emerald-600' : 'text-rose-600';
            const iconBg = isRevenue ? 'bg-emerald-50' : 'bg-rose-50';
            const icon = isRevenue ? 'arrow-up-circle' : 'arrow-down-circle';
            const statusColor = t.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';

            return `
            <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative group active:scale-[0.98] transition-all">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${iconBg} ${typeColor} flex items-center justify-center shrink-0">
                            <i data-feather="${icon}" class="w-5 h-5"></i>
                        </div>
                        <div>
                             <h4 class="font-bold text-gray-800 text-xs line-clamp-1">${t.description}</h4>
                             <span class="text-[9px] font-black text-gray-400 uppercase tracking-wider block">${t.category}</span>
                        </div>
                    </div>
                    <div class="text-right">
                         <span class="block font-black text-sm ${typeColor}">${formatCurrency(t.finalValue || t.value)}</span>
                         <span class="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">${t.dueDate ? t.dueDate.split('-').reverse().slice(0, 2).join('/') : '--'}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${statusColor}">
                            ${t.paid ? (isRevenue ? 'RECEBIDO' : 'PAGO') : 'PENDENTE'}
                        </span>
                        ${t.isQuote ? '<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-600">ORÇAMENTO</span>' : ''}
                    </div>

                    <div class="flex gap-2">
                         <button class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100" onclick="window.financialModule.editTransaction('${t.id}')">
                            <i data-feather="edit-2" class="w-4 h-4"></i>
                         </button>
                         <button class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100" onclick="window.financialModule.deleteTransaction('${t.id}')">
                            <i data-feather="trash-2" class="w-4 h-4"></i>
                         </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    renderTableRows() {
        return this.filteredTransactions.map(t => {
            // Determine if it is a Sale/Auto transaction
            const isSale = t.category.includes('Venda') || t.category === 'Serviço Prestado';

            return `
            <tr class="border-b border-gray-50 hover:bg-gray-50/80 transition-all group ${t.status === 'refunded' ? 'opacity-60 bg-red-50/30' : ''} ${isSale || t.isQuote ? 'cursor-pointer hover:bg-blue-50/30' : ''}"
                onclick="${(isSale || t.isQuote) ? `
                    if (!event.target.closest('button')) {
                        const match = '${t.description}'.match(/#([A-Z]+-[0-9]+)/);
                        const saleId = '${t.metadata?.saleId || ''}' || (match ? match[1] : ''); 
                        if (saleId) window.salesModule.viewSaleDetails(saleId); 
                    }
                ` : ''}">
                <td class="p-1 text-center text-xs font-mono text-gray-400">
                    <div class="font-black text-gray-600">${t.id.slice(-6)}</div>
                    <div class="text-[9px] text-gray-400 font-bold uppercase leading-tight">${t.dueDate ? t.dueDate.split('-').reverse().slice(0, 2).join('/') : '--'}</div>
                    <div class="text-[9px] text-gray-300 font-sans">${t.metadata?.time || formatDateTime(t.createdAt).split(' ')[1] || '--:--'}</div>
                </td>
                <td class="p-1">
                    <div class="flex flex-col gap-0.5">
                        ${(() => {
                    // Smart Detection for Description
                    let displayName = t.description.replace('Venda PDV: ', '');
                    const isOS = t.category === 'Conserto' ||
                        t.description.includes('OS #') ||
                        (t.metadata?.items && (t.metadata.items.includes('OS #') || t.metadata.items.includes('CONSERTO')));

                    // Try to extract OS ID from items if generic V-ID is shown
                    if (isOS && displayName.includes('#V-')) {
                        const match = t.metadata?.items?.match(/OS #([0-9]+)/);
                        if (match) displayName = `CONSERTO OS #${match[1]}`;
                    }
                    return `<span class="font-bold text-gray-800 text-[10px] leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[60vw] md:max-w-[200px]">${displayName}</span>`;
                })()}
                        <div class="flex items-center gap-1">
                             <span class="px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${t.type === 'revenue'
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'}">
                                ${(() => {
                    const isOS = t.category === 'Conserto' ||
                        t.description.includes('OS #') ||
                        (t.metadata?.items && (t.metadata.items.includes('OS #') || t.metadata.items.includes('CONSERTO')));

                    if (isOS) return 'CONSERTO';
                    return t.category === 'Venda de Produto' ? 'VENDA' : t.category;
                })()}
                            </span>
                            ${t.recurrence && t.recurrence !== 'Não recorrente' ? `<span class="text-[8px] text-blue-500 flex items-center gap-0.5"><i data-feather="repeat" class="w-2 h-2"></i> ${t.recurrence}</span>` : ''}
                        </div>
                        <div class="mt-0.5 pt-0.5 border-t border-dashed border-gray-100 flex flex-col">
                             <span class="font-bold text-gray-600 text-[10px] uppercase block truncate max-w-[60vw] md:max-w-[200px] leading-none">${t.person}</span>
                             <span class="text-[8px] text-gray-400 uppercase font-bold leading-none">${t.seller || 'Sistema'}</span>
                        </div>
                    </div>
                </td>
                <td class="p-1 text-center hidden md:table-cell">
                    <div class="inline-flex flex-col items-center">
                         <span class="font-bold text-gray-600 text-xs">${(() => {
                    const methodMap = {
                        'MONEY': 'DINHEIRO',
                        'CASH': 'DINHEIRO',
                        'CREDIT_CARD_PARCELADO': 'CARTÃO DE CRÉDITO (PARCELADO)',
                        'CREDIT_CARD': 'CARTÃO DE CRÉDITO',
                        'DEBIT_CARD': 'CARTÃO DE DÉBITO',
                        'PIX': 'PIX',
                        'ORCAMENTO': 'ORÇAMENTO',
                        'DINHEIRO': 'DINHEIRO'
                    };
                    return methodMap[t.method] || t.method || '---';
                })()}</span>
                         <span class="text-[9px] text-gray-400">Principal</span>
                    </div>
                </td>
                <td class="p-1 text-right">
                    <div class="flex flex-col items-end">
                        <span class="font-black text-sm ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'} ${t.status === 'refunded' ? 'line-through text-gray-400' : ''}">
                            ${formatCurrency(t.finalValue)}
                        </span>
                        
                        <!-- Mobile Only: Method & Status -->
                        <div class="flex flex-col items-end md:hidden gap-0.5">
                             <span class="text-[8px] font-bold text-gray-500 uppercase">${(() => {
                    const methodMap = {
                        'MONEY': 'DINHEIRO',
                        'CASH': 'DINHEIRO',
                        'CREDIT_CARD_PARCELADO': 'CARTÃO DE CRÉDITO (PARCELADO)',
                        'CREDIT_CARD': 'CARTÃO DE CRÉDITO',
                        'DEBIT_CARD': 'CARTÃO DE DÉBITO',
                        'PIX': 'PIX',
                        'ORCAMENTO': 'ORÇAMENTO',
                        'DINHEIRO': 'DINHEIRO'
                    };
                    return methodMap[t.method] || t.method || '---';
                })()}</span>
                             ${t.paid
                    ? '<span class="text-[8px] font-black text-green-600 uppercase">PAGO</span>'
                    : '<span class="text-[8px] font-black text-orange-500 uppercase">PENDENTE</span>'}
                        </div>

                         ${(t.discount > 0 || t.interest > 0) ? `
                             <span class="text-[9px] text-gray-400 flex items-center gap-1">
                                ${t.interest > 0 ? `<span class="text-orange-500">+Juros</span>` : ''}
                                ${t.discount > 0 ? `<span class="text-green-500">-Desc</span>` : ''}
                             </span>
                         ` : ''}
                    </div>
                </td>
                <td class="p-1 text-center hidden md:table-cell">
                    <span class="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                        ${new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                    </span>
                </td>
                
                <!-- STATUS COLUMN (Hidden on Mobile) -->
                <td class="p-1 text-center hidden md:table-cell">
                    ${t.isQuote ?
                    (t.status === 'converted' ?
                        '<span class="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded border border-green-200 uppercase tracking-wide flex items-center justify-center gap-1"><i data-feather="check-double" class="w-3 h-3"></i> CONCRETIZADO</span>' :
                        '<span class="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-1 rounded border border-orange-200 uppercase tracking-wide flex items-center justify-center gap-1"><i data-feather="file-text" class="w-3 h-3"></i> NOVO</span>'
                    )
                    : t.status === 'refunded' ?
                        '<span class="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded border border-red-200 uppercase tracking-wide flex items-center justify-center gap-1"><i data-feather="x-circle" class="w-3 h-3"></i> ESTORNADO</span>' :
                        t.paid ?
                            '<span class="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded border border-green-200 uppercase tracking-wide flex items-center justify-center gap-1"><i data-feather="check-circle" class="w-3 h-3"></i> PAGO</span>' :
                            '<span class="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-1 rounded border border-orange-200 uppercase tracking-wide flex items-center justify-center gap-1"><i data-feather="clock" class="w-3 h-3"></i> PENDENTE</span>'
                }
                </td>

                <!-- NEW ACTIONS COLUMN -->
                <td class="p-1 text-right user-select-none">
                     <div class="flex justify-end gap-2 group-hover:opacity-100 opacity-80">
                          ${t.isQuote ? `
                              ${t.status !== 'converted' ? `
                              <button onclick="document.querySelector('[data-target=\\'sales\\']').click(); setTimeout(() => window.salesModule.loadQuote('${t.id}'), 500);" class="w-8 h-8 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center justify-center transition-colors shadow-sm" title="Concretizar Venda - Ir para Caixa">
                                  <i data-feather="play-circle" class="w-4 h-4"></i>
                              </button>
                              ` : ''}
                               <button onclick="window.salesModule.viewSaleDetails('${t.id}')" class="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors" title="Ver Detalhes do Orçamento">
                                   <i data-feather="eye" class="w-4 h-4"></i>
                               </button>
                          ` : isSale ? `
                             <button onclick="
                                const match = '${t.description}'.match(/#([A-Z]+-[0-9]+)/);
                                const saleId = '${t.metadata?.saleId || ''}' || (match ? match[1] : '');
                                if (saleId) window.salesModule.viewSaleDetails(saleId);
                                else alert('ID da venda não encontrado nesta transação antiga.');
                             " class="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm" title="Ver Detalhes">
                                 <i data-feather="eye" class="w-4 h-4"></i>
                             </button>
                             <button onclick="
                                const match = '${t.description}'.match(/#([A-Z]+-[0-9]+)/);
                                const saleId = '${t.metadata?.saleId || ''}' || (match ? match[1] : '');
                                if (saleId) window.salesModule.printReceiptById(saleId);
                                else alert('ID da venda não encontrado para impressão.');
                             " class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors shadow-sm" title="Imprimir Comprovante">
                                 <i data-feather="printer" class="w-4 h-4"></i>
                             </button>
                          ` : `
                              <button onclick="window.financialModule.printTransaction('${t.id}')" class="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm" title="Imprimir Recibo"><i data-feather="printer" class="w-4 h-4"></i></button>
                          `}
                      </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    calculateSummary() {
        const stats = {
            paidRevenue: 0,
            pendingRevenue: 0,
            totalRevenue: 0,
            paidExpenses: 0,
            pendingExpenses: 0,
            totalExpenses: 0,
            interestPaid: 0,
            taxesPaid: 0,
            balance: 0,
            margin: 0,
            revenueGrowth: 0,
            expensesGrowth: 0,
            balanceGrowth: 0
        };

        // Use period transactions to calculate correct totals shown on screen
        const transactionsToSummarize = this.periodTransactions;

        transactionsToSummarize.forEach(t => {
            if (t.status === 'refunded') return;

            if (t.type === 'revenue') {
                stats.totalRevenue += t.finalValue;
                if (t.paid) stats.paidRevenue += t.finalValue;
                else stats.pendingRevenue += t.finalValue;
            } else {
                stats.totalExpenses += t.finalValue;
                if (t.paid) stats.paidExpenses += t.finalValue;
                else stats.pendingExpenses += t.finalValue;

                stats.interestPaid += (t.interest || 0);
                stats.taxesPaid += (t.taxes || 0);
            }
        });

        stats.balance = stats.paidRevenue - stats.paidExpenses;
        stats.margin = stats.paidRevenue - stats.paidExpenses;

        return stats;
    }

    populateCategoryFilter() {
        const select = document.getElementById('fin-filter-category');
        if (!select) return;

        const categories = [...new Set(this.transactions.map(t => t.category))].sort();

        select.innerHTML = '<option value="Todas">Todas Categorias</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    setTab(tab) {
        this.activeTab = tab; // This will handle 'Despesas' matching logic in applyFilters
        this.applyFilters();
        this.render();
    }

    attachEvents() {
        const searchClient = document.getElementById('fin-search-client');
        const searchType = document.getElementById('fin-search-type');
        const btnFilterTrigger = document.getElementById('fin-btn-filter-trigger');
        const filterCategory = document.getElementById('fin-filter-category');
        const filterSituation = document.getElementById('fin-filter-situation');
        const filterMethod = document.getElementById('fin-filter-method');

        searchClient?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.applyFilters();
            this.updateTableOnly();
        });

        const handleTypeFilter = () => {
            if (searchType) this.filters.type = searchType.value;
            this.applyFilters();
            this.render();
        };

        searchType?.addEventListener('change', handleTypeFilter);

        btnFilterTrigger?.addEventListener('click', () => {
            if (searchType) this.filters.type = searchType.value;
            this.applyFilters();
            this.render();
            this.printReport();
        });

        const startDate = document.getElementById('fin-date-start');
        const endDate = document.getElementById('fin-date-end');

        if (startDate && endDate) {
            const handleDateChange = () => {
                this.startDate = startDate.value;
                this.endDate = endDate.value;
                this.loadData();
            };
            startDate.addEventListener('change', handleDateChange);
            endDate.addEventListener('change', handleDateChange);
        }

        filterCategory?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
            this.render();
        });

        filterSituation?.addEventListener('change', (e) => {
            this.filters.situation = e.target.value;
            this.applyFilters();
            this.render();
        });

        filterMethod?.addEventListener('change', (e) => {
            this.filters.method = e.target.value;
            this.applyFilters();
            this.render();
        });
    }

    updateTableOnly() {
        const tbody = this.container.querySelector('tbody');
        if (tbody) tbody.innerHTML = this.renderTableRows();
        if (window.feather) window.feather.replace();
    }

    openNewTransaction(type) {
        const modal = document.getElementById('fin-modal-overlay');
        const content = document.getElementById('fin-modal-content');

        const defaultCategories = type === 'revenue'
            ? ['Venda Produtos', 'Serviços', 'Outras Receitas']
            : ['Água', 'Luz', 'Telefone', 'Internet', 'Aluguel', 'Salário', 'Manutenção', 'Fornecedores', 'Impostos', 'Materiais', 'Transporte', 'Marketing'];

        const existingCategories = [...new Set(this.transactions.filter(t => t.type === type).map(t => t.category))];
        const allCategories = [...new Set([...defaultCategories, ...existingCategories])].sort();

        const clients = storage.getClients();
        const suggestedPeople = type === 'revenue'
            ? clients.filter(c => c.category !== 'supplier' && c.category !== 'creditor')
            : clients.filter(c => c.category === 'supplier' || c.category === 'creditor');

        const suggestionsHTML = suggestedPeople.map(p => `<option value="${p.name}">`).join('');

        content.className = "bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto max-h-[90vh] transform transition-all scale-100 custom-scrollbar";
        content.innerHTML = `
            <div class="p-6 space-y-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-4">
                    <div>
                        <h3 class="text-xl font-black text-gray-800 uppercase tracking-tight">${type === 'revenue' ? 'Nova Receita' : 'Nova Despesa'}</h3>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Preencha os detalhes do lançamento</p>
                    </div>
                    <button onclick="document.getElementById('fin-modal-overlay').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition-colors"><i data-feather="x" class="w-6 h-6"></i></button>
                </div>
                
                <form id="new-transaction-form" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição</label>
                            <input type="text" id="t-description" class="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 placeholder-gray-400" placeholder="Ex: Pagamento conta de luz">
                        </div>
                        
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categoria</label>
                            <input type="text" id="t-category" list="category-list" class="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-bold text-gray-900 placeholder-gray-400" placeholder="Selecione ou digite...">
                            <datalist id="category-list">
                                ${allCategories.map(c => `<option value="${c}">`).join('')}
                            </datalist>
                        </div>

                        <div>
                             <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">${type === 'revenue' ? 'Cliente' : 'Credor'}</label>
                             <div class="flex gap-2">
                                <input type="text" id="t-person" list="person-list" class="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 placeholder-gray-400" placeholder="Busque ou digite o nome...">
                                <button type="button" onclick="window.financialModule.openQuickRegister('${type === 'revenue' ? 'client' : 'creditor'}')" class="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-lg transition-colors" title="Cadastrar Novo">
                                    <i data-feather="plus" class="w-4 h-4"></i>
                                </button>
                             </div>
                             <datalist id="person-list">
                                ${suggestionsHTML}
                             </datalist>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Valor (R$)</label>
                            <input type="number" id="t-value" step="0.01" class="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 placeholder-gray-400">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data</label>
                            <input type="date" id="t-date" value="${new Date().toISOString().split('T')[0]}" class="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900">
                        </div>
                         <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Método</label>
                            <select id="t-method" class="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 bg-white">
                                <option value="PIX">PIX</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Cartão de Débito">Cartão de Débito</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Recorrência</label>
                         <select id="t-recurrence" class="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 bg-white">
                            <option value="Não recorrente">Não recorrente (Lançamento Único)</option>
                            <option value="Mensal">Mensal (Todo mês)</option>
                            <option value="Semanal">Semanal (Toda semana)</option>
                            <option value="Anual">Anual (Todo ano)</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <input type="checkbox" id="t-paid" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer">
                        <label for="t-paid" class="text-sm font-bold text-gray-700 cursor-pointer select-none">
                            Lançamento já foi pago/recebido?
                        </label>
                    </div>

                    <div class="pt-4 flex justify-end gap-3">
                        <button type="button" onclick="document.getElementById('fin-modal-overlay').classList.add('hidden')" class="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                        <button type="submit" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">Salvar Lançamento</button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');
        if (window.feather) window.feather.replace();

        document.getElementById('new-transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTransaction(type);
        });
    }

    openQuickRegister(type) {
        const name = prompt(`Informe o nome do novo ${type === 'client' ? 'Cliente' : 'Credor/Fornecedor'}:`);
        if (!name) return;

        if (type === 'client') {
            const newClient = {
                id: Date.now(),
                name: name.toUpperCase(),
                phone: '',
                email: '',
                document: '', // CPF/CNPJ
                category: 'client',
                createdAt: new Date().toISOString()
            };
            storage.addClient(newClient);
        } else {
            const newClient = { // Storing creditors in same 'clients' DB for now but with different category
                id: Date.now(),
                name: name.toUpperCase(),
                phone: '',
                email: '',
                document: '',
                category: 'creditor',
                createdAt: new Date().toISOString()
            };
            storage.addClient(newClient);
        }

        // Re-open modal to refresh list
        // A bit hacky: Close then re-open existing type logic
        const currentType = document.querySelector('h3').innerText.includes('RECEITA') ? 'revenue' : 'expense';
        this.openNewTransaction(currentType);

        // Pre-fill the input
        setTimeout(() => {
            const input = document.getElementById('t-person');
            if (input) input.value = name.toUpperCase();
        }, 100);
    }

    saveTransaction(type, editId = null) {
        const fmt = (text) => text.toUpperCase().trim();

        const transaction = {
            id: editId || `TR-${Date.now()}`,
            type,
            description: fmt(document.getElementById('t-description').value),
            category: fmt(document.getElementById('t-category').value),
            person: fmt(document.getElementById('t-person').value) || 'Consumidor Final',
            method: document.getElementById('t-method')?.value || 'PIX',
            recurrence: document.getElementById('t-recurrence')?.value || '',
            value: parseFloat(document.getElementById('t-value').value),
            finalValue: parseFloat(document.getElementById('t-value').value),
            dueDate: document.getElementById('t-date').value,
            paid: document.getElementById('t-paid')?.checked || false,
            createdAt: new Date().toISOString()
        };

        if (editId) {
            storage.updateTransaction(transaction);
        } else {
            storage.addTransaction(transaction);
        }

        document.getElementById('fin-modal-overlay').classList.add('hidden');
        this.loadData();
        this.render();
    }

    editTransaction(id) {
        const t = this.transactions.find(item => item.id == id);
        if (!t) return;

        const modal = document.getElementById('fin-modal-overlay');
        const content = document.getElementById('fin-modal-content');

        // Check if automated (Sale)
        const isAutomated = (t.category.includes('Venda') || t.category === 'Serviço Prestado');

        if (isAutomated) {
            alert("⚠️ Lançamentos automáticos (Vendas/OS) não devem ser editados manualmente. Use o estorno.");
            return;
        }

        // Reuse open logic but fill data
        this.openNewTransaction(t.type);

        // Fill Data
        setTimeout(() => {
            document.getElementById('t-description').value = t.description;
            document.getElementById('t-category').value = t.category;
            document.getElementById('t-person').value = t.person;
            document.getElementById('t-value').value = t.finalValue;
            document.getElementById('t-date').value = t.dueDate.split('T')[0];
            document.getElementById('t-paid').checked = t.paid;

            if (document.getElementById('t-method')) document.getElementById('t-method').value = t.method;
            if (document.getElementById('t-recurrence')) document.getElementById('t-recurrence').value = t.recurrence || 'Não recorrente';

            // Override submit
            const form = document.getElementById('new-transaction-form');
            // Remove old listener by cloning
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTransaction(t.type, t.id);
            });
        }, 50);
    }

    deleteTransaction(id) {
        alert("🔒 AÇÃO BLOQUEADA: Para garantir a integridade dos relatórios, lançamentos não podem ser apagados por aqui.\n\nSe necessário corrigir, faça um estorno ou edite o lançamento.");
    }

    async printTransaction(id) {
        const t = this.transactions.find(item => item.id == id);
        if (!t) return;

        // 0. Handle Refunded Transaction
        if (t.status === 'refunded') {
            await printerService.printRefundReceipt(t);
            return;
        }

        // 1. Try to delegate to PrinterService if it is a Sale
        if (t.metadata && t.metadata.saleId) {
            try {
                // Check if sale exists in storage
                const sales = storage.getSales();
                const sale = sales.find(s => s.id === t.metadata.saleId);
                if (sale) {
                    await printerService.printCUPOM(sale);
                    return;
                }
            } catch (e) {
                console.warn('Could not print via Sale ID, falling back to generic receipt.', e);
            }
        }

        // 2. Generic Receipt for other transactions (Manual, Expenses, etc.)
        const settings = storage.getSettings();
        const company = {
            name: settings.companyName || 'UniTech Celulares',
            cnpj: settings.cnpj || '00.000.000/0001-00',
            address: settings.address || 'Endereço não configurado',
            phone: settings.phone || ''
        };

        const content = `
            <div style="font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto;">
                <h3 style="text-align: center;">${company.name}</h3>
                <p style="text-align: center; font-size: 12px;">${company.address}<br/>Contato: ${company.phone}</p>
                <hr style="border-top: 1px dashed #000;"/>
                <p style="text-align: center; font-weight: bold;">RECIBO #${t.id.slice(-6)}</p>
                <hr style="border-top: 1px dashed #000;"/>
                <p>Data: ${new Date(t.dueDate).toLocaleDateString('pt-BR')} ${t.metadata?.time || ''}<br/>
                ${t.type === 'revenue' ? 'Recebimento' : 'Pagamento'}</p>
                <p><strong>${t.description}</strong></p>
                <p>${t.category} - ${t.person}</p>
                <p>Resp: ${t.seller || 'Sistema'}</p>
                <hr style="border-top: 1px dashed #000;"/>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                    <span>VALOR:</span>
                    <span>${parseFloat(t.finalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                 <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 5px;">
                    <span>Forma:</span>
                    <span>${t.method}</span>
                </div>
                <hr style="border-top: 1px dashed #000;"/>
                <p style="text-align: center; font-size: 10px;">Documento para controle interno</p>
                <p style="text-align: center; font-size: 10px;">Impresso em ${new Date().toLocaleString('pt-BR')}</p>
            </div>
        `;

        printerService.openPrintWindow(content);
    }

    printReport() {
        // Modal Based Report
        const transactions = this.filteredTransactions;
        const stats = this.calculateSummary();

        const modal = document.getElementById('fin-modal-overlay');
        const content = document.getElementById('fin-modal-content');

        if (content) {
            content.className = "bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden transform transition-all scale-100 flex flex-col h-[90vh]";
        }

        const rows = transactions.map(t => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="p-3 text-xs text-gray-600">
                    <div class="font-bold">${new Date(t.dueDate).toLocaleDateString('pt-BR')}</div>
                    <div class="text-[9px] text-gray-400">${t.metadata?.time || new Date(t.createdAt).toLocaleTimeString('pt-BR') || '--:--'}</div>
                </td>
                <td class="p-3 text-sm text-gray-800 font-bold">${t.description}</td>
                <td class="p-3 text-sm text-gray-600">
                    <div class="font-medium">${t.person}</div>
                    <div class="text-[9px] text-blue-500 font-bold uppercase">${t.seller || 'Sistema'}</div>
                </td>
                <td class="p-3 text-sm text-gray-500">${t.category}</td>
                 <td class="p-3 text-sm text-right font-mono font-bold ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'}">
                    R$ ${t.finalValue.toFixed(2)}
                </td>
                <td class="p-3 text-center">
                    <span class="text-[10px] font-bold px-2 py-1 rounded-full ${t.status === 'refunded' ? 'bg-red-100 text-red-700' : (t.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}">
                        ${t.status === 'refunded' ? 'ESTORNADO' : (t.paid ? 'PAGO' : 'PENDENTE')}
                    </span>
                </td>
            </tr>
        `).join('');

        content.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Header / Controls -->
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 class="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            <i data-feather="file-text" class="w-5 h-5 text-blue-600"></i> Relatório Financeiro
                        </h2>
                        <p class="text-xs text-gray-500 mt-1">Período: ${new Date(this.startDate).toLocaleDateString('pt-BR')} a ${new Date(this.endDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.financialModule.executePrintReport()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
                            <i data-feather="printer" class="w-4 h-4"></i> Imprimir / PDF
                        </button>
                        <button onclick="document.getElementById('fin-modal-overlay').classList.add('hidden')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <i data-feather="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>

                <!-- Scrollable Content -->
                <div id="fin-report-print-area" class="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div class="text-center mb-8 border-b-2 border-gray-100 pb-6">
                        <h1 class="text-2xl font-black text-gray-900 uppercase tracking-wider mb-2">UniTech Cellular</h1>
                        <p class="text-sm text-gray-500 font-bold uppercase tracking-widest">Relatório Analítico de Movimentações</p>
                        <div class="flex justify-center gap-4 mt-4 text-xs text-gray-400">
                            <span>Tipo: <strong class="text-gray-700 uppercase">${this.filters.type === 'revenue' ? 'Receitas' : (this.filters.type === 'expense' ? 'Despesas' : 'Geral')}</strong></span>
                            <span>•</span>
                            <span>Emissão: ${new Date().toLocaleString('pt-BR')}</span>
                        </div>
                    </div>

                    <table class="w-full text-left border-collapse">
                        <thead class="bg-gray-50 border-b-2 border-gray-100">
                            <tr>
                                <th class="p-3 text-xs font-bold text-gray-500 uppercase">Data / Hora</th>
                                <th class="p-3 text-xs font-bold text-gray-500 uppercase">Descrição</th>
                                <th class="p-3 text-xs font-bold text-gray-500 uppercase">Cliente / Vendedor</th>
                                <th class="p-3 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                                <th class="p-3 text-xs font-bold text-gray-500 uppercase text-right">Valor</th>
                                <th class="p-3 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${rows}
                        </tbody>
                    </table>

                    <div class="mt-8 pt-6 border-t-2 border-gray-900 flex justify-end gap-12">
                         <div class="text-right">
                            <p class="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Receitas</p>
                            <p class="text-xl font-black text-emerald-600">R$ ${stats.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Despesas</p>
                            <p class="text-xl font-black text-rose-600">R$ ${stats.totalExpenses.toFixed(2)}</p>
                        </div>
                        <div class="text-right pl-12 border-l border-gray-200">
                            <p class="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Líquido</p>
                            <p class="text-2xl font-black ${stats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}">R$ ${stats.balance.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        if (window.feather) window.feather.replace();
    }

    executePrintReport() {
        const content = document.getElementById('fin-report-print-area').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório Financeiro</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        body { font-family: 'Inter', sans-serif; background: white; padding: 0; }
                        @media print { 
                            body { -webkit-print-color-adjust: exact; } 
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body class="p-8">
                    ${content}
                    <script>
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
}

window.financialModule = new FinancialModule();
export default window.financialModule;
