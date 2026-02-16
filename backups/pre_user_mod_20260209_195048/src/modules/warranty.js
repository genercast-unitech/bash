import { storage } from '../services/storage.js';

export class WarrantyModule {
  constructor() {
    this.activeWarranties = [];
  }

  async init(containerId, params = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.activeWarranties = storage.getWarranties().reverse();

    // DEEP LINK: If searching specifically for a warranty, show list (or could add search logic)
    const initialView = params.warrantyId ? 'list' : 'form';

    container.innerHTML = `
      <div class="h-full flex flex-col gap-4 max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-unitech-primary">Gestão de Garantia & RMA</h2>
        <div class="flex gap-2 bg-white/5 p-1 rounded-lg">
          <button class="px-3 py-1 rounded-md ${initialView === 'form' ? 'bg-unitech-primary text-white' : 'text-gray-400 hover:text-white'} text-sm" id="tab-form">Nova Garantia</button>
          <button class="px-3 py-1 rounded-md ${initialView === 'list' ? 'bg-unitech-primary text-white' : 'text-gray-400 hover:text-white'} text-sm" id="tab-list">Consultar (${this.activeWarranties.length})</button>
          <button class="px-3 py-1 rounded-md ${initialView === 'search' ? 'bg-unitech-primary text-white' : 'text-gray-400 hover:text-white'} text-sm" id="tab-search">Rastreio de Selo</button>
        </div>
      </div>

      <!-- View: Form -->
      <div id="view-form" class="${initialView === 'form' ? '' : 'hidden'} animate-fade-in space-y-4">
        <div class="glass-panel p-8">
          <form id="warranty-form" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">CPF do Cliente</label>
                <input type="text" id="w-cpf" class="input-field" placeholder="000.000.000-00" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Nome Completo</label>
                <input type="text" id="w-name" class="input-field" placeholder="Nome do Cliente Final" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Série da Peça (S/N)</label>
                <div class="flex gap-2">
                  <input type="text" id="w-serial" class="input-field" placeholder="Escaneie ou digite..." required>
                    <button type="button" class="btn-secondary">Scan</button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">Modelo do Aparelho</label>
                <select id="w-device" class="input-field">
                  <option>Selecione...</option>
                  <option>iPhone 11</option>
                  <option>iPhone 12</option>
                  <option>Samsung S21</option>
                  <option>Outro</option>
                </select>
              </div>
            </div>

            <div class="pt-6 border-t border-unitech-border flex justify-end gap-4">
              <button type="button" class="btn-secondary" onclick="document.getElementById('warranty-form').reset()">Limpar</button>
              <button type="submit" class="btn-primary">Gerar Certificado Digital</button>
            </div>
          </form>
        </div>

        <div id="certificate-preview" class="hidden animate-fade-in glass-panel p-8 border-2 border-unitech-primary text-center relative overflow-hidden">
          <div class="absolute top-0 right-0 p-4 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <h3 class="text-2xl font-bold text-unitech-primary mb-2">CERTIFICADO DE GARANTIA</h3>
          <p class="text-sm text-gray-400 mb-6">UniTech Certified Components</p>

          <div class="text-4xl font-mono tracking-widest mb-6">90 DIAS</div>

          <p class="text-sm">Válido até: <span class="text-white font-bold" id="valid-date">--/--/----</span></p>
          <div class="mt-4 text-xs text-gray-500">
            Cliente: <span id="c-customer"></span><br>
              RMA ID: <span id="c-id"></span>
          </div>
          <button class="mt-6 text-unitech-primary hover:underline text-sm flex items-center justify-center gap-2 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
            Baixar PDF
          </button>
        </div>
      </div>

      <!-- View: List -->
      <div id="view-list" class="${initialView === 'list' ? '' : 'hidden'} animate-fade-in glass-panel p-0 overflow-hidden flex flex-col">
          <!-- Table (Desktop) -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-white/5 border-b border-unitech-border text-xs uppercase text-gray-400">
                  <th class="p-4">RMA ID</th>
                  <th class="p-4">Cliente</th>
                  <th class="p-4">Aparelho</th>
                  <th class="p-4">Vencimento</th>
                  <th class="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="text-sm" id="warranty-list-body">
                ${this.renderTableRows()}
              </tbody>
            </table>
          </div>

          <!-- Cards (Mobile) -->
          <div class="md:hidden space-y-3 p-4 pb-20 overflow-y-auto">
               ${this.renderMobileCards()}
          </div>
      </div>

      <!-- View: Search (Warranty Lookup) -->
      <div id="view-search" class="hidden animate-fade-in space-y-4">
        <div class="glass-panel p-8">
          <div class="max-w-xl mx-auto">
            <label class="block text-sm font-medium text-gray-400 mb-2 text-center">Digite o Código do Selo de Garantia</label>
            <div class="relative flex items-center">
              <input type="text" id="search-warranty-code"
                class="w-full bg-black/20 border border-unitech-border rounded-xl p-4 text-center font-mono text-xl tracking-widest text-white focus:outline-none focus:border-unitech-primary transition-colors uppercase placeholder-gray-600"
                placeholder="Ex: G-123456"
              >
                <button id="btn-search-warranty" class="absolute right-2 p-2 bg-unitech-primary text-white rounded-lg hover:bg-red-700 transition-colors">
                  <i data-feather="search" class="w-5 h-5"></i>
                </button>
            </div>
            <p class="text-center text-xs text-gray-500 mt-2">O código pode ser encontrado no selo fixado no produto.</p>
          </div>
        </div>

        <div id="search-result-area" class="max-w-2xl mx-auto"></div>
      </div>
    </div>
    `;

    this.attachEvents();
  }

