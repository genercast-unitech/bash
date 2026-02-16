

import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';
import { db } from '../services/db.js';
import { collection, query, where, getDocs, onSnapshot, orderBy } from '../services/db.js';
import printerService from '../services/printer.js';
import { getPostSaleModalHTML } from '../components/PostSaleModal.js';
import { formatCurrency } from '../utils/formatters.js';

export class SalesModule {
    constructor() {
        this.products = [];
        this.cart = [];
        this.clients = [];
        this.filteredProducts = [];
        this.selectedClient = null;
        this.pricingMode = 'retail';
        this.discountValue = 0;
        this.discountType = 'fixed'; // 'fixed' | 'percent'
        this.lastSaleId = null; // Track last sale for post-sale actions
        this.currentQuoteId = null; // Track origin quote for conversion
        this.cartTotal = 0; // Current cart total
        window.salesModule = this; // Ensure global access for inline handlers

        // Scanner Buffer
        this.buffer = '';
        this.bufferTimeout = null;

        // Expose helper globally since it is used in inline onclick
        window.openSaleDebug = (id) => {
            if (window.salesModule) {
                window.salesModule.viewSaleDetails(id);
            } else {
                console.error('ERRO: SalesModule não inicializado.');
                window.toastService.error('Erro interno: Módulo de vendas não carregado.');
            }
        };
    }

    async init(containerId, params = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // Load Data
        this.products = storage.getProducts();
        this.clients = storage.getClients();
        this.filteredProducts = [...this.products];

        // Render Initial UI
        this.render();
        this.attachEvents();
        this.startClock();

        // DEEP LINK: Open specific sale details if requested
        if (params.saleId) {
            console.log(`[SalesModule] Initializing with deep-link for Sale ID: ${params.saleId}`);
            this.viewSaleDetails(params.saleId);
        }

        // Retry category loading to handle async storage
        this.updateCategories();
        setTimeout(() => this.updateCategories(), 1500);

        // DEEP LINK: Auto-add product by SKU (Global Barcode Scanner)
        if (params.addProductSku) {
            console.log(`[SalesModule] Auto-adding product from global scanner: ${params.addProductSku}`);
            const product = this.products.find(p => p.sku === params.addProductSku);
            if (product) {
                this.addToCart(product.id);
                // Highlight product
                this.handleScan(params.addProductSku);
            } else {
                window.toastService.error(`Erro: Produto com SKU "${params.addProductSku}" não encontrado no módulo de vendas.`);
            }
        }

        // AUTO-CLEANUP: Remove budgets older than 8 days
        this.cleanupQuotes();
    }

    updateCategories() {
        const select = document.getElementById('pos-category');
        if (!select) return;

        const categories = storage.getCategories();
        if (categories && categories.length > 0) {
            const options = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            select.innerHTML = `<option value="">Todas as Categorias</option>${options}`;
        }
    }

    render() {
        this.container.innerHTML = `
        <div class="flex flex-col h-full gap-4 animate-fade-in">
            <!-- Header Toolbar -->
            <div class="flex justify-between items-center bg-[#fff2e6] border border-orange-100 p-4 rounded-lg shadow-sm">
                <div class="flex items-center gap-4 flex-1">
                    <div class="relative flex-1 max-w-md">
                        <span class="absolute left-3 top-3 text-gray-400">
                             <i data-feather="search" class="w-5 h-5"></i>
                        </span>
                        <input type="text" id="pos-search" 
                            class="pl-10 w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-unitech-primary focus:border-unitech-primary outline-none transition-all uppercase font-mono text-sm text-gray-900" 
                            placeholder="BUSCAR PRODUTO (NOME, SKU, TAGS)...">
                    </div>
                    
                    <select id="pos-category" class="p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-unitech-primary outline-none text-sm text-gray-700 hidden md:block">
                        <option value="">Todas as Categorias</option>
                    </select>
                </div>

                <div class="flex items-center gap-3">
                    <div class="flex bg-gray-100 p-1 rounded-lg">
                        <button class="px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${this.pricingMode === 'retail' ? 'bg-white text-unitech-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}" id="mode-retail">VAREJO</button>
                        <button class="px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${this.pricingMode === 'wholesale' ? 'bg-white text-unitech-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}" id="mode-wholesale">ATACADO</button>
                    </div>
                    
                    <button id="btn-history" class="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Histórico de Vendas">
                        <i data-feather="clock" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>

            <div class="flex flex-1 gap-6 overflow-hidden">
                <!-- Product Grid (Left) -->
                <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div id="pos-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 content-start">
                        ${this.renderProductGrid()}
                    </div>
                </div>

                <!-- Cart Panel (Right) -->
                <div class="w-96 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col shrink-0">
                    <!-- Client Selector -->
                    <div class="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                        <div class="flex items-center justify-between mb-2">
                            <label class="text-sm font-bold text-black uppercase tracking-wider">Cliente</label>
                            <button id="btn-add-client" class="text-unitech-primary hover:bg-unitech-primary/10 p-1 rounded transition-colors" title="Novo Cliente">
                                <i data-feather="user-plus" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <div class="relative">
                            <input type="text" id="pos-client-search" autocomplete="off" 
                                class="w-full p-2 pl-8 text-sm font-bold text-gray-900 placeholder-gray-600 border border-gray-300 rounded focus:ring-1 focus:ring-unitech-primary outline-none" 
                                placeholder="Selecionar Cliente..." value="${this.selectedClient ? this.selectedClient.name : ''}">
                            <span class="absolute left-2 top-2.5 text-gray-600">
                                <i data-feather="user" class="w-4 h-4"></i>
                            </span>
                            <!-- Dropdown Results -->
                            <div id="client-results" class="hidden absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-b-lg z-20 max-h-48 overflow-y-auto"></div>
                        </div>
                    </div>

                    <!-- Cart Items -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-3" id="cart-container">
                        ${this.renderCartItems()}
                    </div>

                    <!-- Totals & Actions -->
                    <!-- Totals & Actions -->
                    <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg space-y-3">
                        


                        <!-- Integrated Discount Control -->
                        <div class="flex justify-between items-center h-8">
                            <span class="text-xs text-gray-500 font-medium self-center">Desconto</span>
                            
                            <div class="flex items-center">
                                <!-- Input Group -->
                                <div class="flex items-center border border-gray-300 bg-white rounded-md overflow-hidden shadow-sm h-7">
                                    <button id="btn-discount-mode-fixed" class="px-2 h-full text-[10px] font-bold border-r border-gray-200 hover:bg-gray-50 transition-colors ${this.discountType === 'fixed' ? 'text-unitech-primary bg-orange-50' : 'text-gray-400'}" onclick="window.salesModule.setDiscountMode('fixed')" title="Valor Fixo (R$)">R$</button>
                                    <button id="btn-discount-mode-percent" class="px-2 h-full text-[10px] font-bold border-r border-gray-200 hover:bg-gray-50 transition-colors ${this.discountType === 'percent' ? 'text-unitech-primary bg-orange-50' : 'text-gray-400'}" onclick="window.salesModule.setDiscountMode('percent')" title="Porcentagem (%)">%</button>
                                    <input type="number" 
                                        class="w-20 px-2 py-1 text-xs text-right font-bold text-gray-700 outline-none placeholder-gray-300" 
                                        placeholder="0,00" 
                                        min="0" 
                                        step="0.01" 
                                        value="${this.discountValue > 0 ? this.discountValue : ''}"
                                        oninput="window.salesModule.setDiscountValue(this.value)">
                                </div>
                                <!-- Calculated Value (only if > 0) -->
                                <span id="discount-display" class="ml-2 text-xs font-bold text-red-500 whitespace-nowrap ${this.discountValue > 0 ? '' : 'hidden'}">- ${formatCurrency(0)}</span>
                            </div>
                        </div>

                        <!-- Total Divider -->
                        <div class="border-t border-gray-200 border-dashed"></div>

                        <!-- Total -->
                        <div class="flex justify-between items-end">
                            <span class="text-sm font-bold text-gray-900 uppercase">Total</span>
                            <span class="text-2xl font-black text-unitech-primary leading-none" id="cart-total">${formatCurrency(0)}</span>
                        </div>

                        <!-- Checkout Button -->
                        <button id="btn-checkout" class="w-full py-3 bg-unitech-primary text-white font-bold rounded-lg shadow-sm hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                            FINALIZAR VENDA (F2)
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Checkout Selection Modal -->
        <div id="checkout-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden flex items-center justify-center animate-fade-in">
             <div class="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                  <div class="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 class="font-bold text-lg text-gray-800">Pagamento</h3>
                      <button id="close-checkout" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
                  </div>
                  <div class="p-6 grid grid-cols-2 gap-4" id="checkout-methods-grid">
                      <button class="checkout-method p-4 border border-gray-200 rounded-lg hover:border-unitech-primary hover:bg-red-50 transition-all flex flex-col items-center gap-2 group" data-method="PIX">
                          <i data-feather="zap" class="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform"></i>
                          <span class="font-bold text-gray-700">PIX</span>
                      </button>
                      <button class="checkout-method p-4 border border-gray-200 rounded-lg hover:border-unitech-primary hover:bg-red-50 transition-all flex flex-col items-center gap-2 group" data-method="CASH">
                          <i data-feather="dollar-sign" class="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform"></i>
                          <span class="font-bold text-gray-700">Dinheiro</span>
                      </button>
                      <button class="checkout-method p-4 border border-gray-200 rounded-lg hover:border-unitech-primary hover:bg-red-50 transition-all flex flex-col items-center gap-2 group" data-method="DEBIT_CARD">
                          <i data-feather="credit-card" class="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform"></i>
                          <span class="font-bold text-gray-700">Débito</span>
                      </button>
                      <button class="checkout-method p-4 border border-gray-200 rounded-lg hover:border-unitech-primary hover:bg-red-50 transition-all flex flex-col items-center gap-2 group" data-method="CREDIT_CARD_VISTA">
                          <i data-feather="credit-card" class="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform"></i>
                          <span class="font-bold text-gray-700 text-[10px] uppercase">Crédito à Vista</span>
                      </button>
                      <button class="checkout-method p-4 border border-gray-200 rounded-lg hover:border-unitech-primary hover:bg-red-50 transition-all flex flex-col items-center gap-2 group" data-method="CREDIT_CARD_PARCELADO">
                          <i data-feather="credit-card" class="w-8 h-8 text-blue-700 group-hover:scale-110 transition-transform"></i>
                          <span class="font-bold text-gray-700">Crédito Parcelado</span>
                      </button>
                      <button class="checkout-method p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all flex flex-col items-center gap-2 group" data-method="ORCAMENTO">
                          <i data-feather="file-text" class="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform"></i>
                          <span class="font-bold text-gray-700">Orçamento / Cotação</span>
                      </button>
                  </div>

                  <!-- PIX Bank Selection (Hidden by default) -->
                  <div id="pix-payment-details" class="px-6 pb-6 hidden animate-fade-in">
                      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                          <div>
                              <label class="text-xs font-bold text-gray-500 uppercase mb-2 block">Banco de Destino (PIX)</label>
                              <select id="pix-bank-select" class="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-unitech-primary outline-none text-sm bg-white text-gray-900 font-bold">
                                  ${(storage.getSettings().pixBanks || []).map(bank => {
            const name = typeof bank === 'string' ? bank : bank.name;
            const details = typeof bank === 'object' && (bank.agency || bank.account)
                ? ` (${bank.agency}/${bank.account})` : '';
            return `<option value="${name}">${name}${details}</option>`;
        }).join('')}
                              </select>
                          </div>
                          <button id="btn-confirm-pix" onclick="window.salesModule.confirmPix()" class="w-full py-3 bg-unitech-primary text-white font-bold rounded hover:bg-red-700 transition-all uppercase text-sm shadow-md">Confirmar Venda PIX</button>
                      </div>
                  </div>

                  <!-- Installment Details (Hidden by default) -->
                  <div id="installments-payment-details" class="px-6 pb-6 hidden animate-fade-in">
                      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                          <div>
                              <label class="text-xs font-bold text-gray-500 uppercase mb-2 block">Número de Parcelas</label>
                              <select id="installments-count" class="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-unitech-primary outline-none text-sm bg-white text-gray-900 font-bold">
                                  ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}
                              </select>
                          </div>
                          <div class="flex justify-between items-center border-t border-dashed border-gray-300 pt-4">
                              <span class="text-xs font-bold text-gray-500 uppercase">Valor da Parcela</span>
                              <span class="text-lg font-bold text-blue-600 font-mono" id="installment-value-display">${formatCurrency(0)}</span>
                          </div>
                          <button id="btn-confirm-installments" onclick="window.salesModule.confirmInstallments()" class="w-full py-3 bg-unitech-primary text-white font-bold rounded hover:bg-red-700 transition-all uppercase text-sm shadow-md">Confirmar Venda</button>
                      </div>
                  </div>

                  <!-- Cash Details (Hidden by default) -->
                  <div id="cash-payment-details" class="px-6 pb-6 hidden animate-fade-in">
                      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                      <div class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                          <label class="text-xs font-bold text-gray-400 uppercase">Valor Recebido</label>
                          <div class="flex items-center">
                              <span class="mr-2 text-gray-400 font-bold">R$</span>
                              <input type="number" id="cash-amount-received" step="0.01" class="w-24 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-xl font-bold text-gray-800 text-right" placeholder="0.00" oninput="window.salesModule.updateCashChange()">
                          </div>
                      </div>
                          <div class="flex justify-between items-center border-t border-dashed border-gray-300 pt-4">
                              <span class="text-xs font-bold text-gray-500 uppercase">Troco</span>
                              <span class="text-lg font-bold text-green-600 font-mono" id="cash-change-display">${formatCurrency(0)}</span>
                          </div>
                          <button id="btn-confirm-cash" onclick="window.salesModule.confirmCash()" class="w-full py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 transition-all uppercase text-sm shadow-md">Confirmar Recebimento</button>
                      </div>
                  </div>

                  <div class="p-4 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-100">
                      Total a pagar: <span class="font-bold text-lg text-gray-800 ml-1" id="checkout-total-display">${formatCurrency(0)}</span>
                  </div>
             </div>
        </div>
        
         <!-- Receipt Modal -->
         ${this.getReceiptModalHTML()}

         <!-- Post-Sale Modal -->
         ${getPostSaleModalHTML()}

         <!-- Product Details Modal (Quick View) -->
         ${this.getProductDetailsModalHTML()}

         <!-- Full Client Modal (Integrated in PDV) -->
         <div id="quick-client-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] hidden flex items-center justify-center p-4 animate-fade-in">
             <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all scale-100">
                 <div class="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-center">
                     <div>
                        <h3 class="font-black text-xl text-gray-800 uppercase tracking-tight">Cadastrar Novo Cliente</h3>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Preencha os dados completos abaixo</p>
                     </div>
                     <button onclick="document.getElementById('quick-client-modal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition-colors"><i data-feather="x" class="w-6 h-6"></i></button>
                 </div>
                 
                 <div class="p-8 space-y-6">
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div class="md:col-span-2">
                             <label class="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-wider">Nome Completo</label>
                             <input type="text" id="quick-client-name" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-unitech-primary outline-none text-sm transition-all font-bold text-gray-800" placeholder="Ex: JOÃO DA SILVA SAURO">
                         </div>

                         <div>
                             <label class="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-wider">Telefone Principal</label>
                             <input type="text" id="quick-client-phone" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-unitech-primary outline-none text-sm font-mono text-gray-800 font-bold" placeholder="(00) 00000-0000">
                         </div>

                         <div>
                             <label class="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-wider">CPF / CNPJ</label>
                             <input type="text" id="quick-client-doc" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-unitech-primary outline-none text-sm font-mono text-gray-800 font-bold" placeholder="000.000.000-00">
                         </div>

                         <div class="md:col-span-2">
                             <label class="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-wider">E-mail de Contato</label>
                             <input type="email" id="quick-client-email" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-unitech-primary outline-none text-sm text-gray-800 font-bold" placeholder="cliente@exemplo.com">
                         </div>

                         <div>
                             <label class="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-wider">Categoria</label>
                             <select id="quick-client-category" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-unitech-primary outline-none text-sm font-bold text-gray-700 appearance-none bg-white">
                                 <option value="client">CLIENTE</option>
                                 <option value="supplier">FORNECEDOR</option>
                             </select>
                         </div>

                         <div>
                             <label class="block text-[10px] font-black text-gray-500 uppercase mb-1.5 tracking-wider">Tabela de Preço</label>
                             <select id="quick-client-type" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-unitech-primary outline-none text-sm font-bold text-gray-700 appearance-none bg-white">
                                 <option value="retail">VAREJO</option>
                                 <option value="wholesale">ATACADO</option>
                             </select>
                         </div>
                     </div>
                 </div>

                 <div class="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                    <button onclick="document.getElementById('quick-client-modal').classList.add('hidden')" class="flex-1 px-6 py-3.5 border border-gray-200 text-gray-500 font-black rounded-xl hover:bg-white hover:text-gray-700 transition-all text-xs uppercase tracking-widest">Descartar</button>
                     <button id="btn-save-quick-client" class="flex-[2] px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-black rounded-xl hover:shadow-lg hover:shadow-green-500/20 active:scale-[0.98] transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                        <i data-feather="user-check" class="w-4 h-4"></i> Salvar e Selecionar
                     </button>
                 </div>
             </div>
         </div>

          <!-- Mobile Cart FAB (Floating Action Button) -->
          <div class="mobile-cart-fab md:hidden" id="mobile-cart-fab" onclick="window.salesModule.toggleMobileCart()">
              <i data-feather="shopping-cart"></i>
              <span class="mobile-cart-badge" id="mobile-cart-badge">0</span>
          </div>

          <!-- Mobile Cart Modal -->
          <div id="mobile-cart-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] hidden flex items-center justify-end animate-fade-in md:hidden">
              <div class="bg-white h-full w-full max-w-md flex flex-col shadow-2xl transform transition-all translate-x-0">
                  <!-- Header -->
                  <div class="bg-gradient-to-br from-unitech-primary via-red-600 to-red-700 p-3 flex justify-between items-center text-white relative overflow-hidden shrink-0">
                      <div class="absolute inset-0 bg-black/10"></div>
                      <div class="flex items-center gap-2 relative z-10 w-full justify-center">
                          <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                              <i data-feather="shopping-cart" class="w-4 h-4"></i>
                          </div>
                          <div>
                              <h3 class="font-black text-sm uppercase tracking-tight">Carrinho</h3>
                              <p class="text-[10px] opacity-90 font-bold leading-none" id="mobile-cart-count">0 itens</p>
                          </div>
                      </div>
                  </div>

                  <!-- SCROLLABLE CONTENT WRAPPER -->
                  <div class="flex-1 overflow-y-auto">
                  
                  <!-- Client Selector - COMPACT -->
                  <div class="p-3 bg-gray-50 border-b border-gray-100">
                      <div class="flex items-center justify-between mb-2">
                          <label class="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                              <i data-feather="user" class="w-3 h-3"></i>
                              Cliente
                          </label>
                          <button id="btn-add-client-mobile" class="text-unitech-primary hover:bg-unitech-primary/10 px-1.5 py-0.5 rounded-md transition-all active:scale-95 flex items-center gap-1 text-xs font-bold" title="Novo Cliente">
                              <i data-feather="user-plus" class="w-3.5 h-3.5"></i>
                              <span>Novo</span>
                          </button>
                      </div>
                      <div class="relative">
                          <input type="text" id="pos-client-search-mobile" autocomplete="off" 
                              class="w-full p-2 pl-8 text-xs font-bold text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-unitech-primary/30 focus:border-unitech-primary outline-none transition-all" 
                              placeholder="Buscar cliente..." value="${this.selectedClient ? this.selectedClient.name : ''}">
                          <span class="absolute left-2.5 top-2.5 text-gray-400">
                              <i data-feather="search" class="w-3.5 h-3.5"></i>
                          </span>
                          <!-- Dropdown Results -->
                          <div id="client-results-mobile" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-20 max-h-40 overflow-y-auto"></div>
                      </div>
                  </div>

                  <!-- Cart Items -->
                  <div class="p-4 space-y-3 bg-gray-50" id="mobile-cart-container">
                      ${this.renderCartItems()}
                  </div>

                  <!-- Totals & Actions -->
                  <div class="flex-shrink-0 p-3 pb-24 bg-white border-t-2 border-gray-100 shadow-lg">
                      <!-- Subtotal -->
                      <div class="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                          <span class="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                          <span class="text-base font-black text-gray-800" id="mobile-cart-subtotal">${formatCurrency(0)}</span>
                      </div>
                      
                      <!-- Discount Section - COMPACT -->
                      <div class="mb-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <div class="flex gap-2 items-center">
                              <div class="relative flex-1">
                                  <span class="absolute left-2 top-2 text-gray-500 text-xs font-bold" id="mobile-discount-symbol">${this.discountType === 'fixed' ? 'R$' : '%'}</span>
                                  <input type="number" id="mobile-discount-input" 
                                      class="w-full pl-8 pr-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-unitech-primary/30 focus:border-unitech-primary text-right font-bold text-gray-700 transition-all" 
                                      placeholder="Desconto" min="0" step="0.01" value="${this.discountValue > 0 ? this.discountValue : ''}"
                                      oninput="window.salesModule.setDiscountValue(this.value)">
                              </div>
                              <div class="flex bg-gray-200 rounded-md p-0.5 shrink-0">
                                  <button id="btn-discount-fixed-mobile" class="px-2 py-1 rounded text-xs font-black transition-all ${this.discountType === 'fixed' ? 'bg-white shadow text-unitech-primary' : 'text-gray-500'}\" onclick="window.salesModule.setDiscountMode('fixed')">R$</button>
                                  <button id="btn-discount-percent-mobile" class="px-2 py-1 rounded text-xs font-black transition-all ${this.discountType === 'percent' ? 'bg-white shadow text-unitech-primary' : 'text-gray-500'}\" onclick="window.salesModule.setDiscountMode('percent')">%</button>
                              </div>
                              <span class="text-xs text-green-600 font-bold whitespace-nowrap" id="mobile-discount-display">- ${formatCurrency(0)}</span>
                          </div>
                      </div>
                      
                      <!-- Total - COMPACT -->
                      <div class="flex justify-between items-center mb-3 p-2 bg-gradient-to-r from-unitech-primary/5 to-red-50 rounded-lg border border-unitech-primary/20">
                          <span class="text-sm font-black text-gray-700 uppercase">Total</span>
                          <span class="text-xl font-black text-unitech-primary" id="mobile-cart-total">${formatCurrency(0)}</span>
                      </div>

                      <!-- Checkout Button - COMPACT -->
                      <button id="btn-checkout-mobile" class="w-full py-4 bg-gradient-to-r from-unitech-primary via-red-600 to-red-700 text-white font-black rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm relative overflow-hidden group">
                          <div class="absolute inset-0 bg-white/0 group-active:bg-white/10 transition-colors"></div>
                          <i data-feather="shopping-bag" class="w-5 h-5 relative z-10"></i>
                          <span class="relative z-10">Finalizar Venda</span>
                      </button>
                  </div>
                  </div> <!-- End Scrollable Wrapper -->
              </div>
          </div>
         `;

        // Icons
        if (window.feather) window.feather.replace();

        // Re-attach events after render
        setTimeout(() => this.attachEvents(), 0);
    }

