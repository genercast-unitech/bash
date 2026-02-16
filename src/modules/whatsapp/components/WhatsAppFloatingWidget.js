export const WhatsAppFloatingWidget = {
    render: () => {
        // Verifica se já existe para não duplicar
        if (document.getElementById('whatsapp-floating-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'whatsapp-floating-widget';
        widget.className = 'fixed bottom-24 right-6 z-50 flex flex-col items-end pointer-events-none md:bottom-6';

        widget.innerHTML = `
            <!-- Chat Window -->
            <div id="wpp-float-window" class="pointer-events-auto bg-white w-[360px] h-[500px] mb-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right scale-0 opacity-0 border border-slate-100">
                <!-- Header -->
                <div class="bg-[#00a884] p-4 flex items-center justify-between text-white shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <i data-feather="message-circle" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-sm">WhatsApp Cloud</h3>
                            <p class="text-[10px] text-white/80 font-medium tracking-wide flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <button id="wpp-close-btn" class="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <i data-feather="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Body (Quick Send for now) -->
                <div class="flex-1 bg-[#efeae2] p-4 overflow-y-auto relative">
                    <div class="absolute inset-0 opacity-[0.06] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]"></div>
                    
                    <div class="relative z-10 space-y-4">
                        <div class="bg-white p-3 rounded-lg shadow-sm text-center">
                            <p class="text-xs text-slate-500 font-medium">Use este painel para envio rápido de mensagens.</p>
                        </div>

                        <!-- Form de Envio Rápido -->
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                            <div>
                                <label class="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Número (com DDD)</label>
                                <input type="text" id="wpp-float-phone" placeholder="5511999999999" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-[#00a884] transition-colors">
                            </div>
                            <div>
                                <label class="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Mensagem</label>
                                <textarea id="wpp-float-msg" rows="3" placeholder="Digite sua mensagem..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-[#00a884] transition-colors resize-none"></textarea>
                            </div>
                            <button id="wpp-float-send" class="w-full bg-[#00a884] hover:bg-[#008f6f] text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-[#00a884]/20 flex items-center justify-center gap-2">
                                <span>Enviar</span>
                                <i data-feather="send" class="w-3 h-3"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Floating Button -->
            <button id="wpp-fab-btn" class="pointer-events-auto w-14 h-14 bg-[#25d366] hover:bg-[#20bd5a] text-white rounded-full shadow-2xl shadow-green-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group">
                <i data-feather="message-circle" class="w-7 h-7 fill-current"></i>
                <span class="absolute right-0 top-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full hidden"></span>
            </button>
        `;

        document.body.appendChild(widget);
        feather.replace();

        // Event Listeners
        const fab = document.getElementById('wpp-fab-btn');
        const window = document.getElementById('wpp-float-window');
        const close = document.getElementById('wpp-close-btn');
        const sendBtn = document.getElementById('wpp-float-send');

        const toggleWidget = () => {
            const isHidden = window.classList.contains('scale-0');
            if (isHidden) {
                window.classList.remove('scale-0', 'opacity-0');
            } else {
                window.classList.add('scale-0', 'opacity-0');
            }
        };

        fab.addEventListener('click', toggleWidget);
        close.addEventListener('click', toggleWidget);

        // Lógica de Envio
        sendBtn.addEventListener('click', async () => {
            const phone = document.getElementById('wpp-float-phone').value;
            const message = document.getElementById('wpp-float-msg').value;

            if (!phone || !message) return;

            const btnText = sendBtn.querySelector('span');
            const originalText = btnText.innerText;
            btnText.innerText = 'Enviando...';
            sendBtn.disabled = true;

            try {
                const { localWhatsapp } = await import('../services/LocalConnector.js');
                const res = await localWhatsapp.sendMessage(phone, message);

                if (res.success) {
                    btnText.innerText = 'Enviado!';
                    document.getElementById('wpp-float-msg').value = '';
                    setTimeout(() => btnText.innerText = originalText, 2000);
                } else {
                    alert('Erro ao enviar: ' + (res.error || 'Desconhecido'));
                    btnText.innerText = originalText;
                }
            } catch (err) {
                console.error(err);
                btnText.innerText = 'Erro';
            } finally {
                sendBtn.disabled = false;
            }
        });
    }
};
