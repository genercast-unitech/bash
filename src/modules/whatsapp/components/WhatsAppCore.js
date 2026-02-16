export const WhatsAppCore = {
    template: () => `
        <div class="flex flex-col h-full bg-[#0f172a] relative overflow-hidden">
            <!-- Background Effects -->
            <div class="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>
            <div class="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

            <!-- Content Container -->
            <div class="relative z-10 flex flex-col h-full max-w-7xl mx-auto w-full p-6 lg:p-10">
                
                <!-- Header -->
                <div class="flex items-center justify-between mb-12">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl shadow-black/50 backdrop-blur-md">
                            <i data-feather="message-circle" class="text-emerald-400 w-6 h-6"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-black text-white tracking-tight">WhatsApp Cloud</h2>
                            <div id="wpp-badge" class="flex items-center gap-2 mt-1">
                                <span class="relative flex h-2 w-2">
                                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                                  <span class="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                                </span>
                                <span class="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Iniciando Conexão...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Display Area -->
                <div id="wpp-content" class="flex-1 flex flex-col items-center justify-center pb-20">
                    <!-- Loading State (Default) -->
                    <div class="flex flex-col items-center animate-fade-in">
                        <div class="relative">
                            <div class="w-20 h-20 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <i data-feather="cloud" class="w-6 h-6 text-slate-600"></i>
                            </div>
                        </div>
                        <p class="mt-8 text-slate-400 font-medium tracking-wide animate-pulse">Conectando ao servidor seguro...</p>
                    </div>
                </div>

            </div>
        </div>
    `,

    updateUI: (state) => {
        const content = document.getElementById('wpp-content');
        const badge = document.getElementById('wpp-badge');
        if (!content || !badge) return;

        // Limpa classes anteriores de animação para reiniciar se necessário
        content.className = "flex-1 flex flex-col items-center justify-center pb-20 transition-all duration-500";

        switch (state.status) {
            case 'SEARCHING':
            case 'INITIALIZING':
            case 'RECONNECTING':
            case 'MISSING': // Tratamos MISSING como "Tentando reconectar" agora, pois é Cloud
                badge.innerHTML = `
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span class="text-[11px] text-blue-400 font-bold uppercase tracking-widest">Sincronizando Cloud</span>
                `;
                content.innerHTML = `
                    <div class="flex flex-col items-center animate-fade-in text-center max-w-md">
                        <div class="relative mb-10">
                            <!-- Orb Animation -->
                            <div class="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                            <div class="w-24 h-24 bg-slate-900 border border-white/5 rounded-3xl flex items-center justify-center shadow-2xl relative z-10 p-6">
                                <i data-feather="server" class="w-full h-full text-blue-500 animate-pulse"></i>
                            </div>
                            
                            <!-- Connecting Line -->
                            <div class="absolute top-1/2 left-full w-32 h-[2px] bg-gradient-to-r from-blue-500/50 to-transparent -z-10 hidden lg:block"></div>
                        </div>
                        
                        <h3 class="text-3xl font-black text-white mb-4">Conectando Servidor</h3>
                        <p class="text-slate-400 text-sm leading-relaxed">
                            Estamos estabelecendo uma conexão segura com seu servidor UniTech Power no Google Cloud. 
                            <br><span class="text-slate-600 text-xs mt-2 block">(IP: 34.171.111.211)</span>
                        </p>
                        
                        <div class="mt-8 flex gap-2">
                            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0s"></span>
                            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
                        </div>
                    </div>
                `;
                break;

            case 'QR_CODE':
                badge.innerHTML = `
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span class="text-[11px] text-amber-500 font-bold uppercase tracking-widest">Aguardando Leitura</span>
                `;
                content.innerHTML = `
                    <div class="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 animate-scale-in">
                        
                        <!-- QR Display -->
                        <div class="relative group">
                            <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div class="relative bg-white p-6 rounded-[2rem] shadow-2xl ring-4 ring-white/10">
                                <div class="w-72 h-72 bg-slate-100 rounded-xl overflow-hidden relative">
                                    <img src="${state.qrCode}" class="w-full h-full object-contain mix-blend-multiply opacity-0 transition-opacity duration-500" onload="this.classList.remove('opacity-0')">
                                    
                                    <!-- Scanning Line Animation -->
                                    <div class="absolute top-0 left-0 w-full h-1 bg-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-scan pointer-events-none"></div>
                                </div>
                                <div class="mt-6 flex items-center justify-center gap-3 text-slate-400">
                                    <i data-feather="camera" class="w-4 h-4"></i>
                                    <span class="text-xs font-bold tracking-widest uppercase">Aponte a Câmera</span>
                                </div>
                            </div>
                        </div>

                        <!-- Instructions -->
                        <div class="max-w-sm text-center lg:text-left">
                            <h1 class="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
                                Conecte seu <br>
                                <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">WhatsApp</span>
                            </h1>
                            <ol class="space-y-6 text-slate-300 font-medium">
                                <li class="flex items-center gap-4 group">
                                    <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">1</span>
                                    <span>Abra o WhatsApp no seu celular</span>
                                </li>
                                <li class="flex items-center gap-4 group">
                                    <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">2</span>
                                    <span>Toque em <b>Mais opções</b> ou <b>Configurações</b></span>
                                </li>
                                <li class="flex items-center gap-4 group">
                                    <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">3</span>
                                    <span>Selecione <b>Aparelhos Conectados</b></span>
                                </li>
                                <li class="flex items-center gap-4 group">
                                    <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">4</span>
                                    <span>Toque em <b>Conectar um Aparelho</b></span>
                                </li>
                            </ol>
                        </div>

                    </div>
                `;
                break;

            case 'CONNECTED':
                badge.innerHTML = `
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span class="text-[11px] text-emerald-500 font-bold uppercase tracking-widest">Sistema Operacional</span>
                `;
                content.innerHTML = `
                    <div class="text-center animate-scale-in max-w-lg">
                        <div class="relative inline-block mb-10">
                            <div class="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full"></div>
                            <div class="w-32 h-32 bg-slate-900 border-2 border-emerald-500/20 rounded-full flex items-center justify-center relative z-10 shadow-2xl">
                                <i data-feather="check" class="w-16 h-16 text-emerald-500"></i>
                            </div>
                            
                            <!-- Orbiting Particles -->
                            <div class="absolute inset-0 animate-spin-slow">
                                <div class="w-3 h-3 bg-emerald-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2 -mt-1 shadow-lg shadow-emerald-500"></div>
                            </div>
                        </div>

                        <h3 class="text-4xl font-black text-white mb-4">Tudo Conectado!</h3>
                        <p class="text-slate-400 text-lg mb-8 leading-relaxed">
                            Seu servidor UniTech Cloud está sincronizado e pronto para processar mensagens automáticas.
                        </p>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Status</p>
                                <p class="text-emerald-400 font-black text-xl">Online</p>
                            </div>
                            <div class="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Servidor</p>
                                <p class="text-white font-black text-xl">Cloud AI</p>
                            </div>
                        </div>

                        <button onclick="localWhatsapp.checkStatus()" class="mt-8 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                            <i data-feather="refresh-cw" class="w-3 h-3"></i> Atualizar Status
                        </button>
                    </div>
                `;
                break;
        }

        if (window.feather) window.feather.replace();
    }
};
