import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';
import { TenantRepository, PlanRepository, SassSettingsRepository } from '../repositories/index.js';

export class MasterModule {
    constructor() {
        this.tenants = [];
        this.plans = [];
        this.sassConfig = null;
        this.isLoading = false;
        this.refreshInterval = null;
    }

    async init() {
        auth.requireRole('master');
        await this.loadData();
        this.render();
        this.attachEventListeners();

        // Monitor de Sincronização em Tempo Real (Polling como Fallback)
        this.refreshInterval = setInterval(() => {
            this.loadData().then(() => {
                const list = document.getElementById('tenant-list-body');
                if (list) list.innerHTML = this.renderTenantRows();
                this.updateMetricsUI();
                if (window.feather) window.feather.replace();
                this.attachEventListeners();
            });
        }, 10000);
    }

    destroy() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    async loadData() {
        this.isLoading = true;
        this.tenants = TenantRepository.getAll(true);
        this.plans = PlanRepository.getAll(true);
        const configs = SassSettingsRepository.getAll(true);
        this.sassConfig = configs.length > 0 ? configs[0] : null;
        this.isLoading = false;
    }

    render() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        contentArea.innerHTML = `
            <div class="space-y-6 animate-fade-in pb-20">
                <!-- Header Premium Master -->
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-8 bg-unitech-primary rounded-full"></div>
                            <h2 class="text-3xl font-black text-slate-800 uppercase tracking-tighter">Painel <span class="text-unitech-primary">Master SaaS</span></h2>
                        </div>
                        <div class="flex items-center gap-4 mt-2">
                             <button id="tab-master-stores" class="px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 border-unitech-primary text-unitech-primary transition-all">Ecossistema</button>
                             <button id="tab-master-plans" class="px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all">Gestão de Planos</button>
                             <button id="tab-master-config" class="px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-all">Configuração SaaS</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="btn-refresh-master" class="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-unitech-primary transition-all active:rotate-180 duration-500">
                             <i data-feather="refresh-cw" class="w-5 h-5"></i>
                        </button>
                        <button id="btn-new-tenant" class="flex items-center gap-2 px-8 py-4 bg-unitech-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-unitech-primary/30 hover:scale-105 active:scale-95 transition-all">
                            <i data-feather="plus-square" class="w-4 h-4"></i>
                            Criar Nova Unidade (Loja)
                        </button>
                    </div>
                </div>

                <!-- Ecossistema Grid (Default Tab) -->
                <div id="master-tab-content" class="space-y-6">
                    <!-- Métricas do Ecossistema -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        ${this.renderMetrics()}
                    </div>

                    <!-- Lista de Instâncias -->
                    <div class="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                        <div class="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                            <div class="space-y-1">
                                <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Explorador de Ecossistema</h3>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento e Controle de COTAS</p>
                            </div>
                            <div class="relative group">
                                 <i data-feather="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-unitech-primary transition-colors"></i>
                                 <input type="text" id="tenant-search" placeholder="FILTRAR POR ID OU NOME..." class="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black outline-none focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 w-full md:w-64 transition-all">
                            </div>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                                        <th class="px-8 py-6">Estado</th>
                                        <th class="px-8 py-6">Identificação da Unidade</th>
                                        <th class="px-8 py-6">Plano de Serviço</th>
                                        <th class="px-8 py-6 text-center">Uso de Armazenamento</th>
                                        <th class="px-8 py-6">Ciclo de Cobrança</th>
                                        <th class="px-8 py-6 text-right">Comandos Master</th>
                                    </tr>
                                </thead>
                                <tbody id="tenant-list-body">
                                    ${this.renderTenantRows()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Alertas e Segurança -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 flex gap-4">
                        <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                            <i data-feather="alert-triangle" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-black text-amber-800 uppercase tracking-tight">Monitor de Cotas de Dados</h4>
                            <p class="text-[10px] text-amber-700 font-medium leading-relaxed mt-1">Lojas que atingirem 90% do limite terão o acesso de escrita automaticamente mitigado. O Master pode expandir a cota em "Configurações".</p>
                        </div>
                    </div>
                    <div class="bg-blue-50/50 border border-blue-200 rounded-3xl p-6 flex gap-4">
                        <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                            <i data-feather="shield" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-black text-blue-800 uppercase tracking-tight">Política de Impersonação</h4>
                            <p class="text-[10px] text-blue-700 font-medium leading-relaxed mt-1">Toda sessão iniciada por um administrador master em um tenant é auditada e registrada como "Acesso de Suporte".</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.feather) window.feather.replace();
        this.attachTabClickListeners();
    }

    attachTabClickListeners() {
        const tabs = {
            'tab-master-stores': () => this.renderEcossistemaTab(),
            'tab-master-plans': () => this.renderPlansTab(),
            'tab-master-config': () => this.renderSassConfigTab()
        };

        Object.keys(tabs).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.onclick = () => {
                    // Update tab styling
                    document.querySelectorAll('[id^="tab-master-"]').forEach(t => {
                        t.classList.remove('border-unitech-primary', 'text-unitech-primary');
                        t.classList.add('border-transparent', 'text-slate-400');
                    });
                    el.classList.add('border-unitech-primary', 'text-unitech-primary');
                    el.classList.remove('border-transparent', 'text-slate-400');

                    // Render content
                    tabs[id]();
                };
            }
        });
    }

    renderEcossistemaTab() {
        const container = document.getElementById('master-tab-content');
        if (!container) return;

        container.innerHTML = `
            <!-- Métricas do Ecossistema -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${this.renderMetrics()}
            </div>

