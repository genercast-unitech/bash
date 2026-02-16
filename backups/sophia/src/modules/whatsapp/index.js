
import { ConfigPanel } from './components/ConfigPanel.js';
import { WhatsAppWidget } from './components/Widget.js';
import './whatsapp.css';

export class WhatsAppModule {
    constructor() {
        this.cleanupToken = null;
        if (typeof document !== 'undefined') {
            window.WhatsAppWidget = WhatsAppWidget;
            setTimeout(() => {
                WhatsAppWidget.init();
            }, 1000);
        }
    }

    async init(containerId, params = {}) {
        if (this.cleanupToken) {
            this.cleanupToken();
            this.cleanupToken = null;
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div id="whatsapp-config-root" class="w-full h-full flex items-center justify-center p-4">
            </div>
        `;

        this.cleanupToken = ConfigPanel('whatsapp-config-root');
    }
}
