import { localWhatsapp } from './services/LocalConnector.js';
import { WhatsAppCore } from './components/WhatsAppCore.js';

export class WhatsAppModule {
    constructor() {
        this.containerId = null;
    }

    async init(containerId) {
        this.containerId = containerId;

        // EXPOSE GLOBAL SERVICE FOR COMPATIBILITY
        window.whatsappService = localWhatsapp;

        this.render();

        // Inicia a verificação contínua do motor local
        this.startMonitoring();
    }

    startMonitoring() {
        localWhatsapp.checkStatus();
        this.interval = setInterval(() => localWhatsapp.checkStatus(), 5000);
    }

    render() {
        const target = document.getElementById(this.containerId);
        if (!target) return;

        target.innerHTML = WhatsAppCore.template();

        // Ativa o primeiro check imediatamente para sair do "Verificando..."
        localWhatsapp.checkStatus();

        // Escuta mudanças de status para atualizar a tela
        localWhatsapp.addListener((state) => {
            WhatsAppCore.updateUI(state);
        });
    }

    destroy() {
        if (this.interval) clearInterval(this.interval);
    }
}
