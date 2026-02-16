
import { whatsappService } from '../services/WhatsappService.js';
import { WhatsAppChatApp } from './WhatsAppCore.js';

let widgetContainer = null;
let chatWindow = null;
let appInstance = null;
let isVisible = false;

export const WhatsAppWidget = {
    init() {
        // Skip on Mobile or Public Catalog Page
        const isCatalogPage = new URLSearchParams(window.location.search).has('catalog');
        if (typeof window !== 'undefined' && (window.innerWidth <= 768 || isCatalogPage)) {
            console.log('WhatsAppWidget: Mobile or Catalog Page detected - skipping initialization.');
            return;
        }
        if (document.getElementById('whatsapp-widget-container')) return;

        // 1. Create Floating Container
        widgetContainer = document.createElement('div');
        widgetContainer.id = 'whatsapp-widget-container';
        widgetContainer.className = 'hidden';

        // 2. FAB (Small Icon to Open)
        const fab = document.createElement('div');
        fab.id = 'whatsapp-fab';
        fab.className = 'whatsapp-fab';
        fab.innerHTML = `<i data-feather="message-circle" width="32" height="32"></i>`;

        // 3. The App Window (using exact static panel styles but floating)
        chatWindow = document.createElement('div');
        chatWindow.className = 'whatsapp-chat-window hidden shadow-2xl';
        chatWindow.id = 'floating-chat-window';

        // We set a larger size for the floating version to fit the sidebar "perfectly"
        chatWindow.style.width = '1000px';
        chatWindow.style.height = '700px';
        chatWindow.style.maxWidth = '90vw';
        chatWindow.style.maxHeight = '85vh';
        chatWindow.style.resize = 'both';
        chatWindow.style.overflow = 'hidden';

        widgetContainer.appendChild(fab);
        widgetContainer.appendChild(chatWindow);
        document.body.appendChild(widgetContainer);

        // 4. Initialize the CORE APP inside the floating window
        appInstance = WhatsAppChatApp('floating-chat-window', {
            mode: 'full',
            isWidget: true,
            onClose: () => {
                console.log("Widget: Close clicked");
                this.toggleWindow();
            },
            onMinimize: () => {
                console.log("Widget: Minimize clicked");
                this.toggleWindow();
            }
        });

        // Ensure buttons work even after core app re-renders its layout
        const setupButtons = () => {
            const closeBtn = chatWindow.querySelector('#close-btn');
            const minimizeBtn = chatWindow.querySelector('#minimize-btn');
            if (closeBtn) closeBtn.onclick = () => this.toggleWindow();
            if (minimizeBtn) minimizeBtn.onclick = () => this.toggleWindow();
        };

        // 5. Draggable Logic (Handle is the app header)
        setTimeout(() => {
            const header = document.getElementById('app-header');
            if (header) {
                this.makeDraggable(widgetContainer, header);
            }
            this.makeDraggable(widgetContainer, fab);
            setupButtons(); // Re-assign buttons after initial render
            if (window.feather) window.feather.replace();
        }, 500);

        // 6. Global Visibility based on WPP connection
        whatsappService.onSessionStatusChange((status) => {
            if (status.status === 'CONNECTED') {
                widgetContainer.classList.remove('hidden');
            } else {
                widgetContainer.classList.add('hidden');
                chatWindow.classList.add('hidden');
                fab.style.display = 'flex';
            }
        });

        // Click FAB to open
        fab.onclick = () => {
            if (!this.wasDragging) this.toggleWindow();
        };
    },

    toggleWindow() {
        if (!chatWindow) return;
        const fab = document.getElementById('whatsapp-fab');

        if (chatWindow.classList.contains('hidden')) {
            chatWindow.classList.remove('hidden');
            fab.style.display = 'none';
        } else {
            chatWindow.classList.add('hidden');
            fab.style.display = 'flex';
        }
    },

    makeDraggable(elmnt, handle) {
        let startX, startY;
        let initialBottom, initialRight;
        this.wasDragging = false;

        const onMouseDown = (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('button') || e.target.closest('input')) return;

            const rect = elmnt.getBoundingClientRect();
            initialBottom = window.innerHeight - rect.bottom;
            initialRight = window.innerWidth - rect.right;

            startX = e.clientX;
            startY = e.clientY;
            this.wasDragging = false;

            const onMouseMove = (ev) => {
                const dx = startX - ev.clientX;
                const dy = startY - ev.clientY;

                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    this.wasDragging = true;
                }

                let newBottom = initialBottom + dy;
                let newRight = initialRight + dx;

                // Simple constraints
                newBottom = Math.max(0, Math.min(newBottom, window.innerHeight - 100));
                newRight = Math.max(0, Math.min(newRight, window.innerWidth - 100));

                elmnt.style.bottom = newBottom + 'px';
                elmnt.style.right = newRight + 'px';
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        handle.onmousedown = onMouseDown;
    },

    // Bridge for external calls (like opening chat for a specific client)
    async openChat(phone, name, prefilledText = '') {
        // Show window if hidden
        if (chatWindow.classList.contains('hidden')) this.toggleWindow();

        // Use Global Helper to select chat (defined in WhatsAppCore.js)
        if (window.SharedChat_Select) {
            window.SharedChat_Select(phone, name);
            if (prefilledText) {
                setTimeout(() => {
                    const input = document.getElementById('real-chat-input');
                    if (input) {
                        input.value = prefilledText;
                        input.focus();
                    }
                }, 500);
            }
        }
    },

    // Bridge for sending text messages
    async sendMessage(phone, text) {
        try {
            const chatId = await whatsappService.getOrCreateChat(phone, 'Cliente');
            return await whatsappService.sendMessage(chatId, text);
        } catch (e) {
            console.error('WhatsAppWidget: sendMessage error', e);
            throw e;
        }
    },

    // Bridge for sending media (PDFs, Images)
    async sendMedia(phone, filename, base64, caption = '') {
        try {
            const chatId = await whatsappService.getOrCreateChat(phone, 'Cliente');
            return await whatsappService.sendMedia(chatId, base64, filename, caption);
        } catch (e) {
            console.error('WhatsAppWidget: sendMedia error', e);
            throw e;
        }
    }
};
