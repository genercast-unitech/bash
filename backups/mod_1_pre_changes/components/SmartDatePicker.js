
export class SmartDatePicker {
    constructor(containerId, onOptionsChange) {
        this.containerId = containerId;
        this.onChange = onOptionsChange;
        this.isOpen = false;

        // State
        this.startDate = new Date();
        this.endDate = new Date();
        this.activePreset = 'thisMonth';
        this.compareMode = false;

        // Initialize with default range (This Month)
        this.setPreset('thisMonth', false); // false = don't trigger callback yet

        // Try to load from URL
        this.loadFromURL();

        this.render();
        this.attachGlobalListeners();
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const start = params.get('start');
        const end = params.get('end');
        const compare = params.get('compare');

        if (start && end) {
            const [sY, sM, sD] = start.split('-').map(Number);
            this.startDate = new Date(sY, sM - 1, sD);

            const [eY, eM, eD] = end.split('-').map(Number);
            this.endDate = new Date(eY, eM - 1, eD);

            this.activePreset = 'custom';
        }

        if (compare === 'true') {
            this.compareMode = true;
        }
    }

    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('start', this.startDate.toISOString().split('T')[0]);
        url.searchParams.set('end', this.endDate.toISOString().split('T')[0]);
        url.searchParams.set('compare', this.compareMode);
        window.history.pushState({}, '', url);
    }

    setPreset(preset, triggerCallback = true) {
        this.activePreset = preset;
        const now = new Date();

        switch (preset) {
            case 'today':
                this.startDate = new Date();
                this.endDate = new Date();
                break;
            case 'yesterday':
                const y = new Date();
                y.setDate(y.getDate() - 1);
                this.startDate = y;
                this.endDate = y;
                break;
            case 'last7':
                const l7 = new Date();
                l7.setDate(l7.getDate() - 6);
                this.startDate = l7;
                this.endDate = new Date();
                break;
            case 'last30':
                const l30 = new Date();
                l30.setDate(l30.getDate() - 29);
                this.startDate = l30;
                this.endDate = new Date();
                break;
            case 'thisMonth':
                this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'lastMonth':
                this.startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                this.endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'thisYear':
                this.startDate = new Date(now.getFullYear(), 0, 1);
                this.endDate = new Date(now.getFullYear(), 11, 31);
                break;
        }

        if (triggerCallback) {
            this.updateURL();
            this.onChange({
                start: this.startDate,
                end: this.endDate,
                compare: this.compareMode
            });
            this.render();
        }
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.render();
    }

    toggleCompare() {
        this.compareMode = !this.compareMode;
        this.updateURL();
        this.onChange({
            start: this.startDate,
            end: this.endDate,
            compare: this.compareMode
        });
        this.render();
    }

    applyCustomRange() {
        const startInput = document.getElementById('sdp-start').value;
        const endInput = document.getElementById('sdp-end').value;

        if (startInput && endInput) {
            const [sY, sM, sD] = startInput.split('-').map(Number);
            this.startDate = new Date(sY, sM - 1, sD);

            const [eY, eM, eD] = endInput.split('-').map(Number);
            this.endDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999);

            this.activePreset = 'custom';

            this.updateURL();
            this.onChange({
                start: this.startDate,
                end: this.endDate,
                compare: this.compareMode
            });
            this.isOpen = false;
            this.render();
        }
    }

    formatDateRange() {
        const start = this.startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const end = this.endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

        if (this.startDate.getTime() === this.endDate.getTime()) {
            return this.startDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        return `${start} - ${end}`;
    }

    attachGlobalListeners() {
        document.addEventListener('click', (e) => {
            const container = document.getElementById(this.containerId);
            if (this.isOpen && container && !container.contains(e.target)) {
                this.isOpen = false;
                this.render();
            }
        });
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const presets = [
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: 'last7', label: 'Últimos 7 dias' },
            { id: 'last30', label: 'Últimos 30 dias' },
            { id: 'thisMonth', label: 'Este Mês' },
            { id: 'lastMonth', label: 'Mês Passado' },
            { id: 'thisYear', label: 'Ano Atual' },
        ];

        const startISO = this.startDate.toISOString().split('T')[0];
        const endISO = this.endDate.toISOString().split('T')[0];

        container.innerHTML = `
            <div class="relative font-inter">
                <!-- Trigger Button -->
                <button onclick="window.smartDatePicker.toggle()" class="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-2 px-3 rounded-lg shadow-sm transition-all text-sm group ${this.isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}">
                    <i data-feather="calendar" class="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform"></i>
                    <span class="uppercase tracking-tight">${this.formatDateRange()}</span>
                    <i data-feather="chevron-down" class="w-3 h-3 text-gray-400"></i>
                </button>

                <!-- Popover -->
                <div class="${this.isOpen ? 'block' : 'hidden'} absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 flex overflow-hidden min-w-[500px] animate-fade-in-up">
                    
                    <!-- Sidebar: Presets -->
                    <div class="w-40 bg-gray-50 border-r border-gray-100 p-2 space-y-1">
                        ${presets.map(p => `
                            <button onclick="window.smartDatePicker.setPreset('${p.id}')" 
                                class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${this.activePreset === p.id ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-white hover:text-gray-700'}">
                                ${p.label}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Main Area: Custom Range & Compare -->
                    <div class="flex-1 p-4">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-xs font-black text-gray-400 uppercase tracking-wider">Período Personalizado</h4>
                            
                            <!-- Compare Toggle -->
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold text-gray-400 uppercase">Comparar</span>
                                <button onclick="window.smartDatePicker.toggleCompare()" class="w-8 h-4 rounded-full transition-colors relative ${this.compareMode ? 'bg-green-500' : 'bg-gray-200'}">
                                    <div class="w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${this.compareMode ? 'left-4.5' : 'left-0.5'}"></div>
                                </button>
                            </div>
                        </div>

                        <div class="flex gap-2 items-center mb-4">
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-gray-400 mb-1">Início</label>
                                <input type="date" id="sdp-start" value="${startISO}" class="w-full p-2 border border-gray-200 rounded text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                            <span class="text-gray-300">-</span>
                            <div class="flex-1">
                                <label class="block text-[10px] font-bold text-gray-400 mb-1">Fim</label>
                                <input type="date" id="sdp-end" value="${endISO}" class="w-full p-2 border border-gray-200 rounded text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                            </div>
                        </div>

                        <div class="flex justify-end pt-4 border-t border-gray-50">
                            <button onclick="window.smartDatePicker.applyCustomRange()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-blue-500/20 text-xs uppercase tracking-widest transition-all">
                                Aplicar Filtro
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.feather) window.feather.replace();
    }
}