  renderMobileCards() {
    if (this.activeWarranties.length === 0) {
      return `
            <div class="flex flex-col items-center gap-3 p-8 text-center border border-white/10 rounded-xl opacity-60">
                <i data-feather="inbox" class="w-8 h-8 text-gray-400"></i>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma garantia ativa</p>
            </div>
         `;
    }

    return this.activeWarranties.map(item => {
      let statusColor = 'text-green-400 border-green-400/30 bg-green-400/10';
      let statusText = 'VIGENTE';

      const expiry = new Date(item.expiry);
      const now = new Date();
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        statusColor = 'text-red-400 border-red-400/30 bg-red-400/10';
        statusText = 'VENCIDA';
      } else if (diffDays <= 7) {
        statusColor = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
        statusText = 'EXPIRANDO';
      }

      return `
      <div class="bg-white/5 border border-white/10 rounded-xl p-4 relative group active:scale-[0.98] transition-all">
          <div class="flex justify-between items-start mb-3">
              <div>
                  <span class="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block mb-1">#${item.id}</span>
                  <h4 class="font-bold text-white text-sm line-clamp-1">${item.customer}</h4>
              </div>
              <span class="text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColor}">${statusText}</span>
          </div>
          
          <div class="space-y-2">
               <div class="flex items-center gap-2 text-xs text-gray-400">
                    <i data-feather="smartphone" class="w-3.5 h-3.5 text-unitech-primary"></i>
                    <span>${item.device}</span>
               </div>
               <div class="flex items-center gap-2 text-xs text-gray-400">
                    <i data-feather="calendar" class="w-3.5 h-3.5 text-unitech-primary"></i>
                    <span>Vence em: <b class="text-gray-300 ml-1">${item.expiry}</b></span>
               </div>
          </div>
      </div>
      `;
    }).join('');
  }

  renderTableRows() {
    if (this.activeWarranties.length === 0) return `< tr > <td colspan="5" class="p-4 text-center text-gray-500">Nenhuma garantia ativa</td></tr > `;

    return this.activeWarranties.map(item => {
      let statusColor = 'text-green-400';
      let statusText = 'VIGENTE';

      const expiry = new Date(item.expiry);
      const now = new Date();
      const diffTime = expiry - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        statusColor = 'text-red-400';
        statusText = 'VENCIDA';
      } else if (diffDays <= 7) {
        statusColor = 'text-yellow-400';
        statusText = 'EXPIRANDO';
      }

      return `
      < tr class="border-b border-unitech-border/50 hover:bg-white/5 transition-colors" >
              <td class="p-4 font-mono text-xs opacity-70">${item.id}</td>
              <td class="p-4 font-medium">${item.customer}</td>
              <td class="p-4 text-gray-400">${item.device}</td>
              <td class="p-4 font-mono">${item.expiry}</td>
              <td class="p-4 text-right font-bold text-xs ${statusColor}">${statusText}</td>
           </tr >
      `;
    }).join('');
  }



  attachEvents() {
    // Tabs logic
    const tabForm = document.getElementById('tab-form');
    const tabList = document.getElementById('tab-list');
    const tabSearch = document.getElementById('tab-search');

    const viewForm = document.getElementById('view-form');
    const viewList = document.getElementById('view-list');
    const viewSearch = document.getElementById('view-search');

    const resetTabs = () => {
      [tabForm, tabList, tabSearch].forEach(t => t?.classList.replace('bg-unitech-primary', 'text-gray-400'));
      [tabForm, tabList, tabSearch].forEach(t => t?.classList.add('text-gray-400'));
      [tabForm, tabList, tabSearch].forEach(t => t?.classList.remove('text-white'));

      [viewForm, viewList, viewSearch].forEach(v => v?.classList.add('hidden'));
    };

    const activateTab = (tab, view) => {
      resetTabs();
      tab.classList.remove('text-gray-400');
      tab.classList.add('bg-unitech-primary', 'text-white');
      view.classList.remove('hidden');
    };

    if (tabForm) tabForm.addEventListener('click', () => activateTab(tabForm, viewForm));
    if (tabList) tabList.addEventListener('click', () => activateTab(tabList, viewList));

    if (tabSearch) {
      tabSearch.addEventListener('click', () => activateTab(tabSearch, viewSearch));
    }

    // Form logic (Manual Creation)
    const form = document.getElementById('warranty-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const customer = document.getElementById('w-name').value;
        const device = document.getElementById('w-device').value;
        const serial = document.getElementById('w-serial').value;

        const date = new Date();
        date.setDate(date.getDate() + 90);
        const expiryStr = date.toISOString().split('T')[0];
        const rmaId = `RMA - ${Date.now().toString().slice(-6)} `;

        // Save to Storage
        const warranty = {
          id: rmaId,
          customer,
          device,
          expiry: expiryStr,
          status: 'active',
          serial
        };
        storage.addWarranty(warranty);
        this.activeWarranties = storage.getWarranties().reverse();

        // Update Interface
        document.getElementById('valid-date').innerText = date.toLocaleDateString('pt-BR');
        document.getElementById('c-customer').innerText = customer;
        document.getElementById('c-id').innerText = rmaId;
        document.getElementById('certificate-preview').classList.remove('hidden');

        // Clear form
        form.reset();

        // Update List
        document.getElementById('warranty-list-body').innerHTML = this.renderTableRows();
        document.getElementById('tab-list').innerText = `Manuais(${this.activeWarranties.length})`;

        if (window.toastService) window.toastService.success('Garantia registrada com sucesso!');
        else alert('Garantia registrada com sucesso!');
      });
    }

    // Search Logic (POS Sales)
    const searchBtn = document.getElementById('btn-search-warranty');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.performSearch());
    }

    const searchInput = document.getElementById('search-warranty-code');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.performSearch();
      });
    }
  }

  performSearch() {
    const code = document.getElementById('search-warranty-code').value.trim();
    const resultArea = document.getElementById('search-result-area');

    if (!code) {
      if (window.toastService) window.toastService.warning('Digite o código do selo para pesquisar.');
      else alert('Digite o código do selo para pesquisar.');
      return;
    }

    const sales = storage.getSales();
    let foundItem = null;
    let foundSale = null;

    // Find the item within all sales
    for (const sale of sales) {
      const item = sale.items.find(i => i.warrantyCode && i.warrantyCode.toUpperCase() === code.toUpperCase());
      if (item) {
        foundItem = item;
        foundSale = sale;
        break;
      }
    }

    if (foundSale && foundItem) {
      const saleDate = new Date(foundSale.date);
      const expiryDate = new Date(saleDate);
      expiryDate.setDate(expiryDate.getDate() + 90); // 90 days warranty

      const now = new Date();
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const expiredDays = Math.abs(diffDays);

      let statusHTML = '';
      if (diffDays >= 0) {
        statusHTML = `< div class="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl mb-4 text-center" >
                  <h3 class="font-bold text-xl mb-1">GARANTIA ATIVA</h3>
                  <p class="text-sm">Restam <strong>${diffDays} dias</strong> de cobertura.</p>
              </div > `;
      } else {
        statusHTML = `< div class="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-4 text-center" >
                  <h3 class="font-bold text-xl mb-1">GARANTIA EXPIRADA</h3>
                  <p class="text-sm">Vencida há <strong>${expiredDays} dias</strong>.</p>
              </div > `;
      }

      resultArea.innerHTML = `
      < div class="animate-fade-in" >
        ${statusHTML}

    <div class="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">Produto</p>
          <p class="font-bold text-white">${foundItem.name}</p>
        </div>
        <div>
          <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">Código do Selo</p>
          <p class="font-mono text-unitech-primary font-bold">${foundItem.warrantyCode}</p>
        </div>

        <div>
          <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">Data da Venda</p>
          <p class="font-bold text-gray-300">${saleDate.toLocaleDateString('pt-BR')} às ${saleDate.toLocaleTimeString('pt-BR').slice(0, 5)}</p>
        </div>
        <div>
          <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">Vencimento</p>
          <p class="font-bold text-gray-300">${expiryDate.toLocaleDateString('pt-BR')}</p>
        </div>

        <div class="col-span-2">
          <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">Cliente</p>
          <p class="font-bold text-gray-300">${foundSale.clientName}</p>
        </div>
        <div class="col-span-2">
          <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">ID da Venda</p>
          <p class="font-mono text-xs text-gray-400">${foundSale.id}</p>
        </div>
      </div>
    </div>
            </div >
      `;
    } else {
      resultArea.innerHTML = `
      < div class="text-center p-8 animate-fade-in" >
                <div class="inline-block p-4 bg-red-500/10 rounded-full text-red-500 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 class="font-bold text-white text-lg">Código não encontrado</h3>
                <p class="text-sm text-gray-400 mt-2">Verifique se o código foi digitado corretamente.</p>
            </div >
      `;
    }
  }
}