    checkOS(term) {
        const id = term.replace(/\D/g, '');
        const checklists = storage.getChecklists();
        const os = checklists.find(c => String(c.id).replace(/\D/g, '') === String(id));

        if (!os) {
            // Only alert if it looks like an OS search (explicit OS- prefix) or if we want to be verbose
            if (term.toUpperCase().includes('OS-')) {
                if (window.toastService) window.toastService.show(`❌ Ordem de Serviço #${id} não encontrada.`, 'error');
                else window.toastService.error(`Ordem de Serviço #${id} não encontrada.`);
            }
            return false; // Return false to indicate not handled
        }

        const situation = (os.situation || '').toUpperCase();

        // --- AUTO-UNLOCK FOR REFUNDED OS ---
        if (situation === 'FATURADO' || situation === 'PAGO') {
            // Check if there is an ACTIVE sale for this OS.
            // If all sales for this OS are REFUNDED, then the OS should NOT be locked.
            const sales = storage.getSales();
            const activeSale = sales.find(s =>
                s.status !== 'refunded' &&
                s.items.some(i => (i.isOS && i.osId == os.id) || (i.name && i.name.includes(`#${os.id}`)))
            );

            if (!activeSale) {
                // No active sale found -> It was refunded but status got stuck.
                // Auto-fix it now.
                os.situation = 'Realizado';
                os.status = 'Concluído';
                storage.updateChecklist(os);

                const msg = `⚠️ OS #${os.id} estava travada como FATURADO mas foi estornada. Liberando para novo pagamento...`;
                console.warn(msg);
                if (window.toastService) window.toastService.show(msg, 'info');

                // Proceed to add to cart
                this.addOSToCart(os);
                return true;
            } else {
                // Truly paid
                if (window.toastService) window.toastService.show(`⚠️ Pagamento já realizado para a OS #${os.id}.`, 'warning');
                else window.toastService.warning(`Pagamento já realizado para a OS #${os.id}.`);
                return true;
            }
        }

        if (situation !== 'REALIZADO' && situation !== 'CONCLUÍDO' && situation !== 'ENTREGUE' && situation !== 'AUTORIZADA') {
            if (situation !== 'REALIZADO') {
                const msg = `⚠️ A OS #${os.id} não pode ser paga ainda. Status: ${situation}. Necessário: REALIZADO`;
                if (window.toastService) window.toastService.show(msg, 'warning');
                else window.toastService.warning(msg);
                return true;
            }
        }

        if (this.cart.find(i => i.isOS && i.osId == os.id)) {
            if (window.toastService) window.toastService.show('⚠️ Esta OS já está no carrinho!', 'warning');
            else window.toastService.warning('Esta OS já está no carrinho!');
            return true;
        }

        this.addOSToCart(os);
        return true;
    }

    addOSToCart(os) {
        const valTotal = parseFloat(os.valTotal || 0);
        if (valTotal <= 0) {
            if (window.toastService) window.toastService.show('⚠️ Esta OS não possui valor a cobrar.', 'warning');
            else window.toastService.warning('Esta OS não possui valor a cobrar.');
            return;
        }

        const item = {
            id: `OS-${os.id}`,
            osId: os.id,
            name: `CONSERTO OS #${os.id} - ${os.device || 'Aparelho'}`,
            qty: 1,
            retail: valTotal,
            wholesale: valTotal,
            stock: 999, // Service has no stock limit
            photo: 'https://placehold.co/200/22c55e/ffffff?text=OS',
            isOS: true,
            type: 'service',
            warrantyCode: '',
            total: valTotal
        };

        this.cart.push(item);

        // Auto-select client if present
        if (os.client) {
            const clients = storage.getClients();
            const client = clients.find(c => c.name === os.client);
            if (client) {
                this.selectClient(client.id);
            }
        }

        this.updateCartUI();
        if (window.toastService) window.toastService.show('OS adicionada ao carrinho!', 'success');

        // VISUAL FEEDBACK: Show the OS in the grid as if it were a searched product
        const mockProduct = {
            id: item.id,
            name: item.name,
            sku: `OS-${os.id}`,
            retail: item.retail,
            wholesale: item.wholesale,
            stock: 1,
            photo: 'https://placehold.co/200/22c55e/ffffff?text=OS',
            isOS: true
        };

        this.filteredProducts = [mockProduct];
        const grid = document.getElementById('pos-grid');
        if (grid) grid.innerHTML = this.renderProductGrid();

        // Update Search Input
        const searchInput = document.getElementById('pos-search');
        if (searchInput) {
            searchInput.value = `OS ${os.id}`;
        }
    }

    renderProductGrid() {
        const searchInput = document.getElementById('pos-search');
        const isSearchEmpty = !searchInput || !searchInput.value.trim();

        // If cart is empty and nothing is being searched, show the "CAIXA LIVRE" standby screen
        if (this.cart.length === 0 && isSearchEmpty) {
            return this.renderIdleScreen();
        }

        if (this.filteredProducts.length === 0) {
            return `<div class="col-span-full flex flex-col items-center justify-center p-12 text-gray-400">
                <i data-feather="box" class="w-12 h-12 mb-3 opacity-20"></i>
                <p>Nenhum produto encontrado</p>
            </div>`;
        }

        return this.filteredProducts.map(p => {
            const price = this.pricingMode === 'retail' ? p.retail : p.wholesale;

            // Calculate "Available" Stock (Real Stock - In Cart)
            const cartItem = this.cart.find(i => i.id == p.id);
            const availableStock = p.stock - (cartItem ? cartItem.qty : 0);

            const isLowStock = availableStock < 5;
            const outOfStock = availableStock <= 0;
            const image = p.photo || 'https://placehold.co/150x150/f3f4f6/9ca3af?text=' + p.name.substring(0, 3).toUpperCase();

            return `
            <div class="product-card group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${outOfStock && !p.isOS ? 'opacity-60 grayscale' : ''}" 
                 onclick="window.salesModule.addToCart('${p.id}')">
                <div class="absolute top-2 right-2 z-10">
                     ${!p.isOS && isLowStock && !outOfStock ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full border border-yellow-200">POUCO ESTOQUE</span>' : ''}
                     ${!p.isOS && outOfStock ? '<span class="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full border border-red-200">ESGOTADO</span>' : ''}
                </div>
                
                <div class="aspect-square bg-gray-50 relative overflow-hidden">
                    <img src="${image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="${p.name}">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                </div>

                <div onclick="event.stopPropagation(); window.salesModule.viewProductDetails('${p.id}')" class="w-full bg-blue-50 hover:bg-blue-100 border-b border-gray-100 py-1 md:py-1.5 flex items-center justify-center gap-1 transition-colors cursor-pointer group/info">
                <i data-feather="plus-circle" class="w-3 h-3 text-blue-600"></i>
                <span class="hidden md:inline text-[9px] font-bold text-blue-700 uppercase tracking-wide">+ Informações</span>
            </div>

            <div class="p-1 px-1.5">
                <p class="hidden md:block text-[9px] text-gray-400 font-mono truncate">${p.sku || '#'}</p>
                <h4 class="text-[10px] md:text-[11px] font-bold text-gray-800 leading-[1.1] mb-0.5 line-clamp-2 min-h-[1.2rem] md:h-7">${p.name}</h4>
                
                <div class="flex justify-between items-center mt-0.5">
                    <div class="text-[9px] text-gray-500 font-bold shrink-0">
                        ${p.isOS ? '<span class="text-unitech-primary">Serviço</span>' :
                    p.isQuote ? '<span class="text-orange-500 font-bold uppercase">Orçamento</span>' :
                        `Est: <span id="stock-display-${p.id}">${availableStock}</span>`}
                    </div>
                    <div class="font-mono font-black text-unitech-primary text-[11px] md:text-[12px]">
                        ${formatCurrency(price)}
                    </div>
                </div>
            </div>
            </div>
            `;
        }).join('');
    }

