/**
 * Post-Sale Modal HTML Template
 * Modal exibido após conclusão da venda com opções de impressão
 */
export const getPostSaleModalHTML = () => {
    return `
    <!-- Post-Sale Modal -->
    <div id="post-sale-modal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] hidden flex items-center justify-center p-4 animate-fade-in">
        <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 border border-white/20">
            <!-- Header -->
            <div id="post-sale-header" class="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center relative overflow-hidden">
                <!-- Deco circles -->
                <div class="absolute top-[-20%] left-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div class="absolute bottom-[-20%] right-[-10%] w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
                
                <div id="post-sale-icon-container" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl rotate-3 transform group-hover:rotate-0 transition-transform">
                    <i id="post-sale-icon" data-feather="check-circle" class="w-12 h-12 text-emerald-500"></i>
                </div>
                <h3 id="post-sale-title" class="font-black text-3xl text-white uppercase tracking-tighter leading-none">Venda Concluída</h3>
                <p id="post-sale-subtitle" class="text-emerald-50 text-xs font-bold uppercase tracking-widest mt-3 opacity-80">O que deseja fazer agora?</p>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-4 bg-gray-50/50 dark:bg-slate-900/50">
                <!-- NF-e Button -->
                <button id="btn-print-nfe" class="w-full p-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800/50 rounded-2xl transition-all group flex items-center gap-4 hover:shadow-lg active:scale-[0.98]">
                    <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:rotate-3 transition-transform">
                        <i data-feather="file-text" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-black font-bold text-blue-900 dark:text-blue-300 uppercase tracking-tight">Imprimir NF-e</p>
                        <p class="text-[10px] text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Nota Fiscal Eletrônica</p>
                    </div>
                    <div class="px-2 py-1 bg-blue-500 text-white text-[9px] font-black rounded-lg shadow-sm">F1</div>
                </button>

                <!-- Cupom Button -->
                <button id="btn-print-cupom" class="w-full p-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800/50 rounded-2xl transition-all group flex items-center gap-4 hover:shadow-lg active:scale-[0.98]">
                    <div class="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30 group-hover:rotate-3 transition-transform">
                        <i data-feather="printer" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-black font-bold text-amber-900 dark:text-amber-300 uppercase tracking-tight">Imprimir Cupom</p>
                        <p class="text-[10px] text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Cupom Não Fiscal</p>
                    </div>
                    <div class="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-lg shadow-sm uppercase">Enter</div>
                </button>

                <!-- WhatsApp Button (Premium) -->
                <button id="btn-share-whatsapp" class="hidden w-full p-5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl transition-all group flex items-center gap-4 hover:shadow-xl hover:shadow-emerald-500/10 active:scale-[0.98]">
                    <div class="w-14 h-14 bg-[#25D366] rounded-xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all">
                        <i data-feather="message-circle" class="w-8 h-8"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-black font-bold text-emerald-950 dark:text-emerald-100 text-lg leading-none uppercase tracking-tighter">WhatsApp</p>
                        <p id="btn-share-whatsapp-subtitle" class="text-[10px] text-xs text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.15em] mt-1.5">Comprovante em PDF</p>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-700 transition-colors">
                        <i data-feather="chevron-right" class="w-5 h-5"></i>
                    </div>
                </button>

                <!-- Concluir Button -->
                <button id="btn-complete-sale" class="w-full p-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-gray-200 dark:border-slate-700 rounded-2xl transition-all group flex items-center gap-4 active:scale-[0.98]">
                    <div class="w-12 h-12 bg-gray-600 dark:bg-slate-600 rounded-xl flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                        <i data-feather="arrow-right" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-black font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight">Concluir</p>
                        <p class="text-[10px] text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Voltar ao PDV</p>
                    </div>
                    <div class="px-2 py-1 bg-gray-600 text-white text-[9px] font-black rounded-lg shadow-sm">ESC</div>
                </button>
            </div>

            <!-- Footer Info -->
            <div class="p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 text-center relative">
                <p class="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Identificador da Venda</p>
                <p id="post-sale-id" class="text-lg font-mono font-black text-slate-800 dark:text-slate-200 tracking-tighter">---</p>
                
                <!-- Decorative dot -->
                <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
        </div>
    </div>
    `;
};
