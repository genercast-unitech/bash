import { storage } from '../services/storage.js';

export class StorefrontModule {
    constructor() {
        this.products = [];
        this.clients = [];
        this.categories = [];
        this.locations = [];
        this.selectedIds = new Set();
        this.initialized = false;
        this.staticEventsAttached = false;
        this.currentMode = 'create';
        this.currentId = null;
        this.currentPhotoBase64 = '';
        this.filters = {
            name: '',
            sku: '',
            category: '',
            supplier: ''
        };
        this.editingBrandId = null;
        this.editingCategoryId = null;
    }

    async init(containerId, params = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.fixData();
        this.products = storage.getProducts();
        this.clients = storage.getClients();
        this.categories = storage.getCategories();
        this.locations = storage.getLocations();

        container.innerHTML = `
            <div class="h-full flex flex-col gap-3 animate-fade-in text-white p-2 md:p-4">
                <!-- Header / Filter Bar -->
                <div class="bg-white rounded-xl p-2.5 md:p-3 shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col gap-2 md:gap-3 flex-shrink-0">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
                        <button id="btn-new-product" class="bg-unitech-primary hover:bg-slate-900 active:scale-95 text-white font-black h-8 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl text-[9px] md:text-[10px] flex items-center justify-center md:justify-start gap-2 transition-all shadow-md shadow-unitech-primary/20 uppercase tracking-widest group shrink-0 w-full md:w-auto">
                            <i data-feather="plus-circle" class="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-90 transition-transform"></i> Novo Registro
                        </button>
                        
                        <div class="hidden md:block h-6 w-px bg-gray-200 mx-1"></div>

                        <div class="flex gap-2 flex-1">
                            <div class="relative group flex-1">
                                <i data-feather="search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 transition-colors group-focus-within:text-unitech-primary"></i>
                                <input type="text" id="search-name" placeholder="Nome..." class="input-field border border-gray-100 bg-gray-50/50 rounded-lg md:rounded-xl h-8 md:h-10 pl-8 pr-2 text-[10px] md:text-xs w-full text-gray-800 placeholder-gray-400 focus:ring-4 focus:ring-unitech-primary/5 focus:bg-white focus:border-unitech-primary outline-none transition-all">
                            </div>

                            <div class="relative group w-24 md:w-40">
                                <i data-feather="maximize" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"></i>
                                <input type="text" id="search-barcode" placeholder="SKU/EAN" class="input-field border border-gray-100 bg-gray-50/50 rounded-lg md:rounded-xl h-8 md:h-10 pl-8 pr-2 text-[10px] md:text-xs w-full text-gray-800 placeholder-gray-400 focus:ring-4 focus:ring-unitech-primary/5 focus:bg-white focus:border-unitech-primary outline-none transition-all font-mono uppercase">
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 items-center">
                        <select id="filter-supplier" class="input-field border border-gray-100 bg-gray-50/50 rounded-lg md:rounded-xl h-8 md:h-10 px-2 text-[10px] md:text-xs flex-1 text-gray-700 font-bold focus:ring-4 focus:ring-unitech-primary/5 focus:bg-white outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Fornecedor</option>
                            ${this.renderSupplierOptions()}
                        </select>

                        <select id="filter-category" class="input-field border border-gray-100 bg-gray-50/50 rounded-lg md:rounded-xl h-8 md:h-10 px-2 text-[10px] md:text-xs flex-1 text-gray-700 font-bold focus:ring-4 focus:ring-unitech-primary/5 focus:bg-white outline-none transition-all appearance-none cursor-pointer">
                            <option value="">Categoria</option>
                            ${this.renderCategoryOptions()}
                        </select>

                        <button id="btn-apply-filters" class="bg-slate-900 hover:bg-black active:scale-95 text-white h-8 w-8 md:h-10 md:w-10 flex items-center justify-center rounded-lg md:rounded-xl transition-all shadow-md shrink-0">
                            <i data-feather="search" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>

                <!-- Products Table (Desktop) -->
                <div class="hidden md:flex bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex-col min-h-0 mb-4">
                    <div class="overflow-auto custom-scrollbar flex-1 relative min-h-0 table-scroll-container">
                        <table class="w-full text-left border-collapse table-fixed">
                            <colgroup>
                                <col class="hidden md:table-column" style="width: 50px">
                                <col class="hidden md:table-column" style="width: 70px">
                                <col class="hidden md:table-column" style="width: 80px">
                                <col class="w-[55%] md:w-auto">
                                <col class="hidden lg:table-column">
                                <col class="hidden lg:table-column">
                                <col class="w-[12%] md:w-[100px]">
                                <col class="w-[18%] md:w-[120px]">
                                <col class="w-[15%] md:w-[100px]">
                            </colgroup>
                            <thead class="bg-slate-900 text-white uppercase text-[8px] md:text-[10px] font-black sticky top-0 z-10 shadow-xl overflow-hidden rounded-t-lg">
                                <tr>
                                    <th class="p-4 text-center hidden md:table-cell w-12"><input type="checkbox" id="check-all-products" class="cursor-pointer accent-unitech-primary"></th>
                                    <th class="p-4 text-center hidden md:table-cell w-16">ID</th>
                                    <th class="p-4 text-center hidden md:table-cell w-20">FOTO</th>
                                    <th class="px-1 py-3 md:p-4 border-slate-800 tracking-tighter">ITEM</th>
                                    <th class="p-4 border-slate-800 hidden lg:table-cell">CATEGORIA</th>
                                    <th class="p-4 border-slate-800 hidden lg:table-cell">FORNECEDOR</th>
                                    <th class="p-0.5 md:p-4 text-center border-slate-800">ESTOQUE</th>
                                    <th class="p-0.5 md:p-4 text-right border-slate-800" title="Preço"><i data-feather="dollar-sign" class="w-3 h-3 ml-auto hidden md:block"></i><span class="md:hidden">$</span></th>
                                    <th class="p-0.5 md:p-4 text-center border-slate-800" title="Ações"><i data-feather="more-horizontal" class="w-3 h-3 mx-auto hidden md:block"></i><span class="md:hidden">ACT</span></th>
                                </tr>
                            </thead>
                            <tbody id="product-list" class="divide-y divide-gray-100">
                                ${this.renderRows()}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Mobile Cards (Mobile) -->
                <div class="md:hidden flex-1 overflow-y-auto min-h-0 space-y-3 mb-20 custom-scrollbar">
                    ${this.renderMobileCards()}
                </div>
                ${this.renderProductModal()}
                ${this.renderSupplierModal()}
                ${this.renderCategoryModal()}
                ${this.renderLocationModal()}
                ${this.renderPhysicalLocationModal()}
                ${this.renderBoxModal()}
                ${this.renderBrandModal()}
                ${this.renderImageModal()}
            </div>
        `;

        this.attachStaticEvents();
        this.render();

        // SKU Parameters handling or direct Create New request
        const skuToUse = params.sku || params.createSku;
        const productId = params.productId;

        if (productId) {
            const product = this.products.find(p => String(p.id) === String(productId));
            if (product) {
                setTimeout(() => this.openModal(product, 'edit'), 500);
            }
        } else if (skuToUse || params.createNew) {
            setTimeout(() => {
                this.openModal(null, 'create');
                setTimeout(() => {
                    const skuInput = document.getElementById('prod-sku');
                    if (skuInput) {
                        if (skuToUse) skuInput.value = skuToUse;
                        document.getElementById('prod-name')?.focus();
                    }
                }, 100);
            }, 500);
        }
    }

    fixData() {
        const prods = storage.getProducts();
        let changed = false;
        prods.forEach(p => {
            if (typeof p.id !== 'string' && typeof p.id !== 'number') {
                p.id = Date.now() + Math.random();
                changed = true;
            }
        });
        if (changed) storage.saveProducts(prods);
    }

    renderSupplierOptions() {
        const suppliers = storage.getClients().filter(c => c.category === 'supplier');
        suppliers.sort((a, b) => a.name.localeCompare(b.name));
        return suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }

