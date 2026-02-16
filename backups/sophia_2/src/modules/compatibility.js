import { storage } from '../services/storage.js';

export class CompatibilityModule {
  constructor() {
    this.products = [];
  }

  async init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.products = storage.getProducts();

    container.innerHTML = `
      <div class="h-full flex flex-col gap-4 max-w-6xl mx-auto">
        <div class="flex justify-between items-center mb-4">
           <div>
             <h2 class="text-xl font-bold text-unitech-primary">Smart Stock & Inventário</h2>
             <p class="text-xs text-gray-400">Gestão Inteligente de Estoque</p>
           </div>
           <button class="btn-primary flex items-center gap-2" id="btn-new-product">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Novo Produto
           </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
           <!-- Stock List -->
           <div class="lg:col-span-2 glass-panel p-0 flex flex-col overflow-hidden">
              <div class="p-4 border-b border-unitech-border flex gap-4">
                 <input type="text" id="stock-search" placeholder="Buscar por Nome ou SKU..." class="input-field flex-1">
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 overflow-y-auto" id="stock-list">
                 ${this.renderStockList()}
              </div>
           </div>

           <!-- Stock Controls / Details -->
           <div class="glass-panel p-6 flex flex-col bg-unitech-surface border-l border-unitech-border overflow-y-auto" id="stock-panel">
              <div class="text-center text-gray-500 py-12">
                 Selecione um produto para gerenciar ou criar um novo.
              </div>
           </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  renderStockList() {
    if (this.products.length === 0) return `<div class="col-span-full text-center text-gray-500">Nenhum produto cadastrado.</div>`;

    return this.products.map(p => `
      <div class="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-unitech-primary/50 transition-colors cursor-pointer group stock-item flex flex-col relative overflow-hidden" data-id="${p.id}">
         <div class="flex justify-between items-start mb-2">
            <div>
               <p class="text-[10px] text-gray-400 font-mono mb-1">${p.sku}</p>
               <h4 class="font-bold text-gray-200 text-sm truncate pr-2 w-48" title="${p.name}">${p.name}</h4>
            </div>
            <div class="text-right">
               <span class="text-xs font-bold ${p.stock < 5 ? 'text-red-400 animate-pulse' : 'text-green-400'}">${p.stock} un</span>
            </div>
         </div>
         
         <div class="mt-auto pt-2 border-t border-white/5 flex justify-between items-end text-xs text-gray-400">
            <span>Varejo: <span class="text-white">R$ ${p.retail.toFixed(2)}</span></span>
            <span>Atacado: <span class="text-white">R$ ${p.wholesale.toFixed(2)}</span></span>
         </div>
      </div>
    `).join('');
  }

  renderForm(product = null) {
    const isNew = !product;
    return `
        <h3 class="font-bold text-lg mb-6 border-b border-unitech-border pb-2 flex items-center gap-2">
            ${isNew ?
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Cadastrar Produto' :
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/></svg> Editar Produto'
      }
        </h3>
        
        <form id="product-form" class="space-y-4">
           <input type="hidden" id="p-id" value="${product?.id || ''}">
           
           <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Nome do Produto</label>
              <input type="text" id="p-name" class="input-field" value="${product?.name || ''}" required placeholder="Ex: Tela iPhone X">
           </div>

           <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">SKU / Código</label>
              <input type="text" id="p-sku" class="input-field font-mono" value="${product?.sku || ''}" required placeholder="Ex: SCR-IPX-01">
           </div>

           <div class="p-4 bg-white/5 rounded-lg border border-white/10">
              <h4 class="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
                 Gestão de Estoque
              </h4>
              <div class="flex items-center gap-4">
                 <div class="flex-1">
                    <label class="block text-xs font-medium text-gray-400 mb-1">Qtd Atual</label>
                    <input type="number" id="p-stock" class="input-field text-center font-bold text-lg text-green-400" value="${product?.stock || 0}" ${!isNew ? 'readonly' : ''}>
                 </div>
                 ${!isNew ? `
                 <div class="flex flex-col gap-1 w-1/2">
                    <label class="block text-[10px] font-medium text-gray-400 text-center">Entrada Rápida</label>
                    <div class="flex gap-1">
                        <button type="button" class="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded py-1 text-xs font-bold quick-add" data-qty="1">+1</button>
                        <button type="button" class="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded py-1 text-xs font-bold quick-add" data-qty="5">+5</button>
                        <button type="button" class="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded py-1 text-xs font-bold quick-add" data-qty="10">+10</button>
                    </div>
                 </div>
                 ` : ''}
              </div>
           </div>