            <!-- Lista de Instâncias -->
            <div class="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                <div class="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                    <div class="space-y-1">
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-tight">Explorador de Ecossistema</h3>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento e Controle de COTAS</p>
                    </div>
                    <div class="relative group">
                         <i data-feather="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-unitech-primary transition-colors"></i>
                         <input type="text" id="tenant-search" placeholder="FILTRAR POR ID OU NOME..." class="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black outline-none focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 w-full md:w-64 transition-all">
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                                <th class="px-8 py-6">Estado</th>
                                <th class="px-8 py-6">Identificação da Unidade</th>
                                <th class="px-8 py-6">Plano de Serviço</th>
                                <th class="px-8 py-6 text-center">Uso de Armazenamento</th>
                                <th class="px-8 py-6">Ciclo de Cobrança</th>
                                <th class="px-8 py-6 text-right">Comandos Master</th>
                            </tr>
                        </thead>
                        <tbody id="tenant-list-body">
                            ${this.renderTenantRows()}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Alertas e Segurança -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                <div class="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 flex gap-4">
                    <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                        <i data-feather="alert-triangle" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-black text-amber-800 uppercase tracking-tight">Monitor de Cotas de Dados</h4>
                        <p class="text-[10px] text-amber-700 font-medium leading-relaxed mt-1">Lojas que atingirem 90% do limite terão o acesso de escrita automaticamente mitigado. O Master pode expandir a cota em "Configurações".</p>
                    </div>
                </div>
                <div class="bg-blue-50/50 border border-blue-200 rounded-3xl p-6 flex gap-4">
                    <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <i data-feather="shield" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-black text-blue-800 uppercase tracking-tight">Política de Impersonação</h4>
                        <p class="text-[10px] text-blue-700 font-medium leading-relaxed mt-1">Toda sessão iniciada por um administrador master em um tenant é auditada e registrada como "Acesso de Suporte".</p>
                    </div>
                </div>
            </div>
        `;
        if (window.feather) window.feather.replace();
    }

    renderPlansTab() {
        const container = document.getElementById('master-tab-content');
        if (!container) return;

        const plans = this.plans || [];

        container.innerHTML = `
            <div class="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-fade-in mb-20">
                <div class="flex items-center justify-between mb-10">
                    <div class="space-y-1">
                        <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Configuração de Planos SaaS</h3>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Definição de Valores, Recursos e Limites por Nível</p>
                    </div>
                    <button id="btn-create-plan" class="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                        <i data-feather="plus" class="w-3 h-3 inline mr-1"></i> Criar Novo Plano
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    ${plans.map(p => `
                        <div class="p-8 border-2 ${p.id === 'pro' ? 'border-unitech-primary bg-unitech-primary/5 shadow-xl shadow-unitech-primary/10' : 'border-slate-100'} rounded-[2rem] hover:border-unitech-primary transition-all group relative">
                            ${p.id === 'pro' ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-unitech-primary text-white rounded-full text-[8px] font-black uppercase tracking-widest">Mais Vendido</div>' : ''}
                            <div class="flex justify-between items-start mb-6">
                                <span class="px-3 py-1 ${p.id === 'pro' ? 'bg-unitech-primary text-white' : 'bg-slate-100 text-slate-500'} rounded-lg text-[9px] font-black uppercase">${p.name}</span>
                                <span class="text-2xl font-black text-slate-800">R$ ${p.price}<span class="text-xs text-slate-400">/${p.interval === 'monthly' ? 'mês' : 'ano'}</span></span>
                            </div>
                            <ul class="space-y-4 mb-8 min-h-[120px]">
                                <li class="flex items-center gap-3 text-[10px] font-bold text-slate-600"><i data-feather="check" class="w-3 h-3 text-emerald-500"></i> Cloud Storage: ${p.storageLimitGB}GB</li>
                                ${p.features.map(f => `
                                    <li class="flex items-center gap-3 text-[10px] font-bold text-slate-600"><i data-feather="check" class="w-3 h-3 text-emerald-500"></i> ${f.toUpperCase()}</li>
                                `).slice(0, 5).join('')}
                            </ul>
                            <button class="btn-edit-plan w-full py-4 ${p.id === 'pro' ? 'bg-unitech-primary text-white shadow-lg shadow-unitech-primary/30' : 'border border-slate-200'} rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all" data-id="${p.id}">Editar Definições</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        if (window.feather) window.feather.replace();
        this.attachPlansListeners();
    }

    attachPlansListeners() {
        const createBtn = document.getElementById('btn-create-plan');
        if (createBtn) createBtn.onclick = () => this.showPlanModal();

        document.querySelectorAll('.btn-edit-plan').forEach(btn => {
            btn.onclick = () => this.showPlanModal(btn.getAttribute('data-id'));
        });
    }

    showPlanModal(planId = null) {
        const plan = planId ? this.plans.find(p => p.id === planId) : null;
        const isEdit = !!plan;

        const allFeatures = [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'sales', label: 'Vendas (PDV)' },
            { id: 'checklist', label: 'Ordens de Serviço' },
            { id: 'clients', label: 'Clientes' },
            { id: 'storefront', label: 'Produtos' },
            { id: 'financial', label: 'Financeiro' },
            { id: 'warranty', label: 'Garantias' },
            { id: 'vision', label: 'Serviços Vision' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'copilot', label: 'IA Copilot' }
        ];

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center animate-fade-in p-4';

        const modal = document.createElement('div');
        modal.className = 'bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in relative';

        modal.innerHTML = `
            <button class="modal-close absolute right-6 top-6 w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-all z-50">
                <i data-feather="x" class="w-5 h-5"></i>
            </button>

            <div class="p-10">
                <div class="mb-8">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">${isEdit ? 'Editar Plano' : 'Criar Novo Plano'}</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure as entregas do pacote de serviço</p>
                </div>

                <div class="space-y-6">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Plano</label>
                        <input type="text" id="plan-name" value="${plan?.name || ''}" placeholder="Ex: BASIC, VIP, EXCLUSIVE" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preço (Mensal)</label>
                            <input type="number" id="plan-price" value="${plan?.price || 0}" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Armazenamento (GB)</label>
                            <input type="number" id="plan-storage" value="${plan?.storageLimitGB || 5}" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recursos Inclusos</label>
                        <div class="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border border-slate-100 rounded-2xl custom-scrollbar">
                            ${allFeatures.map(f => `
                                <label class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all">
                                    <input type="checkbox" class="plan-feature-checkbox" value="${f.id}" ${plan?.features?.includes(f.id) ? 'checked' : ''}>
                                    <span class="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">${f.label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <button id="save-plan-btn" class="w-full py-5 bg-slate-900 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <i data-feather="check-circle" class="w-5 h-5 text-unitech-primary"></i>
                        ${isEdit ? 'Salvar Alterações' : 'Confirmar e Criar'}
                    </button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        if (window.feather) window.feather.replace();

        const closeModal = () => {
            overlay.classList.add('animate-fade-out');
            modal.classList.add('animate-scale-out');
            setTimeout(() => overlay.remove(), 300);
        };

        modal.querySelector('.modal-close').onclick = closeModal;

        modal.querySelector('#save-plan-btn').onclick = async () => {
            const name = modal.querySelector('#plan-name').value.trim();
            const price = parseFloat(modal.querySelector('#plan-price').value);
            const storageGB = parseInt(modal.querySelector('#plan-storage').value);
            const features = Array.from(modal.querySelectorAll('.plan-feature-checkbox:checked')).map(cb => cb.value);

            if (!name) {
                window.toastService?.error('Dê um nome ao plano.');
                return;
            }

            const data = {
                id: isEdit ? plan.id : name.toLowerCase().replace(/\s+/g, '-'),
                name: name,
                price: price,
                storageLimitGB: storageGB,
                features: features,
                interval: 'monthly',
                status: 'active',
                createdAt: plan?.createdAt || new Date().toISOString()
            };

            try {
                if (isEdit) {
                    await PlanRepository.update(plan.id, data);
                } else {
                    await PlanRepository.add(data);
                }
                window.toastService?.success(`Plano ${isEdit ? 'atualizado' : 'criado'} com sucesso!`);
                await this.loadData();
                this.renderPlansTab();
                closeModal();
            } catch (e) {
                window.toastService?.error('Erro: ' + e.message);
            }
        };
    }

    renderSassConfigTab() {
        const container = document.getElementById('master-tab-content');
        if (!container) return;

        const config = this.sassConfig || {
            appName: 'UniTech Service',
            maintenanceMode: false,
            gateways: { mercadoPago: { enabled: false }, pix: { enabled: false } }
        };

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 animate-fade-in">
                <!-- Gateway de Pagamento Global -->
                <div class="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                            <i data-feather="credit-card" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-black text-slate-800 uppercase">Gateway de Pagamento</h3>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Configuração de Recebimento de Planos</p>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <img src="https://img.icons8.com/color/48/000000/mercado-pago.png" class="w-6 h-6">
                                    <span class="text-[10px] font-black text-slate-700 uppercase">Mercado Pago</span>
                                </div>
                                <div id="mp-enable-toggle" class="w-10 h-5 ${config.gateways?.mercadoPago?.enabled ? 'bg-emerald-500' : 'bg-slate-300'} rounded-full relative cursor-pointer transition-all">
                                    <div class="absolute ${config.gateways?.mercadoPago?.enabled ? 'right-1' : 'left-1'} top-1 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                             </div>
                             <div class="space-y-3">
                                <input type="text" id="mp-access-token" value="${config.gateways?.mercadoPago?.accessToken || ''}" placeholder="Access Token (APP_USR-...)" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-unitech-primary transition-all">
                                <input type="text" id="mp-public-key" value="${config.gateways?.mercadoPago?.publicKey || ''}" placeholder="Public Key" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-unitech-primary transition-all">
                             </div>
                        </div>

                        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 bg-slate-200 rounded flex items-center justify-center text-[10px] font-black">PIX</div>
                                    <span class="text-[10px] font-black text-slate-700 uppercase">PIX Automático</span>
                                </div>
                                <div id="pix-enable-toggle" class="w-10 h-5 ${config.gateways?.pix?.enabled ? 'bg-emerald-500' : 'bg-slate-300'} rounded-full relative cursor-pointer transition-all">
                                    <div class="absolute ${config.gateways?.pix?.enabled ? 'right-1' : 'left-1'} top-1 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                             </div>
                             <div class="space-y-3">
                                <input type="text" id="pix-key" value="${config.gateways?.pix?.key || ''}" placeholder="Chave PIX (CPF/Email/Aleatória)" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-unitech-primary transition-all">
                             </div>
                        </div>
                        
                        <button id="save-gateway-settings" class="w-full py-4 bg-slate-900 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all">Salvar Configurações de Gateway</button>
                    </div>
                </div>

                <!-- Configurações de Sistema & Whitelabel -->
                <div class="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                            <i data-feather="settings" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-black text-slate-800 uppercase">Parâmetros Globais</h3>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identidade Visual e Regras de Negócio</p>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[9px] font-extrabold text-slate-400 uppercase mb-2">Nome do App</label>
                                <input type="text" id="global-app-name" value="${config.appName}" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none transition-all">
                            </div>
                            <div>
                                <label class="block text-[9px] font-extrabold text-slate-400 uppercase mb-2">Versão Master</label>
                                <input type="text" value="V7.5.0-FIRE" disabled class="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 outline-none transition-all">
                            </div>
                        </div>

                        <div class="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100">
                            <div class="flex items-center gap-3">
                                <i data-feather="power" class="w-5 h-5 text-rose-500"></i>
                                <div>
                                    <h4 class="text-[10px] font-black text-rose-800 uppercase">Modo de Manutenção</h4>
                                    <p class="text-[8px] text-rose-600 font-bold uppercase tracking-tight">Bloquear acesso de todos os Tenants</p>
                                </div>
                            </div>
                            <div id="maintenance-toggle" class="w-10 h-5 ${config.maintenanceMode ? 'bg-rose-500' : 'bg-slate-300'} rounded-full relative cursor-pointer transition-all">
                                <div class="absolute ${config.maintenanceMode ? 'right-1' : 'left-1'} top-1 w-3 h-3 bg-white rounded-full"></div>
                            </div>
                        </div>

                        <div class="p-6 bg-slate-900 rounded-[2rem] text-white">
                             <div class="flex items-center gap-2 mb-4">
                                <i data-feather="cpu" class="w-4 h-4 text-unitech-primary"></i>
                                <span class="text-[9px] font-black uppercase tracking-widest">Saúde do Servidor (WhatsApp)</span>
                             </div>
                             <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl mb-2">
                                <span class="text-[9px] font-bold">API STATUS:</span>
                                <span id="api-status-badge" class="text-[9px] font-black text-emerald-400">OPERACIONAL</span>
                             </div>
                             <div class="flex justify-between items-center bg-slate-800 p-3 rounded-xl">
                                <span class="text-[9px] font-bold">REQUISIÇÕES/HORA:</span>
                                <span class="text-[9px] font-black text-indigo-400">${Math.floor(Math.random() * 2000)} REQS</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (window.feather) window.feather.replace();
        this.attachConfigListeners();
    }

    attachConfigListeners() {
        const container = document.getElementById('master-tab-content');
        if (!container) return;

        const mpToggle = container.querySelector('#mp-enable-toggle');
        const pixToggle = container.querySelector('#pix-enable-toggle');
        const maintenanceToggle = container.querySelector('#maintenance-toggle');
        const saveBtn = container.querySelector('#save-gateway-settings');

        const toggleState = (el, type) => {
            const isEnabled = el.classList.contains('bg-emerald-500') || el.classList.contains('bg-rose-500');
            el.classList.toggle('bg-emerald-500', !isEnabled);
            el.classList.toggle('bg-slate-300', isEnabled);
            const knob = el.querySelector('div');
            knob.classList.toggle('right-1', !isEnabled);
            knob.classList.toggle('left-1', isEnabled);
        };

        if (mpToggle) mpToggle.onclick = () => toggleState(mpToggle);
        if (pixToggle) pixToggle.onclick = () => toggleState(pixToggle);
        if (maintenanceToggle) {
            maintenanceToggle.onclick = () => {
                const isEnabled = maintenanceToggle.classList.contains('bg-rose-500');
                maintenanceToggle.classList.toggle('bg-rose-500', !isEnabled);
                maintenanceToggle.classList.toggle('bg-slate-300', isEnabled);
                const knob = maintenanceToggle.querySelector('div');
                knob.classList.toggle('right-1', !isEnabled);
                knob.classList.toggle('left-1', isEnabled);
            };
        }

        if (saveBtn) {
            saveBtn.onclick = async () => {
                const updatedConfig = {
                    id: 'global',
                    appName: container.querySelector('#global-app-name').value,
                    maintenanceMode: container.querySelector('#maintenance-toggle').classList.contains('bg-rose-500'),
                    gateways: {
                        mercadoPago: {
                            enabled: container.querySelector('#mp-enable-toggle').classList.contains('bg-emerald-500'),
                            accessToken: container.querySelector('#mp-access-token').value,
                            publicKey: container.querySelector('#mp-public-key').value
                        },
                        pix: {
                            enabled: container.querySelector('#pix-enable-toggle').classList.contains('bg-emerald-500'),
                            key: container.querySelector('#pix-key').value
                        }
                    }
                };

                try {
                    await SassSettingsRepository.update('global', updatedConfig);
                    window.toastService?.success('Configurações Globais Salvas!');
                    await this.loadData();
                } catch (e) {
                    window.toastService?.error('Erro ao salvar: ' + e.message);
                }
            };
        }
    }

    renderMetrics() {
        const activeCount = this.tenants.length;
        const totalStorageBytes = this.tenants.reduce((acc, t) => acc + (t.currentUsageBytes || 0), 0);
        const totalLimitGB = this.tenants.reduce((acc, t) => acc + (t.storageLimitGB || 5), 0);
        const totalLimitBytes = totalLimitGB * 1024 * 1024 * 1024;

        // Correção do Bug do NaN%
        const usagePercentValue = totalLimitBytes > 0 ? (totalStorageBytes / totalLimitBytes) * 100 : 0;
        const usagePercent = usagePercentValue.toFixed(1);

        const mrr = this.calculateMRR();

        return `
            <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-unitech-primary transition-all duration-500">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-feather="cloud" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades Ativas</p>
                        <h4 class="text-3xl font-black text-slate-800" id="metric-active-count">${activeCount} <span class="text-xs text-slate-300">LOJAS</span></h4>
                    </div>
                </div>
            </div>

            <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-orange-400 transition-all duration-500">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-feather="database" class="w-7 h-7"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-end mb-1">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uso Global de Dados</p>
                            <span class="text-[10px] font-black text-slate-900">${(totalStorageBytes / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                        <h4 class="text-2xl font-black text-slate-800" id="metric-storage-total">${usagePercent}%</h4>
                        <div class="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div class="h-full bg-orange-500 transition-all duration-1000" style="width: ${usagePercent}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:border-emerald-500 transition-all duration-500">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-feather="trending-up" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">MRR Estimado</p>
                        <h4 class="text-3xl font-black text-slate-800" id="metric-mrr">R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                    </div>
                </div>
            </div>
        `;
    }

    updateMetricsUI() {
        const activeCount = this.tenants.length;
        const totalStorageBytes = this.tenants.reduce((acc, t) => acc + (t.currentUsageBytes || 0), 0);
        const totalLimitGB = this.tenants.reduce((acc, t) => acc + (t.storageLimitGB || 5), 0);
        const totalLimitBytes = totalLimitGB * 1024 * 1024 * 1024;
        const usagePercentValue = totalLimitBytes > 0 ? (totalStorageBytes / totalLimitBytes) * 100 : 0;
        const mrr = this.calculateMRR();

        const elCount = document.getElementById('metric-active-count');
        const elMRR = document.getElementById('metric-mrr');
        const elStorage = document.getElementById('metric-storage-total');

        if (elCount) elCount.innerHTML = `${activeCount} <span class="text-xs text-slate-300">LOJAS</span>`;
        if (elMRR) elMRR.innerHTML = `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        if (elStorage) elStorage.innerHTML = `${usagePercentValue.toFixed(1)}%`;
    }

    calculateMRR() {
        const prices = { basic: 99, pro: 199, enterprise: 499, master: 0, trial: 0 };
        return this.tenants.reduce((acc, t) => acc + (prices[t.plan] || 0), 0);
    }

    renderTenantRows() {
        if (this.tenants.length === 0) {
            return `<tr><td colspan="6" class="px-8 py-20 text-center text-slate-300 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Ecossistema...</td></tr>`;
        }

        return this.tenants.map(t => {
            const usageMB = (t.currentUsageBytes || 0) / (1024 * 1024);
            const limitGB = t.storageLimitGB || 5;
            const limitMB = limitGB * 1024;
            const usagePercent = Math.min(100, (usageMB / limitMB) * 100);

            let statusBadge = '';
            if (t.status === 'active') statusBadge = '<span class="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider"><div class="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></div> Ativo</span>';
            else if (t.status === 'suspended') statusBadge = '<span class="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-wider"><div class="w-1.5 h-1.5 bg-rose-600 rounded-full"></div> Suspenso</span>';
            else statusBadge = `<span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase">${t.status}</span>`;

            return `
                <tr class="group hover:bg-slate-50 transition-all border-b border-slate-50">
                    <td class="px-8 py-6">${statusBadge}</td>
                    <td class="px-8 py-6">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-unitech-primary group-hover:text-white transition-all">
                                ${t.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xs font-black text-slate-800">${t.name}</span>
                                <span class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${t.id}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-6">
                        <span class="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-tighter">${t.plan}</span>
                    </td>
                    <td class="px-8 py-6">
                        <div class="flex flex-col gap-1.5 w-40 mx-auto">
                            <div class="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                                <span>${usageMB.toFixed(1)}MB</span>
                                <span>${limitGB}GB</span>
                            </div>
                            <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full ${usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-400' : 'bg-unitech-primary'} transition-all duration-700" style="width: ${usagePercent}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-6">
                        <div class="flex flex-col">
                            <span class="text-xs font-black text-slate-700">DIA ${t.billingDay || 10}</span>
                            <span class="text-[9px] text-slate-400 font-bold">FECHAMENTO</span>
                        </div>
                    </td>
                    <td class="px-8 py-6 text-right">
                        <div class="flex items-center justify-end gap-2">
                             <button class="btn-action-view p-3 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" data-id="${t.id}" title="RELATÓRIO DA UNIDADE">
                                <i data-feather="eye" class="w-4 h-4"></i>
                            </button>
                            <button class="btn-action-edit p-3 text-slate-400 hover:text-unitech-primary hover:bg-unitech-primary/10 rounded-xl transition-all" data-id="${t.id}" title="EDITAR UNIDADE & RECURSOS">
                                <i data-feather="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button class="btn-action-delete p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" data-id="${t.id}" title="EXCLUIR UNIDADE (PERDA TOTAL DE DADOS)">
                                <i data-feather="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    attachEventListeners() {
        const btnNew = document.getElementById('btn-new-tenant');
        if (btnNew) btnNew.onclick = () => this.showNewTenantModal();

        const btnRefresh = document.getElementById('btn-refresh-master');
        if (btnRefresh) {
            btnRefresh.onclick = () => {
                this.loadData().then(() => this.render());
                window.toastService?.info('Ecossistema sincronizado.');
            };
        }

        // EDITAR UNIDADE (DADOS + RECURSOS)
        document.querySelectorAll('.btn-action-edit').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const tenant = this.tenants.find(t => t.id === id);
                if (tenant) this.showEditTenantModal(tenant);
            };
        });

        // RELATÓRIO / VISUALIZAR
        document.querySelectorAll('.btn-action-view').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const tenant = this.tenants.find(t => t.id === id);
                if (tenant) this.showTenantDetailsModal(tenant);
            };
        });

        // EXCLUIR UNIDADE
        document.querySelectorAll('.btn-action-delete').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const tenant = this.tenants.find(t => t.id === id);
                if (tenant) this.showDeleteTenantModal(tenant);
            };
        });
    }

    async updateTenantFeatures(tenantId, features) {
        try {
            await TenantRepository.update(tenantId, { enabledFeatures: features });
            window.toastService?.success('Recursos atualizados.');
            await this.loadData();
            this.render();
        } catch (e) {
            alert('Falha na atualização: ' + e.message);
        }
    }

    showDeleteTenantModal(tenant) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[300] flex items-center justify-center animate-fade-in p-4';

        const modal = document.createElement('div');
        modal.className = 'bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border-4 border-rose-500';

        modal.innerHTML = `
            <div class="p-10 text-center">
                <div class="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-200">
                    <i data-feather="alert-triangle" class="w-10 h-10"></i>
                </div>
                
                <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Atenção Crítica!</h3>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Você está prestes a excluir a unidade:</p>
                
                <div class="bg-rose-50 p-4 rounded-2xl mb-8 border border-rose-100">
                    <span class="text-lg font-black text-rose-700 uppercase">${tenant.name}</span>
                    <p class="text-[10px] text-rose-400 font-bold mt-1 uppercase tracking-tighter">ESTA AÇÃO É IRREVERSÍVEL E RESULTARÁ EM PERDA TOTAL DE DADOS DA LOJA.</p>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Confirme a Senha Master</label>
                        <input type="password" id="delete-confirm-password" placeholder="••••••••" class="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-lg font-black text-slate-900 focus:border-rose-500 transition-all outline-none">
                    </div>

                    <div class="flex flex-col gap-3 pt-4">
                        <button id="btn-confirm-delete-final" class="w-full py-5 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-600/30 hover:bg-rose-700 transition-all active:scale-95">
                            Sim, Excluir Definitivamente
                        </button>
                        <button id="btn-cancel-delete" class="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                            Cancelar e Voltar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(modal);
        if (window.feather) window.feather.replace();

        const input = document.getElementById('delete-confirm-password');
        input.focus();

        document.getElementById('btn-cancel-delete').onclick = () => overlay.remove();

        document.getElementById('btn-confirm-delete-final').onclick = async () => {
            const password = input.value;
            if (!password) {
                window.toastService?.error('Informe a senha master.');
                return;
            }

            const isCorrect = await auth.verifyCurrentPassword(password);
            if (!isCorrect) {
                window.toastService?.error('Senha Master incorreta.');
                return;
            }

            try {
                const btn = document.getElementById('btn-confirm-delete-final');
                btn.disabled = true;
                btn.innerHTML = 'Excluindo...';

                await TenantRepository.delete(tenant.id);

                window.toastService?.success('Unidade excluída com sucesso.');
                overlay.remove();
                await this.loadData();
                this.render();
            } catch (error) {
                console.error('Erro ao excluir tenant:', error);
                window.toastService?.error('Erro ao excluir unidade.');
                btn.disabled = false;
                btn.innerHTML = 'Sim, Excluir Definitivamente';
            }
        };
    }


    showEditTenantModal(tenant) {
        const allFeatures = [
            { id: 'dashboard', label: 'Dashboard Principal', desc: 'Resumo geral e indicadores.' },
            { id: 'sales', label: 'Vendas (PDV)', desc: 'Terminal de vendas e caixa.' },
            { id: 'checklist', label: 'Ordens de Serviço', desc: 'Assistência técnica completa.' },
            { id: 'clients', label: 'Clientes / CRM', desc: 'Gestão de base e histórico.' },
            { id: 'storefront', label: 'Produtos e Estoque', desc: 'Controle de SKU e inventário.' },
            { id: 'financial', label: 'Financeiro Pro', desc: 'Fluxo de caixa e DRE.' },
            { id: 'warranty', label: 'Garantias & Termos', desc: 'Geração de documentos legais.' },
            { id: 'vision', label: 'Serviços Vision', desc: 'Checklist com evidências fotográficas.' },
            { id: 'whatsapp', label: 'WhatsApp & Bot', desc: 'Integração e automação de chat.' },
            { id: 'copilot', label: 'IA Copilot', desc: 'Assistente inteligente GPT.' }
        ];

        const currentFeatures = tenant.enabledFeatures || [];

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center animate-fade-in p-4 lg:p-10';

        const modal = document.createElement('div');
        modal.className = 'bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]';

        modal.innerHTML = `
            <div class="px-10 py-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center text-slate-800 shrink-0">
                <div>
                   <h3 class="text-xl font-black uppercase tracking-tight">Editar Unidade & Recursos</h3>
                   <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${tenant.name} (${tenant.id})</p>
                </div>
                <button class="modal-close text-slate-400 hover:text-slate-800 transition-colors"><i data-feather="x"></i></button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-10 lg:p-14 custom-scrollbar">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    
                    <div class="col-span-2">
                        <h4 class="text-[10px] font-black text-unitech-primary uppercase tracking-[0.3em] mb-2 border-b border-slate-100 pb-2">01. Dados Cadastrais & Plano</h4>
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Plano de Serviço</label>
                        <select id="edit-store-plan" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                            <option value="basic" ${tenant.plan === 'basic' ? 'selected' : ''}>BASIC (R$ 99/mês)</option>
                            <option value="pro" ${tenant.plan === 'pro' ? 'selected' : ''}>PROFESSIONAL (R$ 199/mês)</option>
                            <option value="enterprise" ${tenant.plan === 'enterprise' ? 'selected' : ''}>ENTERPRISE (R$ 499/mês)</option>
                            <option value="trial" ${tenant.plan === 'trial' ? 'selected' : ''}>TRIAL (Degustação)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dia de Vencimento</label>
                        <input type="number" id="edit-store-billing" value="${tenant.billingDay || 10}" min="1" max="28" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Unidade</label>
                        <input type="text" id="edit-store-name" value="${tenant.name}" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Documento (CPF/CNPJ)</label>
                        <input type="text" id="edit-store-doc" value="${tenant.document || ''}" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inscrição Estadual</label>
                        <input type="text" id="edit-store-ie" value="${tenant.stateRegistration || ''}" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                        <input type="text" id="edit-store-phone" value="${tenant.phone || ''}" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                    </div>

                    <div class="form-group col-span-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Endereço Completo</label>
                        <input type="text" id="edit-store-street" value="${tenant.addressStreet || ''}" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary transition-all">
                    </div>

                    <!-- RECURSOS -->
                    <div class="col-span-2 mt-8">
                        <h4 class="text-[10px] font-black text-unitech-primary uppercase tracking-[0.3em] mb-4 border-b border-slate-100 pb-2">02. Seleção de Recursos (SaaS Permissions)</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${allFeatures.map(f => `
                                <label class="flex items-start gap-4 p-5 rounded-[2rem] border-2 cursor-pointer transition-all hover:bg-slate-50 ${currentFeatures.includes(f.id) ? 'border-unitech-primary bg-unitech-primary/5 shadow-inner' : 'border-slate-100'}" for="edit-feat-${f.id}">
                                    <div class="pt-1">
                                        <input type="checkbox" id="edit-feat-${f.id}" class="feature-checkbox accent-unitech-primary w-5 h-5" value="${f.id}" ${currentFeatures.includes(f.id) ? 'checked' : ''}>
                                    </div>
                                    <div class="flex-1">
                                        <h4 class="text-xs font-black text-slate-800 uppercase tracking-tight">${f.label}</h4>
                                        <p class="text-[10px] text-slate-400 font-medium leading-tight mt-1">${f.desc}</p>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button class="modal-close px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-all">Cancelar</button>
                <button id="update-tenant-btn" class="px-10 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                    Salvar Alterações
                </button>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(modal);
        if (window.feather) window.feather.replace();

        const closeModal = () => {
            overlay.classList.add('animate-fade-out');
            modal.classList.add('animate-scale-out');
            setTimeout(() => overlay.remove(), 300);
        };

        modal.querySelectorAll('.modal-close').forEach(b => b.onclick = closeModal);

        // Feature selection coloring
        modal.querySelectorAll('.feature-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                const label = e.target.closest('label');
                if (e.target.checked) {
                    label.classList.add('border-unitech-primary', 'bg-unitech-primary/5', 'shadow-inner');
                    label.classList.remove('border-slate-100');
                } else {
                    label.classList.remove('border-unitech-primary', 'bg-unitech-primary/5', 'shadow-inner');
                    label.classList.add('border-slate-100');
                }
            };
        });

        modal.querySelector('#update-tenant-btn').onclick = async () => {
            const data = {
                name: modal.querySelector('#edit-store-name').value.trim(),
                plan: modal.querySelector('#edit-store-plan').value,
                billingDay: parseInt(modal.querySelector('#edit-store-billing').value),
                document: modal.querySelector('#edit-store-doc').value.trim(),
                stateRegistration: modal.querySelector('#edit-store-ie').value.trim(),
                addressStreet: modal.querySelector('#edit-store-street').value.trim(),
                phone: modal.querySelector('#edit-store-phone').value.trim(),
                enabledFeatures: Array.from(modal.querySelectorAll('.feature-checkbox:checked')).map(cb => cb.value),
                storageLimitGB: modal.querySelector('#edit-store-plan').value === 'enterprise' ? 50 : (modal.querySelector('#edit-store-plan').value === 'pro' ? 10 : 5),
            };

            try {
                const btn = modal.querySelector('#update-tenant-btn');
                btn.disabled = true;
                btn.innerHTML = 'SINCRONIZANDO...';

                await TenantRepository.update(tenant.id, data);
                window.toastService?.success('Dados da unidade atualizados!');
                await this.loadData();
                this.render();
                closeModal();
            } catch (e) {
                console.error(e);
                window.toastService?.error('Falha ao atualizar unidade.');
                btn.disabled = false;
                btn.innerHTML = 'Salvar Alterações';
            }
        };
    }

    showTenantDetailsModal(tenant) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center animate-fade-in p-4 print:hidden';

        const modal = document.createElement('div');
        modal.className = 'bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]';

        modal.innerHTML = `
            <!-- Modal Header / Controls -->
            <div class="px-12 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div class="flex items-center gap-4">
                    <div class="w-2 h-10 bg-unitech-primary rounded-full"></div>
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tighter">Relatório Estrutural</h3>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visão Master da Unidade: ${tenant.id}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button id="btn-print-report" class="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                        <i data-feather="printer" class="w-4 h-4"></i> Imprimir Relatório
                    </button>
                    <button class="modal-close p-3 text-slate-300 hover:text-slate-800 transition-colors"><i data-feather="x"></i></button>
                </div>
            </div>

            <!-- Report Content -->
            <div id="printable-report" class="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white">
                <div class="flex flex-col gap-12">
                    
                    <!-- Header Report (Visual) -->
                    <div class="flex justify-between items-start border-b-2 border-slate-900 pb-8">
                        <div>
                            <h1 class="text-4xl font-black text-slate-900 uppercase leading-none">${tenant.name}</h1>
                            <p class="text-sm font-bold text-slate-500 mt-2 uppercase tracking-wide">Identificador único (SLUG): <span class="bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-black">${tenant.id}</span></p>
                        </div>
                        <div class="text-right">
                            <span class="px-4 py-2 bg-unitech-primary text-white rounded-xl text-xs font-black uppercase tracking-widest">Ativado em: ${tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '---'}</span>
                            <p class="text-[10px] font-bold text-slate-400 mt-3 font-mono uppercase">Relatório Gerado por: ${auth.getUser().name} (Master)</p>
                        </div>
                    </div>

                    <!-- Grid Dados -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div class="space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-2">
                                <i data-feather="file-text" class="w-3 h-3 text-unitech-primary"></i> Identificação e Faturamento
                            </h4>
                            <div class="space-y-4">
                                <div class="flex flex-col">
                                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Documento (CPF/CNPJ)</span>
                                    <span class="text-sm font-black text-slate-800">${tenant.document || 'NÃO INFORMADO'}</span>
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inscrição Estadual</span>
                                    <span class="text-sm font-black text-slate-800">${tenant.stateRegistration || 'ISENTO'}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-4 pt-2">
                                    <div class="bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
                                        <p class="text-[9px] font-bold text-slate-400 uppercase mb-1">Dia Faturamento</p>
                                        <p class="text-xl font-black text-slate-900">DIA ${tenant.billingDay || 10}</p>
                                    </div>
                                    <div class="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 text-center">
                                        <p class="text-[9px] font-bold text-slate-400 uppercase mb-1">Plano</p>
                                        <p class="text-xl font-black text-slate-900 uppercase text-xs">${tenant.plan}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-2">
                                <i data-feather="map-pin" class="w-3 h-3 text-unitech-primary"></i> Localização e Contato
                            </h4>
                            <div class="space-y-4">
                                <div class="flex flex-col">
                                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Endereço Operacional</span>
                                    <span class="text-sm font-black text-slate-800">${tenant.addressStreet || 'ENDEREÇO NÃO CADASTRADO'}</span>
                                    <span class="text-[11px] font-bold text-slate-500 uppercase">${tenant.addressDistrict || ''} ${tenant.city || ''} - ${tenant.state || ''}</span>
                                </div>
                                <div class="flex flex-col pt-2">
                                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Telefone de Suporte</span>
                                    <span class="text-sm font-black text-slate-800">${tenant.phone || 'SEM CONTATO'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recursos Ativos -->
                    <div class="mt-8">
                         <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
                            <i data-feather="box" class="w-3 h-3 text-unitech-primary"></i> Recursos Digitais Ativos
                        </h4>
                        <div class="flex flex-wrap gap-2">
                            ${(tenant.enabledFeatures || []).map(f => `
                                <span class="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-tighter">${f}</span>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex justify-between items-center pt-10 border-t border-slate-100 opacity-50 border-dashed">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400 text-[10px]">U</div>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">UniTech System • Master Portal Report</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(modal);
        if (window.feather) window.feather.replace();

        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        modal.querySelector('.modal-close').onclick = () => overlay.remove();

        document.getElementById('btn-print-report').onclick = () => {
            const reportContent = document.getElementById('printable-report').outerHTML;
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow.document.write('<html><head><title>Relatório Master</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write('</head><body class="p-10">');
            printWindow.document.write(reportContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 1000);
        };
    }

    showNewTenantModal() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[300] flex items-center justify-center animate-fade-in p-4 lg:p-10';

        const modal = document.createElement('div');
        modal.className = 'bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col md:flex-row';

        modal.innerHTML = `
            <!-- Botão Fechar (Cruz) -->
            <button class="modal-close absolute right-6 top-6 w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-all z-50">
                <i data-feather="x" class="w-5 h-5"></i>
            </button>

            <!-- Sidebar Informativa -->
            <div class="w-full md:w-80 bg-slate-900 p-10 text-white flex flex-col justify-between shrink-0">
                <div>
                    <div class="w-12 h-12 bg-unitech-primary rounded-2xl flex items-center justify-center mb-6">
                        <i data-feather="box" class="w-6 h-6"></i>
                    </div>
                    <h3 class="text-2xl font-black uppercase tracking-tight leading-none mb-4">Criação de<br/>Nova Unidade</h3>
                    <p class="text-xs text-slate-400 font-medium leading-relaxed">Configuração de infraestrutura isolada e registro legal da unidade de negócio.</p>
                    
                    <ul class="mt-8 space-y-4">
                        <li class="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Painel Administrativo
                        </li>
                        <li class="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Banco de Dados Isolado
                        </li>
                        <li class="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> IA Copilot Ativada
                        </li>
                    </ul>
                </div>
                
                <div class="pt-8 border-t border-white/5">
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Protocolo de Segurança</p>
                    <p class="text-[9px] text-slate-600 mt-1 italic">Toda criação gera um log de auditoria reversível.</p>
                </div>
            </div>

            <!-- Formulário -->
            <div class="flex-1 bg-white p-10 lg:p-14 overflow-y-auto max-h-[90vh] custom-scrollbar">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    
                    <div class="col-span-2">
                        <h4 class="text-[10px] font-black text-unitech-primary uppercase tracking-[0.3em] mb-2 border-b border-slate-100 pb-2">01. Configuração de Conta & Plano</h4>
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Plano de Serviço</label>
                        <select id="store-plan" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                            <option value="basic">BASIC (R$ 99/mês)</option>
                            <option value="pro" selected>PROFESSIONAL (R$ 199/mês)</option>
                            <option value="enterprise">ENTERPRISE (R$ 499/mês)</option>
                            <option value="trial">TRIAL (Degustação)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dia de Vencimento</label>
                        <input type="number" id="store-billing" value="10" min="1" max="28" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Domínio / ID Único</label>
                        <input type="text" id="store-id" placeholder="ex: mariacell" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all uppercase">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Loja / Unidade</label>
                        <input type="text" id="store-name" placeholder="ex: Maria Cell Matriz" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <!-- 02. Identidade Legal -->
                    <div class="col-span-2 mt-6">
                        <h4 class="text-[10px] font-black text-unitech-primary uppercase tracking-[0.3em] mb-2">02. Identidade Legal & Contato</h4>
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CPF / CNPJ da Unidade</label>
                        <input type="text" id="store-doc" placeholder="00.000.000/0000-00" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inscrição Estadual (IE)</label>
                        <input type="text" id="store-ie" placeholder="Isento ou Número" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Logradouro / Endereço</label>
                        <input type="text" id="store-street" placeholder="Rua, Av, etc" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bairro</label>
                        <input type="text" id="store-district" placeholder="ex: Centro" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
                        <input type="text" id="store-phone" placeholder="(00) 00000-0000" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cidade</label>
                        <input type="text" id="store-city" placeholder="ex: São Paulo" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado (UF)</label>
                        <input type="text" id="store-state" placeholder="ex: SP" maxlength="2" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all uppercase">
                    </div>

                    <!-- 03. Credenciais -->
                    <div class="col-span-2 mt-6">
                        <h4 class="text-[10px] font-black text-unitech-primary uppercase tracking-[0.3em] mb-2">03. Credenciais do Proprietário / Gestor</h4>
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome Completo</label>
                        <input type="text" id="admin-name" placeholder="ex: João Silva Santos" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-mail de Acesso</label>
                        <input type="email" id="admin-email" placeholder="admin@loja.com" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                    </div>

                    <div class="form-group col-span-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Senha Provisória</label>
                        <div class="relative">
                            <input type="password" id="admin-password" placeholder="••••••••" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:border-unitech-primary focus:ring-4 focus:ring-unitech-primary/5 transition-all">
                             <button type="button" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600" onclick="const p = document.getElementById('admin-password'); p.type = p.type === 'password' ? 'text' : 'password';">
                                <i data-feather="eye" class="w-4 h-4"></i>
                             </button>
                        </div>
                    </div>
                </div>

                <div class="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <button class="modal-close text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">Cancelar Operação</button>
                    <button id="finalize-creation-btn" class="w-full md:w-auto px-12 py-5 bg-unitech-primary text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-unitech-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <i data-feather="check-circle" class="w-4 h-4"></i>
                        Confirmar e Ativar Loja
                    </button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        if (window.feather) window.feather.replace();

        const closeModal = () => {
            overlay.classList.add('animate-fade-out');
            modal.classList.add('animate-scale-out');
            setTimeout(() => overlay.remove(), 300);
        };

        modal.querySelectorAll('.modal-close').forEach(b => b.onclick = closeModal);

        const idInput = modal.querySelector('#store-id');
        const docInput = modal.querySelector('#store-doc');
        const nameInput = modal.querySelector('#store-name');
        const streetInput = modal.querySelector('#store-street');
        const districtInput = modal.querySelector('#store-district');
        const phoneInput = modal.querySelector('#store-phone');
        const cityInput = modal.querySelector('#store-city');
        const stateInput = modal.querySelector('#store-state');

        idInput.oninput = (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        };

        // --- Auto-fill Logic ---
        const lookupDocument = async (docValue) => {
            const cleanDoc = docValue.replace(/\D/g, '');

            // 1. Check if it's a CNPJ (14 digits) -> Try BrasilAPI
            if (cleanDoc.length === 14) {
                try {
                    window.toastService?.info('Consultando CNPJ no banco de dados federal...');
                    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanDoc}`);
                    if (resp.ok) {
                        const info = await resp.json();
                        if (nameInput) nameInput.value = info.razao_social || info.nome_fantasia || '';
                        if (streetInput) streetInput.value = `${info.logradouro}${info.numero ? ', ' + info.numero : ''}`;
                        if (districtInput) districtInput.value = info.bairro || '';
                        if (cityInput) cityInput.value = info.municipio || '';
                        if (stateInput) stateInput.value = info.uf || '';
                        if (phoneInput) phoneInput.value = info.ddd_telefone_1 || '';

                        // Try to generate a slug if id is empty
                        if (idInput && !idInput.value) {
                            const slug = (info.nome_fantasia || info.razao_social || '').toLowerCase()
                                .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                            idInput.value = slug.substring(0, 15);
                        }

                        window.toastService?.success('Dados da empresa importados!');
                    }
                } catch (e) {
                    console.error('CNPJ Lookup failed', e);
                }
            }
            // 2. Check Local Database (CPF or CNPJ already registered)
            else if (cleanDoc.length === 11 || cleanDoc.length === 14) {
                const existingClients = storage.getClients() || [];
                const matched = existingClients.find(c => (c.document || '').replace(/\D/g, '') === cleanDoc);
                if (matched) {
                    if (confirm(`Encontramos o registro de "${matched.name}". Deseja importar os dados?`)) {
                        if (nameInput) nameInput.value = matched.name || '';
                        if (phoneInput) phoneInput.value = matched.phone || '';
                        if (cityInput) cityInput.value = matched.city || '';
                        if (stateInput) stateInput.value = matched.state || '';
                        // Address fields are usually nested or in different keys in Clients
                        if (streetInput && matched.address) streetInput.value = matched.address;
                        window.toastService?.info('Dados recuperados do banco local.');
                    }
                }
            }
        };

        if (docInput) {
            docInput.oninput = (e) => {
                const val = e.target.value;
                const clean = val.replace(/\D/g, '');
                if (clean.length <= 11) {
                    e.target.value = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                } else {
                    e.target.value = clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                }
            };
            docInput.onblur = (e) => lookupDocument(e.target.value);
        }

        if (phoneInput) {
            phoneInput.oninput = (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 11) v = v.substring(0, 11);
                if (v.length > 10) {
                    e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
                } else if (v.length > 5) {
                    e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
                } else if (v.length > 2) {
                    e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
                } else if (v.length > 0) {
                    e.target.value = `(${v}`;
                }
            };
        }

