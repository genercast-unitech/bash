export class LocalWhatsappService {
    constructor() {
        // Agora aponta para o servidor Google Cloud
        this.baseUrl = 'http://34.171.111.211';
        this.sessionId = 'unitech_main'; // Sessão padrão
        this.status = 'SEARCHING';
        this.qrCode = null;
        this.listeners = [];
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb({
            status: this.status,
            qrCode: this.qrCode
        }));
    }

    async checkStatus() {
        try {
            // Verifica o status da sessão no servidor cloud
            const res = await fetch(`${this.baseUrl}/session/status/${this.sessionId}`);

            if (res.status === 404) {
                // Sessão não existe, inicia uma nova
                await this.startSession();
                this.status = 'INITIALIZING';
            } else {
                const data = await res.json();

                // Mapeia os status do servidor para o frontend
                if (data.status === 'CONNECTED') {
                    this.status = 'CONNECTED';
                    this.qrCode = null;
                } else if (data.status === 'QR_READY' && data.qr) {
                    this.status = 'QR_CODE';
                    this.qrCode = data.qr;
                } else {
                    this.status = 'INITIALIZING';
                }
            }
        } catch (err) {
            console.error('Erro de conexão com WhatsApp:', err);
            // Mantém como INITIALIZING para não mostrar "Instalar motor" erroneamente, 
            // ou MISSING se quisermos indicar erro grave
            this.status = 'MISSING';
        }
        this.notify();
    }

    async startSession() {
        // Evita flodar o servidor com startSession
        if (this._starting) return;
        this._starting = true;

        // Cooldown de 15 segundos antes de permitir tentar iniciar novamente
        setTimeout(() => { this._starting = false; }, 15000);

        try {
            await fetch(`${this.baseUrl}/session/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId })
            });
        } catch (e) {
            console.error('Falha ao iniciar sessão:', e);
            // Em caso de falha de rede imediata, libera mais cedo
            this._starting = false;
        }
    }

    // Mantido para compatibilidade, mas agora usa o endpoint correto
    async fetchQR() {
        // O QR Code já vem no checkStatus agora
        return;
    }

    async sendMessage(number, message) {
        try {
            const res = await fetch(`${this.baseUrl}/session/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    to: number,
                    message: message
                })
            });
            return await res.json();
        } catch (e) {
            return { success: false, error: 'Servidor Offline' };
        }
    }

    async sendMedia(number, mediaData, filename, caption) {
        try {
            const res = await fetch(`${this.baseUrl}/session/send-media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    to: number,
                    media: mediaData,
                    filename: filename,
                    caption: caption
                })
            });
            if (!res.ok) {
                const text = await res.text();
                console.error('[LocalConnector] Erro do servidor:', res.status, text);
                return { success: false, error: `Erro do Servidor (${res.status}): ${text}` };
            }
            return await res.json();
        } catch (e) {
            console.error('[LocalConnector] Erro ao enviar média:', e);
            return { success: false, error: `Erro de conexão: ${e.message}` };
        }
    }
}

export const localWhatsapp = new LocalWhatsappService();