           <div class="grid grid-cols-2 gap-4">
              <div>
                 <label class="block text-xs font-medium text-gray-400 mb-1">Preço Varejo (R$)</label>
                 <input type="number" step="0.01" id="p-retail" class="input-field" value="${product?.retail || ''}" required>
              </div>
              <div>
                 <label class="block text-xs font-medium text-gray-400 mb-1">Preço Atacado (R$)</label>
                 <input type="number" step="0.01" id="p-wholesale" class="input-field" value="${product?.wholesale || ''}" required>
              </div>
           </div>

           <div class="pt-6 flex gap-3">
              ${!isNew ? '<button type="button" class="btn-secondary flex-1" id="btn-cancel">Voltar</button>' : ''}
              <button type="submit" class="btn-primary flex-1 bg-gradient-to-r from-orange-500 to-pink-600 border-none hover:shadow-lg hover:shadow-orange-500/20 transition-all">${isNew ? 'Cadastrar Item' : 'Salvar Alterações'}</button>
           </div>
        </form>
      `;
  }

  attachEvents() {
    // Search
    document.getElementById('stock-search')?.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      this.products = storage.getProducts().filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      );
      document.getElementById('stock-list').innerHTML = this.renderStockList();
      this.attachListEvents();
    });

    // New Product Button
    document.getElementById('btn-new-product')?.addEventListener('click', () => {
      document.getElementById('stock-panel').innerHTML = this.renderForm();
      this.attachFormEvents();
    });

    this.attachListEvents();
  }

  attachListEvents() {
    document.querySelectorAll('.stock-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id);
        const product = this.products.find(p => p.id === id);
        document.getElementById('stock-panel').innerHTML = this.renderForm(product);
        this.attachFormEvents();
      });
    });
  }

  attachFormEvents() {
    // Quick Add Buttons
    document.querySelectorAll('.quick-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('p-stock');
        const current = parseInt(input.value) || 0;
        const add = parseInt(btn.dataset.qty);
        input.value = current + add;

        // Flash effect
        input.classList.add('bg-green-500/20', 'text-white');
        setTimeout(() => input.classList.remove('bg-green-500/20', 'text-white'), 300);
      });
    });

    document.getElementById('product-form')?.addEventListener('submit', (e) => {
      e.preventDefault();

      const id = document.getElementById('p-id').value;
      const name = document.getElementById('p-name').value;
      const sku = document.getElementById('p-sku').value;
      const stock = parseInt(document.getElementById('p-stock').value) || 0;
      const retail = parseFloat(document.getElementById('p-retail').value) || 0;
      const wholesale = parseFloat(document.getElementById('p-wholesale').value) || 0;

      if (!name || !sku) return;

      const productData = {
        id: id ? parseInt(id) : Date.now(),
        name,
        sku: sku.toUpperCase(),
        stock,
        retail,
        wholesale
      };

      if (id) {
        storage.updateProduct(productData);
      } else {
        storage.addProduct(productData);
      }

      alert(id ? 'Produto atualizado e estoque ajustado!' : 'Novo produto cadastrado com sucesso!');

      // Refresh list locally from storage to capture changes
      this.products = storage.getProducts();
      document.getElementById('stock-list').innerHTML = this.renderStockList();
      this.attachListEvents();

      // If new, clear; if edit, stay
      if (!id) document.getElementById('stock-panel').innerHTML = `<div class="text-center text-gray-500 py-12">Selecione um produto para gerenciar ou criar um novo.</div>`;
    });

    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      document.getElementById('stock-panel').innerHTML = `<div class="text-center text-gray-500 py-12">Selecione um produto para gerenciar ou criar um novo.</div>`;
    });
  }
}
