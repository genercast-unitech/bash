/**
 * Post-Sale Modal HTML Template
 * Modal exibido após conclusão da venda com opções de impressão
 */
export const getPostSaleModalHTML = () => {
    return `
    <!-- Post-Sale Modal -->
    <div id="post-sale-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center animate-fade-in">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
            <!-- Header -->
            <div id="post-sale-header" class="bg-gradient-to-r from-green-500 to-green-600 p-6 text-center">
                <div id="post-sale-icon-container" class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <i id="post-sale-icon" data-feather="check-circle" class="w-10 h-10 text-green-500"></i>
                </div>
                <h3 id="post-sale-title" class="font-black text-2xl text-white uppercase tracking-tight">Venda Concluída</h3>
                <p id="post-sale-subtitle" class="text-green-100 text-sm  mt-2">Escolha uma opção abaixo</p>
            </div>

            <!-- Content -->
            <div class="p-8 space-y-4">
                <!-- NF-e Button -->
                <button id="btn-print-nfe" class="w-full p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-all group flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <i data-feather="file-text" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-bold text-gray-800">Imprimir NF-e</p>
                        <p class="text-xs text-gray-500">Nota Fiscal Eletrônica</p>
                    </div>
                    <div class="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">F1</div>
                </button>

                <!-- Cupom Button -->
                <button id="btn-print-cupom" class="w-full p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-xl transition-all group flex items-center gap-4">
                    <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <i data-feather="printer" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-bold text-gray-800">Imprimir Cupom</p>
                        <p class="text-xs text-gray-500">Cupom Não Fiscal</p>
                    </div>
                    <div class="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">ENTER</div>
                </button>

                <!-- XML Button -->
                <button id="btn-export-xml" class="w-full p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-xl transition-all group flex items-center gap-4" onclick="window.salesModule.exportLastSaleXML()">
                    <div class="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <i data-feather="code" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-bold text-gray-800">Exportar XML</p>
                        <p class="text-xs text-gray-500">Nota Fiscal Eletrônica</p>
                    </div>
                </button>

                <!-- WhatsApp Button (Hidden by default) -->
                <button id="btn-share-whatsapp" class="hidden w-full p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-xl transition-all group flex items-center gap-4">
                    <div class="w-12 h-12 bg-[#25D366] rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <i data-feather="message-circle" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-bold text-gray-800">Enviar no WhatsApp</p>
                        <p class="text-xs text-gray-500">Compartilhar Orçamento</p>
                    </div>
                </button>

                <!-- Concluir Button -->
                <button id="btn-complete-sale" class="w-full p-4 bg-gray-100 hover:bg-gray-200 border-2 border-gray-200 rounded-xl transition-all group flex items-center gap-4">
                    <div class="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <i data-feather="arrow-right" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <p class="font-bold text-gray-800">Concluir</p>
                        <p class="text-xs text-gray-500">Voltar ao PDV</p>
                    </div>
                    <div class="px-3 py-1 bg-gray-600 text-white text-xs font-bold rounded-full">ESC</div>
                </button>
            </div>

            <!-- Footer Info -->
            <div class="p-4 bg-gray-50 border-t border-gray-100 text-center">
                <p class="text-xs text-gray-500">
                    Venda #<span id="post-sale-id" class="font-mono font-bold text-gray-700">---</span>
                </p>
            </div>
        </div>
    </div>
    `;
};