    renderCategoryOptions() {
        return storage.getCategories().map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    applyFilters() {
        const allProducts = storage.getProducts();

        // Normalize terms for broad matching
        const term = (this.filters.name || '').toLowerCase().trim();
        const skuTerm = (this.filters.sku || '').toLowerCase().trim();
        const catFilter = this.filters.category;
        const supFilter = this.filters.supplier;

        this.products = allProducts.filter(p => {
            // Smart Search: Check name, category, and SKU together in the primary field
            const searchableText = `${p.name} ${p.category || ''} ${p.sku || ''} ${p.supplier || ''}`.toLowerCase();
            const matchName = !term || searchableText.includes(term);

            // SKU-Specific Search: Still allow dedicated SKU matching
            const matchSku = !skuTerm || (p.sku || '').toLowerCase().includes(skuTerm);

            // Exact Filters: Only apply if a specific value is selected
            const matchCat = !catFilter || p.category === catFilter;
            const matchSup = !supFilter || p.supplier === supFilter;

            // All conditions must be met (Additive Filtering)
            return matchName && matchSku && matchCat && matchSup;
        });

        this.render();
    }



    renderMobileCards() {
        if (this.products.length === 0) {
            return `
                <div class="flex flex-col items-center gap-3 p-10 text-center bg-white rounded-xl border border-gray-100 opacity-50">
                    <i data-feather="search" class="w-8 h-8 text-gray-400"></i>
                    <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhum produto encontrado</p>
                </div>`;
        }
        return this.products.map(p => {
            const stockColor = p.stock > (p.minStock || 5) ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';
            return `
            <div class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 items-start relative overflow-hidden group active:scale-[0.98] transition-transform">
                <!-- Image -->
                <div class="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                    ${p.photo ? `<img src="${p.photo}" class="w-full h-full object-cover">` : `<i data-feather="image" class="w-6 h-6 text-gray-300"></i>`}
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-slate-800 text-xs leading-tight line-clamp-2 mb-1">${p.name}</h4>
                        <span class="text-[9px] font-black font-mono text-slate-400">#${String(p.id).slice(-4)}</span>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">${p.category || 'Geral'}</span>
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${stockColor}">Est: ${p.stock}</span>
                    </div>
                    <div class="flex justify-between items-center mt-2 border-t border-gray-50 pt-2">
                        <span class="text-sm font-black text-slate-900">R$ ${Number(p.retail || 0).toFixed(2)}</span>
                        <div class="flex gap-2">
                            <button class="btn-share-catalog w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100" data-id="${p.id}" title="Compartilhar Catálogo"><i data-feather="share-2" class="w-3.5 h-3.5 pointer-events-none"></i></button>
                            <button class="btn-edit w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 border border-blue-100" data-id="${p.id}"><i data-feather="edit-2" class="w-3.5 h-3.5 pointer-events-none"></i></button>
                            <button class="btn-delete w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 border border-rose-100" data-id="${p.id}"><i data-feather="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i></button>
                        </div>
                    </div>
                </div>
            </div>
             `;
        }).join('');
    }

    renderRows() {
        if (this.products.length === 0) {
            return `
                <tr>
                    <td colspan="9" class="py-20 text-center">
                        <div class="flex flex-col items-center gap-3 animate-fade-in">
                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <i data-feather="search" class="w-8 h-8"></i>
                            </div>
                            <p class="text-slate-400 font-bold text-sm tracking-tight">Nenhum produto encontrado</p>
                            <p class="text-slate-300 text-[10px] uppercase tracking-widest font-black">Tente mudar os filtros ou o termo de busca</p>
                        </div>
                    </td>
                </tr>`;
        }
        return this.products.map((p, index) => {
            const isSelected = this.selectedIds.has(String(p.id));
            const stockColor = p.stock > (p.minStock || 5) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100';

            return `
            <tr class="hover:bg-slate-50 transition-all border-b border-gray-50 ${isSelected ? 'bg-indigo-50/30' : ''}">
                <td class="hidden md:table-cell p-4 text-center">
                    <input type="checkbox" class="prod-check accent-unitech-primary cursor-pointer" data-id="${p.id}" ${isSelected ? 'checked' : ''}>
                </td>
                <td class="hidden md:table-cell p-4 text-center">
                    <span class="text-[10px] font-black text-slate-400 font-mono">#${String(p.id).slice(-4)}</span>
                </td>
                <td class="hidden md:table-cell p-2 text-center">
                    <div class="w-10 h-10 rounded-lg bg-slate-100 mx-auto overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center ${p.photo ? 'cursor-zoom-in hover:scale-110 active:scale-95 transition-transform product-img-trigger' : ''}" data-photo="${p.photo || ''}">
                        ${p.photo ? `<img src="${p.photo}" class="w-full h-full object-cover">` : `<i data-feather="image" class="w-4 h-4 text-slate-300"></i>`}
                    </div>
                </td>
                <td class="px-2 py-2 md:p-4">
                    <div class="flex flex-col gap-0.5">
                        <div class="font-black text-slate-800 text-[10px] md:text-[13px] leading-tight truncate max-w-[120px] md:max-w-none">${p.name}</div>
                        <div class="flex items-center">
                            <span class="text-[7px] md:text-[9px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-1 py-0 rounded shadow-sm">${p.sku}</span>
                        </div>
                    </div>
                </td>
                <td class="hidden lg:table-cell p-4">
                    <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">${p.category || 'Geral'}</span>
                </td>
                <td class="hidden lg:table-cell p-4">
                    <span class="text-[10px] font-bold text-slate-500 truncate max-w-[100px] block">${p.supplier || '--'}</span>
                </td>
                <td class="px-1 py-2 md:p-4 text-center">
                    <span class="px-1 py-0.5 rounded text-[9px] md:text-[10px] font-black border ${stockColor}">
                        ${p.stock}
                    </span>
                </td>
                <td class="px-1 py-2 md:p-4 text-right">
                    <div class="font-mono text-slate-900 font-black text-[9px] md:text-sm tracking-tighter">R$${Number(p.retail || 0).toFixed(2)}</div>
                </td>
                <td class="px-1 py-2 md:p-4 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button class="btn-share-catalog p-2 text-emerald-500 hover:text-emerald-700 active:scale-90 transition-transform cursor-pointer" data-id="${p.id}" title="Compartilhar Catálogo"><i data-feather="share-2" class="w-4 h-4 pointer-events-none"></i></button>
                        <button class="btn-edit p-2 text-blue-500 hover:text-blue-700 active:scale-90 transition-transform cursor-pointer" data-id="${p.id}"><i data-feather="edit-2" class="w-4 h-4 pointer-events-none"></i></button>
                        <button class="btn-delete p-2 text-rose-500 hover:text-rose-700 active:scale-90 transition-transform cursor-pointer" data-id="${p.id}"><i data-feather="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    renderProductModal() {
        return `
            <div id="product-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 transition-all duration-300">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-scale-in flex flex-col h-full md:h-auto md:max-h-[85vh] ring-1 ring-gray-100">
                    
                    <!-- Header -->
                    <div class="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white sticky top-0 z-20">
                        <div>
                            <h3 class="text-2xl font-black text-slate-900 tracking-tight"><span>Novo Produto</span></h3>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Inventário</p>
                        </div>
                        <button id="close-intro-modal" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all active:scale-95">
                            <i data-feather="x" class="w-5 h-5"></i>
                        </button>
                    </div>
                    
                    <!-- Body -->
                    <div class="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            <!-- Left: Identity -->
                            <div class="lg:col-span-7 space-y-8">
                                <!-- Main Info -->
                                <div class="space-y-6">
                                    <div class="flex items-center gap-2 mb-4">
                                        <div class="w-1.5 h-4 bg-slate-900 rounded-full"></div>
                                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest">Identificação</h4>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Nome do Produto</label>
                                        <input type="text" id="prod-name" placeholder="Ex: iPhone 13 Pro Max 128GB" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all placeholder-slate-300">
                                    </div>

                                    <div class="grid grid-cols-2 gap-4">
                                         <div class="form-group">
                                            <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">SKU / Código</label>
                                            <div class="flex">
                                                <input type="text" id="prod-sku" placeholder="Gerar..." class="flex-1 bg-slate-50 border border-slate-100 border-r-0 rounded-l-xl p-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-0 outline-none transition-all uppercase font-mono">
                                                <button type="button" id="btn-scan" class="bg-white border border-slate-100 border-l-0 rounded-r-xl px-4 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
                                                    <i data-feather="maximize" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                         <div class="form-group">
                                            <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Garantia (Meses)</label>
                                            <input type="number" id="prod-warranty" value="3" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all">
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <!-- Brand Field (New) -->
                                        <div class="form-group">
                                            <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Marca / Fabricante</label>
                                            <div class="flex gap-2">
                                                <select id="prod-brand" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none hover:bg-slate-100 transition-all cursor-pointer">
                                                    <option value="">Selecione...</option>
                                                    ${this.renderBrandOptions()}
                                                </select>
                                                <button type="button" id="btn-open-brand-modal" class="w-11 h-11 bg-white border border-slate-100 text-slate-400 hover:text-slate-900 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
                                                    <i data-feather="plus" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div class="form-group">
                                            <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Categoria</label>
                                            <div class="flex gap-2">
                                                <select id="prod-category" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none hover:bg-slate-100 transition-all cursor-pointer">
                                                    <option value="Geral">Geral</option>
                                                    ${this.renderCategoryOptions()}
                                                </select>
                                                <button type="button" id="btn-open-category-modal" class="w-11 h-11 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-50 transition-all shadow-sm">
                                                    <i data-feather="hash" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                     <div class="form-group">
                                        <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Fornecedor</label>
                                        <div class="flex gap-2">
                                            <select id="prod-supplier" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none hover:bg-slate-100 transition-all cursor-pointer">
                                                <option value="">Selecione...</option>
                                                ${this.renderSupplierOptions()}
                                            </select>
                                            <button type="button" id="btn-open-supplier-modal" class="w-11 h-11 bg-white border border-slate-100 text-slate-400 hover:text-slate-900 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
                                                <i data-feather="user-plus" class="w-4 h-4"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Logistics -->
                                <div class="space-y-6 pt-4 border-t border-gray-50">
                                    <div class="flex items-center gap-2 mb-4">
                                        <div class="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest">Logística</h4>
                                    </div>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="form-group">
                                            <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Localização</label>
                                            <div class="flex gap-2">
                                                <select id="prod-location" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none hover:bg-slate-100 transition-all cursor-pointer">
                                                    <option value="">Selecione...</option>
                                                    ${this.renderLocationOptions()}
                                                </select>
                                                <button type="button" id="btn-open-location-modal" class="w-11 h-11 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-50 transition-all shadow-sm">
                                                    <i data-feather="map-pin" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Setor / Gaveta</label>
                                            <div class="flex gap-2">
                                                <select id="prod-physical-location" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none hover:bg-slate-100 transition-all cursor-pointer">
                                                    <option value="">Selecione...</option>
                                                    ${this.renderPhysicalLocationOptions()}
                                                </select>
                                                <button type="button" id="btn-open-physical-location-modal" class="w-11 h-11 bg-white border border-slate-100 text-slate-400 hover:text-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-50 transition-all shadow-sm">
                                                    <i data-feather="layers" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                     <div class="form-group">
                                        <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Caixa</label>
                                        <div class="flex gap-2">
                                            <select id="prod-box" class="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none hover:bg-slate-100 transition-all cursor-pointer">
                                                <option value="">Selecione...</option>
                                                ${this.renderBoxOptions()}
                                            </select>
                                            <button type="button" id="btn-open-box-modal" class="w-11 h-11 bg-white border border-slate-100 text-slate-400 hover:text-pink-500 rounded-xl flex items-center justify-center hover:bg-pink-50 transition-all shadow-sm">
                                                <i data-feather="box" class="w-4 h-4"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right: Financials -->
                            <div class="lg:col-span-5 space-y-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100 h-fit">
                                <div class="space-y-6">
                                    <div class="flex items-center gap-2 mb-4">
                                        <div class="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest">Financeiro</h4>
                                    </div>

                                    <div class="grid grid-cols-3 gap-4">
                                         <div class="form-group">
                                            <label class="block text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Custo (R$)</label>
                                            <input type="number" id="prod-cost" step="0.01" value="0.00" class="w-full bg-white border border-slate-200 rounded-xl p-3 text-lg font-black text-slate-900 focus:border-slate-900 outline-none transition-all">
                                        </div>
                                         <div class="form-group">
                                            <label class="block text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Estoque</label>
                                            <input type="number" id="prod-stock" value="0" class="w-full bg-white border border-slate-200 rounded-xl p-3 text-lg font-black text-slate-900 focus:border-slate-900 outline-none text-center transition-all">
                                        </div>
                                        <div class="form-group">
                                            <label class="block text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Mínimo</label>
                                            <input type="number" id="prod-min-stock" value="0" class="w-full bg-white border border-slate-200 rounded-xl p-3 text-lg font-black text-slate-900 focus:border-slate-900 outline-none text-center transition-all">
                                        </div>
                                    </div>

                                    <div class="form-group bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500 transition-all">
                                        <div class="flex justify-between items-center mb-2">
                                            <label class="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Venda Varejo</label>
                                            <div id="retail-profit-badge" class="hidden px-2 py-0.5 rounded-full bg-emerald-50 text-[8px] font-black text-emerald-600 uppercase">Lucro: R$ 0.00</div>
                                        </div>
                                        <div class="flex gap-3 items-center">
                                            <div class="relative flex-1">
                                                <span class="absolute left-0 top-1.5 text-slate-400 text-xs font-bold">R$</span>
                                                <input type="number" id="prod-retail" step="0.01" class="w-full pl-6 bg-transparent border-none text-2xl font-black text-slate-900 focus:ring-0 outline-none p-0" placeholder="0.00">
                                            </div>
                                             <div class="relative w-20">
                                                <input type="number" id="prod-margin-retail" class="w-full bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center text-xs font-bold text-emerald-700 outline-none" placeholder="0">
                                                <span class="absolute right-1 top-2 text-[8px] text-emerald-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-group bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
                                        <div class="flex justify-between items-center mb-2">
                                            <label class="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Venda Atacado</label>
                                            <div id="wholesale-profit-badge" class="hidden px-2 py-0.5 rounded-full bg-blue-50 text-[8px] font-black text-blue-600 uppercase">Lucro: R$ 0.00</div>
                                        </div>
                                        <div class="flex gap-3 items-center">
                                            <div class="relative flex-1">
                                                <span class="absolute left-0 top-1.5 text-slate-400 text-xs font-bold">R$</span>
                                                <input type="number" id="prod-wholesale" step="0.01" class="w-full pl-6 bg-transparent border-none text-2xl font-black text-slate-900 focus:ring-0 outline-none p-0" placeholder="0.00">
                                            </div>
                                             <div class="relative w-20">
                                                <input type="number" id="prod-margin-wholesale" class="w-full bg-blue-50 border border-blue-100 rounded-lg p-2 text-center text-xs font-bold text-blue-700 outline-none" placeholder="0">
                                                <span class="absolute right-1 top-2 text-[8px] text-blue-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                     <!-- Media -->
                                    <div class="bg-white p-4 rounded-xl border border-slate-200">
                                        <div class="flex items-center gap-4">
                                            <div id="photo-preview" class="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                                <i data-feather="image" class="w-6 h-6 text-slate-300"></i>
                                            </div>
                                            <div class="flex gap-2">
                                                <button type="button" onclick="document.getElementById('prod-photo-camera').click()" class="bg-slate-900 text-white px-3 py-2 rounded-lg text-[9px] font-bold uppercase hover:bg-black transition-all">Câmera</button>
                                                <button type="button" onclick="document.getElementById('prod-photo-gallery').click()" class="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-50 transition-all">Arquivo</button>
                                            </div>
                                            <input type="file" id="prod-photo-camera" accept="image/*" capture="environment" class="hidden">
                                            <input type="file" id="prod-photo-gallery" accept="image/*" class="hidden">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                         <div class="form-group mt-8">
                            <label class="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Observações Técnicas</label>
                            <textarea id="prod-specifications" rows="2" class="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all resize-none placeholder-slate-300"></textarea>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50/50">
                        <label class="flex items-center gap-3 cursor-pointer group">
                             <div class="relative w-10 h-5 flex items-center">
                                <input type="checkbox" id="prod-manage-stock" checked class="peer sr-only">
                                <div class="w-full h-full bg-slate-200 rounded-full transition-all peer-checked:bg-slate-900"></div>
                                <div class="absolute left-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
                            </div>
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Gerenciar Estoque</span>
                        </label>
                        
                        <div class="flex gap-4">
                            <button type="button" id="btn-cancel-modal" class="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-red-500 hover:border-red-200 transition-all">Cancelar</button>
                            <button type="button" id="save-prod-btn" class="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                <i data-feather="check" class="w-4 h-4"></i> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSupplierModal() {
        return `
            <div id="supplier-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-unitech-primary/10 text-unitech-primary flex items-center justify-center">
                                <i data-feather="user-plus" class="w-5 h-5"></i>
                            </div>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Novo Fornecedor</h3>
                        </div>
                        <button id="close-supplier-modal" class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
                            <i data-feather="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    <div class="p-8 space-y-5 bg-white">
                        <div class="form-group">
                            <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Nome Fantasia / Razão Social</label>
                            <input type="text" id="supp-name" placeholder="Ex: Apple Imports LTDA" class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-unitech-primary/5 focus:border-unitech-primary outline-none transition-all shadow-sm font-bold">
                        </div>
                        <div class="form-group">
                            <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Telefone / WhatsApp Comercial</label>
                            <input type="text" id="supp-phone" class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-unitech-primary/5 focus:border-unitech-primary outline-none transition-all shadow-sm font-bold" placeholder="(00) 00000-0000">
                        </div>
                        <div class="form-group">
                            <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Documento (CNPJ / CPF)</label>
                            <input type="text" id="supp-doc" placeholder="00.000.000/0001-00" class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-unitech-primary/5 focus:border-unitech-primary outline-none transition-all shadow-sm font-bold">
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row justify-end items-center p-6 bg-gray-50 border-t border-gray-100 gap-4">
                        <button type="button" id="close-supplier-modal-btn" class="w-full sm:w-auto bg-white border border-gray-200 text-gray-500 font-bold py-3 px-8 rounded-xl text-xs hover:bg-gray-100 transition-all uppercase tracking-widest">Fechar</button>
                        <button type="button" id="save-supplier-btn" class="w-full sm:w-auto bg-unitech-primary hover:bg-red-700 text-white font-black py-3 px-10 rounded-xl text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest">Salvar Registro</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderCategoryModal() {
        return `
            <div id="category-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                        <div class="flex items-center gap-3">
                             <div class="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                <i data-feather="hash" class="w-5 h-5"></i>
                            </div>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Categorias</h3>
                        </div>
                        <button id="close-category-modal" class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
                            <i data-feather="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    <div class="p-8 space-y-8 bg-white">
                        <div class="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Apelido da Categoria</label>
                                <input type="text" id="cat-name" placeholder="Ex: Placas-mãe" class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all shadow-sm font-bold bg-white">
                            </div>
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Identificador Visual (Cor)</label>
                                <div class="flex gap-4 items-center">
                                    <input type="color" id="cat-color" value="#3b82f6" class="w-16 h-12 border border-gray-200 rounded-xl p-1 bg-white cursor-pointer shadow-sm">
                                    <p class="text-[10px] text-gray-400 font-bold uppercase italic">Clique para escolher a cor do badge</p>
                                </div>
                            </div>
                            <div class="flex justify-end gap-3 pt-2">
                                <button type="button" id="cancel-cat-edit" class="hidden bg-white border border-gray-200 text-gray-500 font-bold px-6 py-2 rounded-xl text-[10px] uppercase transition-all">Cancelar Edição</button>
                                <button type="button" id="save-category-btn" class="bg-slate-900 hover:bg-black text-white font-black px-8 py-3 rounded-xl text-[10px] uppercase shadow-lg active:scale-95 transition-all">Salvar</button>
                            </div>
                        </div>
                        
                        <div class="space-y-3">
                            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Categorias Existentes</h4>
                            <div class="max-h-60 overflow-y-auto custom-scrollbar border border-gray-100 rounded-2xl shadow-sm">
                                <table class="w-full text-left">
                                    <thead class="bg-gray-50 sticky top-0"><tr class="border-b border-gray-100"><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Status</th><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Nome</th><th class="p-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Gestão</th></tr></thead>
                                    <tbody id="category-table-body" class="divide-y divide-gray-100">${this.renderCategoryRows()}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 bg-gray-50 border-t border-gray-100 text-right">
                        <button type="button" id="close-category-modal-btn" class="bg-white border border-gray-200 text-gray-500 font-bold px-10 py-3 rounded-xl text-xs hover:bg-gray-100 transition-all uppercase tracking-widest">Encerrar</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderCategoryRows() {
        return storage.getCategories().map(cat => `
            <tr class="hover:bg-blue-50/50 transition-colors">
                <td class="p-4 w-16"><div class="w-5 h-5 rounded-lg shadow-sm" style="background-color: ${cat.color}"></div></td>
                <td class="p-4 font-black text-slate-800 text-xs uppercase">${cat.name}</td>
                <td class="p-4 text-right">
                    <div class="flex justify-end gap-3">
                        <button class="edit-cat-btn text-blue-500 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-all" data-id="${cat.id}" data-name="${cat.name}" data-color="${cat.color}"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                        <button class="delete-cat-btn text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-all" data-id="${cat.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="p-10 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">Nenhuma categoria cadastrada</td></tr>';
    }

    renderLocationModal() {
        return `
            <div id="location-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                        <div class="flex items-center gap-3">
                             <div class="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                                <i data-feather="map" class="w-5 h-5"></i>
                            </div>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Locais Físicos</h3>
                        </div>
                        <button id="close-location-modal" class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"><i data-feather="x" class="w-6 h-6"></i></button>
                    </div>
                    <div class="p-8 space-y-8 bg-white">
                        <div class="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Nome da Localização</label>
                                <input type="text" id="loc-name" placeholder="Ex: Galpão A / Loja Matriz" class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all shadow-sm font-bold bg-white">
                            </div>
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Sinalização (Cor)</label>
                                <input type="color" id="loc-color" value="#10b981" class="w-full h-12 border border-gray-100 rounded-xl p-1 bg-white cursor-pointer shadow-sm">
                            </div>
                            <div class="flex justify-end pt-2">
                                <button id="save-location-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-3 rounded-xl text-[10px] uppercase shadow-lg active:scale-95 transition-all">Adicionar Unidade</button>
                            </div>
                        </div>
                        <div id="location-table-body-container" class="max-h-60 overflow-y-auto border border-gray-100 rounded-2xl shadow-sm custom-scrollbar">
                             <table class="w-full text-left">
                                <thead class="bg-gray-50 sticky top-0"><tr class="border-b border-gray-100"><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Ind.</th><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Unidade</th><th class="p-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Ações</th></tr></thead>
                                <tbody id="location-table-body" class="divide-y divide-gray-100">${this.renderLocationRows()}</tbody>
                             </table>
                        </div>
                    </div>
                    <div class="p-6 bg-gray-50 border-t border-gray-100 text-right"><button id="close-location-modal-btn" class="bg-white border border-gray-200 text-gray-500 font-bold px-10 py-3 rounded-xl text-xs hover:bg-gray-100 transition-all uppercase tracking-widest">Fechar</button></div>
                </div>
            </div>
        `;
    }

    renderLocationRows() {
        return storage.getLocations().map(loc => `
            <tr class="hover:bg-indigo-50/50 transition-colors">
                <td class="p-4 w-16"><div class="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style="background-color: ${loc.color}"></div></td>
                <td class="p-4 font-black text-slate-800 text-xs uppercase tracking-tight">${loc.name}</td>
                <td class="p-4 text-right">
                    <button class="delete-loc-btn text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all" data-id="${loc.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="p-10 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">Nenhuma localização configurada</td></tr>';
    }

    renderPhysicalLocationModal() {
        return `
            <div id="physical-location-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                        <div class="flex items-center gap-3">
                             <div class="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center">
                                <i data-feather="layers" class="w-5 h-5"></i>
                            </div>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Setores e Gavetas</h3>
                        </div>
                        <button id="close-physical-location-modal" class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"><i data-feather="x" class="w-6 h-6"></i></button>
                    </div>
                    <div class="p-8 space-y-6 bg-white font-bold">
                        <div class="grid grid-cols-1 gap-4">
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Identificador (Ex: Gaveta 03 / Prateleira 2)</label>
                                <input type="text" id="phys-loc-name" placeholder="Nome do setor..." class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none transition-all shadow-sm bg-white font-black">
                            </div>
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Cromatização de Setor</label>
                                <input type="color" id="phys-loc-color" value="#f59e0b" class="w-full h-12 border border-gray-100 rounded-xl p-1 bg-white cursor-pointer shadow-sm">
                            </div>
                        </div>
                        <button id="save-physical-location-btn" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest">Adicionar Setor</button>
                        
                        <div class="max-h-52 overflow-y-auto custom-scrollbar border border-gray-100 rounded-2xl shadow-sm">
                            <table class="w-full text-left">
                                <thead class="bg-gray-50 sticky top-0"><tr class="border-b border-gray-100"><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Marker</th><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Setor</th><th class="p-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Gestão</th></tr></thead>
                                <tbody id="physical-location-table-body" class="divide-y divide-gray-100">${this.renderPhysicalLocationRows()}</tbody>
                            </table>
                        </div>
                    </div>
                    <div class="p-6 bg-gray-50 border-t border-gray-100 text-right"><button id="close-physical-location-modal-btn" class="bg-white border border-gray-200 text-gray-500 font-bold px-10 py-3 rounded-xl text-xs hover:bg-gray-100 transition-all uppercase tracking-widest">Fechar</button></div>
                </div>
            </div>
        `;
    }

    renderPhysicalLocationRows() {
        return storage.getPhysicalLocations().map(loc => `
            <tr class="hover:bg-orange-50/50 transition-colors">
                <td class="p-4 w-16 text-center"><div class="w-4 h-4 rounded shadow-sm mx-auto" style="background-color: ${loc.color}"></div></td>
                <td class="p-4 font-black text-slate-800 text-xs uppercase tracking-tight">${loc.name}</td>
                <td class="p-4 text-right"><button class="delete-phys-loc-btn text-red-400 hover:text-red-600 p-2 rounded-lg transition-all" data-id="${loc.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="p-10 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">Nenhum setor cadastrado</td></tr>';
    }

    renderPhysicalLocationOptions() {
        return storage.getPhysicalLocations().map(l => `<option value="${l.name}">${l.name}</option>`).join('');
    }

    renderBoxModal() {
        return `
            <div id="box-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                        <div class="flex items-center gap-3">
                             <div class="w-10 h-10 rounded-xl bg-pink-600/10 text-pink-600 flex items-center justify-center">
                                <i data-feather="box" class="w-5 h-5"></i>
                            </div>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Gestão de Caixas</h3>
                        </div>
                        <button id="close-box-modal" class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"><i data-feather="x" class="w-6 h-6"></i></button>
                    </div>
                    <div class="p-8 space-y-6 bg-white">
                        <div class="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Identificador da Caixa</label>
                                <input type="text" id="box-name" placeholder="Ex: CX-01 / Caixa de Telas" class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500 outline-none transition-all shadow-sm bg-white font-black">
                            </div>
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Etiqueta Colorida</label>
                                <input type="color" id="box-color" value="#ec4899" class="w-full h-12 border border-gray-100 rounded-xl p-1 bg-white cursor-pointer shadow-sm">
                            </div>
                            <button id="save-box-btn" class="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-4 rounded-xl text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest">Registrar Caixa</button>
                        </div>
                        <div class="max-h-52 overflow-y-auto custom-scrollbar border border-gray-100 rounded-2xl shadow-sm">
                            <table class="w-full text-left">
                                <thead class="bg-gray-50 sticky top-0"><tr class="border-b border-gray-100"><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Tag</th><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Identificação</th><th class="p-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Ações</th></tr></thead>
                                <tbody id="box-table-body" class="divide-y divide-gray-100 font-bold">${this.renderBoxRows()}</tbody>
                            </table>
                        </div>
                    </div>
                    <div class="p-6 bg-gray-50 border-t border-gray-100 text-right"><button id="close-box-modal-btn" class="bg-white border border-gray-200 text-gray-500 font-bold px-10 py-3 rounded-xl text-xs hover:bg-gray-100 transition-all uppercase tracking-widest">Fechar</button></div>
                </div>
            </div>
        `;
    }

    renderBoxRows() {
        return storage.getBoxes().map(b => `
            <tr class="border-b">
                <td class="p-2"><div class="w-4 h-4 rounded" style="background-color: ${b.color}"></div></td>
                <td class="p-2 font-bold">${b.name}</td>
                <td class="p-2 text-right"><button class="delete-box-btn text-red-500" data-id="${b.id}"><i data-feather="trash-2" class="w-3 h-3"></i></button></td>
            </tr>
        `).join('');
    }

    renderBrandOptions() {
        return storage.getBrands().map(b => `<option value="${b.name}">${b.name}</option>`).join('');
    }

    renderBrandRows() {
        return storage.getBrands().map(b => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-4 w-16"><div class="w-5 h-5 rounded-lg shadow-sm" style="background-color: ${b.color}"></div></td>
                <td class="p-4 font-black text-slate-800 text-xs uppercase">${b.name}</td>
                <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                        <button class="edit-brand-btn text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-all" data-id="${b.id}" data-name="${b.name}" data-color="${b.color}"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                        <button class="delete-brand-btn text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all" data-id="${b.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="p-10 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">Nenhuma marca cadastrada</td></tr>';
    }

    renderBrandModal() {
        return `
            <div id="brand-modal" class="hidden fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-gray-100 flex flex-col">
                    <div class="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
                        <div class="flex items-center gap-3">
                             <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                                <i data-feather="award" class="w-5 h-5"></i>
                            </div>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Gerenciar Marcas</h3>
                        </div>
                        <button id="close-brand-modal" class="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"><i data-feather="x" class="w-6 h-6"></i></button>
                    </div>
                    <div class="p-8 space-y-6 bg-white">
                        <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Nome da Marca</label>
                                <input type="text" id="brand-name" placeholder="Ex: Samsung, Apple..." class="w-full border border-gray-200 rounded-xl p-4 text-sm !text-slate-900 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm font-bold bg-white">
                            </div>
                            <div class="form-group">
                                <label class="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Cor da Tag</label>
                                <input type="color" id="brand-color" value="#334155" class="w-full h-12 border border-gray-200 rounded-xl p-1 bg-white cursor-pointer shadow-sm">
                            </div>
                            <button id="save-brand-btn" class="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl text-xs shadow-lg active:scale-95 transition-all uppercase tracking-widest">Adicionar Marca</button>
                        </div>
                        
                        <div class="space-y-3">
                             <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Marcas Registradas</h4>
                             <div class="max-h-52 overflow-y-auto custom-scrollbar border border-gray-100 rounded-2xl shadow-sm">
                                <table class="w-full text-left">
                                    <thead class="bg-gray-50 sticky top-0"><tr class="border-b border-gray-100"><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Tag</th><th class="p-4 text-[9px] font-black text-gray-400 uppercase">Marca</th><th class="p-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Ações</th></tr></thead>
                                    <tbody id="brand-table-body" class="divide-y divide-gray-100">${this.renderBrandRows()}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 bg-gray-50 border-t border-gray-100 text-right"><button id="close-brand-modal-btn" class="bg-white border border-gray-200 text-gray-500 font-bold px-10 py-3 rounded-xl text-xs hover:bg-gray-100 transition-all uppercase tracking-widest">Fechar</button></div>
                </div>
            </div>
        `;
    }

    renderImageModal() {
        return `
            <div id="image-modal" class="hidden fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in" onclick="this.classList.add('hidden')">
                <button class="absolute top-5 right-5 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full p-2"><i data-feather="x" class="w-8 h-8"></i></button>
                <img id="image-modal-content" src="" class="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain animate-scale-in" onclick="event.stopPropagation()">
            </div>
        `;
    }

    renderLocationOptions() {
        return storage.getLocations().map(l => `<option value="${l.name}">${l.name}</option>`).join('');
    }

    renderBoxOptions() {
        return storage.getBoxes().map(b => `<option value="${b.name}">${b.name}</option>`).join('');
    }

    render() {
        const productList = document.getElementById('product-list');
        if (productList) productList.innerHTML = this.renderRows();

        const btnNewProduct = document.getElementById('btn-new-product');
        if (btnNewProduct) {
            const hasSelection = this.selectedIds.size > 0;
            let bulkBtn = document.getElementById('btn-bulk-delete-prod');

            if (hasSelection) {
                if (!bulkBtn) {
                    const btnHTML = `<button id="btn-bulk-delete-prod" class="bg-red-500 hover:bg-red-600 text-white font-bold h-10 px-4 rounded text-sm flex items-center gap-2 transition-all animate-fade-in shadow-sm"><i data-feather="trash-2" class="w-4 h-4"></i> Excluir (${this.selectedIds.size})</button>`;
                    btnNewProduct.insertAdjacentHTML('afterend', btnHTML);
                    bulkBtn = document.getElementById('btn-bulk-delete-prod');
                } else {
                    bulkBtn.innerHTML = `<i data-feather="trash-2" class="w-4 h-4"></i> Excluir (${this.selectedIds.size})`;
                }
                bulkBtn.onclick = () => this.handleBulkDelete();
            } else if (bulkBtn) {
                bulkBtn.remove();
            }

            const inputs = btnNewProduct.parentElement.querySelectorAll('input, select');
            inputs.forEach(el => {
                if (el.id !== 'btn-new-product' && el.id !== 'btn-bulk-delete-prod') {
                    if (hasSelection) el.classList.add('opacity-50', 'pointer-events-none');
                    else el.classList.remove('opacity-50', 'pointer-events-none');
                }
            });
        }

        this.attachDynamicEvents();
        this.attachStaticEvents();
        if (window.feather) window.feather.replace();
    }

    handleBulkDelete() {
        if (confirm(`Tem certeza que deseja excluir ${this.selectedIds.size} produtos selecionados?`)) {
            this.selectedIds.forEach(id => storage.deleteProduct(id));
            this.products = storage.getProducts();
            this.selectedIds.clear();
            this.render();
            const checkAll = document.getElementById('check-all-products');
            if (checkAll) checkAll.checked = false;
        }
    }

    handleDelete(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            storage.deleteProduct(id);
            this.products = storage.getProducts();
            this.selectedIds.delete(String(id));
            this.render();
        }
    }

    checkDuplicateSku() {
        const skuInput = document.getElementById('prod-sku');
        const sku = skuInput.value.trim();
        if (!sku || sku.length < 3) return;

        // Skip if editing the same product
        if (this.currentMode === 'edit' && this.currentId) {
            const current = this.products.find(p => p.id == this.currentId);
            if (current && current.sku === sku) return;
        }

        const existing = this.products.find(p => p.sku === sku);
        if (existing) {
            setTimeout(() => {
                if (confirm(`⚠️ SKU JÁ CADASTRADO!\nO SKU "${sku}" já pertence ao produto "${existing.name}".\nDeseja atualizar o estoque deste produto em vez de criar um novo?`)) {
                    const newStock = prompt(`Estoque Atual: ${existing.stock}\nInforme a nova quantidade total:`, existing.stock);
                    if (newStock !== null && !isNaN(parseInt(newStock))) {
                        existing.stock = parseInt(newStock);
                        storage.updateProduct(existing);
                        this.products = storage.getProducts();
                        this.render();
                        document.getElementById('product-modal').classList.add('hidden');
                        alert('✅ Estoque atualizado!');
                    }
                } else {
                    skuInput.value = '';
                    skuInput.focus();
                }
            }, 100);
        }
    }

    attachStaticEvents() {
        // Removed persistent guard to allow re-attachment on render
        // if (this.staticEventsAttached) return;
        // this.staticEventsAttached = true;

        // SKU Input Events
        const skuInput = document.getElementById('prod-sku');
        if (skuInput) {
            skuInput.addEventListener('blur', () => this.checkDuplicateSku());
            skuInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.checkDuplicateSku();
                }
            });
            let debounceSku;
            skuInput.addEventListener('input', () => {
                clearTimeout(debounceSku);
                debounceSku = setTimeout(() => this.checkDuplicateSku(), 800);
            });
        }

        // Search Barcode (Filters Grid)
        const searchBarcode = document.getElementById('search-barcode');
        if (searchBarcode && !searchBarcode.dataset.hasListener) {
            searchBarcode.dataset.hasListener = 'true';
            let debounceBarcode;
            searchBarcode.addEventListener('input', (e) => {
                clearTimeout(debounceBarcode);
                debounceBarcode = setTimeout(() => {
                    this.filters.sku = e.target.value.trim().toLowerCase();
                    this.applyFilters();
                }, 300);
            });
            searchBarcode.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const sku = searchBarcode.value.trim();
                    // If it's a perfect match, we might want to edit it directly
                    const found = storage.getProducts().find(p => p.sku === sku);
                    if (found) {
                        this.openModal(found.id, 'edit');
                        searchBarcode.value = '';
                        this.filters.sku = '';
                        this.applyFilters();
                    }
                }
            });
        }

        // Search Name (Filters Grid)
        const searchName = document.getElementById('search-name');
        if (searchName && !searchName.dataset.hasListener) {
            searchName.dataset.hasListener = 'true';
            let debounceName;
            searchName.addEventListener('input', (e) => {
                clearTimeout(debounceName);
                debounceName = setTimeout(() => {
                    this.filters.name = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 300);
            });
        }

        // Filter Category
        const filterCat = document.getElementById('filter-category');
        if (filterCat && !filterCat.dataset.hasListener) {
            filterCat.dataset.hasListener = 'true';
            filterCat.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }

        // Filter Supplier
        const filterSup = document.getElementById('filter-supplier');
        if (filterSup && !filterSup.dataset.hasListener) {
            filterSup.dataset.hasListener = 'true';
            filterSup.addEventListener('change', (e) => {
                this.filters.supplier = e.target.value;
                this.applyFilters();
            });
        }
        // Apply Filters Button (Manual trigger)
        const btnApply = document.getElementById('btn-apply-filters');
        if (btnApply && !btnApply.dataset.hasListener) {
            btnApply.dataset.hasListener = 'true';
            btnApply.addEventListener('click', () => this.applyFilters());
        }

        // Modal Triggers
        const btnNew = document.getElementById('btn-new-product');
        if (btnNew && !btnNew.dataset.hasListener) {
            btnNew.dataset.hasListener = 'true';
            btnNew.addEventListener('click', () => {
                this.resetModal();
                document.getElementById('product-modal')?.classList.remove('hidden');
            });
        }

        ['close-intro-modal', 'btn-cancel-modal'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn && !btn.dataset.hasListener) {
                btn.dataset.hasListener = 'true';
                btn.addEventListener('click', () => {
                    document.getElementById('product-modal')?.classList.add('hidden');
                });
            }
        });

        const saveBtn = document.getElementById('save-prod-btn');
        if (saveBtn && !saveBtn.dataset.hasListener) {
            saveBtn.dataset.hasListener = 'true';
            saveBtn.addEventListener('click', () => this.saveProduct());
        }

        // Price Calculations
        const priceIds = ['prod-cost', 'prod-retail', 'prod-wholesale', 'prod-margin-retail', 'prod-margin-wholesale'];
        priceIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hasListener) {
                el.dataset.hasListener = 'true';
                el.addEventListener('input', () => this.updatePriceCalculations(id));
            }
        });

        // Supplier Modal
        const btnSup = document.getElementById('btn-open-supplier-modal');
        if (btnSup && !btnSup.dataset.hasListener) {
            btnSup.dataset.hasListener = 'true';
            btnSup.addEventListener('click', () => {
                document.getElementById('supplier-modal')?.classList.remove('hidden');
            });
        }

        ['close-supplier-modal', 'close-supplier-modal-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hasListener) {
                el.dataset.hasListener = 'true';
                el.addEventListener('click', () => document.getElementById('supplier-modal').classList.add('hidden'));
            }
        });

        const saveSup = document.getElementById('save-supplier-btn');
        if (saveSup && !saveSup.dataset.hasListener) {
            saveSup.dataset.hasListener = 'true';
            saveSup.addEventListener('click', () => this.handleSaveSupplier());
        }

        // Category Modal
        const openCatModal = () => {
            document.getElementById('category-modal')?.classList.remove('hidden');
            this.refreshCategoriesUI();
        };
        const btnOpenCat = document.getElementById('btn-open-category-modal');
        if (btnOpenCat && !btnOpenCat.dataset.hasListener) {
            btnOpenCat.dataset.hasListener = 'true';
            btnOpenCat.addEventListener('click', openCatModal);
        }
        ['close-category-modal', 'close-category-modal-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hasListener) {
                el.dataset.hasListener = 'true';
                el.addEventListener('click', () => document.getElementById('category-modal').classList.add('hidden'));
            }
        });
        const saveCat = document.getElementById('save-category-btn');
        if (saveCat && !saveCat.dataset.hasListener) {
            saveCat.dataset.hasListener = 'true';
            saveCat.addEventListener('click', () => this.handleSaveCategory());
        }

        // Physical Location Modal
        const openPhysLocModal = () => {
            document.getElementById('physical-location-modal').classList.remove('hidden');
            this.refreshPhysicalLocationsUI();
        };
        const btnOpenPhys = document.getElementById('btn-open-physical-location-modal');
        if (btnOpenPhys && !btnOpenPhys.dataset.hasListener) {
            btnOpenPhys.dataset.hasListener = 'true';
            btnOpenPhys.addEventListener('click', openPhysLocModal);
        }
        ['close-physical-location-modal', 'close-physical-location-modal-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hasListener) {
                el.dataset.hasListener = 'true';
                el.addEventListener('click', () => document.getElementById('physical-location-modal').classList.add('hidden'));
            }
        });
        const savePhys = document.getElementById('save-physical-location-btn');
        if (savePhys && !savePhys.dataset.hasListener) {
            savePhys.dataset.hasListener = 'true';
            savePhys.addEventListener('click', () => this.handleSavePhysicalLocation());
        }

        // Box Modal
        const openBoxModal = () => {
            document.getElementById('box-modal').classList.remove('hidden');
            this.refreshBoxUI();
        };
        const btnOpenBox = document.getElementById('btn-open-box-modal');
        if (btnOpenBox && !btnOpenBox.dataset.hasListener) {
            btnOpenBox.dataset.hasListener = 'true';
            btnOpenBox.addEventListener('click', openBoxModal);
        }
        ['close-box-modal', 'close-box-modal-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hasListener) {
                el.dataset.hasListener = 'true';
                el.addEventListener('click', () => document.getElementById('box-modal').classList.add('hidden'));
            }
        });
        const saveBox = document.getElementById('save-box-btn');
        if (saveBox && !saveBox.dataset.hasListener) {
            saveBox.dataset.hasListener = 'true';
            saveBox.addEventListener('click', () => this.handleSaveBox());
        }

        // Brand Modal (New)
        const openBrandModal = () => {
            document.getElementById('brand-modal').classList.remove('hidden');
            this.refreshBrandsUI();
        };
        const btnOpenBrand = document.getElementById('btn-open-brand-modal');
        if (btnOpenBrand && !btnOpenBrand.dataset.hasListener) {
            btnOpenBrand.dataset.hasListener = 'true';
            btnOpenBrand.addEventListener('click', openBrandModal);
        }
        ['close-brand-modal', 'close-brand-modal-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hasListener) {
                el.dataset.hasListener = 'true';
                el.addEventListener('click', () => {
                    document.getElementById('brand-modal').classList.add('hidden');
                    // Reset State
                    this.editingBrandId = null;
                    document.getElementById('brand-name').value = '';
                    document.getElementById('brand-color').value = '#334155';
                    document.getElementById('save-brand-btn').innerText = 'Adicionar Marca';
                });
            }
        });
        const saveBrand = document.getElementById('save-brand-btn');
        if (saveBrand && !saveBrand.dataset.hasListener) {
            saveBrand.dataset.hasListener = 'true';
            saveBrand.addEventListener('click', () => this.handleSaveBrand());
        }

        // Mock Scan
        const btnScan = document.getElementById('btn-scan');
        if (btnScan && !btnScan.dataset.hasListener) {
            btnScan.dataset.hasListener = 'true';
            btnScan.addEventListener('click', () => this.handleMockScan());
        }

        // Location Modal
        const openLocModal = () => {
            document.getElementById('location-modal').classList.remove('hidden');
            this.refreshLocationsUI();
        };
        const btnOpenLoc = document.getElementById('btn-open-location-modal');
        if (btnOpenLoc && !btnOpenLoc.dataset.hasListener) {
            btnOpenLoc.dataset.hasListener = 'true';
            btnOpenLoc.addEventListener('click', openLocModal);
        }
        ['close-location-modal', 'close-location-modal-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hasListener) {
                el.dataset.hasListener = 'true';
                el.addEventListener('click', () => document.getElementById('location-modal').classList.add('hidden'));
            }
        });
        const saveLoc = document.getElementById('save-location-btn');
        if (saveLoc && !saveLoc.dataset.hasListener) {
            saveLoc.dataset.hasListener = 'true';
            saveLoc.addEventListener('click', () => this.handleSaveLocation());
        }

        // Photo Upload
        const photoCam = document.getElementById('prod-photo-camera');
        if (photoCam && !photoCam.dataset.hasListener) {
            photoCam.dataset.hasListener = 'true';
            photoCam.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
        const photoGal = document.getElementById('prod-photo-gallery');
        if (photoGal && !photoGal.dataset.hasListener) {
            photoGal.dataset.hasListener = 'true';
            photoGal.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
    }

    attachDynamicEvents() {
        const checkAll = document.getElementById('check-all-products');
        if (checkAll) {
            checkAll.onchange = (e) => {
                const checked = e.target.checked;
                this.products.forEach(p => {
                    if (checked) this.selectedIds.add(String(p.id));
                    else this.selectedIds.clear();
                });
                this.render();
            };
        }

        document.querySelectorAll('.prod-check').forEach(chk => {
            chk.onchange = (e) => {
                const id = e.target.dataset.id;
                if (e.target.checked) this.selectedIds.add(id);
                else this.selectedIds.delete(id);
                this.render();
            };
        });

        // Use Event Delegation for Table Actions (More robust for reactive re-renders)
        const productList = document.getElementById('product-list');
        if (productList && !productList.dataset.hasDelegate) {
            productList.dataset.hasDelegate = 'true';
            productList.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.btn-edit');
                const btnDelete = e.target.closest('.btn-delete');
                const imgTrigger = e.target.closest('.product-img-trigger');

                if (imgTrigger && imgTrigger.dataset.photo) {
                    const modal = document.getElementById('image-modal');
                    const img = document.getElementById('image-modal-content');
                    if (modal && img) {
                        img.src = imgTrigger.dataset.photo;
                        modal.classList.remove('hidden');
                    }
                } else if (btnEdit) {
                    const id = btnEdit.dataset.id;
                    this.openModal(id, 'edit');
                } else if (btnDelete) {
                    const id = btnDelete.dataset.id;
                    this.handleDelete(id);
                } else if (e.target.closest('.btn-share-catalog')) {
                    const id = e.target.closest('.btn-share-catalog').dataset.id;
                    this.handleShareCatalog(id);
                }
            });
        }

        // Delegate Category Actions
        const catBody = document.getElementById('category-table-body');
        if (catBody) {
            catBody.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-cat-btn');
                const editBtn = e.target.closest('.edit-cat-btn');

                if (deleteBtn) {
                    if (confirm('Tem certeza que deseja excluir esta categoria? Isso não removerá os produtos, mas eles ficarão sem categoria.')) {
                        storage.deleteCategory(deleteBtn.dataset.id);
                        this.refreshCategoriesUI();
                    }
                } else if (editBtn) {
                    this.editingCategoryId = editBtn.dataset.id;
                    document.getElementById('cat-name').value = editBtn.dataset.name;
                    document.getElementById('cat-color').value = editBtn.dataset.color;

                    const btn = document.getElementById('save-category-btn');
                    if (btn) btn.innerText = 'Atualizar Categoria';

                    // Show cancel button if implemented
                    const cancel = document.getElementById('cancel-cat-edit');
                    if (cancel) {
                        cancel.classList.remove('hidden');
                        cancel.onclick = () => {
                            this.editingCategoryId = null;
                            document.getElementById('cat-name').value = '';
                            document.getElementById('cat-color').value = '#3b82f6';
                            btn.innerText = 'Salvar';
                            cancel.classList.add('hidden');
                        };
                    }
                }
            });
        }

        // Delegate Brand Actions
        const brandBody = document.getElementById('brand-table-body');
        if (brandBody) {
            brandBody.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-brand-btn');
                const editBtn = e.target.closest('.edit-brand-btn');

                if (deleteBtn) {
                    if (confirm('Excluir esta marca?')) {
                        storage.deleteBrand(deleteBtn.dataset.id);
                        this.refreshBrandsUI();
                    }
                } else if (editBtn) {
                    this.editingBrandId = editBtn.dataset.id;
                    document.getElementById('brand-name').value = editBtn.dataset.name;
                    document.getElementById('brand-color').value = editBtn.dataset.color;

                    const btn = document.getElementById('save-brand-btn');
                    if (btn) btn.innerText = 'Atualizar Marca';
                }
            });
        }

        // Delegate Location Actions
        document.getElementById('location-table-body')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-loc-btn');
            if (deleteBtn) {
                if (confirm('Excluir este local?')) {
                    storage.deleteLocation(deleteBtn.dataset.id);
                    this.refreshLocationsUI();
                }
            }
        });

        // Delegate Location Actions
        document.getElementById('location-table-body')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-loc-btn');
            if (deleteBtn) {
                if (confirm('Excluir este local?')) {
                    storage.deleteLocation(deleteBtn.dataset.id);
                    this.refreshLocationsUI();
                }
            }
        });

        // Delegate Physical Location Actions
        document.getElementById('physical-location-table-body')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-phys-loc-btn');
            if (deleteBtn) {
                if (confirm('Excluir este local físico?')) {
                    storage.deletePhysicalLocation(deleteBtn.dataset.id);
                    this.refreshPhysicalLocationsUI();
                }
            }
        });

        // Delegate Box Actions
        document.getElementById('box-table-body')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-box-btn');
            if (deleteBtn) {
                if (confirm('Excluir esta caixa?')) {
                    storage.deleteBox(deleteBtn.dataset.id);
                    this.refreshBoxUI();
                }
            }
        });



        // Delegate Location Actions
        document.getElementById('location-table-body')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-loc-btn');
            if (deleteBtn) {
                if (confirm('Excluir este local?')) {
                    storage.deleteLocation(deleteBtn.dataset.id);
                    this.refreshLocationsUI();
                }
            }
        });
    }

    updatePriceCalculations(triggerId) {
        const costInput = document.getElementById('prod-cost');
        const retailInput = document.getElementById('prod-retail');
        const wholesaleInput = document.getElementById('prod-wholesale');
        const mRetailInput = document.getElementById('prod-margin-retail');
        const mWholesaleInput = document.getElementById('prod-margin-wholesale');

        const retailBadge = document.getElementById('retail-profit-badge');
        const wholesaleBadge = document.getElementById('wholesale-profit-badge');

        const cost = parseFloat(costInput.value) || 0;

        // Retail Calculations
        if (triggerId === 'prod-cost' || triggerId === 'prod-retail') {
            const retail = parseFloat(retailInput.value) || 0;
            if (cost > 0) mRetailInput.value = (((retail - cost) / cost) * 100).toFixed(0);
        } else if (triggerId === 'prod-margin-retail') {
            const margin = parseFloat(mRetailInput.value) || 0;
            if (cost > 0) retailInput.value = (cost * (1 + margin / 100)).toFixed(2);
        }

        // Wholesale Calculations
        if (triggerId === 'prod-cost' || triggerId === 'prod-wholesale') {
            const wholesale = parseFloat(wholesaleInput.value) || 0;
            if (cost > 0) mWholesaleInput.value = (((wholesale - cost) / cost) * 100).toFixed(0);
        } else if (triggerId === 'prod-margin-wholesale') {
            const margin = parseFloat(mWholesaleInput.value) || 0;
            if (cost > 0) wholesaleInput.value = (cost * (1 + margin / 100)).toFixed(2);
        }

        // Update Profit Badges
        const curRetail = parseFloat(retailInput.value) || 0;
        const curWholesale = parseFloat(wholesaleInput.value) || 0;

        if (cost > 0 && curRetail > 0) {
            const profit = curRetail - cost;
            retailBadge.innerHTML = `Lucro: R$ ${profit.toFixed(2)}`;
            retailBadge.classList.remove('hidden');
        } else {
            retailBadge.classList.add('hidden');
        }

        if (cost > 0 && curWholesale > 0) {
            const profit = curWholesale - cost;
            wholesaleBadge.innerHTML = `Lucro: R$ ${profit.toFixed(2)}`;
            wholesaleBadge.classList.remove('hidden');
        } else {
            wholesaleBadge.classList.add('hidden');
        }
    }

    async handleSaveLocation() {
        const name = document.getElementById('loc-name').value.trim() || 'Local S/N';
        const color = document.getElementById('loc-color').value;
        await storage.addLocation({ id: Date.now(), name, color });
        this.refreshLocationsUI();
        document.getElementById('loc-name').value = '';
        window.toastService.success('Local adicionado!');
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                window.toastService.error('A imagem deve ter no máximo 5MB.');
                return;
            }

            // Show Loading
            const preview = document.getElementById('photo-preview');
            preview.innerHTML = '<div class="absolute inset-0 flex items-center justify-center animate-spin text-unitech-primary"><i data-feather="loader" class="w-8 h-8"></i></div>';
            if (window.feather) feather.replace();

            const reader = new FileReader();
            reader.onload = (re) => {
                this.currentPhotoBase64 = re.target.result;
                preview.innerHTML = `<img src="${this.currentPhotoBase64}" class="w-full h-full object-cover">`;
            };
            reader.readAsDataURL(file);
        }
    }

    handleMockScan() {
        const btn = document.getElementById('btn-scan');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="animate-spin" data-feather="loader"></i>';
        if (window.feather) feather.replace();

        setTimeout(() => {
            const randomEan = Math.floor(Math.random() * 1000000000000).toString();
            document.getElementById('prod-sku').value = randomEan;
            btn.innerHTML = originalContent;
            if (window.feather) feather.replace();
            window.toastService.info('Código de Barras escaneado: ' + randomEan);
        }, 1200);
    }

    async handleSaveSupplier() {
        const name = document.getElementById('supp-name').value.trim() || 'Fornecedor S/N';
        await storage.addClient({
            id: Date.now(),
            name,
            category: 'supplier',
            phone: document.getElementById('supp-phone').value,
            document: document.getElementById('supp-doc').value || '--',
            createdAt: new Date().toISOString()
        });
        this.clients = storage.getClients();
        const select = document.getElementById('prod-supplier');
        if (select) {
            select.innerHTML = '<option value="">Selecione...</option>' + this.renderSupplierOptions();
            select.value = name;
        }
        document.getElementById('supplier-modal')?.classList.add('hidden');
        window.toastService.success('Fornecedor adicionado!');
    }

    async handleSaveCategory() {
        const nameInput = document.getElementById('cat-name');
        const colorInput = document.getElementById('cat-color');
        const btn = document.getElementById('save-category-btn');

        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
            window.toastService.warning('O nome da categoria é obrigatório.');
            return;
        }

        // Duplicity Check
        const existing = storage.getCategories().find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== this.editingCategoryId);
        if (existing) {
            window.toastService.warning(`A categoria "${name}" já existe!`);
            return;
        }

        const originalText = btn.innerText;
        btn.innerText = 'Salvando...';
        btn.disabled = true;

        if (this.editingCategoryId) {
            await storage.updateCategory({ id: this.editingCategoryId, name, color });
            this.editingCategoryId = null;
            btn.innerText = 'Salvar'; // Reset text for next add
        } else {
            await storage.addCategory({ id: Date.now(), name, color });
        }

        await new Promise(r => setTimeout(r, 100)); // Sync delay

        this.refreshCategoriesUI();
        nameInput.value = '';
        colorInput.value = '#3b82f6';

        // Reset button state if it was 'Atualizar'
        btn.innerText = 'Salvar';
        btn.disabled = false;

        // Hide cancel button if visible
        document.getElementById('cancel-cat-edit')?.classList.add('hidden');

        window.toastService.success('Categoria salva com sucesso!');
    }

    async handleSavePhysicalLocation() {
        const name = document.getElementById('phys-loc-name').value.trim() || 'Local S/N';
        const color = document.getElementById('phys-loc-color').value;
        await storage.addPhysicalLocation({ id: Date.now(), name, color });
        this.refreshPhysicalLocationsUI();
        document.getElementById('phys-loc-name').value = '';
        window.toastService.success('Local físico adicionado!');
    }

    async handleSaveBox() {
        const name = document.getElementById('box-name').value.trim() || 'Caixa S/N';
        const color = document.getElementById('box-color').value;
        await storage.addBox({ id: Date.now(), name, color });
        this.refreshBoxUI();
        document.getElementById('box-name').value = '';
        window.toastService.success('Caixa adicionada!');
    }

    async handleSaveBrand() {
        const nameInput = document.getElementById('brand-name');
        const colorInput = document.getElementById('brand-color');
        const btn = document.getElementById('save-brand-btn');

        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
            window.toastService.warning('O nome da marca é obrigatório.');
            return;
        }

        // Duplicity Check
        const existing = storage.getBrands().find(b => b.name.toLowerCase() === name.toLowerCase() && b.id !== this.editingBrandId);
        if (existing) {
            window.toastService.warning(`A marca "${name}" já existe!`);
            return;
        }

        const originalText = btn.innerText;
        btn.innerText = 'Salvando...';
        btn.disabled = true;

        if (this.editingBrandId) {
            await storage.updateBrand({ id: this.editingBrandId, name, color });
            this.editingBrandId = null;
        } else {
            await storage.addBrand({ id: Date.now(), name, color });
        }

        // Small delay to ensure Firestore listener fires if local cache isn't immediate
        await new Promise(r => setTimeout(r, 100));

        this.refreshBrandsUI();
        nameInput.value = '';
        colorInput.value = '#334155'; // Reset to default dark blue/slate

        btn.innerText = 'Adicionar Marca';
        btn.disabled = false;

        // Remove cancel button if I add one later, or just reset state
        const cancelBtn = document.getElementById('cancel-brand-edit');
        if (cancelBtn) cancelBtn.classList.add('hidden');

        window.toastService.success('Marca salva com sucesso!');
    }

    refreshBrandsUI() {
        const tableBody = document.getElementById('brand-table-body');
        if (tableBody) tableBody.innerHTML = this.renderBrandRows();
        const select = document.getElementById('prod-brand');
        if (select) {
            const val = select.value;
            select.innerHTML = '<option value="">Selecione...</option>' + this.renderBrandOptions();
            select.value = val;
        }
        if (window.feather) feather.replace();
    }



    openModal(id, mode) {
        this.resetModal();
        const product = id ? storage.getProducts().find(p => p.id == id) : null;
        this.currentMode = mode;
        this.currentId = id;

        const modal = document.getElementById('product-modal');
        if (!modal) return;

        if (product) {
            document.querySelector('#product-modal h3 span').textContent = 'Editar Produto';
            document.getElementById('prod-name').value = product.name;
            document.getElementById('prod-sku').value = product.sku;
            document.getElementById('prod-brand').value = product.brand || '';
            document.getElementById('prod-supplier').value = product.supplier || '';
            document.getElementById('prod-category').value = product.category || 'Geral';
            document.getElementById('prod-cost').value = product.cost || 0;
            document.getElementById('prod-retail').value = product.retail || 0;
            document.getElementById('prod-wholesale').value = product.wholesale || 0;
            document.getElementById('prod-stock').value = product.stock || 0;
            document.getElementById('prod-min-stock').value = product.minStock || 0;
            document.getElementById('prod-manage-stock').checked = product.manageStock !== false;
            document.getElementById('prod-specifications').value = product.specifications || '';
            document.getElementById('prod-warranty').value = product.warrantyMonths || 3;
            document.getElementById('prod-physical-location').value = product.physicalLocation || '';
            document.getElementById('prod-location').value = product.location || '';
            document.getElementById('prod-box').value = product.box || '';
            this.currentPhotoBase64 = product.photo || '';
            if (product.photo) {
                document.getElementById('photo-preview').innerHTML = `<img src="${product.photo}" class="w-full h-full object-cover">`;
            }
            this.updatePriceCalculations('prod-cost');
        }

        // Refresh Dropdowns ALWAYS when opening modal to ensure sync
        this.refreshBrandsUI();
        this.refreshCategoriesUI();
        this.refreshLocationsUI();
        this.refreshPhysicalLocationsUI();
        this.refreshBoxUI();

        // Restore values if editing (because refreshes wipe the selects)
        if (product) {
            if (product.brand) document.getElementById('prod-brand').value = product.brand;
            if (product.category) document.getElementById('prod-category').value = product.category;
            if (product.location) document.getElementById('prod-location').value = product.location;
            if (product.physicalLocation) document.getElementById('prod-physical-location').value = product.physicalLocation;
            if (product.box) document.getElementById('prod-box').value = product.box;
        }

        // Manual refresh for Supplier since it doesn't have a dedicated refresh method exposed yet, or check if we need one
        const suppSelect = document.getElementById('prod-supplier');
        if (suppSelect) {
            const val = suppSelect.value;
            suppSelect.innerHTML = '<option value="">Selecione...</option>' + this.renderSupplierOptions();
            if (product && product.supplier) suppSelect.value = product.supplier;
        }

        modal.classList.remove('hidden');
    }

    resetModal() {
        this.currentMode = 'create';
        this.currentId = null;
        const titleEl = document.querySelector('#product-modal h3');
        if (titleEl) {
            const span = titleEl.querySelector('span');
            if (span) span.textContent = 'Novo Produto';
            else titleEl.textContent = 'Novo Produto';
        }
        const fields = ['prod-name', 'prod-sku', 'prod-cost', 'prod-retail', 'prod-wholesale', 'prod-stock', 'prod-min-stock', 'prod-specifications', 'prod-warranty'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = (f === 'prod-warranty' ? '3' : '');
        });
        if (document.getElementById('prod-brand')) document.getElementById('prod-brand').value = '';
        if (document.getElementById('prod-category')) document.getElementById('prod-category').value = 'Geral';
        if (document.getElementById('prod-supplier')) document.getElementById('prod-supplier').value = '';
        if (document.getElementById('prod-physical-location')) document.getElementById('prod-physical-location').value = '';
        if (document.getElementById('prod-location')) document.getElementById('prod-location').value = '';
        if (document.getElementById('prod-box')) document.getElementById('prod-box').value = '';
        const manageStock = document.getElementById('prod-manage-stock');
        if (manageStock) manageStock.checked = true;
        const preview = document.getElementById('photo-preview');
        if (preview) preview.innerHTML = '<i data-feather="image" class="w-8 h-8 text-gray-300"></i>';
        this.currentPhotoBase64 = '';
        if (window.feather) feather.replace();
    }

    saveProduct() {
        const name = (document.getElementById('prod-name').value.trim()) || 'Produto Sem Nome';
        const sku = (document.getElementById('prod-sku').value.trim()) || 'SKU-TEMP-' + Date.now();

        const product = {
            id: this.currentId || Date.now(),
            name,
            sku,
            brand: document.getElementById('prod-brand').value,
            supplier: document.getElementById('prod-supplier').value,
            category: document.getElementById('prod-category').value,
            physicalLocation: document.getElementById('prod-physical-location').value,
            location: document.getElementById('prod-location').value,
            box: document.getElementById('prod-box').value,
            cost: parseFloat(document.getElementById('prod-cost').value) || 0,
            retail: parseFloat(document.getElementById('prod-retail').value) || 0,
            wholesale: parseFloat(document.getElementById('prod-wholesale').value) || 0,
            stock: parseInt(document.getElementById('prod-stock').value) || 0,
            minStock: parseInt(document.getElementById('prod-min-stock').value) || 0,
            manageStock: document.getElementById('prod-manage-stock').checked,
            specifications: document.getElementById('prod-specifications').value,
            warrantyMonths: parseInt(document.getElementById('prod-warranty').value) || 0,
            photo: this.currentPhotoBase64
        };

        if (this.currentMode === 'edit') storage.updateProduct(product);
        else storage.addProduct(product);

        this.products = storage.getProducts();
        this.render();
        document.getElementById('product-modal').classList.add('hidden');
        window.toastService.success('Operação realizada!');
    }

    refreshCategoriesUI() {
        const tableBody = document.getElementById('category-table-body');
        if (tableBody) tableBody.innerHTML = this.renderCategoryRows();

        // Update selects
        const selects = ['prod-category', 'filter-category'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const val = el.value;
                el.innerHTML = (id === 'filter-category' ? '<option value="">Categoria</option>' : '') + this.renderCategoryOptions();
                el.value = val || (id === 'prod-category' ? 'Geral' : '');
            }
        });
        if (window.feather) feather.replace();
    }

    refreshPhysicalLocationsUI() {
        const tableBody = document.getElementById('physical-location-table-body');
        if (tableBody) tableBody.innerHTML = this.renderPhysicalLocationRows();
        const select = document.getElementById('prod-physical-location');
        if (select) {
            const val = select.value;
            select.innerHTML = '<option value="">Selecione...</option>' + this.renderPhysicalLocationOptions();
            select.value = val;
        }
        if (window.feather) feather.replace();
    }

    refreshBoxUI() {
        const tableBody = document.getElementById('box-table-body');
        if (tableBody) tableBody.innerHTML = this.renderBoxRows();
        const select = document.getElementById('prod-box');
        if (select) {
            const val = select.value;
            select.innerHTML = '<option value="">Selecione...</option>' + this.renderBoxOptions();
            select.value = val;
        }
        if (window.feather) feather.replace();
    }

    refreshLocationsUI() {
        const tableBody = document.getElementById('location-table-body');
        if (tableBody) tableBody.innerHTML = this.renderLocationRows();
        const select = document.getElementById('prod-location');
        if (select) {
            const val = select.value;
            select.innerHTML = '<option value="">Selecione...</option>' + this.renderLocationOptions();
            select.value = val;
        }
        if (window.feather) feather.replace();
    }

    handleShareCatalog(id) {
        const product = this.products.find(p => String(p.id) === String(id));
        if (!product) return;

        // Template de mensagem profissional
        const message = `Olá! Tudo bem? 🚀\n\nVimos que você tem interesse no produto: *${product.name.toUpperCase()}*.\n\nEste item faz parte da nossa linha selecionada da *Unitech Distribuidora*, garantindo a melhor performance e durabilidade para seus reparos.\n\nPreparamos um *Catálogo Instantâneo* exclusivo para você ver todos os detalhes técnicos, fotos em alta resolução (com zoom!) e compatibilidade total.\n\nAcesse agora: http://localhost:5173/?catalog=${product.sku || product.id}\n\nQualquer dúvida, estou à disposição para fecharmos o seu pedido! 📲`;

        // Se o widget de WhatsApp estiver disponível, tenta abrir chat direto
        if (window.whatsappService && window.whatsappService.status === 'CONNECTED') {
            // Tenta copiar para o clipboard para facilitar o colar
            navigator.clipboard.writeText(message).then(() => {
                if (window.toastService) window.toastService.info('✅ Mensagem do Catálogo copiada! Abra o chat para enviar.');
                else alert('Mensagem copiada!');
            });
        } else {
            // Fallback: Apenas copia
            navigator.clipboard.writeText(message).then(() => {
                if (window.toastService) window.toastService.success('🚀 Link do Catálogo e mensagem gerados com sucesso e copiados para sua área de transferência!');
                else alert('Mensagem profissional copiada!');
            });
        }
    }
}


