import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';

export class BenchModule {
    constructor() {
        this.activeSession = null;
        this.chronicFaults = [
            { model: 'iphone 7', symptom: 'audio', solution: 'Ressoldar Pad C12 no Codec de Áudio' },
            { model: 'iphone 11', symptom: 'restart', solution: 'Verificar conexão do Sensor Mic/Power (Panic Full)' },
            { model: 'iphone xr', symptom: 'no touch', solution: 'Verificar linhas MIPI e filtro FL no conector LCD' }
        ];
        this.currentFilter = 'all';
    }

    async init(containerId) {
        this.containerId = containerId;
        const container = document.getElementById(containerId);
        if (!container) return;

        const user = auth.getUser();
        const checklists = storage.getChecklists();

        // Filter OS assigned to this technician or all if admin
        const myOS = checklists.filter(os => {
            if (user.role === 'tech') return os.technician === user.name;
            return true;
        }).reverse();

        container.innerHTML = `
        <div class="h-full flex flex-col gap-4 animate-fade-in">
           <!-- Header -->
           <div class="flex justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
             <div>
                <h2 class="text-xl font-bold text-gray-800 mb-1 flex items-center gap-3">
                    <i data-feather="terminal" class="w-6 h-6 text-blue-600"></i>
                    Bancada de Trabalho 
                    <span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded border border-blue-200 uppercase font-bold tracking-tight">V9.0 Pro</span>
                </h2>
                <p class="text-gray-500 text-xs">Gerenciamento de Ordens de Serviço Atribuídas</p>
             </div>
             <div class="flex items-center gap-4">
                 <div class="text-right">
                    <p class="text-[10px] text-gray-400 uppercase font-bold">Logado como</p>
                    <p class="text-sm font-bold text-gray-700">${user.name}</p>
                 </div>
                 <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    ${user.name.charAt(0)}
                 </div>
             </div>
           </div>
           
           <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
             
             <!-- Left Column: OS Queue -->
             <div class="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                <div class="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 class="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                        <i data-feather="list" class="w-3 h-3"></i> Fila de Trabalho
                    </h3>
                    <span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">${myOS.length}</span>
                </div>
                <div class="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    ${myOS.length > 0 ? myOS.map(os => `
                        <div class="p-3 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all shadow-sm group ${this.activeSession && this.activeSession.osId === os.id ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20' : ''}" 
                             onclick="window.benchModule.selectOS('${os.id}')">
                            <div class="flex flex-col gap-1">
                                <div class="flex justify-between items-center">
                                    <span class="text-[10px] font-mono font-bold text-gray-400 group-hover:text-blue-500">#${os.id}</span>
                                    <span class="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold uppercase">${os.status}</span>
                                </div>
                                <h4 class="text-sm font-bold text-gray-700 truncate">${os.device || 'Aparelho'}</h4>
                                <p class="text-[10px] text-gray-500 truncate">${os.client}</p>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="h-40 flex flex-col items-center justify-center text-center p-4">
                            <i data-feather="coffee" class="w-8 h-8 text-gray-300 mb-2"></i>
                            <p class="text-xs text-gray-400 font-bold">Nenhuma OS atribuída</p>
                        </div>
                    `}
                </div>
             </div>

             <!-- Middle: Main Bench Area -->
             <div class="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
                <div id="bench-main-ui" class="flex-1 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden flex flex-col">
                    ${this.activeSession ? this.renderActiveSession() : `
                        <div class="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-80 shadow-inner">
                            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg">
                                <i data-feather="cpu" class="w-10 h-10 text-gray-400"></i>
                            </div>
                            <h2 class="text-xl font-bold text-gray-400 mb-2">Aguardando Seleção</h2>
                            <p class="text-gray-400 text-sm max-w-sm">Selecione uma ordem de serviço na fila ao lado para iniciar o diagnóstico técnico.</p>
                        </div>
                    `}
                </div>
             </div>
           </div>
        </div>
        `;

        if (window.feather) window.feather.replace();
    }

    selectOS(osId) {
        const os = storage.getChecklists().find(c => c.id === osId);
        if (!os) return;

        this.activeSession = {
            osId: os.id,
            model: os.device,
            client: os.client,
            problem: os.equipmentDetails?.problem || 'Não relatado',
            startTime: Date.now(),
            items: [
                { id: 'power', label: 'Consumo Primário (Fonte)', status: null },
                { id: 'charge', label: 'Ciclo de Carga (Tristar)', status: null },
                { id: 'screen', label: 'Imagem / Touch (FPC)', status: null },
                { id: 'audio', label: 'Áudio (Codec)', status: null },
                { id: 'faceid', label: 'Face ID / Sensores', status: null },
                { id: 'wifi', label: 'Wi-Fi / Bluetooth', status: null }
            ]
        };

        this.init(this.containerId);
        this.startTimer();
    }