        const createBtn = modal.querySelector('#finalize-creation-btn');
        createBtn.onclick = async () => {
            const data = {
                id: idInput.value.trim(),
                name: nameInput.value.trim(),
                plan: modal.querySelector('#store-plan').value,
                billingDay: parseInt(modal.querySelector('#store-billing').value),
                document: docInput.value.trim(),
                stateRegistration: modal.querySelector('#store-ie').value.trim(),
                addressStreet: streetInput.value.trim(),
                addressDistrict: districtInput.value.trim(),
                phone: phoneInput.value.trim(),
                city: cityInput.value.trim(),
                state: stateInput.value.trim(),
                adminName: modal.querySelector('#admin-name').value.trim(),
                adminEmail: modal.querySelector('#admin-email').value.trim(),
                adminPass: modal.querySelector('#admin-password').value
            };

            // Validação Básica UI
            if (!data.id || !data.name || !data.adminEmail || !data.adminPass) {
                window.toastService?.error('Preencha os campos essenciais: ID, Nome, Email e Senha.');
                return;
            }

            if (this.tenants.find(t => t.id === data.id)) {
                window.toastService?.error('ID já existe no ecossistema.');
                return;
            }

            try {
                createBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i> CRIANDO INFRAESTRUTURA...';
                createBtn.disabled = true;
                if (window.feather) window.feather.replace();

                // 1. Criar Registro de Tenant
                await TenantRepository.add({
                    id: data.id,
                    name: data.name,
                    status: 'active',
                    plan: data.plan,
                    ownerName: data.adminName,
                    document: data.document,
                    stateRegistration: data.stateRegistration,
                    addressStreet: data.addressStreet,
                    addressDistrict: data.addressDistrict,
                    phone: data.phone,
                    city: data.city,
                    state: data.state,
                    storageLimitGB: data.plan === 'enterprise' ? 50 : (data.plan === 'pro' ? 10 : 5),
                    currentUsageBytes: 0,
                    billingDay: data.billingDay,
                    createdAt: new Date().toISOString(),
                    enabledFeatures: ['dashboard', 'sales', 'clients', 'storefront', 'checklist', 'copilot']
                });

                // 2. Criar Usuário Admin Raiz
                await storage.addUser({
                    id: `usr-${Date.now()}`,
                    tenantId: data.id,
                    name: data.adminName || `Admin ${data.name}`,
                    email: data.adminEmail.toLowerCase(),
                    password: data.adminPass,
                    role: 'admin',
                    status: 'active',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.adminName || data.name)}&background=000&color=fff&bold=true`
                });

                window.toastService?.success('Nova Loja Ativada com Sucesso!');
                await this.loadData();
                this.render();
                closeModal();
            } catch (e) {
                console.error('Master Creation Error:', e);
                window.toastService?.error(`Erro Crítico: ${e.message}`);
                createBtn.innerHTML = '<i data-feather="check-circle" class="w-4 h-4"></i> Confirmar e Ativar Loja';
                createBtn.disabled = false;
                if (window.feather) window.feather.replace();
            }
        };
    }

}
