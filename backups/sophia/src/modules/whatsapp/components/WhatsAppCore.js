
import { whatsappService } from '../services/WhatsappService.js';

/**
 * WhatsApp Core Application (Unified for Static Panel and Floating Widget)
 */
export const WhatsAppChatApp = (containerId, options = {}) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
        mode = 'full', // 'full' or 'auth-only'
        isWidget = false,
        onClose = () => { },
        onMinimize = () => { }
    } = options;

    let currentStatus = 'DISCONNECTED';
    let currentChats = [];
    let selectedChatId = null;
    let messagesPoller = null;
    let listPoller = null;
    let messageSentUnsubscribe = null;

    const renderLayout = () => {
        // If auth-only mode, we show a simplified layout
        if (mode === 'auth-only') {
            container.innerHTML = `
                <div class="unitech-card rounded-3xl overflow-hidden relative max-w-lg w-full p-10 mx-auto mt-20 text-center bg-pattern-dots border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    <div class="flex flex-col items-center gap-4 mb-10">
                        <div class="w-16 h-16 bg-[#25D366]/10 rounded-2xl flex items-center justify-center mb-2">
                            <i data-feather="message-circle" class="w-8 h-8 text-[#25D366]"></i>
                        </div>
                        <h2 class="text-3xl font-black text-[#e9edef] tracking-tight">WhatsApp <span class="text-[#25D366]">UniTech</span></h2>
                        <div id="status-badge" class="status-badge-premium bg-yellow-500/20 text-yellow-500 flex items-center gap-2">
                            <div id="status-dot-inner" class="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></div>
                            <span id="conn-status-text">Verificando...</span>
                        </div>
                    </div>
                    
                    <div id="auth-view" class="space-y-10 relative z-10">
                        <div id="qr-target" class="qr-container-premium w-64 h-64 mx-auto flex items-center justify-center p-4 bg-white">
                            <div class="animate-spin rounded-full h-8 w-8 border-4 border-[#00a884] border-t-transparent"></div>
                        </div>
                        
                        <div id="connected-view" class="hidden py-6 animate-in zoom-in duration-500">
                            <div class="w-20 h-20 bg-[#25D366]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i data-feather="check-circle" class="w-10 h-10 text-[#25D366]"></i>
                            </div>
                            <p class="text-[#e9edef] text-2xl font-bold mb-2">Conectado com Sucesso</p>
                            <p class="text-[#8696a0] text-sm max-w-xs mx-auto">O atendimento via WhatsApp está ativo e disponível em todas as telas.</p>
                        </div>

                        <div class="flex flex-col gap-4 items-center">
                            <button id="sync-real-btn" class="hidden px-8 py-3 bg-white/5 hover:bg-white/10 text-sm font-bold text-[#e9edef] rounded-2xl border border-white/10 transition-all w-full max-w-xs">Forçar Sincronização</button>
                            <button id="disconnect-btn" class="hidden px-8 py-3 bg-red-500/10 text-red-500 text-sm font-bold rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all w-full max-w-xs">Desconectar Aparelho</button>
                        </div>
                    </div>

                    <!-- Subtle bottom brand -->
                    <div class="mt-12 opacity-20 text-[10px] uppercase tracking-[0.2em] font-bold text-white">
                        UniTech Industrial Messaging System v9.0
                    </div>
                </div>
            `;
        } else {
            // FULL MODE (Used for Widget)
            container.innerHTML = `
                <div class="flex flex-col h-full bg-[#111b21] rounded-xl overflow-hidden shadow-2xl relative border border-white/5">
                    <!-- Top Header -->
                    <div class="h-16 bg-[#202c33] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20 ${isWidget ? 'cursor-move' : ''}" id="app-header">
                        <div class="flex items-center gap-3">
                            <div id="status-dot" class="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                            <h2 class="text-md font-bold text-[#e9edef]">WhatsApp <span id="conn-status-text" class="text-xs font-normal opacity-50 ml-2 italic">...</span></h2>
                        </div>
                        <div class="flex items-center gap-3">
                            ${isWidget ? `
                                <button id="minimize-btn" class="text-[#8696a0] hover:text-white p-1 transition-colors"><i data-feather="minus" class="w-4 h-4"></i></button>
                                <button id="close-btn" class="text-[#8696a0] hover:text-red-500 p-1 transition-colors"><i data-feather="x" class="w-4 h-4"></i></button>
                            ` : `
                                <button id="sync-real-btn" class="hidden px-3 py-1 bg-[#202c33] hover:bg-[#2a3942] text-xs text-[#8696a0] rounded border border-white/5 transition-colors">Sincronizar</button>
                                <button id="disconnect-btn" class="hidden px-3 py-1 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/20 transition-colors">Sair</button>
                            `}
                        </div>
                    </div>

                    <div class="flex flex-1 overflow-hidden flex-row">
                        <!-- Sidebar -->
                        <div class="w-80 border-r border-white/5 flex flex-col bg-[#111b21] shrink-0">
                            <div class="p-4 bg-[#111b21] sticky top-0 z-10">
                                <div class="bg-[#202c33] rounded-lg flex items-center px-4 py-2 border border-white/5">
                                    <i data-feather="search" class="w-4 h-4 text-[#8696a0]"></i>
                                    <input type="text" id="chat-search" placeholder="Pesquisar..." class="bg-transparent border-none text-sm text-gray-300 w-full focus:ring-0 ml-3">
                                </div>
                            </div>
                            <div id="real-chat-list" class="flex-1 overflow-y-auto divide-y divide-white/5 custom-scroll">
                                <div class="p-10 text-center text-gray-500 text-sm">Carregando conversas...</div>
                            </div>
                        </div>

                        <!-- Chat Container -->
                        <div class="flex-1 flex flex-col bg-[#0b141a] relative">
                             <div id="msg-placeholder" class="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div class="w-24 h-24 mb-6 opacity-10">
                                    <i data-feather="message-circle" style="width:100%; height:100%;"></i>
                                </div>
                                <h1 class="text-xl text-[#e9edef] font-light mb-2">WhatsApp UniTech</h1>
                                <p class="text-xs text-[#8696a0]">Selecione uma conversa para começar o atendimento.</p>
                             </div>

                             <div id="active-chat-view" class="hidden flex-1 flex flex-col overflow-hidden">
                                <div class="h-16 bg-[#202c33] flex items-center px-4 gap-3 border-b border-white/5">
                                    <div id="active-chat-avatar" class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white shrink-0 shadow-sm overflow-hidden text-sm uppercase"></div>
                                    <h4 id="active-chat-name" class="text-[#e9edef] font-medium truncate">Carregando...</h4>
                                </div>
                                <div id="real-messages-container" class="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scroll bg-[#0b141a]"></div>
                                <div class="p-3 bg-[#202c33] border-t border-white/5 flex items-center gap-2">
                                    <input type="file" id="real-file-input" class="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip">
                                    <button id="real-attach-btn" class="p-2 text-[#8696a0] hover:text-[#00a884] transition-colors">
                                        <i data-feather="paperclip" class="w-5 h-5"></i>
                                    </button>
                                    <input type="text" id="real-chat-input" placeholder="Digite uma mensagem" class="flex-1 bg-[#2a3942] rounded-lg px-4 h-11 border-none text-gray-200 text-sm focus:ring-1 focus:ring-[#00a884]/40">
                                    <button id="real-send-btn" class="p-2.5 bg-[#00a884] rounded-full text-[#111b21] hover:scale-105 active:scale-95 transition shadow-md">
                                        <i data-feather="send" class="w-4 h-4"></i>
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>

                    <!-- Photo Viewer Modal (Absolute to window) -->
                    <div id="wpp-image-viewer" class="wpp-viewer-overlay hidden">
                        <div class="wpp-viewer-content">
                            <button id="viewer-close-btn" class="wpp-viewer-close">
                                <i data-feather="x" class="w-5 h-5"></i>
                            </button>
                            <img id="viewer-img" src="" class="wpp-viewer-img">
                        </div>
                    </div>
                </div>
            `;
        }

        initializeElements();
    };

    let chatList, messageContainer, connStatusText, statusDot, disconnectBtn, syncRealBtn, qrOverlay, qrTarget, activeChatView, placeholderView, chatInput, sendBtn, chatSearch;

    const initializeElements = () => {
        chatList = container.querySelector('#real-chat-list');
        messageContainer = container.querySelector('#real-messages-container');
        connStatusText = container.querySelector('#conn-status-text');
        statusDot = container.querySelector('#status-dot');
        disconnectBtn = container.querySelector('#disconnect-btn');
        syncRealBtn = container.querySelector('#sync-real-btn');
        qrOverlay = container.querySelector('#qr-overlay');
        qrTarget = container.querySelector('#qr-target');
        activeChatView = container.querySelector('#active-chat-view');
        placeholderView = container.querySelector('#msg-placeholder');
        chatInput = container.querySelector('#real-chat-input');
        sendBtn = container.querySelector('#real-send-btn');
        chatSearch = container.querySelector('#chat-search');

        // Widget Buttons
        const minimizeBtn = container.querySelector('#minimize-btn');
        const closeBtn = container.querySelector('#close-btn');
        if (minimizeBtn) minimizeBtn.onclick = onMinimize;
        if (closeBtn) closeBtn.onclick = onClose;

        if (sendBtn) {
            sendBtn.onclick = async () => {
                const text = chatInput.value.trim();
                if (!text || !selectedChatId || currentStatus !== 'CONNECTED') return;
                chatInput.value = '';
                try {
                    await whatsappService.sendMessage(selectedChatId, text);
                    const msgs = await whatsappService.getLiveMessages(selectedChatId);
                    renderMessages(msgs);
                } catch (e) { alert("Erro ao enviar!"); chatInput.value = text; }
            };
        }

        if (chatInput) {
            chatInput.onkeypress = (e) => {
                if (e.key === 'Enter') sendBtn.onclick();
            };
        }

        if (chatSearch) {
            chatSearch.oninput = () => renderChats(currentChats);
        }

        if (disconnectBtn) {
            disconnectBtn.onclick = () => confirm('Sair agora?') && whatsappService.disconnectInstance();
        }

        if (syncRealBtn) {
            syncRealBtn.onclick = async () => {
                syncRealBtn.disabled = true;
                await whatsappService.syncFromPhone();
                setTimeout(() => { syncRealBtn.disabled = false; pollList(); }, 2000);
            };
        }

        const fileInput = document.getElementById('real-file-input');
        const attachBtn = document.getElementById('real-attach-btn');

        if (attachBtn && fileInput) {
            attachBtn.onclick = () => fileInput.click();
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file || !selectedChatId || currentStatus !== 'CONNECTED') return;

                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target.result;
                    const originalBtnHtml = attachBtn.innerHTML;
                    attachBtn.innerHTML = '<i class="animate-spin" data-feather="loader" width="16" height="16"></i>';
                    if (window.feather) window.feather.replace();

                    try {
                        await whatsappService.sendMedia(selectedChatId, base64, file.name, '');
                        const msgs = await whatsappService.getLiveMessages(selectedChatId);
                        renderMessages(msgs);
                        fileInput.value = ''; // Reset
                    } catch (err) {
                        alert("Erro ao enviar arquivo: " + err.message);
                    } finally {
                        attachBtn.innerHTML = originalBtnHtml;
                        if (window.feather) window.feather.replace();
                    }
                };
                reader.readAsDataURL(file);
            };
        }

        if (window.feather) window.feather.replace();
    };

    const updateUI = (state) => {
        const oldStatus = currentStatus;
        currentStatus = state.status;

        if (connStatusText) {
            connStatusText.innerText = state.status === 'CONNECTED' ? 'Conectado' :
                state.status === 'QR_CODE' ? 'Aguardando QR' :
                    state.status === 'INITIALIZING' ? 'Iniciando...' : 'Desconectado';
        }

        const statusBadge = container.querySelector('#status-badge');
        const statusDotInner = container.querySelector('#status-dot-inner');
        if (statusBadge && statusDotInner) {
            const isConn = state.status === 'CONNECTED';
            statusBadge.className = `status-badge-premium ${isConn ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-yellow-500/20 text-yellow-500'} flex items-center gap-2`;
            statusDotInner.className = `w-2 h-2 rounded-full ${isConn ? 'bg-[#25D366]' : 'bg-yellow-500'} ${!isConn ? 'animate-ping' : ''}`;
        }

        if (statusDot) {
            statusDot.className = `w-3 h-3 rounded-full ${state.status === 'CONNECTED' ? 'bg-[#00a884]' : 'bg-yellow-500'} ${state.status !== 'CONNECTED' ? 'animate-pulse' : ''}`;
        }

        if (disconnectBtn) disconnectBtn.classList.toggle('hidden', state.status !== 'CONNECTED');
        if (syncRealBtn) syncRealBtn.classList.toggle('hidden', state.status !== 'CONNECTED');

        // Special handling for auth-only mode
        if (mode === 'auth-only') {
            const connectedView = container.querySelector('#connected-view');
            const qrTargetFull = container.querySelector('#qr-target');
            if (connectedView && qrTargetFull) {
                if (state.status === 'CONNECTED') {
                    connectedView.classList.remove('hidden');
                    qrTargetFull.classList.add('hidden');
                    qrTargetFull.parentElement?.classList.remove('space-y-10');
                } else {
                    connectedView.classList.add('hidden');
                    qrTargetFull.classList.remove('hidden');
                    qrTargetFull.parentElement?.classList.add('space-y-10');
                }
            }
        }

        if (state.status === 'CONNECTED') {
            if (qrOverlay) qrOverlay.classList.add('hidden');
            if (oldStatus !== 'CONNECTED') pollList();
        } else {
            if (qrOverlay) qrOverlay.classList.remove('hidden');
            const target = mode === 'auth-only' ? container.querySelector('#qr-target') : qrTarget;
            if (target) {
                if (state.status === 'QR_CODE' && state.qrCode) {
                    target.innerHTML = `<img src="${state.qrCode}" class="w-full h-full animate-in zoom-in-75 duration-300 rounded-lg" />`;
                    target.classList.add('qr-container-premium');
                } else if (state.status === 'INITIALIZING') {
                    target.innerHTML = `
                        <div class="flex flex-col items-center gap-3">
                            <div class="animate-spin rounded-full h-10 w-10 border-4 border-[#25D366] border-t-transparent"></div>
                            <span class="text-xs text-slate-500 font-bold uppercase tracking-wider">iniciando o WhatsApp</span>
                        </div>
                    `;
                    target.classList.remove('qr-container-premium');
                } else {
                    target.innerHTML = `
                        <div class="flex flex-col items-center gap-4 text-center p-4">
                             <div class="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                                <i data-feather="alert-circle" class="w-6 h-6 text-red-500"></i>
                             </div>
                             <div>
                                <h4 class="text-slate-800 font-bold text-sm">Sessão Expirada</h4>
                                <p class="text-slate-400 text-[10px] mt-1">Clique abaixo para gerar um novo QR Code</p>
                             </div>
                             <button onclick="window.whatsappService.connectInstance()" class="btn-premium-wpp px-8 py-3 rounded-2xl text-xs flex items-center gap-2">
                                <i data-feather="refresh-cw" class="w-3 h-3"></i>
                                Re-conectar Agora
                             </button>
                        </div>
                    `;
                    target.classList.remove('qr-container-premium');
                }
                if (window.feather) window.feather.replace();
            }
        }
    };

    const openImageViewer = (src) => {
        const viewer = container.querySelector('#wpp-image-viewer');
        const img = container.querySelector('#viewer-img');
        const closeBtn = container.querySelector('#viewer-close-btn');

        if (viewer && img) {
            img.src = src;
            viewer.classList.remove('hidden');

            closeBtn.onclick = () => viewer.classList.add('hidden');
            viewer.onclick = (e) => {
                if (e.target === viewer) viewer.classList.add('hidden');
            };
            if (window.feather) window.feather.replace();
        }
    };

    if (isWidget) {
        window.SharedChat_OpenImage = (src) => openImageViewer(src);
    }

    const formatTime = (secs) => {
        if (!secs || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    window.SharedChat_AudioToggle = (msgId) => {
        const audio = container.querySelector(`#audio-${msgId}`);
        const btn = container.querySelector(`#btn-${msgId}`);
        if (!audio || !btn) return;

        if (audio.paused) {
            document.querySelectorAll('audio').forEach(a => {
                if (a.id !== `audio-${msgId}`) {
                    a.pause();
                    const otherBtn = document.getElementById(`btn-${a.id.replace('audio-', '')}`);
                    if (otherBtn) {
                        otherBtn.innerHTML = '<i data-feather="play" class="w-4 h-4"></i>';
                        if (window.feather) window.feather.replace();
                    }
                }
            });
            audio.play();
            btn.innerHTML = '<i data-feather="pause" class="w-4 h-4"></i>';
        } else {
            audio.pause();
            btn.innerHTML = '<i data-feather="play" class="w-4 h-4"></i>';
        }
        if (window.feather) window.feather.replace();
    };

    window.SharedChat_AudioSpeed = (msgId) => {
        const audio = container.querySelector(`#audio-${msgId}`);
        const speedBtn = container.querySelector(`#speed-${msgId}`);
        if (!audio || !speedBtn) return;
        let speed = parseFloat(audio.playbackRate);
        if (speed === 1) speed = 1.5;
        else if (speed === 1.5) speed = 2;
        else speed = 1;
        audio.playbackRate = speed;
        speedBtn.innerText = `${speed}x`;
    };

    window.SharedChat_AudioUpdate = (msgId) => {
        const audio = container.querySelector(`#audio-${msgId}`);
        const timeEl = container.querySelector(`#time-${msgId}`);
        if (!audio) return;

        // WhatsApp Behavior: Show duration when idle at 0, otherwise show progress
        const isIdle = (audio.currentTime === 0 || audio.paused) && audio.currentTime < 0.1;
        if (timeEl) {
            timeEl.innerText = isIdle && audio.duration && audio.duration !== Infinity
                ? formatTime(audio.duration)
                : formatTime(audio.currentTime);
        }

        const progress = (audio.currentTime / audio.duration) || 0;
        const bars = container.querySelectorAll(`#wave-${msgId} .wpp-audio-wave-bar`);
        const activeIdx = Math.floor(progress * bars.length);

        bars.forEach((b, idx) => {
            if (idx <= activeIdx) b.classList.add('active');
            else b.classList.remove('active');
        });
    };

    window.SharedChat_AudioEnded = (msgId) => {
        const btn = container.querySelector(`#btn-${msgId}`);
        if (btn) {
            btn.innerHTML = '<i data-feather="play" class="w-4 h-4"></i>';
            if (window.feather) window.feather.replace();
        }
    };

    window.SharedChat_AudioSeek = (msgId, e) => {
        const audio = container.querySelector(`#audio-${msgId}`);
        const progress = container.querySelector(`#wave-${msgId}`);
        if (!audio || !progress) return;
        const rect = progress.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audio.currentTime = percentage * audio.duration;
    };

    const getWaveformHtml = (msgId) => {
        let bars = '';
        for (let i = 0; i < 35; i++) {
            const h = 8 + Math.random() * 14;
            bars += `<div class="wpp-audio-wave-bar" style="height: ${h}px"></div>`;
        }
        return `<div id="wave-${msgId}" class="wpp-audio-waveform" onclick="window.SharedChat_AudioSeek('${msgId}', event)">${bars}</div>`;
    };

    const getAckHtml = (ack) => {
        if (ack >= 3) return `<span class="wpp-ack-read">✔️✔️</span>`;
        if (ack >= 2) return `<span class="wpp-ack-delivered">✔️✔️</span>`;
        return `<span class="wpp-ack-sent">✔️</span>`;
    };

    const renderChats = (chats) => {
        if (!chatList) return;

        // Sort by timestamp descending (newest first)
        const sorted = [...chats].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        currentChats = sorted;

        const queryTerm = chatSearch ? chatSearch.value.toLowerCase() : '';
        const filtered = sorted.filter(c => {
            // Show all contacts: with name, with phone number, groups, and @lid format
            const name = c.name || c.phone || '';
            if (!name) return false;
            if (c.id.includes('broadcast') || c.id.includes('status')) return false;
            return name.toLowerCase().includes(queryTerm) || (c.phone || '').includes(queryTerm);
        });

        chatList.innerHTML = filtered.map(chat => {
            const isSelected = selectedChatId === chat.id;
            const time = chat.timestamp ? new Date(whatsappService.parseTimestamp(chat.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            // Better name: use contact name, or format phone nicely
            let name = chat.name || '';
            if (!name || /^\d+$/.test(name)) {
                const p = chat.phone || name;
                name = p ? ('+' + p) : 'Contato';
            }

            const normalizedId = chat.id.includes('@') ? chat.id : chat.id.replace(/\D/g, '');
            const photo = chat.customerPhoto || (window._wppPhotoCache ? window._wppPhotoCache[normalizedId] : null);

            const avatarHtml = photo
                ? `<img src="${photo}" class="w-12 h-12 rounded-full object-cover shadow-sm bg-[#39474e]" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="hidden w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white shrink-0 shadow-sm text-sm">${name[0].toUpperCase()}</div>`
                : `<div class="w-12 h-12 rounded-full bg-[#39474e] flex items-center justify-center font-bold text-white shrink-0 shadow-sm text-sm">${name[0].toUpperCase()}</div>`;

            const lastMsgPrefix = chat.lastMessageFromMe ? getAckHtml(chat.lastMessageAck) + ' ' : '';

            return `
                <div class="p-3.5 flex items-center gap-3 cursor-pointer hover:bg-[#202c33] transition-all ${isSelected ? 'bg-[#2a3942]' : ''}"
                    onclick="window.SharedChat_Select('${chat.id}', '${name.replace(/'/g, "\\'")}', '${photo || ''}')">
                    ${avatarHtml}
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-0.5">
                            <h4 class="text-[#e9edef] text-[15px] font-normal truncate ${chat.unreadCount > 0 ? 'font-bold' : ''}">${name}</h4>
                            <span class="${chat.unreadCount > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'} text-[11px]">${time}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <p class="text-[#8696a0] text-[13px] truncate flex-1 mr-2 flex items-center gap-1">
                                ${lastMsgPrefix}${chat.lastMessage || '...'}
                            </p>
                            ${chat.unreadCount > 0 ? `
                                <div class="bg-[#00a884] text-[#111b21] text-[11px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1 shadow-sm">
                                    ${chat.unreadCount}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (filtered.length === 0 && currentStatus === 'CONNECTED') {
            chatList.innerHTML = `<div class="p-10 text-center text-[#8696a0] text-xs">Aguardando mensagens...</div>`;
        }
    };

    const renderMessages = (messages, forceScroll = false) => {
        if (!messageContainer) return;

        // Check if user is near bottom before rendering
        const isNearBottom = messageContainer.scrollHeight - messageContainer.scrollTop <= messageContainer.clientHeight + 150;
        const isFirstLoad = messageContainer.innerHTML === '';

        const sorted = [...messages].sort((a, b) => whatsappService.parseTimestamp(a.timestamp) - whatsappService.parseTimestamp(b.timestamp));

        const grouped = [];
        let currentImgGroup = null;

        sorted.forEach((m) => {
            const isMe = m.from === 'me';
            const timestamp = whatsappService.parseTimestamp(m.timestamp);
            const isImage = m.type === 'image' && m.mediaData;

            if (isImage) {
                const canGroup = currentImgGroup &&
                    currentImgGroup.from === m.from &&
                    (timestamp - currentImgGroup.lastTimestamp) < 60000;

                if (canGroup) {
                    currentImgGroup.items.push(m);
                    currentImgGroup.lastTimestamp = timestamp;
                } else {
                    currentImgGroup = {
                        isGroup: true,
                        type: 'image-group',
                        from: m.from,
                        items: [m],
                        lastTimestamp: timestamp,
                        timestamp: m.timestamp,
                        ack: m.ack
                    };
                    grouped.push(currentImgGroup);
                }
            } else {
                currentImgGroup = null;
                grouped.push(m);
            }
        });

        messageContainer.innerHTML = grouped.map(m => {
            const isMe = m.from === 'me';
            const time = new Date(whatsappService.parseTimestamp(m.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Skip system notifications that aren't useful
            if (m.type === 'e2e_notification' || m.type === 'gp2') return '';

            if (m.type === 'image-group') {
                const count = m.items.length;
                if (count === 1) {
                    const item = m.items[0];
                    return `
                        <div class="wpp-msg ${isMe ? 'sent' : 'received'} !p-1.5 !pr-[70px] mb-1">
                            <div class="rounded overflow-hidden cursor-pointer active:scale-95 transition-transform" onclick="window.SharedChat_OpenImage('${item.mediaData}')">
                                <img src="${item.mediaData}" class="max-w-full max-h-[400px] h-auto rounded block hover:brightness-110 transition-all">
                            </div>
                            <div class="wpp-msg-time">
                                ${time} 
                                ${isMe ? getAckHtml(item.ack) : ''}
                            </div>
                        </div>
                    `;
                }

                // Grid layout for multiple images
                const gridHtml = m.items.slice(0, 4).map((item, idx) => {
                    const isLastVisible = idx === 3 && count > 4;
                    const spanClass = (count === 3 && idx === 0) ? 'col-span-2 aspect-video' : 'aspect-square';

                    return `
                        <div class="relative ${spanClass} rounded overflow-hidden cursor-pointer active:scale-95 transition-transform" onclick="window.SharedChat_OpenImage('${item.mediaData}')">
                            <img src="${item.mediaData}" class="w-full h-full object-cover hover:brightness-105 transition-all">
                            ${isLastVisible ? `
                                <div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                                    +${count - 3}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');

                return `
                    <div class="wpp-msg ${isMe ? 'sent' : 'received'} !p-1 !pr-[70px] !max-w-[370px] mb-1">
                        <div class="grid grid-cols-2 gap-1">
                            ${gridHtml}
                        </div>
                        <div class="wpp-msg-time">
                            ${time} 
                            ${isMe ? getAckHtml(m.ack) : ''}
                        </div>
                    </div>
                `;
            }

            // Normal Media/Text Items
            let content = '';
            if (m.type === 'audio' || m.type === 'ptt') {
                const audioId = m.id.replace(/\W/g, '');
                const contactId = m.from === 'me' ? 'me' : selectedChatId;
                const photo = window._wppPhotoCache ? window._wppPhotoCache[contactId.replace(/\D/g, '')] : null;
                const avatar = photo ? `<img src="${photo}" class="wpp-audio-avatar" referrerpolicy="no-referrer">` : `<div class="wpp-audio-avatar flex items-center justify-center text-[10px] text-white font-bold opacity-30"><i data-feather="user" class="w-4 h-4"></i></div>`;

                content = `
                    <div class="wpp-audio-player">
                        ${avatar}
                        <button id="btn-${audioId}" class="wpp-audio-btn" onclick="window.SharedChat_AudioToggle('${audioId}')">
                            <i data-feather="play" class="w-5 h-5"></i>
                        </button>
                        <div class="wpp-audio-body">
                            <audio id="audio-${audioId}" src="${m.mediaData}" ontimeupdate="window.SharedChat_AudioUpdate('${audioId}')" onended="window.SharedChat_AudioEnded('${audioId}')" onloadedmetadata="window.SharedChat_AudioUpdate('${audioId}')"></audio>
                            ${getWaveformHtml(audioId)}
                            <div class="wpp-audio-info">
                                <span id="time-${audioId}">0:00</span>
                                <div id="speed-${audioId}" class="wpp-audio-speed" onclick="window.SharedChat_AudioSpeed('${audioId}')">1x</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (m.type === 'video') {
                content = `
                    <div class="wpp-video-container">
                        <video src="${m.mediaData}" controls poster=""></video>
                    </div>
                `;
            } else {
                content = m.text || m.body || m.content || '';
                if (!content) {
                    if (m.type === 'document') content = '📄 Arquivo';
                    else content = `<i class="opacity-50 text-[11px] italic">Mensagem (${m.type})</i>`;
                } else {
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    content = content.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline break-all">${url}</a>`);
                    content = content.replace(/\n/g, '<br>');
                }
                content = `<div class="whitespace-pre-wrap">${content}</div>`;
            }

            return `
                <div class="wpp-msg ${isMe ? 'sent' : 'received'}">
                    ${content}
                    <div class="wpp-msg-time">
                        ${time} 
                        ${isMe ? getAckHtml(m.ack) : ''}
                    </div>
                </div>
            `;
        }).join('');

        if (forceScroll || isFirstLoad || isNearBottom) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }

        if (window.feather) window.feather.replace();
    };

    const SharedChat_Select = async (id, name, photo) => {
        if (selectedChatId === id) return;
        selectedChatId = id;

        // Mark as read immediately
        whatsappService.markAsRead(id);
        if (placeholderView) placeholderView.classList.add('hidden');
        if (activeChatView) activeChatView.classList.remove('hidden');

        const activeName = container.querySelector('#active-chat-name');
        if (activeName) activeName.innerText = name;

        const avatarTarget = container.querySelector('#active-chat-avatar');
        if (avatarTarget) {
            if (photo) {
                avatarTarget.innerHTML = `<img src="${photo}" class="w-10 h-10 rounded-full object-cover" referrerpolicy="no-referrer">`;
            } else {
                avatarTarget.innerHTML = name[0].toUpperCase();
            }
        }

        if (messageSentUnsubscribe) {
            messageSentUnsubscribe();
            messageSentUnsubscribe = null;
        }

        renderChats(currentChats);

        const pull = async (isInitial = false) => {
            if (selectedChatId !== id) return;
            try {
                const msgs = await whatsappService.getLiveMessages(id);
                renderMessages(msgs, isInitial);
            } catch (e) { }
        };

        // Listen for sync events
        messageSentUnsubscribe = whatsappService.onMessageSent((sentChatId) => {
            const normalize = (val) => val.includes('_') ? val.split('_')[1] : val.replace(/\D/g, '');
            if (normalize(sentChatId) === normalize(id)) {
                pull();
            }
        });

        if (messagesPoller) clearInterval(messagesPoller);
        await pull(true);
        messagesPoller = setInterval(() => pull(false), 4000);
        if (chatInput) chatInput.focus();
    };

    if (isWidget) {
        window.SharedChat_Select = SharedChat_Select;
    }

    const pollList = async () => {
        if (mode !== 'full') return; // Only full mode polls chats
        if (currentStatus === 'CONNECTED') {
            const chats = await whatsappService.getLiveChats();
            renderChats(chats);
        } else {
            whatsappService.getRecentChats((chats) => {
                if (currentStatus !== 'CONNECTED') renderChats(chats);
            });
        }
    };

    // Initialize
    renderLayout();
    const statusUnsubscribe = whatsappService.onSessionStatusChange(updateUI);
    listPoller = setInterval(pollList, 10000);
    pollList();

    setTimeout(() => {
        if (currentStatus === 'DISCONNECTED') whatsappService.connectInstance();
    }, 1500);

    return () => {
        if (messagesPoller) clearInterval(messagesPoller);
        if (listPoller) clearInterval(listPoller);
        if (messageSentUnsubscribe) messageSentUnsubscribe();
        if (statusUnsubscribe) statusUnsubscribe();
    };
};