    renderActiveSession() {
        return `
            <div class="flex flex-col h-full bg-white">
                <!-- Session Header -->
                <div class="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-end">
                    <div>
                       <div class="flex items-center gap-2 mb-1">
                           <span class="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded tracking-widest uppercase">SESSÃO ATIVA: #${this.activeSession.osId}</span>
                           <span class="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded tracking-widest uppercase">LIVE DIAGNOSTICS</span>
                       </div>
                       <h1 class="text-3xl font-black text-gray-800 tracking-tight">${this.activeSession.model.toUpperCase()}</h1>
                       <p class="text-sm text-gray-500 font-medium">Cliente: ${this.activeSession.client}</p>
                    </div>
                    <div class="text-right">
                       <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">TEMPO DE BANCADA</p>
                       <p class="font-mono text-3xl font-black text-blue-600 shadow-text-sm" id="timer">00:00</p>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto custom-scrollbar">
                    <!-- Technical Checklist -->
                    <div class="space-y-4">
                        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <i data-feather="check-square" class="w-3 h-3"></i> Protocolo de Inspeção
                        </h3>
                        ${this.activeSession.items.map((item, idx) => `
                        <div class="p-4 rounded-xl border-2 transition-all flex justify-between items-center ${item.status === true ? 'border-green-500 bg-green-50/50' :
                item.status === false ? 'border-red-500 bg-red-50/50' :
                    'border-gray-100 bg-white hover:border-blue-200'
            }">
                             <div class="flex items-center gap-3">
                                 <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.status === true ? 'bg-green-500 text-white' :
                item.status === false ? 'bg-red-500 text-white' :
                    'bg-gray-100 text-gray-400'
            }">${idx + 1}</span>
                                 <span class="font-bold text-sm ${item.status === null ? 'text-gray-500' : 'text-gray-800'}">${item.label}</span>
                             </div>
                             <div class="flex gap-2">
                                <button class="px-4 py-1.5 rounded-lg border-2 border-red-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-[10px] font-black uppercase ${item.status === false ? 'bg-red-500 !text-white !border-red-500' : ''}" onclick="window.benchModule.setItemStatus('${item.id}', false)">FAIL</button>
                                <button class="px-4 py-1.5 rounded-lg border-2 border-green-200 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all text-[10px] font-black uppercase ${item.status === true ? 'bg-green-500 !text-white !border-green-500' : ''}" onclick="window.benchModule.setItemStatus('${item.id}', true)">OK</button>
                             </div>
                        </div>
                        `).join('')}
                    </div>

                    <!-- Side Tools -->
                    <div class="space-y-6">
                        <!-- Reported Problem -->
                        <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
                            <h4 class="text-[10px] font-bold text-orange-600 uppercase mb-2 flex items-center gap-1">
                                <i data-feather="alert-triangle" class="w-3 h-3"></i> Queixa do Cliente
                            </h4>
                            <p class="text-sm font-bold text-orange-950">${this.activeSession.problem}</p>
                        </div>

                        <!-- Chronic Faults / AI -->
                        <div id="ai-suggestions-container" class="bg-gray-900 rounded-xl p-5 shadow-inner border border-gray-800">
                             <h4 class="text-[10px] font-bold text-blue-400 uppercase mb-4 flex items-center gap-2">
                                <i data-feather="zap" class="w-3 h-3 text-yellow-400 fill-yellow-400"></i> Bench Intelligence v9
                            </h4>
                            <div id="ai-suggestions" class="space-y-3">
                                <p class="text-[10px] text-gray-500 font-bold text-center py-4 border-2 border-dashed border-gray-800 rounded-lg">Analise os componentes para ativar sugestões...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <button class="text-gray-400 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-2" onclick="window.benchModule.cancelSession()">
                        <i data-feather="trash-2" class="w-4 h-4"></i> Cancelar
                    </button>
                    <button class="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all flex items-center gap-3" onclick="window.benchModule.finishSession()">
                        <i data-feather="check" class="w-4 h-4"></i> Finalizar Laudo Técnico
                    </button>
                </div>
            </div>
        `;
    }

    setItemStatus(itemId, status) {
        const item = this.activeSession.items.find(i => i.id === itemId);
        if (item) {
            item.status = status;
            // Immediate partial re-render or just re-init? 
            // For now, re-init the main UI area or whole container
            this.init(this.containerId);

            if (status === false) {
                // Trigger specific AI suggestion logic if needed
                this.updateAISuggestions();
            }
        }
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((now - this.activeSession.startTime) / 1000);
            const m = Math.floor(diff / 60).toString().padStart(2, '0');
            const s = (diff % 60).toString().padStart(2, '0');
            const el = document.getElementById('timer');
            if (el) el.innerText = `${m}:${s}`;
        }, 1000);
    }

    updateAISuggestions() {
        // Logic to update the AI suggestions box based on failed items
    }

    finishSession() {
        alert('Diagnóstico finalizado com sucesso! O laudo técnico foi gerado.');
        this.activeSession = null;
        this.init(this.containerId);
    }

    cancelSession() {
        if (confirm('Deseja realmente cancelar esta sessão de diagnóstico?')) {
            this.activeSession = null;
            this.init(this.containerId);
        }
    }
}

// Global Export
window.benchModule = new BenchModule();
