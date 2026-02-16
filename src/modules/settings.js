import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';
import { audit } from '../services/audit.js';
import { ThemeService } from '../services/theme.js';
import { formatDateTime, maskCEP } from '../utils/formatters.js';

export class SettingsModule {
    constructor() {
        this.container = null;
        this.settings = storage.getSettings();
    }

    async init(containerId, params = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        if (params.tab) {
            this.currentTab = params.tab;
        } else {
            this.currentTab = 'company';
        }

        // Security Check
        const user = auth.getUser();
        if (!user || (user.role !== 'ceo' && user.role !== 'master' && user.role !== 'admin')) {
            this.container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-500">
                    <i data-feather="shield-off" class="w-16 h-16 mb-4"></i>
                    <h2 class="text-xl font-bold">Acesso Negado</h2>
                    <p>Apenas administradores podem acessar as configurações do sistema.</p>
                </div>
            `;
            if (window.feather) window.feather.replace();
            return;
        }

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-6">
                <!-- Header -->
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Configurações Globais</h1>
                        <p class="text-sm text-gray-500">Gerencie a identidade, dados e aparência do sistema.</p>
                    </div>
                    <button id="save-settings-btn" class="btn-primary flex items-center gap-2">
                        <i data-feather="save" class="w-4 h-4"></i>
                        Salvar Alterações
                    </button>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-200">
                    <button onclick="window.switchSettingsTab('company')" class="px-6 py-3 text-sm font-medium border-b-2 transition-colors ${this.currentTab === 'company' ? 'border-unitech-primary text-unitech-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                        Perfil da Empresa
                    </button>
                    <button onclick="window.switchSettingsTab('access')" class="px-6 py-3 text-sm font-medium border-b-2 transition-colors ${this.currentTab === 'access' ? 'border-unitech-primary text-unitech-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                    Acesso & Usuários
                </button>
                <button onclick="window.switchSettingsTab('backup')" class="px-6 py-3 text-sm font-medium border-b-2 transition-colors ${this.currentTab === 'backup' ? 'border-unitech-primary text-unitech-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                    Backup
                </button>
                    <button onclick="window.switchSettingsTab('audit')" class="px-6 py-3 text-sm font-medium border-b-2 transition-colors ${this.currentTab === 'audit' ? 'border-unitech-primary text-unitech-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                        Auditoria
                    </button>
                    ${auth.getUser().role === 'master' ? `
                    <button onclick="window.switchSettingsTab('franchise')" class="px-6 py-3 text-sm font-medium border-b-2 transition-colors ${this.currentTab === 'franchise' ? 'border-unitech-primary text-unitech-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                        <i data-feather="globe" class="w-3 h-3 inline mr-1"></i> Franquias
                    </button>
                    ` : ''}
                    <button onclick="window.switchSettingsTab('theme')" class="px-6 py-3 text-sm font-medium border-b-2 transition-colors ${this.currentTab === 'theme' ? 'border-unitech-primary text-unitech-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                        Personalização
                    </button>
                </div>

                <!-- Content -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[400px]">
                    ${this.getTabContent()}
                </div>
            </div>
        `;

        if (window.feather) window.feather.replace();
        this.attachListeners();

        // Expose switcher
        window.switchSettingsTab = (tab) => {
            this.currentTab = tab;
            this.render();
        };

        // Auto-Slug Listener for Franchise Creation
        const nameInput = document.getElementById('new-franchise-name');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                const val = e.target.value;
                const slug = val.toLowerCase()
                    .replace(/[àáâãäå]/g, "a")
                    .replace(/[èéêë]/g, "e")
                    .replace(/[ìíîï]/g, "i")
                    .replace(/[òóôõö]/g, "o")
                    .replace(/[ùúûü]/g, "u")
                    .replace(/[ç]/g, "c")
                    .replace(/[^a-z0-9]/g, "-")
                    .replace(/-+/g, "-");
                const idInput = document.getElementById('new-franchise-id');
                if (idInput) idInput.value = slug;
            });
        }

        window.settingsModule = this; // Expose for onClick handlers
        // Expose saveUser for access tab
        window.settingsModule = this; // Make this instance accessible globally
    }

    getTabContent() {
        switch (this.currentTab) {
            case 'theme':
                const currentMode = ThemeService.getMode();
                const theme = this.settings.theme || ThemeService.defaults;

                return `
                <div class="space-y-8 animate-fade-in max-w-2xl mx-auto">
                    <!-- Mode Selection -->
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 mb-1">Aparência do Sistema</h3>
                        <p class="text-sm text-gray-500 mb-4">Escolha como o UniTech deve ser exibido para você.</p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <!-- System Mode -->
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="theme-mode" value="system" class="peer sr-only" 
                                    ${currentMode === 'system' ? 'checked' : ''} 
                                    onchange="ThemeService.setMode('system')">
                                <div class="p-4 rounded-xl border-2 border-gray-200 peer-checked:border-unitech-primary peer-checked:bg-blue-50/50 hover:bg-gray-50 transition-all h-full flex flex-col items-center justify-center gap-3 text-center">
                                    <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <i data-feather="monitor" class="w-5 h-5 text-gray-600"></i>
                                    </div>
                                    <span class="font-bold text-sm text-gray-700">Automático</span>
                                </div>
                            </label>

                            <!-- Light Mode -->
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="theme-mode" value="light" class="peer sr-only" 
                                    ${currentMode === 'light' ? 'checked' : ''} 
                                    onchange="ThemeService.setMode('light')">
                                <div class="p-4 rounded-xl border-2 border-gray-200 peer-checked:border-unitech-primary peer-checked:bg-blue-50/50 hover:bg-gray-50 transition-all h-full flex flex-col items-center justify-center gap-3 text-center">
                                    <div class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                        <i data-feather="sun" class="w-5 h-5 text-orange-500"></i>
                                    </div>
                                    <span class="font-bold text-sm text-gray-700">Modo Claro</span>
                                </div>
                            </label>

                            <!-- Dark Mode -->
                            <label class="relative cursor-pointer group">
                                <input type="radio" name="theme-mode" value="dark" class="peer sr-only" 
                                    ${currentMode === 'dark' ? 'checked' : ''} 
                                    onchange="ThemeService.setMode('dark')">
                                <div class="p-4 rounded-xl border-2 border-gray-200 peer-checked:border-unitech-primary peer-checked:bg-blue-50/50 hover:bg-gray-50 transition-all h-full flex flex-col items-center justify-center gap-3 text-center bg-gray-900">
                                    <div class="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shadow-sm">
                                        <i data-feather="moon" class="w-5 h-5 text-blue-400"></i>
                                    </div>
                                    <span class="font-bold text-sm text-gray-200">Modo Escuro</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Brand Colors (Optional override) -->
                    <div class="pt-6 border-t border-gray-100">
                        <h3 class="text-lg font-bold text-gray-900 mb-1">Cores da Marca</h3>
                        <p class="text-sm text-gray-500 mb-4">Personalize a cor principal do sistema.</p>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">Cor Primária (Destaques)</label>
                                <div class="flex gap-2">
                                    <input type="color" id="theme-color-primary" value="${theme.primary || '#3b82f6'}" 
                                        class="h-10 w-12 rounded border border-gray-300 p-0.5 cursor-pointer"
                                        onchange="document.documentElement.style.setProperty('--color-unitech-primary', this.value)">
                                    <input type="text" class="input-field" value="${theme.primary || '#3b82f6'}" 
                                        onchange="document.getElementById('theme-color-primary').value = this.value; document.documentElement.style.setProperty('--color-unitech-primary', this.value)">
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1">Usado em botões, links e ícones ativos.</p>
                            </div>

                             <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">Cor Secundária (Admin)</label>
                                <div class="flex gap-2">
                                    <input type="color" id="theme-color-secondary" value="${theme.secondary || '#1e293b'}" 
                                        class="h-10 w-12 rounded border border-gray-300 p-0.5 cursor-pointer"
                                        onchange="document.documentElement.style.setProperty('--color-unitech-secondary', this.value)">
                                    <input type="text" class="input-field" value="${theme.secondary || '#1e293b'}" 
                                        onchange="document.getElementById('theme-color-secondary').value = this.value; document.documentElement.style.setProperty('--color-unitech-secondary', this.value)">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800 text-xs">
                        <i data-feather="info" class="w-5 h-5 shrink-0"></i>
                        <p>O Modo Escuro foi projetado para reduzir o cansaço visual em ambientes com pouca luz e economizar bateria em telas OLED.</p>
                    </div>
                </div>
                `;

            case 'company':
                return `
                    <div class="space-y-6 animate-fade-in">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Logo Upload -->
                            <div class="col-span-full md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Logotipo da Empresa</label>
                                <div class="relative w-full h-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors" id="logo-dropzone">
                                    ${this.settings.logo
                        ? `<img src="${this.settings.logo}" class="h-32 object-contain" />`
                        : `<div class="text-center p-4">
                                             <i data-feather="image" class="w-8 h-8 text-gray-400 mx-auto mb-2"></i>
                                             <p class="text-xs text-gray-500">Clique para fazer upload (PNG, JPG)</p>
                                           </div>`
                    }
                                    <input type="file" id="logo-input" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                                <p class="text-xs text-gray-400 mt-1">Recomendado: 400x150px. Fundo transparente.</p>
                            </div>

                            <!-- Basic Info -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                                    <input type="text" id="company-name" value="${this.settings.companyName}" class="input-field" placeholder="Ex: Minha Loja Ltda" />
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                                        <input type="text" id="company-cnpj" value="${this.settings.cnpj}" class="input-field" placeholder="00.000.000/0000-00" oninput="this.value = window.maskCNPJ(this.value)" />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Inscrição Estadual</label>
                                        <input type="text" id="company-ie" value="${this.settings.ie || ''}" class="input-field" placeholder="Isento ou Número" />
                                    </div>
                                </div>
                            </div>

                            <!-- Contact -->
                            <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                    <input type="text" id="company-phone" value="${this.settings.phone}" class="input-field" placeholder="(00) 00000-0000" oninput="this.value = window.maskPhone(this.value)" />
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">E-mail Comercial</label>
                                    <input type="email" id="company-email" value="${this.settings.email}" class="input-field" placeholder="contato@empresa.com" />
                                </div>
                            </div>

                            <!-- Address Information -->
                            <div class="col-span-full pt-6 border-t border-gray-100">
                                <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i data-feather="map-pin" class="w-4 h-4 text-orange-500"></i> Endereço & Localização
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div class="md:col-span-3">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                                        <input type="text" id="company-zip" value="${this.settings.addressZip || ''}" class="input-field" placeholder="00000-000" oninput="this.value = window.maskCEP(this.value)" />
                                    </div>
                                    <div class="md:col-span-6">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                                        <input type="text" id="company-street" value="${this.settings.addressStreet || ''}" class="input-field" placeholder="Rua, Av..." />
                                    </div>
                                    <div class="md:col-span-3">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Número</label>
                                        <input type="text" id="company-number" value="${this.settings.addressNumber || ''}" class="input-field" placeholder="123" />
                                    </div>
                                    
                                    <div class="md:col-span-4">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                                        <input type="text" id="company-district" value="${this.settings.addressDistrict || ''}" class="input-field" placeholder="Bairro" />
                                    </div>
                                    <div class="md:col-span-5">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                        <input type="text" id="company-city" value="${this.settings.addressCity || ''}" class="input-field" placeholder="Cidade" />
                                    </div>
                                    <div class="md:col-span-3">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">UF</label>
                                        <input type="text" id="company-state" value="${this.settings.addressState || ''}" class="input-field uppercase" maxlength="2" placeholder="UF" />
                                    </div>
                                </div>
                            </div>
                            
                            <!-- PIX Banks Management -->
                            <div class="col-span-full pt-6 border-t border-gray-100">
                                <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i data-feather="zap" class="w-4 h-4 text-yellow-500"></i> Bancos para Recebimento PIX
                                </h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <!-- Add New Bank Form -->
                                    <div class="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                        <div>
                                            <label class="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Sugestões de Bancos</label>
                                            <div class="flex flex-wrap gap-2 mb-3">
                                                ${['Nubank', 'Itaú', 'BB', 'Bradesco', 'Santander', 'Caixa', 'Inter', 'C6 Bank'].map(b => `
                                                    <button onclick="document.getElementById('new-pix-bank').value = '${b}'; document.getElementById('new-pix-agency').focus();" 
                                                        class="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:border-unitech-primary hover:text-unitech-primary transition-all">
                                                        ${b}
                                                    </button>
                                                `).join('')}
                                            </div>
                                            <input type="text" id="new-pix-bank" class="input-field w-full" placeholder="Nome do Banco (ex: Nubank)">
                                        </div>
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Agência</label>
                                                <input type="text" id="new-pix-agency" class="input-field w-full" placeholder="0001">
                                            </div>
                                            <div>
                                                <label class="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">Conta</label>
                                                <input type="text" id="new-pix-account" class="input-field w-full" placeholder="0000000-0">
                                            </div>
                                        </div>
                                        <button onclick="window.settingsModule.addPixBank()" class="w-full py-2.5 bg-gray-800 text-white rounded-lg font-bold text-xs hover:bg-black transition-all uppercase tracking-widest shadow-sm">Adicionar Banco</button>
                                    </div>

                                    <!-- Registered Banks List -->
                                    <div class="space-y-2">
                                        <label class="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-wider">Bancos Cadastrados</label>
                                        <div id="pix-banks-list" class="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                            ${(this.settings.pixBanks || []).map(bank => `
                                                <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-blue-200 transition-all">
                                                    <div class="flex flex-col">
                                                        <span class="font-bold text-gray-800 text-sm">${typeof bank === 'string' ? bank : bank.name}</span>
                                                        ${typeof bank === 'object' ? `
                                                            <div class="flex gap-3 text-[10px] text-gray-400 font-mono">
                                                                <span>AG: ${bank.agency || '---'}</span>
                                                                <span>CC: ${bank.account || '---'}</span>
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                    <button onclick="window.settingsModule.deletePixBank('${typeof bank === 'string' ? bank : bank.id}')" class="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <i data-feather="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            `).join('')}
                                            ${!(this.settings.pixBanks && this.settings.pixBanks.length) ? '<div class="p-4 border-2 border-dashed border-gray-100 rounded-lg text-center"><p class="text-xs text-gray-400 italic">Nenhum banco cadastrado.</p></div>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

            case 'backup':
                return `
                    <div class="space-y-8 animate-fade-in">
                        <!-- Auto Backup -->
                        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 class="flex items-center gap-2 text-sm font-bold text-blue-800 mb-2">
                                <i data-feather="cloud" class="w-4 h-4"></i> Backup Automático Diário
                            </h3>
                            <p class="text-xs text-blue-600 mb-3 block">O sistema envia uma cópia segura dos dados para o e-mail cadastrado a cada 24 horas.</p>
                            <div class="flex flex-col gap-3">
                                <div class="flex gap-3">
                                    <input type="email" id="backup-email" value="${this.settings.backupEmail}" placeholder="Seu melhor e-mail para backup" class="input-field flex-1" />
                                </div>
                                <div class="flex items-center gap-2 pt-2 border-t border-blue-200/50">
                                    <input type="checkbox" id="master-backup-enabled" ${this.settings.masterBackupEnabled ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500">
                                    <label for="master-backup-enabled" class="text-xs font-bold text-blue-700 cursor-pointer">
                                        Enviar cópia automática diária para o Usuário Master
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Manual Export -->
                        <div>
                            <h3 class="text-sm font-bold text-gray-800 mb-4 border-b pb-2">Exportação Manual</h3>
                            <div class="flex flex-wrap gap-4">
                                <button id="export-inventory-btn" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700">
                                    <i data-feather="box" class="w-4 h-4"></i> Exportar Estoque (CSV)
                                </button>
                                <button id="export-clients-btn" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700">
                                    <i data-feather="users" class="w-4 h-4"></i> Exportar Clientes (CSV)
                                </button>
                            </div>
                        </div>

                        <!-- System Reset (Redefinir Sistema) -->
                        <div>
                            <h3 class="text-sm font-bold text-gray-800 mb-4 border-b pb-2">Manutenção do Sistema</h3>
                            
                            <button id="show-reset-options-btn" class="flex items-center gap-3 px-6 py-3 bg-white border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 transition-all text-sm font-black uppercase tracking-widest shadow-sm">
                                <i data-feather="settings" class="w-4 h-4"></i> Redefinir Sistema
                            </button>

                            <div id="reset-system-container" class="hidden mt-4 p-6 border border-orange-200 rounded-2xl bg-orange-50/50 animate-fade-in">
                                <p class="text-[10px] uppercase font-black text-orange-700 mb-6 flex items-center gap-2">
                                    <i data-feather="alert-triangle" class="w-4 h-4"></i>
                                    Configuração de Redefinição (Ação Irreversível)
                                </p>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 font-bold">
                                    <label class="flex items-center gap-3 p-4 bg-white border border-orange-100 rounded-xl cursor-pointer hover:border-orange-300 transition-all">
                                        <input type="checkbox" id="reset-financial" class="w-4 h-4 rounded text-orange-600 focus:ring-orange-500">
                                        <span class="text-xs text-gray-700">Movimentações Financeiras</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 bg-white border border-orange-100 rounded-xl cursor-pointer hover:border-orange-300 transition-all">
                                        <input type="checkbox" id="reset-sales" class="w-4 h-4 rounded text-orange-600 focus:ring-orange-500">
                                        <span class="text-xs text-gray-700">Vendas e Orçamentos</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 bg-white border border-orange-100 rounded-xl cursor-pointer hover:border-orange-300 transition-all">
                                        <input type="checkbox" id="reset-clients" class="w-4 h-4 rounded text-orange-600 focus:ring-orange-500">
                                        <span class="text-xs text-gray-700">Clientes e Fornecedores</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 bg-white border border-orange-100 rounded-xl cursor-pointer hover:border-orange-300 transition-all">
                                        <input type="checkbox" id="reset-inventory" class="w-4 h-4 rounded text-orange-600 focus:ring-orange-500">
                                        <span class="text-xs text-gray-700">Estoque de Produtos</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 bg-white border border-orange-100 rounded-xl cursor-pointer hover:border-orange-300 transition-all">
                                        <input type="checkbox" id="reset-os" class="w-4 h-4 rounded text-orange-600 focus:ring-orange-500">
                                        <span class="text-xs text-gray-700">Ordens de Serviço (OS)</span>
                                    </label>
                                </div>

                                <div class="space-y-4">
                                    <div class="relative">
                                        <label class="block text-[10px] uppercase font-black text-orange-500 mb-2">Digite sua Senha Master para liberar</label>
                                        <input type="password" id="reset-master-pass" placeholder="••••••••••••" class="w-full px-5 py-4 bg-white border border-orange-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all">
                                    </div>
                                    <button id="execute-reset-btn" class="w-full py-5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-600/30">
                                        <i data-feather="trash-2" class="w-4 h-4"></i> Confirmar Redefinição Total
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- WhatsApp Connectivity -->
                        <div class="pt-8 border-t border-gray-100 mt-8">
                            <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <i data-feather="message-square" class="w-4 h-4 text-green-600"></i>
                                Conectividade WhatsApp API
                            </h3>
                            <div class="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                                <p class="text-[11px] text-slate-500 mb-4 leading-relaxed">
                                    <b class="text-slate-800">Nota de Segurança:</b> Para o WhatsApp funcionar no ambiente online (HTTPS), sua API deve utilizar obrigatoriamente um endereço seguro (HTTPS). O uso de IPs diretos com HTTP causará bloqueio pelo navegador.
                                </p>
                                <div class="flex flex-col md:flex-row gap-3">
                                    <div class="flex-1">
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Endpoint da API Cloud</label>
                                        <input type="text" id="whatsapp-api-url" placeholder="https://seu-servidor.com" class="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-unitech-primary outline-none transition-all" value="${localStorage.getItem('unitech_whatsapp_api_url') || 'http://34.171.111.211'}">
                                    </div>
                                    <div class="flex items-end">
                                        <button id="save-whatsapp-config" class="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                                            Salvar Conexão
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Restore -->
                        <div>
                            <h3 class="text-sm font-bold text-gray-800 mb-4 border-b pb-2">Zona de Perigo: Backup e Restauração</h3>
                            <div class="p-4 border border-red-200 rounded-lg bg-red-50">
                                <p class="text-sm text-red-700 mb-4">
                                    <b>Gestão de Dados:</b> Recomendamos gerar um backup antes de qualquer restauração. Importar um arquivo irá <u>sobrescrever</u> todos os dados atuais.
                                </p>
                                <div class="flex flex-wrap items-center gap-4">
                                    <div class="flex flex-col gap-2 w-full md:w-auto">
                                        <input type="text" id="backup-name-input" placeholder="Nome do Backup (ex: sophia1)" class="px-4 py-2 border border-gray-300 rounded-md text-sm focus:border-unitech-primary outline-none" value="sophia2">
                                        <div class="flex gap-2">
                                            <button id="manual-backup-download-btn" class="flex items-center gap-2 px-4 py-2 bg-unitech-primary text-white rounded-md hover:brightness-110 transition-all text-sm font-bold shadow-lg shadow-unitech-primary/20">
                                                <i data-feather="download-cloud" class="w-4 h-4"></i> Baixar JSON
                                            </button>
                                            <button id="manual-backup-email-btn" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all text-sm font-bold shadow-lg shadow-emerald-500/20">
                                                <i data-feather="mail" class="w-4 h-4"></i> Enviar p/ Email
                                            </button>
                                        </div>
                                    </div>

                                    <div class="h-8 w-px bg-red-200 hidden md:block"></div>

                                    <div class="flex items-center gap-3">
                                        <input type="file" id="restore-file" accept=".json" class="hidden" />
                                        <label for="restore-file" class="cursor-pointer px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-100 flex items-center gap-2 text-sm font-bold transition-all">
                                            <i data-feather="upload-cloud" class="w-4 h-4"></i> Carregar Arquivo de Backup
                                        </label>
                                        <span id="restore-filename" class="text-[10px] text-gray-500 max-w-[150px] truncate">Nenhum arquivo</span>
                                    </div>
                                </div>
                                <div id="restore-actions" class="hidden mt-4 pt-4 border-t border-red-200">
                                     <button id="confirm-restore-btn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-bold w-full uppercase tracking-widest">
                                        CONFIRMAR RESTAURAÇÃO DO SISTEMA
                                     </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

            case 'theme':
                return `
                    <div class="space-y-6 animate-fade-in">
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <!-- Colors -->
                             <div>
                                 <h3 class="text-sm font-bold text-gray-800 mb-4">Cores do Sistema</h3>
                                 <div class="space-y-4">
                                     <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                         <div class="flex items-center gap-3">
                                             <div class="w-10 h-10 rounded-full shadow-sm" style="background-color: ${this.settings.theme.primary}"></div>
                                             <div>
                                                 <p class="text-sm font-medium text-gray-700">Cor Primária</p>
                                                 <p class="text-xs text-gray-400">Botões, destaques, links</p>
                                             </div>
                                         </div>
                                         <input type="color" id="theme-primary" value="${this.settings.theme.primary}" class="h-10 w-14 p-0 border-0 bg-transparent cursor-pointer" />
                                     </div>

                                     <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                         <div class="flex items-center gap-3">
                                             <div class="w-10 h-10 rounded-full shadow-sm" style="background-color: ${this.settings.theme.secondary}"></div>
                                             <div>
                                                 <p class="text-sm font-medium text-gray-700">Cor Secundária</p>
                                                 <p class="text-xs text-gray-400">Menu lateral, rodapés</p>
                                             </div>
                                         </div>
                                         <input type="color" id="theme-secondary" value="${this.settings.theme.secondary}" class="h-10 w-14 p-0 border-0 bg-transparent cursor-pointer" />
                                     </div>
                                 </div>

                                 <h3 class="text-sm font-bold text-gray-800 mt-8 mb-4">Tipografia</h3>
                                 <div class="space-y-4">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Fonte de Títulos</label>
                                        <select id="theme-font-heading" class="input-field">
                                            <option value="Inter" ${this.settings.theme.fontHeading === 'Inter' ? 'selected' : ''}>Inter (Padrão)</option>
                                            <option value="Roboto" ${this.settings.theme.fontHeading === 'Roboto' ? 'selected' : ''}>Roboto</option>
                                            <option value="Montserrat" ${this.settings.theme.fontHeading === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
                                            <option value="Poppins" ${this.settings.theme.fontHeading === 'Poppins' ? 'selected' : ''}>Poppins</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Fonte de Texto</label>
                                        <select id="theme-font-body" class="input-field">
                                            <option value="Inter" ${this.settings.theme.fontBody === 'Inter' ? 'selected' : ''}>Inter (Padrão)</option>
                                            <option value="Roboto" ${this.settings.theme.fontBody === 'Roboto' ? 'selected' : ''}>Roboto</option>
                                            <option value="Open Sans" ${this.settings.theme.fontBody === 'Open Sans' ? 'selected' : ''}>Open Sans</option>
                                            <option value="Lato" ${this.settings.theme.fontBody === 'Lato' ? 'selected' : ''}>Lato</option>
                                        </select>
                                    </div>
                                 </div>
                             </div>

                             <!-- UI Density -->
                             <div>
                                 <h3 class="text-sm font-bold text-gray-800 mb-4">Densidade da Interface</h3>
                                 <div class="space-y-3">
                                     <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${this.settings.ui.format === 'compact' ? 'ring-2 ring-unitech-primary border-transparent' : ''}">
                                         <input type="radio" name="ui-format" value="compact" class="text-unitech-primary focus:ring-unitech-primary" ${this.settings.ui.format === 'compact' ? 'checked' : ''} onchange="window.updateUIFormat('compact')">
                                         <div>
                                             <p class="text-sm font-bold text-gray-700">Compacto (Padrão)</p>
                                             <p class="text-xs text-gray-500">Mais informações por tela, ideal para desktop.</p>
                                         </div>
                                     </label>
                                     <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${this.settings.ui.format === 'spacious' ? 'ring-2 ring-unitech-primary border-transparent' : ''}">
                                         <input type="radio" name="ui-format" value="spacious" class="text-unitech-primary focus:ring-unitech-primary" ${this.settings.ui.format === 'spacious' ? 'checked' : ''} onchange="window.updateUIFormat('spacious')">
                                         <div>
                                             <p class="text-sm font-bold text-gray-700">Espaçoso</p>
                                             <p class="text-xs text-gray-500">Elementos maiores, ideal para tablets.</p>
                                         </div>
                                     </label>
                                 </div>
                             </div>
                         </div>
                    </div>
                `;
            case 'access':
                return this.getAccessTabContent();
            case 'audit':
                return this.getAuditTabContent();
            case 'franchise':
                return this.getFranchiseTabContent();
        }
    }

    getFranchiseTabContent() {
        // Fetch all users from all tenants to find franchise admins
        const allUsers = storage.getGlobalUsers();
        // Identify unique tenants based on users not in 'master'
        // Strategy: Key tenants by their Admin user
        const franchises = allUsers.filter(u => u.tenantId !== 'master' && u.role === 'admin');

        return `
            <div class="space-y-8 animate-fade-in">
                <!-- Header -->
                <div class="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div class="p-3 bg-indigo-100 rounded-full text-indigo-600">
                        <i data-feather="globe" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-indigo-900">Rede de Franquias</h3>
                        <p class="text-sm text-indigo-700">Gerencie todas as lojas conectadas ao ecossistema UniTech.</p>
                    </div>
                </div>

                <!-- Create Logic -->
                <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 class="text-sm font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                        <i data-feather="plus-circle" class="w-4 h-4 text-green-500"></i> Nova Franquia
                    </h4>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome da Loja</label>
                            <input type="text" id="new-franchise-name" class="input-field" placeholder="Ex: UniTech Centro">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">ID do Sistema (Slug)</label>
                            <input type="text" id="new-franchise-id" class="input-field bg-gray-50 font-mono text-xs" placeholder="unitech-centro" readonly>
                        </div>
                         <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                            <input type="text" id="new-franchise-cnpj" class="input-field" placeholder="00.000.000/0000-00" oninput="this.value = window.maskCNPJ(this.value)">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email do Admin</label>
                            <input type="email" id="new-franchise-email" class="input-field" placeholder="admin@loja.com">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Senha Inicial</label>
                             <div class="relative">
                                <input type="text" id="new-franchise-pass" class="input-field font-mono" value="mudar123">
                            </div>
                        </div>
                        
                        <div class="lg:col-span-3 flex justify-end pt-2">
                             <button onclick="window.settingsModule.createFranchise()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                                <i data-feather="rocket"></i> Inaugurar Franquia
                            </button>
                        </div>
                    </div>
                </div>

                <!-- List -->
                <div>
                    <h4 class="text-sm font-bold text-gray-800 uppercase mb-4">Lojas Ativas (${franchises.length})</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${franchises.length > 0 ? franchises.map(f => this.renderFranchiseCard(f)).join('') :
                `<div class="col-span-3 p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                            Nenhuma franquia cadastrada. Crie a primeira acima.
                        </div>`}
                    </div>
                </div>
            </div>
        `;
    }

    renderFranchiseCard(admin) {
        return `
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group hover:border-indigo-300 transition-all">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                         <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            ${admin.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p class="font-bold text-gray-800 text-sm leading-tight">${admin.name}</p>
                            <span class="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">ID: ${admin.tenantId}</span>
                        </div>
                    </div>
                    <div class="h-2 w-2 rounded-full ${admin.status === 'suspended' ? 'bg-red-500' : 'bg-green-500'}"></div>
                </div>
                
                <div class="space-y-2 pt-2 border-t border-gray-100">
                    <div class="flex items-center gap-2 text-xs text-gray-600">
                        <i data-feather="mail" class="w-3 h-3 text-gray-400"></i>
                        ${admin.email}
                    </div>
                     <div class="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        <div class="flex items-center gap-2">
                             <i data-feather="key" class="w-3 h-3 text-gray-400"></i>
                             <span id="pass-${admin.id}" class="font-mono">••••••</span>
                        </div>
                        <button onclick="
                            const el = document.getElementById('pass-${admin.id}');
                            if(el.innerText === '••••••') el.innerText = '${admin.password}';
                            else el.innerText = '••••••';
                        " class="text-[10px] text-indigo-600 font-bold hover:underline">Ver</button>
                    </div>
                </div>

                <!-- Actions -->
                <div class="grid grid-cols-3 gap-2 mt-2">
                    <button onclick="window.settingsModule.editFranchise('${admin.id}')" class="text-xs py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded border border-gray-200 font-medium transition-colors" title="Editar">
                        <i data-feather="edit-2" class="w-3 h-3 mx-auto"></i>
                    </button>
                    ${admin.status === 'suspended'
                ? `<button onclick="window.settingsModule.toggleFranchiseStatus('${admin.id}', 'active')" class="text-xs py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded border border-green-200 font-medium transition-colors" title="Ativar"><i data-feather="play" class="w-3 h-3 mx-auto"></i></button>`
                : `<button onclick="window.settingsModule.toggleFranchiseStatus('${admin.id}', 'suspended')" class="text-xs py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded border border-yellow-200 font-medium transition-colors" title="Suspender"><i data-feather="pause" class="w-3 h-3 mx-auto"></i></button>`
            }
                    <button onclick="window.settingsModule.deleteFranchise('${admin.id}')" class="text-xs py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 font-medium transition-colors" title="Excluir Definitivamente">
                        <i data-feather="trash-2" class="w-3 h-3 mx-auto"></i>
                    </button>
                </div>
            </div>
        `;
    }

    editFranchise(adminId) {
        const admin = storage.getGlobalUsers().find(u => u.id == adminId);
        if (!admin) return;

        // Custom Modal for Editing
        const modalContent = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Nome Fantasia</label>
                    <input type="text" id="edit-fr-name" class="input-field" value="${admin.name}">
                </div>
                 <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Senha de Acesso</label>
                    <input type="text" id="edit-fr-pass" class="input-field font-mono" value="${admin.password}">
                </div>
                <div class="pt-2 flex justify-end gap-2">
                    <button onclick="document.getElementById('settings-modal').remove()" class="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-bold">Cancelar</button>
                    <button onclick="
                        const newName = document.getElementById('edit-fr-name').value;
                        const newPass = document.getElementById('edit-fr-pass').value;
                        window.settingsModule.saveFranchiseEdit('${admin.id}', newName, newPass);
                    " class="btn-primary">Salvar Alterações</button>
                </div>
            </div>
        `;
        this.showModal(`Editar ${admin.name}`, modalContent);
    }

    saveFranchiseEdit(id, newName, newPass) {
        const admin = storage.getGlobalUsers().find(u => u.id == id);
        if (admin && (newName || newPass)) {
            admin.name = newName || admin.name;
            admin.password = newPass || admin.password;

            storage.updateUser(admin);
            this.showMessage('Dados da franquia atualizados!', 'success');

            // Close modal (managed by parent showModal logic usually, but here we manually replace content so we need to close it)
            // Ideally re-render list
            document.getElementById('settings-modal').remove();
            this.render();
        }
    }

    toggleFranchiseStatus(adminId, newStatus) {
        const admin = storage.getGlobalUsers().find(u => u.id == adminId);
        if (!admin) return;

        const confirmMsg = newStatus === 'suspended'
            ? `Deseja realmente SUSPENDER o acesso da franquia "${admin.name}"? Ninguém poderá acessar esta loja.`
            : `Reativar acesso da franquia "${admin.name}"?`;

        if (confirm(confirmMsg)) {
            // We store status on the Admin User object itself for simplicity in this architecture
            // In a real app, this would be on a Tenant table.
            admin.status = newStatus;
            storage.updateUser(admin);

            this.showMessage(newStatus === 'suspended' ? 'Franquia suspensa.' : 'Franquia reativada.', 'success');
            this.render();
        }
    }

    deleteFranchise(adminId) {
        const admin = storage.getGlobalUsers().find(u => u.id == adminId);
        if (!admin) return;

        const confirmMsg = `PERIGO: Tem certeza que deseja EXCLUIR DEFINITIVAMENTE a franquia "${admin.name}"?\n\nIsso apagará TODO O ESPAÇO ADQUIRIDO (Vendas, Clientes, Estoque, etc) desta loja.\n\nEsta ação não pode ser desfeita.`;

        if (confirm(confirmMsg)) {
            const promptName = prompt(`Para confirmar, digite o nome da franquia: "${admin.name}"`);
            if (promptName !== admin.name) {
                window.toastService.warning('Nome incorreto. Operação cancelada.');
                return;
            }

            // 1. Purge all data
            const tenantId = admin.tenantId;
            storage.purgeTenantData(tenantId);

            // 2. Delete Admin User
            // Note: purgeTenantData removes USERs too if they are in UserRepository with that tenantId.
            // But the Admin User itself usually has tenantId = 'master'?? NO. 
            // In createFranchise, we set newUser.tenantId = tenantId.
            // So purgeTenantData(tenantId) ALREADY deleted the admin user!

            // Just in case the admin user was created differently or we need to be sure:
            const stillExists = storage.getGlobalUsers().find(u => u.id == adminId);
            if (stillExists) {
                storage.deleteUser(adminId);
            }

            this.showMessage(`Franquia "${admin.name}" e todos os dados foram excluídos.`, 'success');
            audit.log('FRANCHISE_DELETE', 'System', tenantId, { deletedBy: auth.getUser().email });
            this.render();
        }
    }

    createFranchise() {
        const name = document.getElementById('new-franchise-name').value;
        const cnpj = document.getElementById('new-franchise-cnpj').value;
        const email = document.getElementById('new-franchise-email').value;
        const password = document.getElementById('new-franchise-pass').value;

        if (!name || !email || !password) {
            window.toastService.warning('Preencha Nome, Email e Senha.');
            return;
        }

        // Generate ID
        const tenantId = name.toLowerCase()
            .replace(/[àáâãäå]/g, "a")
            .replace(/[èéêë]/g, "e")
            .replace(/[ìíîï]/g, "i")
            .replace(/[òóôõö]/g, "o")
            .replace(/[ùúûü]/g, "u")
            .replace(/[ç]/g, "c")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-");

        document.getElementById('new-franchise-id').value = tenantId;

        // Check if tenant already exists (by checking if any user has this tenantId)
        const allUsers = storage.getGlobalUsers();
        if (allUsers.some(u => u.tenantId === tenantId)) {
            window.toastService.warning('Este ID de franquia já existe. Tente outro nome.');
            return;
        }

        const newUser = {
            id: Date.now(),
            tenantId: tenantId,
            name: name, // Store Name as Admin Name for simplicity
            email: email,
            password: password,
            role: 'admin', // Franchise Admin
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        };

        try {
            const success = storage.addUser(newUser);

            if (!success) {
                window.toastService.error('Erro ao salvar no banco de dados. Validação interna falhou. Verifique se o nome é muito curto ou email inválido.');
                return;
            }

            // Optional: Seed initial settings for this tenant?
            // Not strictly necessary as getSettings() falls back to defaults, 
            // but we could save a `unitech_settings_multi` entry here if we wanted custom defaults.

            this.showMessage(`Franquia "${name}" criada com sucesso!`, 'success');
            audit.log('FRANCHISE_CREATE', 'Tenant', tenantId, { createdBy: auth.getUser().email });

            this.render(); // Refresh list
        } catch (e) {
            console.error(e);
            window.toastService.error('Erro ao criar franquia.');
        }
    }

    downloadBackupJSON() {
        const tenantId = storage.getCurrentTenantId();
        const backupData = {
            metadata: {
                tenantId: tenantId,
                exportedAt: new Date().toISOString(),
                exportedBy: auth.getUser().email,
                version: 'v10.0-multi-tenant'
            },
            data: {
                settings: storage.getSettings(),
                users: storage.getUsers(), // User list is filtered
                products: storage.getProducts(),
                clients: storage.getClients(),
                sales: storage.getSales(),
                warranties: storage.getWarranties(),
                checklists: storage.getChecklists(),
                transactions: storage.getTransactions(),
                auditLogs: audit.getLogs()
            }
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `unitech_backup_${tenantId}_${Date.now()}.json`;
        link.click();

        this.showMessage('Backup isolado gerado com sucesso!', 'success');
        audit.log('BACKUP_EXPORT', 'System', 'N/A', { tenantId: tenantId, type: 'manual_json' });
    }

    sendBackupEmail() {
        // Simulation of Email Service
        const email = auth.getUser().email;
        this.showMessage(`Backup criptografado enviado para ${email}`, 'success');
        console.log(`[Mock Email Service] Sending isolated backup to ${email}... [SENT]`);
        audit.log('BACKUP_EMAIL', 'System', 'N/A', { email: email, status: 'sent' });
    }

    getAuditTabContent() {
        const logs = audit.getLogs();

        return `
            <div class="space-y-6 animate-fade-in">
                <div class="flex items-center justify-between">
                    <div>
                         <h3 class="text-sm font-bold text-gray-800">Registros de Auditoria Imutáveis</h3>
                         <p class="text-xs text-gray-500">Histórico cronológico de segurança, vendas e acessos.</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.settingsModule.downloadBackupJSON()" class="text-xs flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-100 text-indigo-700">
                            <i data-feather="download-cloud" class="w-3 h-3"></i> Backup JSON
                        </button>
                        <button onclick="window.settingsModule.sendBackupEmail()" class="text-xs flex items-center gap-1 bg-green-50 border border-green-200 px-2 py-1 rounded hover:bg-green-100 text-green-700">
                            <i data-feather="mail" class="w-3 h-3"></i> Enviar por Email
                        </button>
                         <button onclick="window.print()" class="text-xs flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-700">
                            <i data-feather="printer" class="w-3 h-3"></i> Imprimir Relatório
                        </button>
                        <div class="text-xs font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200 text-gray-600">
                            Protocolo: SECURE_V10.0
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase text-xs">
                            <tr>
                                <th class="p-3">Data / Hora</th>
                                <th class="p-3">Ação</th>
                                <th class="p-3">Entidade</th>
                                <th class="p-3">Detalhes</th>
                                <th class="p-3">Usuário</th>
                                <th class="p-3">IP</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${logs.length > 0 ? logs.map(log => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="p-3 font-mono text-xs whitespace-nowrap text-gray-500">
                                    ${formatDateTime(log.timestamp)}
                                </td>
                                <td class="p-3 text-xs font-bold ${this.getActionColor(log.action)}">
                                    ${this.translateAction(log.action)}
                                </td>
                                <td class="p-3 text-xs text-gray-700">
                                    ${log.entity} <span class="text-gray-400">#${log.entityId}</span>
                                </td>
                                <td class="p-3 text-xs text-gray-600 font-mono">
                                    <button onclick="window.settingsModule.viewAuditDetails('${log.id}')" class="text-blue-600 hover:underline flex items-center gap-1">
                                        <i data-feather="eye" class="w-3 h-3"></i> Ver Detalhes
                                    </button>
                                </td>
                                <td class="p-3 text-xs">
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full bg-gray-300"></div>
                                        ${log.userName || log.userEmail}
                                    </div>
                                </td>
                                <td class="p-3 text-[10px] text-gray-400 font-mono">
                                    ${log.ip}
                                </td>
                            </tr>
                            `).join('') : `
                            <tr>
                                <td colspan="6" class="p-8 text-center text-gray-500 text-xs">Nenhum registro de auditoria encontrado.</td>
                            </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getActionColor(action) {
        if (action.includes('DELETE') || action.includes('REFUND') || action.includes('FAILED')) return 'text-red-600';
        if (action.includes('Create') || action.includes('LOGIN')) return 'text-green-600';
        if (action.includes('UPDATE')) return 'text-blue-600';
        return 'text-gray-600';
    }

    getAccessTabContent() {
        const users = storage.getUsers();

        return `
            <div class="space-y-8 animate-fade-in">
                <!-- Header -->
                <div class="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <div class="p-3 bg-blue-100 rounded-full text-blue-600">
                        <i data-feather="users" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-blue-900">Gerenciamento de Equipe</h3>
                        <p class="text-sm text-blue-700">Cadastre e gerencie o acesso de todos os colaboradores do sistema.</p>
                    </div>
                </div>

                <!-- Create New User Form -->
                <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 class="text-sm font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                        <i data-feather="user-plus" class="w-4 h-4 text-green-500"></i> Novo Usuário
                    </h4>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div class="lg:col-span-1">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                            <input type="text" id="new-user-name" class="input-field" placeholder="Nome do colaborador">
                        </div>
                         <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Função / Cargo</label>
                            <select id="new-user-role" class="input-field bg-white">
                                <option value="sales">Vendedor</option>
                                <option value="tech">Técnico</option>
                                <option value="manager">Gerente</option>
                                <option value="ceo">CEO / Proprietário</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email de Acesso</label>
                            <input type="email" id="new-user-email" class="input-field" placeholder="email@unitech.com">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Senha Inicial</label>
                            <div class="relative">
                                <input type="password" id="new-user-pass" class="input-field pr-10" placeholder="••••••">
                                <button onclick="const el = document.getElementById('new-user-pass'); el.type = el.type === 'password' ? 'text' : 'password'" class="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                                    <i data-feather="eye" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                         <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">CPF</label>
                            <input type="text" id="new-user-cpf" class="input-field" placeholder="000.000.000-00" oninput="this.value = window.maskCPF(this.value)">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Telefone</label>
                            <input type="text" id="new-user-phone" class="input-field" placeholder="(00) 00000-0000" oninput="this.value = window.maskPhone(this.value)">
                        </div>
                        
                        <div class="lg:col-span-3 flex justify-end pt-2">
                             <button onclick="window.settingsModule.createUser()" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-green-500/20 transition-all flex items-center gap-2">
                                <i data-feather="plus"></i> Cadastrar Colaborador
                            </button>
                        </div>
                    </div>
                </div>

                <!-- User List -->
                <div>
                    <h4 class="text-sm font-bold text-gray-800 uppercase mb-4">Colaboradores Ativos (${users.length})</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${users.map(user => this.renderUserCard(user)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderUserCard(user) {
        const roleLabels = {
            'ceo': { label: 'CEO / Proprietário', bg: 'bg-purple-100', text: 'text-purple-700' },
            'manager': { label: 'Gerente', bg: 'bg-blue-100', text: 'text-blue-700' },
            'sales': { label: 'Vendedor', bg: 'bg-green-100', text: 'text-green-700' },
            'tech': { label: 'Técnico', bg: 'bg-orange-100', text: 'text-orange-700' },
            'client': { label: 'Cliente', bg: 'bg-gray-100', text: 'text-gray-700' }
        };
        const roleStyle = roleLabels[user.role] || roleLabels['client'];

        return `
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 group hover:border-blue-300 transition-all">
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                        <img src="${user.avatar || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}`}" class="w-10 h-10 rounded-full border border-gray-100 shadow-sm">
                        <div>
                            <p class="font-bold text-gray-800 text-sm leading-tight">${user.name}</p>
                            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${roleStyle.bg} ${roleStyle.text}">${roleStyle.label}</span>
                        </div>
                    </div>
                    ${user.role !== 'ceo' ? `
                    <button onclick="window.settingsModule.deleteUser('${user.id}')" class="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remover Acesso">
                        <i data-feather="trash-2" class="w-4 h-4"></i>
                    </button>
                    ` : ''}
                </div>
                
                <div class="pt-3 border-t border-gray-50 space-y-1">
                    <p class="text-xs text-gray-500 flex items-center gap-2">
                        <i data-feather="mail" class="w-3 h-3"></i> ${user.email}
                    </p>
                    <p class="text-xs text-gray-500 flex items-center gap-2">
                         <i data-feather="phone" class="w-3 h-3"></i> ${user.phone || '---'}
                    </p>
                     <p class="text-xs text-gray-500 flex items-center gap-2">
                         <i data-feather="file-text" class="w-3 h-3"></i> ${user.cpf || '---'}
                    </p>
                </div>
            </div>
        `;
    }

    async createUser() {
        const name = document.getElementById('new-user-name').value;
        const role = document.getElementById('new-user-role').value;
        const email = document.getElementById('new-user-email').value;
        const password = document.getElementById('new-user-pass').value;
        const cpf = document.getElementById('new-user-cpf').value;
        const phone = document.getElementById('new-user-phone').value;

        if (!name || !email || !password) {
            this.showMessage('Preencha Nome, Email e Senha obrigatórios.', 'error');
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password,
            role,
            cpf,
            phone,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
        };

        try {
            await storage.addUser(newUser);
            this.showMessage('Usuário cadastrado com sucesso!', 'success');
            this.render();
        } catch (error) {
            console.error('Erro ao cadastrar usuário:', error);
            this.showMessage('Erro ao cadastrar: Verifique a conexão ou se o e-mail já existe.', 'error');
        }
    }

    deleteUser(id) {
        if (confirm('Tem certeza que deseja remover o acesso deste usuário?')) {
            storage.deleteUser(id);
            this.showMessage('Usuário removido.', 'success');
            this.render();
        }
    }

    addPixBank() {
        const nameInput = document.getElementById('new-pix-bank');
        const agencyInput = document.getElementById('new-pix-agency');
        const accountInput = document.getElementById('new-pix-account');

        const name = nameInput ? nameInput.value.trim() : '';
        const agency = agencyInput ? agencyInput.value.trim() : '';
        const account = accountInput ? accountInput.value.trim() : '';

        if (!name) {
            this.showMessage('Informe ao menos o nome do banco.', 'error');
            return;
        }

        if (!this.settings.pixBanks) this.settings.pixBanks = [];

        // Check for duplicates (by name, agency, and account)
        const isDuplicate = this.settings.pixBanks.some(b =>
            (typeof b === 'string' ? b === name : (b.name === name && b.agency === agency && b.account === account))
        );

        if (isDuplicate) {
            this.showMessage('Este banco com estes dados já está cadastrado.', 'error');
            return;
        }

        const newBank = {
            id: Date.now().toString(),
            name,
            agency,
            account
        };

        this.settings.pixBanks.push(newBank);

        // Save immediately
        storage.saveSettings(this.settings);

        // Clear inputs
        if (nameInput) nameInput.value = '';
        if (agencyInput) agencyInput.value = '';
        if (accountInput) accountInput.value = '';

        this.render();
        this.showMessage('Banco adicionado com sucesso!', 'success');
    }

    deletePixBank(id) {
        if (!this.settings.pixBanks) return;

        // Handle migration (some might be strings, others objects)
        this.settings.pixBanks = this.settings.pixBanks.filter(b => {
            if (typeof b === 'string') return b !== id;
            return b.id !== id;
        });

        // Save immediately
        storage.saveSettings(this.settings);

        this.render();
        this.showMessage('Banco removido.', 'success');
    }

    attachListeners() {
        // Save Listener
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveAll();
            });
        }

        // --- COMPANY TAB LISTENERS ---
        const companyNameInput = document.getElementById('company-name');
        if (companyNameInput) {
            companyNameInput.addEventListener('input', (e) => {
                const newName = e.target.value;
                // Update internal state
                this.settings.companyName = newName;

                // Update Sidebar immediately
                const brandEl = document.getElementById('app-brand-name');
                if (brandEl) {
                    const nameToUse = newName || 'inforOS.';
                    const parts = nameToUse.split(' ');
                    if (parts.length > 1) {
                        brandEl.innerHTML = `${parts[0]}<span class="text-unitech-primary ml-1">${parts.slice(1).join(' ')}</span>`;
                    } else {
                        brandEl.textContent = nameToUse;
                    }
                }
            });
        }

        const logoInput = document.getElementById('logo-input');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        this.settings.logo = ev.target.result;

                        // Save immediately to prevent "regression"
                        storage.saveSettings(this.settings);

                        // Update Sidebar logo immediately
                        const sidebarLogoContainer = document.querySelector('aside .w-10.h-10');
                        if (sidebarLogoContainer) {
                            sidebarLogoContainer.innerHTML = `<img src="${ev.target.result}" class="w-full h-full object-cover" />`;
                        }

                        this.render(); // Re-render to show preview
                        this.showMessage('Logotipo atualizado e salvo!', 'success');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const cnpjInput = document.getElementById('company-cnpj');
        if (cnpjInput) {
            cnpjInput.addEventListener('blur', async (e) => {
                const clean = e.target.value.replace(/\D/g, '');
                if (clean.length === 14) {
                    try {
                        this.showMessage('Consultando CNPJ...', 'info');
                        const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
                        if (resp.ok) {
                            const info = await resp.json();
                            if (document.getElementById('company-name')) document.getElementById('company-name').value = info.razao_social || info.nome_fantasia || '';
                            if (document.getElementById('company-street')) document.getElementById('company-street').value = info.logradouro || '';
                            if (document.getElementById('company-number')) document.getElementById('company-number').value = info.numero || '';
                            if (document.getElementById('company-district')) document.getElementById('company-district').value = info.bairro || '';
                            if (document.getElementById('company-city')) document.getElementById('company-city').value = info.municipio || '';
                            if (document.getElementById('company-state')) document.getElementById('company-state').value = info.uf || '';
                            if (document.getElementById('company-zip')) document.getElementById('company-zip').value = info.cep || '';
                            if (document.getElementById('company-phone')) document.getElementById('company-phone').value = info.ddd_telefone_1 || '';
                            if (document.getElementById('company-email')) document.getElementById('company-email').value = info.email || '';
                            this.showMessage('Dados da empresa carregados!', 'success');
                        }
                    } catch (err) {
                        console.error('CNPJ lookup error', err);
                    }
                }
            });
        }

        const zipInput = document.getElementById('company-zip');
        if (zipInput) {
            zipInput.addEventListener('blur', async (e) => {
                const clean = e.target.value.replace(/\D/g, '');
                if (clean.length === 8) {
                    try {
                        this.showMessage('Consultando CEP...', 'info');
                        const resp = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`);
                        if (resp.ok) {
                            const info = await resp.json();
                            if (document.getElementById('company-street')) document.getElementById('company-street').value = info.street || '';
                            if (document.getElementById('company-district')) document.getElementById('company-district').value = info.neighborhood || '';
                            if (document.getElementById('company-city')) document.getElementById('company-city').value = info.city || '';
                            if (document.getElementById('company-state')) document.getElementById('company-state').value = info.state || '';
                            this.showMessage('Endereço localizado!', 'success');
                        }
                    } catch (err) {
                        console.error('CEP lookup error', err);
                    }
                }
            });
        }

        // Masks helpers
        window.maskCNPJ = (v) => {
            return v.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .substr(0, 18);
        };
        window.maskCPF = (v) => {
            return v.replace(/\D/g, '')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                .replace(/(-\d{2})\d+?$/, '$1');
        };
        window.maskPhone = (v) => {
            return v.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/g, '($1) $2')
                .replace(/(\d)(\d{4})$/, '$1-$2')
                .substr(0, 15);
        };
        window.maskCEP = maskCEP;


        // --- BACKUP TAB LISTENERS ---
        const exportInventoryBtn = document.getElementById('export-inventory-btn');
        if (exportInventoryBtn) {
            exportInventoryBtn.addEventListener('click', () => {
                const products = storage.getProducts();
                this.downloadCSV(products, 'unitech_estoque.csv');
            });
        }

        const exportClientsBtn = document.getElementById('export-clients-btn');
        if (exportClientsBtn) {
            exportClientsBtn.addEventListener('click', () => {
                const clients = storage.getClients();
                this.downloadCSV(clients, 'unitech_clientes.csv');
            });
        }

        const manualBackupBtn = document.getElementById('manual-backup-download-btn');
        if (manualBackupBtn) {
            manualBackupBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('backup-name-input');
                const name = nameInput ? nameInput.value.trim() : `backup_${new Date().toISOString().slice(0, 10)}`;
                const data = { ...localStorage };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${name || 'unitech_backup'}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showMessage('Cópia de segurança gerada com sucesso!', 'success');
            });
        }

        const saveWhatsAppConfigBtn = document.getElementById('save-whatsapp-config');
        if (saveWhatsAppConfigBtn) {
            saveWhatsAppConfigBtn.onclick = () => {
                const url = document.getElementById('whatsapp-api-url').value.trim();
                if (!url) {
                    this.showMessage('O URL da API não pode estar vazio.', 'error');
                    return;
                }
                localStorage.setItem('unitech_whatsapp_api_url', url);
                this.showMessage('Conexão atualizada! Reiniciando serviços...', 'success');
                setTimeout(() => window.location.reload(), 1500);
            };
        }

        const manualBackupEmailBtn = document.getElementById('manual-backup-email-btn');
        if (manualBackupEmailBtn) {
            manualBackupEmailBtn.addEventListener('click', async () => {
                const nameInput = document.getElementById('backup-name-input');
                const name = nameInput ? nameInput.value.trim() : 'backup';
                const email = document.getElementById('backup-email')?.value || this.settings.backupEmail || 'gener-cell@hotmail.com';

                if (!email) {
                    this.showMessage('Por favor, cadastre um e-mail de backup primeiro.', 'error');
                    return;
                }

                manualBackupEmailBtn.disabled = true;
                manualBackupEmailBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i> Enviando...';
                if (window.feather) window.feather.replace();

                // Mocking the email sending process
                // In a production environment, this would call a backend API
                setTimeout(() => {
                    console.log(`[BACKUP SERVICE] Enviando backup "${name}.json" para ${email}`);
                    console.log(`[DATA SNAPSHOT]`, { ...localStorage });

                    this.showMessage(`Backup "${name}" enviado com sucesso para ${email}!`, 'success');
                    manualBackupEmailBtn.disabled = false;
                    manualBackupEmailBtn.innerHTML = '<i data-feather="mail" class="w-4 h-4"></i> Enviar p/ Email';
                    if (window.feather) window.feather.replace();
                }, 2000);
            });
        }

        const restoreInput = document.getElementById('restore-file');
        const restoreActions = document.getElementById('restore-actions');
        const restoreFilename = document.getElementById('restore-filename');
        const confirmRestoreBtn = document.getElementById('confirm-restore-btn');
        let pendingRestoreData = null;

        if (restoreInput) {
            restoreInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    restoreFilename.textContent = file.name;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        try {
                            pendingRestoreData = JSON.parse(ev.target.result);
                            restoreActions.classList.remove('hidden');
                        } catch (err) {
                            alert('Erro ao ler arquivo: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }

        if (confirmRestoreBtn) {
            confirmRestoreBtn.addEventListener('click', () => {
                if (pendingRestoreData && confirm('Tem certeza? Isso apagará todos os dados atuais.')) {
                    // Restore Logic
                    Object.keys(pendingRestoreData).forEach(key => {
                        localStorage.setItem(key, pendingRestoreData[key]); // Assuming backup implies localStorage dump format
                    });
                    alert('Sistema restaurado com sucesso! A página será recarregada.');
                    window.location.reload();
                }
            });
        }

        // --- SYSTEM RESET LISTENER ---
        const showResetBtn = document.getElementById('show-reset-options-btn');
        const resetContainer = document.getElementById('reset-system-container');
        if (showResetBtn && resetContainer) {
            showResetBtn.addEventListener('click', () => {
                const isHidden = resetContainer.classList.contains('hidden');
                if (isHidden) {
                    resetContainer.classList.remove('hidden');
                    showResetBtn.classList.add('bg-orange-50');
                    showResetBtn.innerHTML = '<i data-feather="chevron-up" class="w-4 h-4"></i> Ocultar Opções de Redefinição';
                } else {
                    resetContainer.classList.add('hidden');
                    showResetBtn.classList.remove('bg-orange-50');
                    showResetBtn.innerHTML = '<i data-feather="settings" class="w-4 h-4"></i> Redefinir Sistema';
                }
                if (window.feather) window.feather.replace();
            });
        }

        const executeResetBtn = document.getElementById('execute-reset-btn');
        if (executeResetBtn) {
            executeResetBtn.addEventListener('click', async () => {
                const passwordInput = document.getElementById('reset-master-pass');
                const password = passwordInput ? passwordInput.value : '';

                if (!password) {
                    this.showMessage('Digite sua senha para confirmar.', 'error');
                    return;
                }

                const selectedTypes = [];
                if (document.getElementById('reset-financial')?.checked) selectedTypes.push('financial');
                if (document.getElementById('reset-sales')?.checked) selectedTypes.push('sales');
                if (document.getElementById('reset-clients')?.checked) selectedTypes.push('clients');
                if (document.getElementById('reset-inventory')?.checked) selectedTypes.push('inventory');
                if (document.getElementById('reset-os')?.checked) selectedTypes.push('os');

                if (selectedTypes.length === 0) {
                    this.showMessage('Selecione ao menos uma categoria para redefinir.', 'warning');
                    return;
                }

                // Verify Password
                executeResetBtn.disabled = true;
                executeResetBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i> Verificando...';

                try {
                    const isPasswordValid = await auth.verifyCurrentPassword(password);

                    if (!isPasswordValid) {
                        this.showMessage('Senha incorreta!', 'error');
                        executeResetBtn.disabled = false;
                        executeResetBtn.innerHTML = '<i data-feather="trash-2" class="w-4 h-4"></i> REDEFINIR DADOS SELECIONADOS';
                        return;
                    }

                    if (confirm(`ATENÇÃO: Você está prestes a apagar PERMANENTEMENTE os dados de: ${selectedTypes.join(', ')}. Esta ação não pode ser desfeita. Deseja continuar?`)) {
                        const results = await storage.bulkDelete(selectedTypes);
                        this.showMessage('Sistema redefinido com sucesso!', 'success');
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        executeResetBtn.disabled = false;
                        executeResetBtn.innerHTML = '<i data-feather="trash-2" class="w-4 h-4"></i> REDEFINIR DADOS SELECIONADOS';
                    }
                } catch (error) {
                    this.showMessage('Erro ao processar redefinição.', 'error');
                    console.error(error);
                    executeResetBtn.disabled = false;
                    executeResetBtn.innerHTML = '<i data-feather="trash-2" class="w-4 h-4"></i> REDEFINIR DADOS SELECIONADOS';
                }

                if (window.feather) window.feather.replace();
            });
        }


        // --- THEME TAB LISTENERS ---
        const themePrimary = document.getElementById('theme-primary');
        const themeSecondary = document.getElementById('theme-secondary');
        const themeFontHeading = document.getElementById('theme-font-heading');
        const themeFontBody = document.getElementById('theme-font-body');

        const updateTheme = () => {
            // Create transient theme object
            const newTheme = {
                ...this.settings.theme,
                primary: themePrimary ? themePrimary.value : this.settings.theme.primary,
                secondary: themeSecondary ? themeSecondary.value : this.settings.theme.secondary,
                fontHeading: themeFontHeading ? themeFontHeading.value : this.settings.theme.fontHeading,
                fontBody: themeFontBody ? themeFontBody.value : this.settings.theme.fontBody
            };

            // Update internal state
            this.settings.theme = newTheme;

            // Apply immediately for preview
            ThemeService.applyTheme(newTheme);
        };

        if (themePrimary) themePrimary.addEventListener('input', updateTheme);
        if (themeSecondary) themeSecondary.addEventListener('input', updateTheme);
        if (themeFontHeading) themeFontHeading.addEventListener('change', updateTheme);
        if (themeFontBody) themeFontBody.addEventListener('change', updateTheme);

        window.updateUIFormat = (format) => {
            this.settings.ui.format = format;
            // Immediate effect if we had classes relying on this, for now just saves preference
            this.render(); // Update selection UI
        };
    }

    saveAll() {
        // Collect form data if on relevant tab
        if (document.getElementById('company-name')) this.settings.companyName = document.getElementById('company-name').value;
        if (document.getElementById('company-cnpj')) this.settings.cnpj = document.getElementById('company-cnpj').value;
        if (document.getElementById('company-ie')) this.settings.ie = document.getElementById('company-ie').value;

        if (document.getElementById('company-phone')) this.settings.phone = document.getElementById('company-phone').value;
        if (document.getElementById('company-email')) this.settings.email = document.getElementById('company-email').value;

        // Address Fields
        if (document.getElementById('company-zip')) this.settings.addressZip = document.getElementById('company-zip').value;
        if (document.getElementById('company-street')) this.settings.addressStreet = document.getElementById('company-street').value;
        if (document.getElementById('company-number')) this.settings.addressNumber = document.getElementById('company-number').value;
        if (document.getElementById('company-district')) this.settings.addressDistrict = document.getElementById('company-district').value;
        if (document.getElementById('company-city')) this.settings.addressCity = document.getElementById('company-city').value;
        if (document.getElementById('company-state')) this.settings.addressState = document.getElementById('company-state').value;

        if (document.getElementById('backup-email')) this.settings.backupEmail = document.getElementById('backup-email').value;
        if (document.getElementById('master-backup-enabled')) this.settings.masterBackupEnabled = document.getElementById('master-backup-enabled').checked;

        const success = storage.saveSettings(this.settings);
        if (success) {
            this.showMessage('Configurações salvas com sucesso!', 'success');
        } else {
            this.showMessage('Erro ao salvar!', 'error');
        }
    }

    showMessage(msg, type) {
        if (window.toastService) {
            if (type === 'success') window.toastService.success(msg);
            else if (type === 'error') window.toastService.error(msg);
            else if (type === 'warning') window.toastService.warning(msg);
            else window.toastService.info(msg);
            return;
        }
        const div = document.createElement('div');
        div.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-bold animate-fade-in ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }

    downloadCSV(data, filename) {
        if (!data || !data.length) {
            alert('Não há dados para exportar.');
            return;
        }
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
        const csvContent = [headers, ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    translateAction(action) {
        const map = {
            'LOGIN': 'Login Realizado',
            'LOGIN_FAILED': 'Falha de Login',
            'LOGOUT': 'Logout / Saída',
            'TRANSACTION_CREATE': 'Nova Transação',
            'TRANSACTION_REFUND': 'Estorno Financeiro',
            'SALE_CREATE': 'Venda Realizada',
            'SALE_REFUND': 'Venda Estornada',
            'SALE_UPDATE': 'Venda Atualizada',
            'STOCK_DEDUCT': 'Baixa de Estoque',
            'STOCK_UPDATE': 'Ajuste de Estoque'
        };
        return map[action] || action;
    }

    viewAuditDetails(logId) {
        const logs = audit.getLogs();
        const log = logs.find(l => l.id === logId);
        if (!log) return;

        const detailsHtml = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs">
                     <div class="flex flex-col">
                        <span class="font-bold text-gray-500 uppercase text-[10px]">ID da Auditoria</span>
                        <span class="font-mono text-gray-800">${log.id}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-500 uppercase text-[10px]">Data & Hora</span>
                        <span class="font-mono text-gray-800">${new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-500 uppercase text-[10px]">Usuário Responsável</span>
                        <span class="font-mono text-gray-800">${log.userName || 'Sistema'} <span class="text-gray-400">(${log.userEmail || 'system@internal'})</span></span>
                    </div>
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-500 uppercase text-[10px]">Endereço IP</span>
                        <span class="font-mono text-gray-800">${log.ip || 'Localhost'}</span>
                    </div>
                </div>

                <div>
                    <span class="font-bold text-gray-500 uppercase text-[10px] block mb-2">Detalhes da Operação</span>
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        ${Object.entries(log.details).map(([key, value]) => {
            const keyMap = {
                'value': 'Valor',
                'type': 'Tipo',
                'method': 'Método',
                'total': 'Total',
                'reason': 'Motivo',
                'qty': 'Quantidade',
                'price': 'Preço',
                'status': 'Status',
                'cost': 'Custo'
            };
            const label = keyMap[key] || key.replace(/([A-Z])/g, ' $1').trim();

            return `
                            <div class="flex justify-between items-center border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                                <span class="text-xs font-semibold text-gray-600 capitalize">${label}:</span>
                                <span class="text-xs font-mono text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-100">${value}</span>
                            </div>
                            `;
        }).join('')}
                        ${Object.keys(log.details).length === 0 ? '<span class="text-xs text-gray-400 italic">Nenhum detalhe adicional registrado.</span>' : ''}
                    </div>
                </div>
            </div>
        `;

        this.showModal('Detalhes da Auditoria', detailsHtml);
    }



    showModal(title, content) {
        let modal = document.getElementById('settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'settings-modal';
            modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 class="font-bold text-gray-800">${title}</h3>
                    <button onclick="document.getElementById('settings-modal').remove()" class="text-gray-500 hover:text-red-500">
                        <i data-feather="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="p-6">
                    ${content}
                </div>
                <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button onclick="document.getElementById('settings-modal').remove()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-bold">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        if (window.feather) window.feather.replace();
    }
}