    renderCartItems() {
        if (this.cart.length === 0) {
            return `
            <div class="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 py-12">
                <i data-feather="shopping-cart" class="w-16 h-16 mb-3"></i>
                <p class="text-base font-bold">Carrinho Vazio</p>
                <p class="text-sm">Adicione produtos para começar</p>
            </div>`;
        }

        return this.cart.map((item, index) => {
            const price = this.pricingMode === 'retail' ? item.retail : item.wholesale;
            const total = price * item.qty;
            const hasWarranty = item.warrantyCode && item.warrantyCode.trim().length > 0;

            return `
             <div class="flex flex-col bg-white p-2 rounded-lg border border-gray-200 hover:border-unitech-primary/50 transition-all shadow-sm group">
                 <div class="flex items-start gap-2">
                     <!-- Product Image -->
                     <div class="w-12 h-12 bg-gray-50 rounded-md flex-shrink-0 overflow-hidden border border-gray-100 p-0.5">
                          <img src="${item.photo || 'https://placehold.co/80x80/f3f4f6/9ca3af?text=' + item.name.substring(0, 2)}" class="w-full h-full object-cover rounded-sm">
                     </div>
                     
                     <!-- Product Info & Controls -->
                     <div class="flex-1 min-w-0 flex flex-col justify-between min-h-[48px]">
                         <!-- Header -->
                         <div class="flex justify-between items-start gap-1">
                            <p class="text-[10px] font-bold text-gray-800 leading-tight line-clamp-2 uppercase" title="${item.name}">${item.name}</p>
                            <button onclick="document.getElementById('warranty-container-${item.id}').classList.toggle('hidden');" class="${hasWarranty ? 'text-unitech-primary' : 'text-gray-300'} hover:text-unitech-primary p-0.5 shrink-0 transition-colors" title="Garantia / Serial">
                                <i data-feather="shield" class="w-3 h-3"></i>
                            </button>
                         </div>

                         <!-- Footer: Unit Price | Qty | Total -->
                         <div class="flex items-end justify-between mt-1">
                             <div class="text-[9px] font-bold text-gray-400">UN: ${price.toFixed(2)}</div>
                             
                             <div class="flex items-center gap-2">
                                 <!-- Compact Qty -->
                                 <div class="flex items-center bg-gray-50 rounded border border-gray-200 h-5">
                                     <button class="w-5 h-full flex items-center justify-center hover:bg-white hover:text-red-500 text-gray-500 font-bold text-xs rounded-l transition-colors" onclick="window.salesModule.updateQty('${item.id}', -1)">−</button>
                                     <span class="w-6 text-center text-[9px] font-black text-gray-800 bg-white border-x border-gray-100 h-full flex items-center justify-center">${item.qty}</span>
                                     <button class="w-5 h-full flex items-center justify-center hover:bg-white hover:text-green-600 text-gray-500 font-bold text-xs rounded-r transition-colors" onclick="window.salesModule.updateQty('${item.id}', 1)">+</button>
                                 </div>
                                 <!-- Total -->
                                 <span class="text-xs font-black text-unitech-primary min-w-[50px] text-right">${formatCurrency(total)}</span>
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <!-- Warranty Input -->
                 <div id="warranty-container-${item.id}" class="${hasWarranty ? '' : 'hidden'} mt-1 pt-1 border-t border-gray-100 animate-fade-in">
                    <input type="text" 
                        class="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-mono text-gray-700 outline-none uppercase placeholder-gray-400 focus:border-unitech-primary transition-colors" 
                        placeholder="N/S ou IMEI"
                        value="${item.warrantyCode || ''}"
                        oninput="window.salesModule.updateItemWarranty('${item.id}', this.value)"
                    >
                 </div>
             </div>
             `;
        }).join('');
    }

    updateItemWarranty(productId, code) {
        const cartItem = this.cart.find(i => i.id == productId);
        if (cartItem) {
            cartItem.warrantyCode = code.trim();
        }
    }

    getReceiptModalHTML() {
        return `
        <div id="receipt-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center animate-fade-in">
             <div class="bg-white text-black p-8 rounded-lg max-w-sm w-full font-mono text-sm relative shadow-2xl">
                <div id="receipt-area">
                    <div class="text-center mb-6 border-b border-dashed border-gray-300 pb-4">
                       <h3 class="font-bold text-xl uppercase tracking-widest mb-1">UNITECH</h3>
                       <p class="text-xs text-gray-500">Technology Solutions</p>
                       <p class="text-xs mt-2">CNPJ: 00.000.000/0001-00</p>
                       <p class="text-xs text-gray-400" id="receipt-date">Data: --/--/---- --:--</p>
                       <p class="text-xs mt-1 text-black font-bold" id="receipt-client">Cliente: Consumidor Final</p>
                    </div>
                    
                    <div id="receipt-items" class="space-y-2 mb-6 text-xs"></div>
    
                    <div class="border-t border-dashed border-gray-300 pt-4 space-y-1">
                       <div class="flex justify-between">
                           <span>Subtotal</span>
                           <span id="receipt-subtotal">${formatCurrency(0)}</span>
                       </div>
                       <div class="flex justify-between font-bold text-lg mt-2">
                           <span>TOTAL</span>
                           <span id="receipt-final">${formatCurrency(0)}</span>
                       </div>
                       <div class="flex justify-between text-xs text-gray-500 mt-1">
                           <span>Pagamento via</span>
                           <span id="receipt-method" class="uppercase">DINHEIRO</span>
                       </div>
                   </div>
                   
                   <div class="mt-4 pt-2 border-t border-dashed border-gray-300 text-[10px] text-center text-gray-400">
                        <p>GARANTIA DE 90 DIAS MEDIANTE APRESENTAÇÃO DESTE CUPOM E SELO DE GARANTIA INTACTO.</p>
                   </div>
                </div>

                <div class="mt-8 flex gap-3 print:hidden">
                    <button class="flex-1 bg-gray-100 text-gray-700 py-3 rounded font-bold uppercase text-xs hover:bg-gray-200 transition-colors" onclick="document.getElementById('receipt-modal').classList.add('hidden')">Fechar</button>
                    <button class="flex-1 bg-gray-800 text-white py-3 rounded font-bold uppercase text-xs hover:bg-gray-900 transition-colors flex items-center justify-center gap-2" onclick="window.salesModule.exportLastSaleXML()">
                        <i data-feather="code" class="w-4 h-4"></i> XML
                    </button>
                    <button class="flex-1 bg-black text-white py-3 rounded font-bold uppercase text-xs hover:opacity-80 transition-opacity flex items-center justify-center gap-2" onclick="window.print()">
                        <i data-feather="printer" class="w-4 h-4"></i> Imprimir
                    </button>
                </div>
             </div>
        </div>`;
    }

    addToCart(productId) {
        // Use loose comparison for string/number IDs
        // Check for OS ID (OS-XXX)
        if (typeof productId === 'string' && productId.startsWith('OS-')) {
            const osId = productId.replace('OS-', '');
            const checklists = storage.getChecklists();
            const os = checklists.find(c => String(c.id) === String(osId));
            if (os) {
                this.addOSToCart(os);
                return;
            }
        }

        // Check for Quote ID (ORC-XXX)
        if (typeof productId === 'string' && productId.startsWith('ORC-')) {
            this.loadQuote(productId);
            return;
        }

        const product = this.products.find(p => p.id == productId);
        if (!product) return;

        // Calculate available stock based on what's already in the cart
        const cartItem = this.cart.find(i => i.id == productId);
        const inCartQty = cartItem ? cartItem.qty : 0;

        if (product.stock - inCartQty <= 0) {
            if (window.toastService) window.toastService.show('Produto esgotado ou limite de estoque atingido!', 'warning');
            else window.toastService.warning('Produto esgotado ou limite de estoque atingido!');
            return;
        }

        if (cartItem) {
            cartItem.qty++;
        } else {
            this.cart.push({ ...product, qty: 1, warrantyCode: '' });
        }

        this.updateCartUI();
        // Update product grid to reflect new available stock
        const posGrid = document.getElementById('pos-grid');
        if (posGrid) posGrid.innerHTML = this.renderProductGrid();

        if (window.toastService) window.toastService.show('Venda adicionada no carrinho!', 'success');
    }

    updateQty(productId, delta) {
        const cartItem = this.cart.find(i => i.id == productId);
        if (!cartItem) return;

        const product = this.products.find(p => p.id == productId);
        const newQty = cartItem.qty + delta;

        if (newQty <= 0) {
            this.cart = this.cart.filter(i => i.id != productId);
        } else if (newQty <= product.stock) {
            cartItem.qty = newQty;
        } else {
            if (window.toastService) window.toastService.warning('Estoque insuficiente!');
            else alert('Estoque insuficiente!');
        }
        this.updateCartUI();
        // Update product grid to reflect new available stock
        const posGrid = document.getElementById('pos-grid');
        if (posGrid) posGrid.innerHTML = this.renderProductGrid();
    }

    updateCartUI() {
        document.getElementById('cart-container').innerHTML = this.renderCartItems();

        // Re-attach icons
        if (window.feather) window.feather.replace();

        // Update Discount Toggles
        const btnFixed = document.getElementById('btn-discount-mode-fixed');
        const btnPercent = document.getElementById('btn-discount-mode-percent');

        if (btnFixed && btnPercent) {
            if (this.discountType === 'fixed') {
                btnFixed.className = "px-2 h-full text-[10px] font-bold border-r border-gray-200 hover:bg-gray-50 transition-colors text-unitech-primary bg-orange-50";
                btnPercent.className = "px-2 h-full text-[10px] font-bold border-r border-gray-200 hover:bg-gray-50 transition-colors text-gray-400";
            } else {
                btnFixed.className = "px-2 h-full text-[10px] font-bold border-r border-gray-200 hover:bg-gray-50 transition-colors text-gray-400";
                btnPercent.className = "px-2 h-full text-[10px] font-bold border-r border-gray-200 hover:bg-gray-50 transition-colors text-unitech-primary bg-orange-50";
            }
        }

        // Calculate Totals
        let subtotal = 0;
        this.cart.forEach(item => {
            const price = this.pricingMode === 'retail' ? item.retail : item.wholesale;
            subtotal += price * item.qty;
        });

        // Calculate Discount
        let discountAmount = 0;
        if (this.discountValue > 0) {
            if (this.discountType === 'fixed') {
                discountAmount = parseFloat(this.discountValue);
            } else {
                discountAmount = subtotal * (parseFloat(this.discountValue) / 100);
            }
        }

        // Prevent negative total
        if (discountAmount > subtotal) discountAmount = subtotal;

        const total = subtotal - discountAmount;
        this.cartTotal = total;
        this.cartSubtotal = subtotal;
        this.cartDiscount = discountAmount;

        // Update desktop cart
        // Subtotal removed


        const discountDisplay = document.getElementById('discount-display');
        const discountRow = document.getElementById('discount-display-row');
        if (discountDisplay) discountDisplay.innerText = `- ${formatCurrency(discountAmount)}`;

        if (discountRow) {
            if (discountAmount > 0) discountRow.classList.remove('hidden');
            else discountRow.classList.add('hidden');
        }

        const cartTotalEl = document.getElementById('cart-total');
        if (cartTotalEl) cartTotalEl.innerText = formatCurrency(total);

        const checkoutTotalDisplay = document.getElementById('checkout-total-display');
        if (checkoutTotalDisplay) checkoutTotalDisplay.innerText = formatCurrency(total);

        // Update mobile cart
        const mobileCartContainer = document.getElementById('mobile-cart-container');
        const mobileCartBadge = document.getElementById('mobile-cart-badge');
        const mobileCartCount = document.getElementById('mobile-cart-count');
        const mobileCartSubtotal = document.getElementById('mobile-cart-subtotal');
        const mobileDiscountDisplay = document.getElementById('mobile-discount-display');
        const mobileCartTotal = document.getElementById('mobile-cart-total');

        if (mobileCartContainer) {
            mobileCartContainer.innerHTML = this.renderCartItems();
        }
        if (mobileCartBadge) {
            mobileCartBadge.innerText = this.cart.length;
            mobileCartBadge.style.display = this.cart.length > 0 ? 'block' : 'none';
        }
        if (mobileCartCount) {
            mobileCartCount.innerText = `${this.cart.length} ${this.cart.length === 1 ? 'item' : 'itens'}`;
        }
        if (mobileCartSubtotal) {
            mobileCartSubtotal.innerText = formatCurrency(subtotal);
        }
        if (mobileDiscountDisplay) {
            mobileDiscountDisplay.innerText = `- ${formatCurrency(discountAmount)}`;
        }
        if (mobileCartTotal) {
            mobileCartTotal.innerText = formatCurrency(total);
        }

        // Update check for empty cart visual
        const checkoutBtn = document.getElementById('btn-checkout');
        if (checkoutBtn) {
            if (this.cart.length === 0) checkoutBtn.classList.add('opacity-50', 'pointer-events-none');
            else checkoutBtn.classList.remove('opacity-50', 'pointer-events-none');
        }

        const checkoutBtnMobile = document.getElementById('btn-checkout-mobile');
        if (checkoutBtnMobile) {
            if (this.cart.length === 0) checkoutBtnMobile.classList.add('opacity-50', 'pointer-events-none');
            else checkoutBtnMobile.classList.remove('opacity-50', 'pointer-events-none');
        }

        // Re-attach icons for mobile cart
        if (window.feather) window.feather.replace();
    }

    toggleMobileCart() {
        const modal = document.getElementById('mobile-cart-modal');
        if (modal) {
            modal.classList.toggle('hidden');
            // Update cart content when opening
            if (!modal.classList.contains('hidden')) {
                this.updateCartUI();
            }
        }
    }

    setDiscountMode(mode) {
        this.discountType = mode; // 'fixed' or 'percent'

        // Apply to both Desktop and Mobile elements
        const targets = [
            { fixed: 'btn-discount-fixed', percent: 'btn-discount-percent', symbol: 'discount-symbol' },
            { fixed: 'btn-discount-fixed-mobile', percent: 'btn-discount-percent-mobile', symbol: 'mobile-discount-symbol' }
        ];

        targets.forEach(ids => {
            const btnFixed = document.getElementById(ids.fixed);
            const btnPercent = document.getElementById(ids.percent);
            const symbol = document.getElementById(ids.symbol);

            if (btnFixed && btnPercent) {
                if (mode === 'fixed') {
                    btnFixed.classList.add('bg-white', 'shadow-sm', 'text-unitech-primary');
                    btnFixed.classList.remove('text-gray-400', 'text-gray-500');
                    btnPercent.classList.remove('bg-white', 'shadow-sm', 'text-unitech-primary');
                    btnPercent.classList.add('text-gray-400', 'text-gray-500');
                    if (symbol) symbol.innerText = 'R$';
                } else {
                    btnPercent.classList.add('bg-white', 'shadow-sm', 'text-unitech-primary');
                    btnPercent.classList.remove('text-gray-400', 'text-gray-500');
                    btnFixed.classList.remove('bg-white', 'shadow-sm', 'text-unitech-primary');
                    btnFixed.classList.add('text-gray-400', 'text-gray-500');
                    if (symbol) symbol.innerText = '%';
                }
            }
        });

        this.updateCartUI();
    }

    setDiscountValue(val) {
        this.discountValue = parseFloat(val) || 0;
        this.updateCartUI();
    }

    viewProductDetails(id) {
        const p = this.products.find(x => x.id == id);
        if (!p) return;

        // Populate Modal
        document.getElementById('qv-title').innerText = p.name;
        document.getElementById('qv-sku').innerText = p.sku || '--';
        document.getElementById('qv-category').innerText = p.category || 'Geral';
        document.getElementById('qv-supplier').innerText = p.supplier || 'N/A';
        const cartItem = this.cart.find(i => i.id == id);
        const availableStock = p.stock - (cartItem ? cartItem.qty : 0);
        document.getElementById('qv-stock').innerText = availableStock;
        // document.getElementById('qv-location').innerText = p.location || 'Não definido'; // Removed Badge
        document.getElementById('qv-location-list').innerText = p.location || 'Não definido'; // Added to List
        document.getElementById('qv-specs').innerText = p.specifications || 'Sem especificações.';

        document.getElementById('qv-retail').innerText = `R$ ${p.retail.toFixed(2)}`;
        document.getElementById('qv-wholesale').innerText = `R$ ${p.wholesale.toFixed(2)}`;

        const img = document.getElementById('qv-image');
        if (p.photo) {
            img.src = p.photo;
            img.classList.remove('hidden');
            document.getElementById('qv-img-placeholder').classList.add('hidden');
        } else {
            img.src = '';
            img.classList.add('hidden');
            document.getElementById('qv-img-placeholder').classList.remove('hidden');
        }

        // Show Modal
        document.getElementById('product-details-modal').classList.remove('hidden');
    }

    getProductDetailsModalHTML() {
        return `
        <div id="product-details-modal" class="hidden fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onclick="if(event.target === this) this.classList.add('hidden')">
             <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 m-4 flex flex-col max-h-[90vh]">
                 <!-- Image Section -->
                 <div class="relative h-64 bg-white flex items-center justify-center overflow-hidden border-b border-gray-100 p-4">
                     <img id="qv-image" src="" class="w-full h-full object-contain hidden pointer-events-none">
                     <div id="qv-img-placeholder" class="text-gray-300 flex flex-col items-center">
                         <i data-feather="image" class="w-16 h-16 opacity-50 mb-2"></i>
                         <span class="text-xs uppercase font-bold tracking-widest">Sem Foto</span>
                     </div>
                     <button onclick="document.getElementById('product-details-modal').classList.add('hidden')" class="absolute top-3 right-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full p-2 transition-colors shadow-sm">
                         <i data-feather="x" class="w-5 h-5"></i>
                     </button>
                 </div>
                 
                 <!-- Details Section -->
                 <div class="p-6 overflow-y-auto custom-scrollbar">
                      <div class="mb-6 text-center">
                          <p class="text-xs font-mono text-gray-400 mb-1 tracking-wider" id="qv-sku">#SKU</p>
                          <h3 class="text-xl font-black text-gray-800 leading-tight mb-3" id="qv-title">Nome do Produto</h3>
                          
                          <div class="flex justify-center flex-wrap gap-2">
                             <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wide border border-gray-200" id="qv-category">Categoria</span>
                          </div>
                      </div>
                      
                      <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="bg-gradient-to-br from-unitech-primary/5 to-unitech-primary/10 p-4 rounded-xl border border-unitech-primary/20 text-center">
                                <p class="text-[10px] text-unitech-primary/70 font-black uppercase tracking-widest mb-1">Varejo</p>
                                <p class="text-unitech-primary font-black text-2xl" id="qv-retail">R$ 0,00</p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center flex flex-col justify-center">
                                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Atacado</p>
                                <p class="text-gray-600 font-bold text-xl" id="qv-wholesale">R$ 0,00</p>
                            </div>
                      </div>

                      <div class="space-y-4">
                          <div class="flex items-center justify-between border-b border-dashed border-gray-200 pb-2">
                                <span class="text-xs font-bold text-gray-400 uppercase">Estoque Disponível</span>
                                <span class="text-sm font-bold text-gray-800 bg-green-100 text-green-700 px-2 py-0.5 rounded" id="qv-stock">0</span>
                           </div>
                           <div class="flex items-center justify-between border-b border-dashed border-gray-200 pb-2">
                                <span class="text-xs font-bold text-gray-400 uppercase">Local do Estoque</span>
                                <span class="text-sm font-bold text-blue-700 flex items-center gap-1" id="qv-location-list">
                                    <i data-feather="map-pin" class="w-3 h-3"></i> --
                                </span>
                           </div>
                           <div class="flex items-center justify-between border-b border-dashed border-gray-200 pb-2">
                                <span class="text-xs font-bold text-gray-400 uppercase">Fornecedor</span>
                                <span class="text-xs font-bold text-gray-700" id="qv-supplier">--</span>
                           </div>
                           <div>
                                <span class="block text-xs font-bold text-gray-400 uppercase mb-1">Especificações / Compatibilidade</span>
                                <p class="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100" id="qv-specs">--</p>
                           </div>
                      </div>
                 </div>
                 
                 <div class="p-4 bg-gray-50 border-t border-gray-100">
                      <button onclick="document.getElementById('product-details-modal').classList.add('hidden')" class="w-full py-3.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg hover:shadow-xl transform active:scale-[0.98]">
                          Fechar Detalhes
                      </button>
                 </div>
             </div>
        </div>
        `;
    }

    loadQuote(id) {
        const sales = storage.getSales();
        const quote = sales.find(s => s.id === id);

        if (!quote) {
            if (window.toastService) window.toastService.error('❌ Orçamento não encontrado!');
            else alert('❌ Orçamento não encontrado!');
            return;
        }

        if (quote.status !== 'quote') {
            if (!confirm('Este ID pertence a uma venda já finalizada. Deseja carregar os itens mesmo assim?')) return;
        }

        this.currentQuoteId = id; // Mark original source

        // Load Items
        this.cart = quote.items.map(i => {
            const product = this.products.find(p => p.id === i.id);
            if (!product) return null;

            return {
                ...product,
                qty: i.qty,
                retail: i.price, // Lock price to quoted price
                wholesale: i.price, // Lock price to quoted price
                warrantyCode: i.warrantyCode || ''
            };
        }).filter(Boolean);

        // Load Client
        if (quote.clientId) {
            this.selectClient(quote.clientId);
        } else {
            this.selectedClient = null; // Reset
            const name = quote.clientName || 'Consumidor Final';
            const desktopInput = document.getElementById('pos-client-search');
            const mobileInput = document.getElementById('pos-client-search-mobile');
            if (desktopInput) desktopInput.value = name;
            if (mobileInput) mobileInput.value = name;
        }

        // Update UI
        this.updateCartUI();

        // Visual Feedback
        const grid = document.getElementById('pos-grid');
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                <div class="relative mb-8">
                    <div class="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse"></div>
                    <div class="relative w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl rotate-3">
                        <i data-feather="file-text" class="w-12 h-12 text-white"></i>
                    </div>
                    <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <i data-feather="check" class="w-5 h-5 text-green-500"></i>
                    </div>
                </div>
                
                <h3 class="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Orçamento Pronto!</h3>
                <p class="text-orange-500 font-mono text-sm font-bold mb-6">${id}</p>
                
                <div class="bg-gray-50 border border-gray-100 p-6 rounded-2xl max-w-md w-full mb-8 shadow-inner">
                    <p class="text-gray-500 text-sm leading-relaxed">
                        Os itens e preços originais da cotação foram restaurados no seu carrinho. 
                        Agora você pode finalizar a venda normalmente ou adicionar novos itens.
                    </p>
                </div>
                
                <button onclick="window.salesModule.render()" class="group flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all hover:scale-105 shadow-xl shadow-gray-900/20 uppercase tracking-widest text-xs">
                    <i data-feather="shopping-bag" class="w-5 h-5 group-hover:rotate-12 transition-transform"></i>
                    Ir para o Check-out
                </button>
            </div>
        `;
        if (window.feather) window.feather.replace();
    }

    handleScan(sku) {
        const product = this.products.find(p => p.sku === sku);
        if (product) {
            // DON'T auto-add to cart - just filter and highlight the product
            console.log('[Sales] Product found:', product.name, '- Click to add or scan again');

            // Filter Grid to show only this product (Visual Confirmation)
            this.filteredProducts = [product];
            document.getElementById('pos-grid').innerHTML = this.renderProductGrid();

            // Update Search Input to match
            const searchInput = document.getElementById('pos-search');
            if (searchInput) {
                searchInput.value = sku;
            }

            // Show visual feedback
            setTimeout(() => {
                const productCard = document.querySelector(`[onclick*="addToCart('${product.id}')"]`);
                if (productCard) {
                    productCard.classList.add('ring-4', 'ring-green-500');
                    setTimeout(() => {
                        productCard.classList.remove('ring-4', 'ring-green-500');
                    }, 2000);
                }
            }, 100);
        } else {
            console.warn('[Sales] Product not found for SKU:', sku);
            if (window.toastService) window.toastService.error(`❌ Produto não encontrado: ${sku}`);
            else alert(`❌ Produto não encontrado: ${sku}`);
        }
    }

    async processSale(method, installments = 1, pixBank = null) {
        if (this.processingSale) return;
        this.processingSale = true;

        try {
            // Validation for Installments
            const installmentsInt = parseInt(installments);

            // 0. STOCK VALIDATION: Check if products are still available (skip for Budgets)
            if (method !== 'ORCAMENTO') {
                const currentProducts = storage.getProducts();
                for (const item of this.cart) {
                    if (item.isOS) continue; // Skip Service Orders
                    const p = currentProducts.find(prod => String(prod.id) === String(item.id));
                    if (!p || p.stock < item.qty) {
                        const name = p ? p.name : item.name;
                        const stock = p ? p.stock : 0;
                        throw new Error(`ESTOQUE INSUFICIENTE: O produto "${name}" possui apenas ${stock} un. em estoque.`);
                    }
                }
            }

            const total = this.cartTotal || 0;
            const subtotal = this.cartSubtotal || 0;
            const discountAmountValue = this.cartDiscount || 0;

            // Get current user (Seller)
            const currentUser = auth.getUser();

            const idPrefix = method === 'ORCAMENTO' ? 'ORC' : 'V';

            // SANITIZATION: Firestore hates 'undefined'
            const cleanUndefined = (obj) => {
                Object.keys(obj).forEach(key => {
                    if (obj[key] === undefined) {
                        delete obj[key];
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        cleanUndefined(obj[key]);
                    }
                });
                return obj;
            };

            // ID Generation: Reuse budget number if converting, otherwise generate new
            let finalId = idPrefix + '-' + Date.now().toString().slice(-6);
            if (this.currentQuoteId && method !== 'ORCAMENTO') {
                finalId = this.currentQuoteId; // Keep ORC-XXXXX even when it becomes a sale
            }

            const rawSale = {
                id: finalId,
                date: new Date().toISOString(),
                clientId: this.selectedClient ? this.selectedClient.id : undefined, // Changed back to undefined
                clientName: this.selectedClient ? this.selectedClient.name : 'Consumidor Final',
                sellerName: currentUser ? currentUser.name : 'Vendedor Padrão',

                items: this.cart.map(i => ({
                    id: i.id,
                    name: i.name,
                    qty: i.qty,
                    price: this.pricingMode === 'retail' ? i.retail : i.wholesale,
                    total: (this.pricingMode === 'retail' ? i.retail : i.wholesale) * i.qty,
                    warrantyCode: i.warrantyCode || undefined, // Changed back to undefined
                    isOS: i.isOS || undefined,
                    osId: i.osId || undefined,
                    type: i.type || undefined
                })),
                discount: {
                    type: this.discountType,
                    value: this.discountValue || 0,
                    amount: discountAmountValue.toFixed(2)
                },
                total: total,
                subtotal: subtotal,
                method: method,
                pixBank: pixBank || undefined,
                originQuoteId: (this.currentQuoteId && method !== 'ORCAMENTO') ? this.currentQuoteId : undefined,
                installments: installmentsInt || 1,
                status: method === 'ORCAMENTO' ? 'quote' : 'completed'
            };

            const sale = cleanUndefined(rawSale);

            // Save to Storage
            const success = await storage.addSale(sale);
            if (success) {
                // Close Checkout Modal FIRST
                document.getElementById('checkout-modal').classList.add('hidden');

                // Store sale ID for post-sale actions
                this.lastSaleId = sale.id;

                // UPDATE OS STATUS IF APPLICABLE
                sale.items.forEach(item => {
                    if (item.isOS && item.osId) {
                        const checklists = storage.getChecklists();
                        const os = checklists.find(c => c.id == item.osId);
                        if (os) {
                            os.situation = 'Faturado';
                            os.status = 'Faturado'; // Update legacy status too
                            storage.updateChecklist(os);
                            console.log(`[Sales] OS #${os.id} automatically updated to Faturado`);
                        }
                    }
                });

                // Handle Quote conversion: BUDGET IS THE SALE (Update record)
                if (this.currentQuoteId && sale.status !== 'quote' && this.currentQuoteId !== sale.id) {
                    console.log(`[Sales] Budget ${this.currentQuoteId} converted to a DIFFERENT sale ID ${sale.id}. Removing old record.`);
                    storage.deleteSale(this.currentQuoteId);
                }
                this.currentQuoteId = null; // Clear after processing

                // Clear Cart and Reset
                this.cart = [];
                this.selectedClient = null;
                this.discountValue = 0; // Reset discount
                this.products = storage.getProducts(); // Refresh stock
                this.filteredProducts = [...this.products];
                this.render(); // Re-render grid (stock updates)
                this.updateCartUI(); // Reset UI values

                // Show Post-Sale Modal AFTER render (to ensure modal isn't cleared)
                setTimeout(() => {
                    this.showPostSaleModal(sale);
                }, 100);
            } else {
                throw new Error('Falha ao salvar venda no Storage (retornou false).');
            }
        } catch (error) {
            console.error('Sale Processing Error:', error);
            if (window.toastService) window.toastService.error(`Erro ao processar venda: ${error.message}`);
            else alert(`Erro ao processar venda: ${error.message}`);
        } finally {
            this.processingSale = false;
        }
    }

    /**
     * Show Post-Sale Modal with print options
     * @param {Object} sale - Sale object
     */
    showPostSaleModal(sale) {
        const modal = document.getElementById('post-sale-modal');
        if (!modal) {
            console.error('Post-sale modal not found');
            return;
        }

        // Set sale ID in modal
        document.getElementById('post-sale-id').innerText = sale.id;

        // Custom UI for Quote
        const isQuote = sale.status === 'quote';
        document.getElementById('post-sale-title').innerText = isQuote ? 'Orçamento Salvo' : 'Venda Concluída';
        document.getElementById('post-sale-subtitle').innerText = isQuote ? 'O orçamento foi salvo no histórico' : 'Escolha uma opção abaixo';

        const header = document.getElementById('post-sale-header');
        if (isQuote) {
            header.className = 'bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-center';
            document.getElementById('post-sale-icon-container').innerHTML = '<i data-feather="file-text" class="w-10 h-10 text-orange-500"></i>';
            document.getElementById('btn-print-nfe').classList.add('hidden');
            document.getElementById('btn-share-whatsapp').classList.remove('hidden'); // Show WA
            document.querySelector('#btn-print-cupom p.font-bold').innerText = 'Imprimir Orçamento';
            document.querySelector('#btn-print-cupom p.text-xs').innerText = 'Documento de Cotação';
        } else {
            header.className = 'bg-gradient-to-r from-green-500 to-green-600 p-6 text-center';
            document.getElementById('post-sale-icon-container').innerHTML = '<i data-feather="check-circle" class="w-10 h-10 text-green-500"></i>';
            document.getElementById('btn-print-nfe').classList.remove('hidden');
            document.getElementById('btn-share-whatsapp').classList.add('hidden'); // Hide WA
            document.querySelector('#btn-print-cupom p.font-bold').innerText = 'Imprimir Cupom';
            document.querySelector('#btn-print-cupom p.text-xs').innerText = 'Cupom Não Fiscal';
        }

        // Show modal
        modal.classList.remove('hidden');

        // Attach event listeners
        this.attachPostSaleEvents(sale);

        // Re-render icons
        if (window.feather) window.feather.replace();
    }

    /**
     * Attach event listeners to post-sale modal buttons
     * @param {Object} sale - Sale object
     */
    attachPostSaleEvents(sale) {
        const modal = document.getElementById('post-sale-modal');

        // Get buttons
        const btnNFE = document.getElementById('btn-print-nfe');
        const btnCupom = document.getElementById('btn-print-cupom');
        const btnComplete = document.getElementById('btn-complete-sale');
        const btnWhatsApp = document.getElementById('btn-share-whatsapp');

        console.log('[PostSale] Attaching events to buttons', { btnNFE, btnCupom, btnComplete, saleId: sale.id });

        if (!btnNFE || !btnCupom || !btnComplete) {
            console.error('[PostSale] One or more buttons not found!');
            return;
        }

        // NF-e Button Handler
        const handleNFE = async () => {
            console.log('[PostSale] NF-e button clicked');
            await printerService.printDANFE(sale);
        };

        // Cupom Button Handler
        const handleCupom = async () => {
            console.log('[PostSale] Cupom button clicked');
            await printerService.printCUPOM(sale);
        };

        // WhatsApp Button Handler
        const handleWhatsApp = () => {
            let phone = '';
            let clientName = sale.clientName;

            if (sale.clientId) {
                const client = storage.getClients().find(c => c.id === sale.clientId);
                if (client) {
                    phone = client.mobile || client.phone || '';
                    clientName = client.name;
                }
            }

            phone = phone.replace(/\D/g, '');
            if (!phone) {
                const input = prompt('Digite o número do WhatsApp (com DDD):', '');
                if (input) phone = input.replace(/\D/g, '');
            }

            const text = encodeURIComponent(`*ORÇAMENTO UNITECH*\n\n📄 *Nº:* ${sale.id}\n📅 *Data:* ${new Date(sale.date).toLocaleDateString()}\n👤 *Cliente:* ${clientName}\n\n*ITENS:*\n${sale.items.map(i => `${i.qty}x ${i.name.substring(0, 25)}... R$ ${(i.price || 0).toFixed(2)}`).join('\n')}\n\n💰 *TOTAL: R$ ${sale.total.toFixed(2)}*\n\n_Aguardamos seu retorno!_`);

            window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        };

        // Complete Button Handler
        const handleComplete = () => {
            console.log('[PostSale] Complete button clicked');
            modal.classList.add('hidden');
            this.removePostSaleKeyboardListeners();
        };

        // Add event listeners
        btnNFE.addEventListener('click', handleNFE);
        if (btnWhatsApp) btnWhatsApp.addEventListener('click', handleWhatsApp);
        btnCupom.addEventListener('click', handleCupom);
        btnComplete.addEventListener('click', handleComplete);

        // Store handlers for cleanup
        this.postSaleHandlers = {
            btnNFE,
            btnCupom,
            btnComplete,
            handleNFE,
            handleCupom,
            handleComplete
        };

        // Keyboard Shortcuts
        const keyHandler = async (e) => {
            if (modal.classList.contains('hidden')) return;

            console.log('[PostSale] Key pressed:', e.key);

            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    await printerService.printDANFE(sale);
                    break;
                case 'Enter':
                    e.preventDefault();
                    await printerService.printCUPOM(sale);
                    break;
                case 'Escape':
                    e.preventDefault();
                    modal.classList.add('hidden');
                    this.removePostSaleKeyboardListeners();
                    break;
            }
        };

        // Store handler reference for cleanup
        this.postSaleKeyHandler = keyHandler;

        // Add keyboard listener
        document.addEventListener('keydown', keyHandler);

        console.log('[PostSale] Events attached successfully');
    }

    /**
     * Remove post-sale keyboard listeners and button handlers
     */
    removePostSaleKeyboardListeners() {
        // Remove keyboard listener
        if (this.postSaleKeyHandler) {
            document.removeEventListener('keydown', this.postSaleKeyHandler);
            this.postSaleKeyHandler = null;
        }

        // Remove button listeners
        if (this.postSaleHandlers) {
            const { btnNFE, btnCupom, btnComplete, handleNFE, handleCupom, handleComplete } = this.postSaleHandlers;

            if (btnNFE) btnNFE.removeEventListener('click', handleNFE);
            if (btnCupom) btnCupom.removeEventListener('click', handleCupom);
            if (btnComplete) btnComplete.removeEventListener('click', handleComplete);

            this.postSaleHandlers = null;
        }

        console.log('[PostSale] Event listeners cleaned up');
    }

    showReceipt(sale) {
        const modal = document.getElementById('receipt-modal');
        document.getElementById('receipt-date').innerText = `Data: ${new Date(sale.date).toLocaleString()}`;
        document.getElementById('receipt-client').innerText = `Cliente: ${sale.clientName || 'Consumidor Final'}`;

        // Translate method
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
        const rawMethod = sale.method || 'N/A';
        const displayMethod = methodMap[rawMethod] || rawMethod.replace('_', ' ');

        document.getElementById('receipt-method').innerText = displayMethod + (sale.pixBank ? ` - ${sale.pixBank}` : '');
        document.getElementById('receipt-items').innerHTML = sale.items.map(i => `
            <div class="flex justify-between border-b border-gray-100 pb-1 mb-1 last:border-0">
                <div>
                   <span class="block font-bold text-gray-700">${i.qty}x ${i.name}</span>
                   <span class="text-[10px] text-gray-400">Unit: R$ ${(i.price || 0).toFixed(2)}</span>
                   ${i.warrantyCode ? `<span class="block text-[9px] font-mono text-gray-500">Selo: ${i.warrantyCode}</span>` : ''}
                </div>
                <span class="font-bold">R$ ${(i.total || 0).toFixed(2)}</span>
            </div>
        `).join('');

        document.getElementById('receipt-subtotal').innerText = `R$ ${(sale.total || 0).toFixed(2)}`;
        document.getElementById('receipt-final').innerText = `R$ ${(sale.total || 0).toFixed(2)}`;

        modal.classList.remove('hidden');
    }

    // --- History & Refunds ---
    renderHistory() {
        const sales = storage.getSales().sort((a, b) => new Date(b.date) - new Date(a.date));



        return `
             <div class="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 animate-fade-in">
                  <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                      <h3 class="font-bold text-lg text-gray-800 flex items-center gap-2">
                         <i data-feather="clock" class="w-5 h-5 text-gray-500"></i>
                         Histórico de Vendas
                      </h3>
                      <div class="flex items-center gap-3">
                          <div class="relative">
                              <i data-feather="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
                              <input type="text" id="history-search" placeholder="Buscar por ID ou Cliente..." class="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-unitech-primary/20 transition-all w-64 font-medium" oninput="window.salesModule.filterHistory(this.value)">
                          </div>
                          <button onclick="window.salesModule.render();" class="text-xs font-bold text-white bg-gray-800 hover:bg-black px-3 py-2 rounded flex items-center gap-2 transition-colors">
                              <i data-feather="arrow-left" class="w-4 h-4"></i> VOLTAR AO PDV
                          </button>
                      </div>
                  </div>
                  
                  <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      <table class="w-full text-left border-collapse">
                          <thead>
                              <tr class="text-xs text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                                  <th class="p-3 font-medium">Data</th>
                                  <th class="p-3 font-medium">ID Venda</th>
                                  <th class="p-3 font-medium">Cliente</th>
                                  <th class="p-3 font-medium">Total</th>
                                  <th class="p-3 font-medium">Status</th>
                                  <th class="p-3 font-medium text-right">Ações</th>
                              </tr>
                          </thead>
                          <tbody class="text-sm">
                              ${sales.length > 0 ? sales.map(sale => {
            const isRefunded = sale.status === 'refunded';
            return `
                                  <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                                      <td class="p-3 text-gray-500 font-mono text-xs">${new Date(sale.date).toLocaleString()}</td>
                                      <td class="p-3 font-bold text-gray-700 font-mono">
                                          ${(() => {
                    const osItem = sale.items && sale.items.find(i => i.isOS || i.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i));
                    if (osItem) {
                        let osId = osItem.osId;
                        if (!osId) {
                            const match = osItem.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i);
                            if (match) osId = match[1];
                        }
                        return osId ? `CONSERTO OS #${osId}` : sale.id;
                    }

                    // Link between Budget and Sale (Bidirectional)
                    if (sale.status === 'converted' && sale.convertedToId) {
                        return `<div class="flex flex-col">
                                <span>${sale.id}</span>
                                <span class="text-[9px] text-blue-500 font-bold flex items-center gap-1 mt-0.5">
                                    <i data-feather="repeat" class="w-2.5 h-2.5"></i> VENDA: ${sale.convertedToId}
                                </span>
                            </div>`;
                    }

                    if (sale.originQuoteId && sale.id !== sale.originQuoteId) {
                        return `<div class="flex flex-col">
                                <span class="font-bold">${sale.id}</span>
                                <span class="text-[9px] text-orange-500 font-bold flex items-center gap-1 mt-0.5">
                                    <i data-feather="file-text" class="w-2.5 h-2.5"></i> VIM DE: ${sale.originQuoteId}
                                </span>
                            </div>`;
                    }

                    return sale.id;
                })()}
                                      </td>
                                      <td class="p-3 text-gray-800 font-medium">${sale.clientName || 'Consumidor Final'}</td>
                                      <td class="p-3 font-bold text-unitech-primary">R$ ${sale.total.toFixed(2)}</td>
                                      <td class="p-3">
                                          ${sale.status === 'quote' ? `
                                              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-yellow-50 text-yellow-700 border-yellow-100">
                                                  Orçamento
                                              </span>
                                          ` : (sale.status === 'converted' || sale.originQuoteId) ? `
                                              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                                  <i data-feather="check-double" class="w-3 h-3"></i> Concretizado (ORC)
                                              </span>
                                          ` : `
                                              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${isRefunded ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}">
                                                  ${isRefunded ? 'Estornado' : 'Concluído'}
                                              </span>
                                          `}
                                      </td>
                                      <td class="p-3 text-right">
                                          ${!isRefunded ? `
                                          <button class="bg-blue-50 text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-3 py-1.5 rounded transition-all text-xs font-bold border border-blue-200 shadow-sm hover:shadow btn-action" data-action="view" data-id="${sale.id}">
                                              VISUALIZAR
                                          </button>
                                          <button class="bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 px-3 py-1.5 rounded transition-all text-xs font-bold border border-red-200 shadow-sm hover:shadow btn-action" data-action="refund" data-id="${sale.id}">
                                              ESTORNAR
                                          </button>` : `
                                          <button class="text-xs text-gray-500 hover:text-gray-700 font-bold border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded transition-all shadow-sm btn-action" data-action="view" data-id="${sale.id}">
                                              DETALHES
                                          </button>
                                          <span class="text-xs font-bold text-red-400 bg-red-50 px-2 py-1 rounded ml-2">ESTORNADO</span>`}
                                      </td>
                                  </tr>`;
        }).join('') : `<tr><td colspan="6" class="p-8 text-center text-gray-400">Nenhuma venda registrada.</td></tr>`}
                     </tbody>
                 </table>
             </div>
        </div>
        `;
    }

    getSaleDetailsModalHTML() {
        return `
        <div id="sale-details-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] hidden flex items-center justify-center p-4 animate-fade-in">
             <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
                 <div class="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-center">
                     <div>
                        <h3 class="font-black text-xl text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            <i data-feather="file-text" class="w-5 h-5 text-gray-500"></i> Detalhes da Venda
                        </h3>
                         <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5" id="detail-id-display">V-000000</p>
                      </div>
                      <button onclick="document.getElementById('sale-details-modal').classList.add('hidden')" class="text-gray-400 hover:text-red-500 transition-colors"><i data-feather="x" class="w-6 h-6"></i></button>
                  </div>
                  
                  <div class="p-6 overflow-y-auto custom-scrollbar space-y-6">
                      <!-- Info Grid -->
                      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <div>
                              <p class="text-[10px] uppercase font-bold text-gray-400">Data</p>
                              <p class="font-bold text-gray-800 text-sm" id="detail-date">--/--/--</p>
                          </div>
                          <div>
                              <p class="text-[10px] uppercase font-bold text-gray-400">Cliente</p>
                              <p class="font-bold text-gray-800 text-sm truncate" id="detail-client">--</p>
                          </div>
                          <div>
                              <p class="text-[10px] uppercase font-bold text-gray-400">Vendedor</p>
                              <p class="font-bold text-gray-800 text-sm truncate" id="detail-seller">--</p>
                          </div>
                          <div>
                              <p class="text-[10px] uppercase font-bold text-gray-400">Pagamento</p>
                              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase" id="detail-method">--</span>
                          </div>
                          <div>
                              <p class="text-[10px] uppercase font-bold text-gray-400">Total</p>
                              <p class="font-bold text-unitech-primary text-base" id="detail-total">R$ 0,00</p>
                          </div>
                      </div>

                     <!-- Items List -->
                     <div>
                         <h4 class="text-xs font-bold text-gray-500 uppercase mb-3 border-b border-gray-100 pb-1">Itens Adquiridos</h4>
                         <div id="detail-items-list" class="space-y-2"></div>
                     </div>

                     <!-- Refund Info Section -->
                     <div id="detail-refund-info" class="hidden bg-red-50 border border-red-100 rounded-xl p-4">
                         <div class="flex items-start gap-3">
                             <div class="p-2 bg-red-100 rounded-lg text-red-500">
                                 <i data-feather="alert-triangle" class="w-5 h-5"></i>
                             </div>
                             <div>
                                 <h4 class="font-bold text-red-800 text-sm">Venda Estornada</h4>
                                 <p class="text-xs text-red-600 mt-1">Esta transação foi cancelada e os itens retornaram ao estoque.</p>
                                 <div class="mt-3 flex gap-4 text-xs">
                                     <div>
                                         <span class="font-bold text-red-400 uppercase">Autorizado Por:</span>
                                         <p class="font-bold text-red-800" id="detail-refund-by">Admin</p>
                                     </div>
                                     <div>
                                         <span class="font-bold text-red-400 uppercase">Data do Estorno:</span>
                                         <p class="font-bold text-red-800" id="detail-refund-at">--/--/--</p>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>

                <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-3">
               <div class="flex gap-2">
                   <button id="btn-print-nfe-history" class="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-xs uppercase tracking-widest flex items-center gap-2">
                       <i data-feather="file-text" class="w-4 h-4"></i> NF-e
                   </button>
                   <button id="btn-print-cupom-history" class="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-lg border border-green-200 hover:bg-green-100 transition-colors text-xs uppercase tracking-widest flex items-center gap-2">
                       <i data-feather="printer" class="w-4 h-4"></i> Cupom
                   </button>
                   <button id="btn-resume-quote" class="hidden px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-500/20">
                       <i data-feather="play-circle" class="w-4 h-4"></i> Concretizar Venda
                   </button>
               </div>
               <button onclick="document.getElementById('sale-details-modal').classList.add('hidden')" class="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors text-xs uppercase tracking-widest">Fechar</button>
           </div>
             </div>
        </div>
        `;
    }

    viewSaleDetails(saleId) {
        try {
            console.log('Viewing details for:', saleId);
            const sales = storage.getSales();
            const sale = sales.find(s => s.id === saleId);

            if (!sale) {
                console.error('Sale not found:', saleId);
                alert('Erro: Venda não encontrada no histórico local.\nID: ' + saleId);
                return;
            }

            // 1. Ensure Modal Exists in Body (Fixing Stacking Context/Transform issues)
            let modal = document.getElementById('sale-details-modal');
            if (!modal) {
                console.log('Injecting modal into body...');
                const modalHTML = this.getSaleDetailsModalHTML();
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                modal = document.getElementById('sale-details-modal');

                // Re-initialize feather icons for the new modal content
                if (window.feather) setTimeout(() => window.feather.replace(), 0);
            }

            // Populate Fields
            console.log('Sale found:', sale);
            console.log('Sale clientName:', sale.clientName);
            document.getElementById('detail-id-display').innerText = sale.id;
            document.getElementById('detail-date').innerText = new Date(sale.date).toLocaleString('pt-BR');
            document.getElementById('detail-client').innerText = sale.clientName || 'Consumidor Final';
            document.getElementById('detail-seller').innerText = sale.sellerName || 'Vendedor Padrão';
            document.getElementById('detail-total').innerText = `R$ ${(sale.total || 0).toFixed(2)}`;

            // Translate and format payment method
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
            const rawMethod = sale.method || 'N/A';
            const displayMethod = methodMap[rawMethod] || rawMethod.replace('_', ' ');

            document.getElementById('detail-method').innerText = displayMethod + (sale.pixBank ? ` - ${sale.pixBank}` : '');

            // Items
            const itemsList = document.getElementById('detail-items-list');
            itemsList.innerHTML = sale.items.map(item => `
                <div class="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center font-bold text-xs text-gray-500">${item.qty}x</div>
                        <div>
                            <p class="font-bold text-gray-800 text-sm">${item.name}</p>
                            <p class="text-[10px] text-gray-400">Unit: R$ ${(item.price || 0).toFixed(2)}</p>
                            ${item.warrantyCode ? `<p class="text-[10px] text-unitech-primary font-bold mt-0.5">Selo: ${item.warrantyCode}</p>` : ''}
                        </div>
                    </div>
                    <p class="font-bold text-gray-700 text-sm">R$ ${(item.total || 0).toFixed(2)}</p>
                </div>
            `).join('');

            // Refund Info
            const refundSection = document.getElementById('detail-refund-info');
            if (sale.status === 'refunded') {
                refundSection.classList.remove('hidden');
                document.getElementById('detail-refund-by').innerText = sale.refundedBy || 'Desconhecido';
                document.getElementById('detail-refund-at').innerText = sale.refundedAt ? new Date(sale.refundedAt).toLocaleString('pt-BR') : '---';
            } else {
                refundSection.classList.add('hidden');
            }

            // Resume Quote Logic
            const resumeBtn = document.getElementById('btn-resume-quote');
            if (resumeBtn) {
                if (sale.status === 'quote') {
                    resumeBtn.classList.remove('hidden');
                    resumeBtn.onclick = () => {
                        document.getElementById('sale-details-modal').classList.add('hidden');
                        document.querySelector('[data-target="sales"]').click();
                        setTimeout(() => this.loadQuote(sale.id), 500);
                    };
                } else {
                    resumeBtn.classList.add('hidden');
                }
            }

            // Attach Print Listeners
            // Attach Print Listeners
            const btnPrintNFE = document.getElementById('btn-print-nfe-history');
            const btnPrintCupom = document.getElementById('btn-print-cupom-history');

            if (btnPrintNFE && btnPrintCupom) {
                // Direct assignment to execute the latest closure state
                btnPrintNFE.onclick = async (e) => {
                    e.preventDefault();
                    console.log('[History] NF-e clicked');
                    // Visual feedback
                    const originalsText = btnPrintNFE.innerHTML;
                    btnPrintNFE.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i> Imprimindo...';
                    if (window.feather) window.feather.replace();

                    try {
                        await printerService.printDANFE(sale);
                    } catch (err) {
                        alert('Erro ao imprimir NF-e: ' + err.message);
                    } finally {
                        btnPrintNFE.innerHTML = originalsText;
                        if (window.feather) window.feather.replace();
                    }
                };

                btnPrintCupom.onclick = async (e) => {
                    e.preventDefault();
                    console.log('[History] Cupom clicked');
                    // Visual feedback
                    const originalsText = btnPrintCupom.innerHTML;
                    btnPrintCupom.innerHTML = '<i data-feather="loader" class="w-4 h-4 animate-spin"></i> Imprimindo...';
                    if (window.feather) window.feather.replace();

                    try {
                        await printerService.printCUPOM(sale);
                    } catch (err) {
                        alert('Erro ao imprimir Cupom: ' + err.message);
                    } finally {
                        btnPrintCupom.innerHTML = originalsText;
                        if (window.feather) window.feather.replace();
                    }
                };
            }

            modal.classList.remove('hidden');
            if (window.feather) window.feather.replace();
        } catch (error) {
            console.error(error);
            alert('Erro ao abrir detalhes da venda:\n' + error.message);
        }
    }

    async printReceiptById(saleId, type = 'cupom') {
        try {
            console.log(`[SalesModule] Printing ${type} for ID: ${saleId}`);
            const sales = storage.getSales();
            const sale = sales.find(s => s.id === saleId);

            if (!sale) {
                alert('Erro: Venda não encontrada no armazenamento local.');
                return;
            }

            if (type === 'cupom') {
                await printerService.printCUPOM(sale);
            } else {
                await printerService.printDANFE(sale);
            }
        } catch (err) {
            console.error('Print Error:', err);
            alert('Erro ao processar impressão: ' + err.message);
        }
    }

    refundSale(saleId) {
        // Security Check
        const password = prompt("🔐 AUTORIZAÇÃO NECESSÁRIA\n\nEsta ação requer privilégios de Gerente ou CEO.\nDigite a SENHA DO GESTOR para continuar:");

        if (!password) return; // User cancelled

        const users = storage.getUsers();
        // Check if password matches any CEO or Manager
        const authorizedUser = users.find(u =>
            (u.role === 'ceo' || u.role === 'manager') && u.password === password
        );

        // Fallback for dev/initial setup if no users exist or simple pass
        const isDevOverride = password === 'admin' || password === '1234';

        if (!authorizedUser && !isDevOverride) {
            alert('⛔ ACESSO NEGADO\n\nSenha incorreta ou usuário sem permissão.');
            return;
        }

        if (!confirm('⚠️ CONFIRMAÇÃO FINAL:\n\nDeseja realmente estornar esta venda?\n\n- O valor será anulado.\n- Os produtos voltarão automaticamente para o estoque.\n- Esta ação é IRREVERSÍVEL.')) return;

        // 1. Get Sale
        const sales = storage.getSales();
        const saleIndex = sales.findIndex(s => s.id === saleId);
        if (saleIndex === -1) return;

        const sale = sales[saleIndex];

        // 2. Restore Stock
        const products = storage.getProducts();
        sale.items.forEach(item => {
            const productIndex = products.findIndex(p => p.id === item.id);
            if (productIndex !== -1) {
                products[productIndex].stock += item.qty;
                storage.updateProduct(products[productIndex]);
            }
        });

        // 3. Mark as Refunded
        sale.status = 'refunded';
        sale.refundedBy = authorizedUser ? authorizedUser.name : 'Admin (Dev)';
        sale.refundedAt = new Date().toISOString();
        storage.updateSale(sale);

        // 4. Update Financial Transaction Status
        const transactions = storage.getTransactions();
        const relatedTransaction = transactions.find(t =>
            t.description && t.description.includes(`#${sale.id}`)
        );
        if (relatedTransaction) {
            relatedTransaction.status = 'refunded';
            relatedTransaction.paid = false; // Mark as unpaid since it was refunded
            storage.updateTransaction(relatedTransaction);
        }

        // 5. Revert OS Status (if applicable)
        sale.items.forEach(item => {
            if (item.isOS || (item.name && item.name.includes('OS #'))) {
                let osId = item.osId;
                // Fallback extraction if osId is missing but name has pattern
                if (!osId && item.name) {
                    const match = item.name.match(/(?:OS|Ordem de Serviço) #([0-9]+)/i);
                    if (match) osId = match[1];
                }

                if (osId) {
                    const checklists = storage.getChecklists();
                    const os = checklists.find(c => c.id == osId);
                    if (os) {
                        os.situation = 'Realizado'; // Revert to Realizado so it can be paid again
                        os.status = 'Concluído'; // Status often mirrors situation or is 'Concluído'
                        storage.updateChecklist(os);
                        console.log(`[Sales] OS #${osId} reverted to Realizado due to refund.`);
                    }
                }
            }
        });

        // 6. Feedback & Refresh
        alert(`✅ ESTORNO AUTORIZADO\n\nAutorizado por: ${sale.refundedBy}\nEstoque atualizado com sucesso.`);
        this.container.innerHTML = this.renderHistory();
        this.attachHistoryEvents();
        if (window.feather) window.feather.replace();
    }


    attachHistoryEvents() {
        const historyTable = this.container.querySelector('table');
        if (!historyTable) return;

        // Use a single listener for the table (delegation)
        historyTable.onclick = (e) => {
            console.log('History table clicked', e.target);
            const btn = e.target.closest('.btn-action');
            if (!btn) {
                console.log('Click was not on a .btn-action element');
                return;
            }

            const action = btn.dataset.action;
            const id = btn.dataset.id;
            console.log(`Action: ${action}, ID: ${id}`);

            if (action === 'view') {
                this.viewSaleDetails(id);
            } else if (action === 'refund') {
                this.refundSale(id);
            }
        };
    }

    attachEvents() {
        // POS Search
        const searchInput = document.getElementById('pos-search');
        if (searchInput && !searchInput.dataset.hasListener) {
            searchInput.dataset.hasListener = 'true';
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                this.lastScannedCode = null; // Clear scan state if user types manually

                // CRITICAL FIX: Refresh products from storage on every keystroke if empty or to ensure we have latest
                // This fixes the issue where "sometimes I type and it doesn't appear, then I refresh and it appears"
                if (this.products.length === 0 || !this.products) {
                    console.log('[SalesModule] Products list empty during search. Refreshing from storage...');
                    this.products = storage.getProducts();
                } else if (term.length > 2 && this.filteredProducts.length === 0) {
                    // Double check if we are missing updates
                    const freshProducts = storage.getProducts();
                    if (freshProducts.length !== this.products.length) {
                        console.log('[SalesModule] Detected product count mismatch. refreshing...');
                        this.products = freshProducts;
                    }
                }

                // Get Current Category Filter
                const categorySelect = document.getElementById('pos-category');
                const selectedCategory = categorySelect ? categorySelect.value : '';

                // 1. Filter Products
                this.filteredProducts = this.products.filter(p => {
                    // Category Filter
                    if (selectedCategory && p.category !== selectedCategory) {
                        return false;
                    }

                    // Search Term
                    if (!term) return true;

                    return (
                        p.name.toLowerCase().includes(term) ||
                        (p.sku && p.sku.toLowerCase().includes(term)) ||
                        (p.compatibility_tags && p.compatibility_tags.some(t => t.toLowerCase().includes(term)))
                    );
                });

                // 2. If no products, try to find OS Preview
                if (this.filteredProducts.length === 0 && term.length > 0) {
                    const id = term.replace(/\D/g, '');
                    if (id) {
                        const checklists = storage.getChecklists();
                        const os = checklists.find(c => String(c.id).replace(/\D/g, '') === String(id));

                        // Only show valid OSs that can be paid
                        if (os) {
                            const situation = (os.situation || '').toUpperCase();
                            if (situation === 'REALIZADO' || situation === 'CONCLUÍDO' || situation === 'ENTREGUE') {
                                // Check if already paid
                                if (situation !== 'FATURADO' && situation !== 'PAGO') {
                                    // Create Preview Mock
                                    const valTotal = parseFloat(os.valTotal || 0);
                                    if (valTotal > 0) {
                                        this.filteredProducts = [{
                                            id: `OS-${os.id}`,
                                            name: `CONSERTO OS #${os.id} - ${os.device || 'Aparelho'}`,
                                            sku: `OS-${os.id}`,
                                            retail: valTotal,
                                            wholesale: valTotal,
                                            stock: 1,
                                            photo: 'https://placehold.co/200/22c55e/ffffff?text=OS',
                                            isOS: true,
                                            osId: os.id // Keep ref
                                        }];
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. If still no products, try to find Budget (Quote)
                if (this.filteredProducts.length === 0 && term.length > 0) {
                    const sales = storage.getSales();
                    const quote = sales.find(s =>
                        s.status === 'quote' &&
                        (s.id.toLowerCase().includes(term) || s.id.toLowerCase().replace('orc-', '').includes(term))
                    );

                    if (quote) {
                        this.filteredProducts = [{
                            id: quote.id,
                            name: `ORÇAMENTO: ${quote.clientName || 'Consumidor Final'}`,
                            sku: quote.id,
                            retail: quote.total,
                            wholesale: quote.total,
                            stock: 1,
                            photo: 'https://placehold.co/200/fb923c/ffffff?text=ORC',
                            isQuote: true,
                            quoteId: quote.id
                        }];
                    }
                }

                document.getElementById('pos-grid').innerHTML = this.renderProductGrid();
            });

            // Add Enter key handler to add product to cart
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();

                    const term = this.lastScannedCode || e.target.value.trim();
                    if (term.toUpperCase().startsWith('ORC-')) {
                        this.loadQuote(term.toUpperCase());
                        e.target.value = '';
                        return;
                    }

                    // Use lastScannedCode if available, otherwise use search input value

                    if (!term) return;

                    // First try exact SKU match
                    let product = this.products.find(p => p.sku === term);

                    // If no exact match, check if there's exactly one filtered product
                    if (!product && this.filteredProducts.length === 1) {
                        product = this.filteredProducts[0];
                    }

                    if (product) {
                        if (product.isOS) {
                            const checklists = storage.getChecklists();
                            const os = checklists.find(c => c.id == product.osId);
                            if (os) {
                                this.addOSToCart(os);
                                // Keep UI state as requested
                                return;
                            }
                        }

                        if (product.isQuote) {
                            this.loadQuote(product.quoteId);
                            e.target.value = '';
                            return;
                        }

                        this.addToCart(product.id);
                        console.log('[Sales] Product added to cart via Enter:', product.name);

                        // Clear everything
                        searchInput.value = '';
                        this.lastScannedCode = null;
                        this.filteredProducts = [...this.products];
                        document.getElementById('pos-grid').innerHTML = this.renderProductGrid();
                    } else {
                        // NEW: Try to find OS
                        const handled = this.checkOS(term);
                        if (handled) {
                            // UI updated by checkOS/addOSToCart
                            return;
                        }

                        if (this.filteredProducts.length === 0) {
                            alert('❌ Nenhum produto ou OS encontrado');
                            this.lastScannedCode = null;
                        } else {
                            alert('⚠️ Múltiplos produtos encontrados. Refine a busca ou clique no produto desejado.');
                            this.lastScannedCode = null;
                        }
                    }
                }
            });
        }

        // Category Filter
        const categorySelect = document.getElementById('pos-category');
        if (categorySelect && !categorySelect.dataset.hasListener) {
            categorySelect.dataset.hasListener = 'true';
            categorySelect.addEventListener('change', (e) => {
                this.filteredProducts = e.target.value ?
                    this.products.filter(p => p.category === e.target.value) : [...this.products];
                document.getElementById('pos-grid').innerHTML = this.renderProductGrid();
            });
        }

        // Pricing Mode
        const btnRetail = document.getElementById('mode-retail');
        if (btnRetail && !btnRetail.dataset.hasListener) {
            btnRetail.dataset.hasListener = 'true';
            btnRetail.addEventListener('click', () => {
                this.pricingMode = 'retail';
                this.render();
            });
        }
        const btnWholesale = document.getElementById('mode-wholesale');
        if (btnWholesale && !btnWholesale.dataset.hasListener) {
            btnWholesale.dataset.hasListener = 'true';
            btnWholesale.addEventListener('click', () => {
                this.pricingMode = 'wholesale';
                this.render();
            });
        }

        // Checkout Flow
        const btnCheckout = document.getElementById('btn-checkout');
        if (btnCheckout && !btnCheckout.dataset.hasListener) {
            btnCheckout.dataset.hasListener = 'true';
            btnCheckout.addEventListener('click', () => {
                if (this.cart.length === 0) {
                    if (window.toastService) window.toastService.warning('Carrinho vazio!');
                    else alert('Carrinho vazio!');
                    return;
                }
                document.getElementById('checkout-modal').classList.remove('hidden');
                document.getElementById('checkout-methods-grid').classList.remove('hidden');
                document.getElementById('cash-payment-details').classList.add('hidden');
                document.getElementById('installments-payment-details').classList.add('hidden');
            });
        }

        // Mobile Checkout Button
        const btnCheckoutMob = document.getElementById('btn-checkout-mobile');
        if (btnCheckoutMob && !btnCheckoutMob.dataset.hasListener) {
            btnCheckoutMob.dataset.hasListener = 'true';
            btnCheckoutMob.addEventListener('click', () => {
                if (this.cart.length === 0) {
                    if (window.toastService) window.toastService.warning('Carrinho vazio!');
                    else alert('Carrinho vazio!');
                    return;
                }
                // Close mobile cart modal
                document.getElementById('mobile-cart-modal')?.classList.add('hidden');
                // Open checkout modal
                document.getElementById('checkout-modal').classList.remove('hidden');
                document.getElementById('checkout-methods-grid').classList.remove('hidden');
                document.getElementById('cash-payment-details').classList.add('hidden');
                document.getElementById('installments-payment-details').classList.add('hidden');
            });
        }

        const btnCloseCheckout = document.getElementById('close-checkout');
        if (btnCloseCheckout && !btnCloseCheckout.dataset.hasListener) {
            btnCloseCheckout.dataset.hasListener = 'true';
            btnCloseCheckout.addEventListener('click', () => {
                document.getElementById('checkout-modal').classList.add('hidden');
            });
        }

        // Client Add
        const btnAdd = document.getElementById('btn-add-client');
        if (btnAdd && !btnAdd.dataset.hasListener) {
            btnAdd.dataset.hasListener = 'true';
            btnAdd.addEventListener('click', () => {
                document.getElementById('quick-client-modal').classList.remove('hidden');
            });
        }

        // Mobile Client Add Button
        const btnAddMob = document.getElementById('btn-add-client-mobile');
        if (btnAddMob && !btnAddMob.dataset.hasListener) {
            btnAddMob.dataset.hasListener = 'true';
            btnAddMob.addEventListener('click', () => {
                document.getElementById('quick-client-modal').classList.remove('hidden');
            });
        }

        const btnSaveQ = document.getElementById('btn-save-quick-client');
        if (btnSaveQ && !btnSaveQ.dataset.hasListener) {
            btnSaveQ.dataset.hasListener = 'true';
            btnSaveQ.addEventListener('click', () => {
                this.saveQuickClient();
            });
        }

        // Sync Mobile Client Search with Desktop
        const mobileClientSearch = document.getElementById('pos-client-search-mobile');
        if (mobileClientSearch && !mobileClientSearch.dataset.hasListener) {
            mobileClientSearch.dataset.hasListener = 'true';
            mobileClientSearch.addEventListener('input', (e) => {
                this.handleClientSearch(e.target.value);
                // Show results in mobile dropdown
                const results = document.getElementById('client-results-mobile');
                if (results) {
                    results.innerHTML = document.getElementById('client-results')?.innerHTML || '';
                    results.classList.toggle('hidden', e.target.value.length < 2);
                }
            });
            mobileClientSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('client-results-mobile')?.classList.add('hidden');
                }, 200);
            });
        }

        // History Toggle
        const btnHistory = document.getElementById('btn-history');
        if (btnHistory) { // Re-attach logic since render might have wiped it if full re-render
            btnHistory.onclick = () => {
                this.container.innerHTML = this.renderHistory();
                this.attachHistoryEvents();
                if (window.feather) window.feather.replace();
            };
        }

        // --- Custom History Method Export ---
        this.filterHistory = (term) => {
            const tableBody = this.container.querySelector('tbody');
            if (!tableBody) return;

            const sales = storage.getSales().sort((a, b) => new Date(b.date) - new Date(a.date));
            const filtered = sales.filter(s =>
                s.status !== 'converted' && // HIDE converted quotes from list (one mention only)
                (s.id.toLowerCase().includes(term.toLowerCase()) ||
                    (s.clientName && s.clientName.toLowerCase().includes(term.toLowerCase())))
            );

            tableBody.innerHTML = filtered.length > 0 ? filtered.map(sale => {
                const isRefunded = sale.status === 'refunded';
                return `
                      <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                          <td class="p-3 text-gray-500 font-mono text-xs">${new Date(sale.date).toLocaleString()}</td>
                          <td class="p-3 font-bold text-gray-700 font-mono">
                              ${(() => {
                        const osItem = sale.items && sale.items.find(i => i.isOS || i.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i));
                        if (osItem) {
                            let osId = osItem.osId;
                            if (!osId) {
                                const match = osItem.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i);
                                if (match) osId = match[1];
                            }
                            return osId ? `CONSERTO OS #${osId}` : sale.id;
                        }

                        // Link between Budget and Sale (Bidirectional)
                        if (sale.status === 'converted' && sale.convertedToId) {
                            return `<div class="flex flex-col">
                                <span>${sale.id}</span>
                                <span class="text-[9px] text-blue-500 font-bold flex items-center gap-1 mt-0.5">
                                    <i data-feather="repeat" class="w-2.5 h-2.5"></i> VENDA: ${sale.convertedToId}
                                </span>
                            </div>`;
                        }

                        if (sale.originQuoteId) {
                            return `<div class="flex flex-col">
                                <span class="font-bold">${sale.id}</span>
                                <span class="text-[9px] text-orange-500 font-bold flex items-center gap-1 mt-0.5">
                                    <i data-feather="file-text" class="w-2.5 h-2.5"></i> ORC: ${sale.originQuoteId.replace('ORC-', '')}
                                </span>
                            </div>`;
                        }

                        return sale.id;
                    })()}
                          </td>
                          <td class="p-3 text-gray-800 font-medium">${sale.clientName || 'Consumidor Final'}</td>
                          <td class="p-3 font-bold text-unitech-primary">R$ ${sale.total.toFixed(2)}</td>
                          <td class="p-3">
                                          ${sale.status === 'quote' ? `
                                              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-yellow-50 text-yellow-700 border-yellow-100">
                                                  Orçamento
                                              </span>
                                          ` : sale.status === 'converted' ? `
                                              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                                  <i data-feather="check-double" class="w-3 h-3"></i> Concretizado
                                              </span>
                                          ` : `
                                              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${isRefunded ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}">
                                                  ${isRefunded ? 'Estornado' : 'Concluído'}
                                              </span>
                                          `}                  </td>
                          <td class="p-3 text-right">
                              ${!isRefunded ? `
                              <button class="bg-blue-50 text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-3 py-1.5 rounded transition-all text-xs font-bold border border-blue-200 shadow-sm hover:shadow btn-action" data-action="view" data-id="${sale.id}">
                                  VISUALIZAR
                              </button>
                              <button class="bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 px-3 py-1.5 rounded transition-all text-xs font-bold border border-red-200 shadow-sm hover:shadow btn-action" data-action="refund" data-id="${sale.id}">
                                  ESTORNAR
                              </button>` : `
                              <button class="text-xs text-gray-500 hover:text-gray-700 font-bold border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded transition-all shadow-sm btn-action" data-action="view" data-id="${sale.id}">
                                  DETALHES
                              </button>
                              <span class="text-xs font-bold text-red-400 bg-red-50 px-2 py-1 rounded ml-2">ESTORNADO</span>`}
                          </td>
                      </tr>`;
            }).join('') : `<tr><td colspan="6" class="p-8 text-center text-gray-400">Nenhum resultado encontrado.</td></tr>`;
        };

        // Checkout Methods - Use direct onclick to prevent duplicates on re-render
        document.querySelectorAll('.checkout-method').forEach(btn => {
            btn.onclick = () => {
                const method = btn.dataset.method;
                if (method === 'CASH') {
                    document.getElementById('cash-payment-details').classList.remove('hidden');
                    document.getElementById('checkout-methods-grid').classList.add('hidden');
                } else if (method === 'CREDIT_CARD_PARCELADO') {
                    document.getElementById('installments-payment-details').classList.remove('hidden');
                    document.getElementById('checkout-methods-grid').classList.add('hidden');
                    this.updateInstallments();
                } else if (method === 'PIX') {
                    const banks = storage.getSettings().pixBanks || [];
                    if (banks.length === 0) {
                        if (confirm('Nenhum banco cadastrado para PIX. Deseja processar sem especificar o banco?')) {
                            this.processSale('PIX');
                        }
                    } else {
                        document.getElementById('pix-payment-details').classList.remove('hidden');
                        document.getElementById('checkout-methods-grid').classList.add('hidden');
                    }
                } else if (method === 'ORCAMENTO') {
                    if (confirm('Deseja salvar como Orçamento?\n(O estoque não será alterado e não haverá lançamento financeiro)')) this.processSale(method);
                } else {
                    if (confirm(`Confirmar venda via ${method}?`)) this.processSale(method);
                }
            };
        });

        // Confirm PIX
        const btnConfirmPIX = document.getElementById('btn-confirm-pix');
        if (btnConfirmPIX) {
            btnConfirmPIX.onclick = () => {
                const bank = document.getElementById('pix-bank-select').value;
                this.processSale('PIX', 1, bank);
            };
        }

        // Confirm Cash
        const btnConfirmCash = document.getElementById('btn-confirm-cash');
        if (btnConfirmCash) {
            btnConfirmCash.onclick = () => {
                const received = parseFloat(document.getElementById('cash-amount-received').value);
                const totalStr = document.getElementById('cart-total').innerText.replace('R$ ', '').replace(',', '.');
                const total = parseFloat(totalStr);

                if (received < total) return window.toastService.error('Valor insuficiente!');
                this.processSale('DINHEIRO');
            };
        }

        // Installments
        const btnConfirmInstallments = document.getElementById('btn-confirm-installments');
        if (btnConfirmInstallments) {
            btnConfirmInstallments.onclick = () => {
                const count = parseInt(document.getElementById('installments-count').value);
                this.processSale('CREDIT_CARD_PARCELADO', count);
            };
        }

        // --- Global Scanner Listener (attached via document) ---
        // Ensure we don't duplicate listeners if re-attached
        if (this._scanListener) document.removeEventListener('keydown', this._scanListener);

        this._scanListener = (e) => {
            // Ignore if focus is on an input (except pos-search which we want to populate)
            const tagName = document.activeElement.tagName.toLowerCase();
            const activeId = document.activeElement.id;
            const isInput = tagName === 'input' || tagName === 'textarea';

            // Handle ESC to cancel scanned product or clear search
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation(); // Always stop propagation in PDV to prevent returning to dashboard

                console.log('[Sales] ESC pressed - Clearing search and reset grid');

                // Clear search input if present
                const searchInput = document.getElementById('pos-search');
                if (searchInput) searchInput.value = '';

                this.lastScannedCode = null;
                this.filteredProducts = [...this.products];

                const grid = document.getElementById('pos-grid');
                if (grid) grid.innerHTML = this.renderProductGrid();

                return;
            }

            // Handle Enter to add scanned product to cart
            if (e.key === 'Enter' && this.lastScannedCode && !isInput) {
                e.preventDefault();
                const product = this.products.find(p => p.sku === this.lastScannedCode);
                if (product) {
                    this.addToCart(product.id);
                    console.log('[Sales] Product added to cart:', product.name);

                    // Clear everything
                    this.lastScannedCode = null;
                    this.filteredProducts = [...this.products];
                    document.getElementById('pos-grid').innerHTML = this.renderProductGrid();
                }
                return;
            }

            // Allow scanner to work even if pos-search is focused
            if (isInput && activeId !== 'pos-search') return;

            // Filter printable characters
            if (e.key.length === 1) {
                this.buffer += e.key;

                // Clear buffer if typing too slow (not a scanner)
                clearTimeout(this.bufferTimeout);
                this.bufferTimeout = setTimeout(() => {
                    this.buffer = '';
                }, 100); // 100ms tolerance for scanner speed
            } else if (e.key === 'Enter') {
                if (this.buffer.length >= 3) {
                    if (this.buffer.toUpperCase().startsWith('ORC-')) {
                        e.preventDefault();
                        this.loadQuote(this.buffer.toUpperCase());
                        this.buffer = '';
                        return;
                    }
                    e.preventDefault(); // Prevent Enter from being processed by search input
                    console.log(`[Sales] Barcode scanned: ${this.buffer}`);

                    // Store the scanned code
                    this.lastScannedCode = this.buffer;

                    // Find product by exact SKU match
                    const product = this.products.find(p => p.sku === this.buffer);

                    if (product) {
                        // Filter to show only this product
                        this.filteredProducts = [product];
                        document.getElementById('pos-grid').innerHTML = this.renderProductGrid();

                        // Highlight the product card
                        setTimeout(() => {
                            const productCard = document.querySelector(`[onclick*="addToCart('${product.id}')"]`);
                            if (productCard) {
                                productCard.classList.add('ring-4', 'ring-green-500');
                            }
                        }, 100);

                        console.log('[Sales] Product found:', product.name, '- Press Enter to add or ESC to cancel');
                    } else {
                        window.toastService.error(`Produto não encontrado: ${this.buffer}`);
                    }
                }
                this.buffer = '';
            }
        };
        document.addEventListener('keydown', this._scanListener);

        // Client Search
        const clientInput = document.getElementById('pos-client-search');
        if (clientInput) {
            clientInput.addEventListener('input', (e) => this.handleClientSearch(e.target.value));
            clientInput.addEventListener('blur', () => setTimeout(() => document.getElementById('client-results').classList.add('hidden'), 200));
        }

        // --- Payment Confirmation Buttons (Fix) ---
        // 1. Confirm PIX
        const btnPix = document.getElementById('btn-confirm-pix');
        if (btnPix && !btnPix.dataset.hasListener) {
            btnPix.dataset.hasListener = 'true';
            btnPix.addEventListener('click', () => {
                const bank = document.getElementById('pix-bank-select').value;
                if (!bank) {
                    window.toastService.warning('Selecione um banco para o PIX.');
                    return;
                }
                this.processSale('PIX', 1, bank);
            });
        }

        // 2. Confirm Installments
        const btnInstallments = document.getElementById('btn-confirm-installments');
        if (btnInstallments && !btnInstallments.dataset.hasListener) {
            btnInstallments.dataset.hasListener = 'true';
            btnInstallments.addEventListener('click', () => {
                const installments = document.getElementById('installments-count').value;
                this.processSale('CREDIT_CARD', installments);
            });
        }

        // 3. Confirm Cash
        const btnCash = document.getElementById('btn-confirm-cash');
        if (btnCash && !btnCash.dataset.hasListener) {
            btnCash.dataset.hasListener = 'true';
            btnCash.addEventListener('click', () => {
                this.processSale('MONEY');
            });
        }
    }

    saveQuickClient() {
        const name = document.getElementById('quick-client-name').value;
        if (!name) return;
        const newClient = {
            id: `CLI-${Date.now()}`,
            name: name.toUpperCase(),
            phone: document.getElementById('quick-client-phone').value,
            type: document.getElementById('quick-client-category').value === 'supplier' ? 'wholesale' : 'retail',
            createdAt: new Date().toISOString()
        };
        storage.addClient(newClient);
        this.clients = storage.getClients();
        this.selectClient(newClient.id);
        const modal = document.getElementById('quick-client-modal');
        if (modal) modal.classList.add('hidden');
        if (window.toastService) window.toastService.show('Cliente cadastrado com sucesso!', 'success');
        else alert('Cliente cadastrado!');
    }

    handleClientSearch(term) {
        // Refresh clients to ensure we have newly registered ones from other modules
        this.clients = storage.getClients();

        const results = document.getElementById('client-results');
        if (!results) return;

        if (term.length < 2) {
            results.classList.add('hidden');
            return;
        }

        // Accent-insensitive search helper
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const normalizedTerm = normalize(term);

        const matches = this.clients.filter(c =>
            normalize(c.name || '').includes(normalizedTerm) ||
            (c.document && c.document.includes(term))
        );

        if (matches.length === 0) {
            results.innerHTML = `
                <div class="p-4 text-center text-gray-400">
                    <p class="text-xs font-bold italic">Nenhum cliente encontrado.</p>
                </div>
            `;
        } else {
            results.innerHTML = matches.map(c => `
                <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors" 
                    onclick="window.salesModule.selectClient('${c.id}')">
                    <p class="font-bold text-sm text-gray-800">${c.name}</p>
                    ${c.document ? `<p class="text-[10px] text-gray-400 font-mono">${c.document}</p>` : ''}
                </div>
            `).join('');
        }

        results.classList.remove('hidden');
    }

    updateInstallments() {
        const total = this.getCartTotal();
        const count = parseInt(document.getElementById('installments-count').value);
        document.getElementById('installment-value-display').innerText = `R$ ${(total / count).toFixed(2)}`;
    }

    getCartTotal() {
        return this.cart.reduce((acc, item) => acc + item.total, 0);
    }

    selectClient(id) {
        this.clients = storage.getClients(); // Ensure fresh data
        this.selectedClient = this.clients.find(c => String(c.id) === String(id));
        if (this.selectedClient) {
            // Update Desktop
            const desktopInput = document.getElementById('pos-client-search');
            if (desktopInput) desktopInput.value = this.selectedClient.name;
            const desktopResults = document.getElementById('client-results');
            if (desktopResults) desktopResults.classList.add('hidden');

            // Update Mobile
            const mobileInput = document.getElementById('pos-client-search-mobile');
            if (mobileInput) mobileInput.value = this.selectedClient.name;
            const mobileResults = document.getElementById('client-results-mobile');
            if (mobileResults) mobileResults.classList.add('hidden');

            if (this.selectedClient.type === 'wholesale') {
                this.pricingMode = 'wholesale';
                this.render();
            }
        }
    }

    exportLastSaleXML() {
        if (!this.lastSaleId) {
            window.toastService.warning('Nenhuma venda recente para exportar.');
            return;
        }
        const sales = storage.getSales();
        const sale = sales.find(s => s.id === this.lastSaleId);
        if (sale) {
            printerService.generateSaleXML(sale);
        } else {
            window.toastService.error('Venda não encontrada.');
        }
    }

    updateCashChange() {
        const receivedInput = document.getElementById('cash-amount-received');
        const changeDisplay = document.getElementById('cash-change-display');

        if (!receivedInput || !changeDisplay) return;

        const total = this.cartTotal || 0;
        const received = parseFloat(receivedInput.value) || 0;

        const change = received - total;

        if (change >= 0) {
            changeDisplay.innerHTML = formatCurrency(change);
            changeDisplay.classList.remove('text-red-500');
            changeDisplay.classList.add('text-green-600');
        } else {
            changeDisplay.innerHTML = formatCurrency(0);
            changeDisplay.classList.remove('text-green-600');
            changeDisplay.classList.add('text-red-500');
        }
    }

    // --- Helpers for OnClick Events (Robusted for Dynamic Re-renders) ---
    confirmPix() {
        const bankSelect = document.getElementById('pix-bank-select');
        if (!bankSelect) return;

        const bank = bankSelect.value;
        if (!bank) {
            window.toastService.warning('Selecione um banco para o PIX.');
            return;
        }
        this.processSale('PIX', 1, bank);
    }

    confirmInstallments() {
        const installments = document.getElementById('installments-count').value;
        this.processSale('CREDIT_CARD', installments);
    }

    confirmCash() {
        const receivedInput = document.getElementById('cash-amount-received');
        if (!receivedInput) return;

        const total = this.cartTotal || 0;
        const received = parseFloat(receivedInput.value) || 0;

        if (received < total) {
            window.toastService.error('Valor recebido é inferior ao total!');
            return;
        }

        this.processSale('DINHEIRO');
    }

    cleanupQuotes() {
        console.log('[SalesModule] Checking for expired budgets (8 days)...');
        const sales = storage.getSales();
        const quotes = sales.filter(s => s.status === 'quote');
        const now = new Date();
        const eightDaysAgo = new Date();
        eightDaysAgo.setDate(now.getDate() - 8);

        let count = 0;
        quotes.forEach(q => {
            const qDate = new Date(q.date);
            if (qDate < eightDaysAgo) {
                storage.deleteSale(q.id);
                count++;
            }
        });
        if (count > 0) console.log(`[SalesModule] ${count} expired budgets removed.`);
    }

    renderIdleScreen() {
        const settings = storage.getSettings();
        const companyName = (settings.companyName || 'UniTech').toUpperCase();
        const currentTime = new Date().toLocaleTimeString('pt-BR');

        return `
        <div class="col-span-full h-full min-h-[450px] flex flex-col items-center justify-center p-8 bg-[#fff2e6] rounded-[2.5rem] border border-orange-100/50 shadow-[xl_inset] animate-fade-in relative overflow-hidden group">
            <!-- Professional Tech Grid Pattern -->
            <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: miter-limit(10); background-image: radial-gradient(circle, #e63946 1px, transparent 1px); background-size: 40px 40px;"></div>
            
            <!-- Refined Professional Wave -->
            <div class="absolute bottom-0 left-0 w-full leading-[0] transform translate-y-[2px]">
                <svg viewBox="0 0 1440 240" preserveAspectRatio="none" class="w-full h-40 md:h-56 filter drop-shadow-[0_-5px_15px_rgba(255,255,255,0.8)]">
                    <path fill="#ffffff" fill-opacity="1" d="M0,160L60,144C120,128,240,96,360,101.3C480,107,600,149,720,149.3C840,149,960,107,1080,90.7C1200,75,1320,85,1380,90.7L1440,96L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
                </svg>
            </div>

            <!-- Absolute Top Accent -->
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-unitech-primary/20 to-transparent"></div>

            <!-- Branding Header -->
            <div class="z-10 flex flex-col items-center mb-10 transform scale-90">

                <h3 class="text-sm md:text-base font-black text-gray-400 uppercase tracking-[0.4em] text-center">${companyName}</h3>
                <div class="h-[1px] w-16 bg-gradient-to-r from-transparent via-gray-200 to-transparent mt-4"></div>
            </div>
            
            <!-- Status Instrument Display -->
            <div class="z-10 relative mb-10 text-center">
                <div class="relative bg-white/60 backdrop-blur-xl px-16 py-10 rounded-[3.5rem] border border-white shadow-[0_20px_60px_rgba(238,68,68,0.08)]">
                    <h1 class="text-7xl md:text-8xl font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-600 mb-2">
                        CAIXA
                    </h1>
                    <h1 class="text-7xl md:text-8xl font-black leading-[0.8] tracking-tighter text-transparent bg-clip-text bg-gradient-to-t from-unitech-primary to-orange-600 flex items-center justify-center gap-6">
                        LIVRE
                        <span class="relative flex h-4 w-4">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-unitech-primary opacity-20"></span>
                            <span class="relative inline-flex rounded-full h-4 w-4 bg-unitech-primary shadow-[0_0_15px_rgba(238,68,68,0.6)]"></span>
                        </span>
                    </h1>
                </div>
            </div>

            <!-- Precision Digital Clock -->
            <div class="z-10 flex flex-col items-center gap-4">
                <div class="relative flex flex-col items-center">
                    <span id="idle-clock" class="text-7xl md:text-[6rem] font-black text-[#1a1a1a] tracking-tight tabular-nums drop-shadow-sm leading-none">${currentTime}</span>
                    <div class="w-full flex items-center justify-between mt-2 px-1">
                        <div class="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gray-200"></div>
                        <span class="mx-4 text-[9px] font-black text-gray-300 uppercase tracking-[0.5em]">unitech solutions</span>
                        <div class="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gray-200"></div>
                    </div>
                </div>
            </div>
            
            <!-- Professional Dashboard Status -->
            <div class="z-10 mt-12">
                <div id="connection-status" class="flex items-center gap-4 px-6 py-2.5 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl shadow-gray-200/50 transition-all duration-500">
                    <div class="flex items-center gap-2">
                        <span class="status-dot w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-400' : 'bg-red-500'} animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.4)]"></span>
                        <span class="status-text text-[10px] font-black uppercase tracking-[0.2em] ${navigator.onLine ? 'text-white' : 'text-red-500'}">
                            ${navigator.onLine ? 'READY / ONLINE' : 'CRITICAL / OFFLINE'}
                        </span>
                    </div>
                    <div class="h-3 w-[1px] bg-gray-700"></div>
                    <span class="text-[9px] font-semibold text-gray-500 uppercase tracking-widest italic">${settings.addressCity ? `UNIDADE: ${settings.addressCity} - ${settings.addressState || ''}` : 'UNIDADE MATRIZ'}</span>
                </div>
            </div>
            
        </div>
        `;
    }

    startClock() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => {
            const el = document.getElementById('idle-clock');
            if (el) {
                el.innerText = new Date().toLocaleTimeString('pt-BR');

                // Dynamic Network Status Update
                const statusDot = document.querySelector('#connection-status .status-dot');
                const statusText = document.querySelector('#connection-status .status-text');
                if (statusDot && statusText) {
                    const isOnline = navigator.onLine;
                    statusDot.className = `status-dot w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`;
                    statusText.innerText = isOnline ? 'SISTEMA ONLINE' : 'SISTEMA OFFLINE';
                    statusText.className = `status-text text-[9px] font-black uppercase tracking-widest italic tracking-wider ${isOnline ? 'text-gray-400' : 'text-red-500'}`;
                }
            } else if (!document.getElementById('pos-grid')) {
                // If the grid is gone, cleanup the interval
                clearInterval(this.clockInterval);
                this.clockInterval = null;
            }
        }, 1000);
    }
}

// Global accessor
window.salesModule = new SalesModule();
