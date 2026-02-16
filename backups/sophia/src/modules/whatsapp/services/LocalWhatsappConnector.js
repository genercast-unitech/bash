// src/modules/whatsapp/services/LocalWhatsappConnector.js

class LocalWhatsappConnector {
    constructor(apiKey = "UNITECH_SECRET_TOKEN_123") {
        this.apiKey = apiKey;
        this.socket = null;
        this.status = 'DISCONNECTED';
        this.qrCode = null;
        this.listeners = new Set();
        this.reconnectTimer = null;
    }

    connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('[LOCAL-WA] Conectando ao agente local...');

        try {
            this.socket = new WebSocket(`ws://127.0.0.1:8080?apiKey=${this.apiKey}`);

            this.socket.onopen = () => {
                console.log('[LOCAL-WA] Conectado ao agente local com sucesso.');
                if (this.reconnectTimer) {
                    clearInterval(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    this.handleMessage(payload);
                } catch (e) {
                    console.error('[LOCAL-WA] Erro ao processar mensagem do agente:', e);
                }
            };

            this.socket.onclose = () => {
                this.status = 'DISCONNECTED';
                this.notifyListeners({ status: 'DISCONNECTED', qrCode: null });
                this.startReconnection();
            };

            this.socket.onerror = (err) => {
                // Silencioso para não poluir o console se o agente não estiver rodando
            };
        } catch (e) {
            this.startReconnection();
        }
    }

    startReconnection() {
        if (!this.reconnectTimer) {
            this.reconnectTimer = setInterval(() => this.connect(), 5000);
        }
    }

    handleMessage(payload) {
        switch (payload.type) {
            case 'STATUS':
                this.status = payload.data;
                this.notifyListeners({ status: this.status });
                break;
            case 'QR_CODE':
                this.qrCode = payload.data;
                this.notifyListeners({ qrCode: this.qrCode });
                break;
            case 'NEW_MESSAGE':
                this.notifyListeners({ type: 'NEW_MESSAGE', data: payload.data });
                break;
            case 'ERROR':
                console.error('[LOCAL-WA] Erro do agente:', payload.message);
                break;
        }
    }

    startInstance() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'START' }));
        }
    }

    sendMessage(phone, text) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'SEND_MESSAGE',
                data: { to: phone, text: text }
            }));
            return true;
        }
        return false;
    }

    onUpdate(callback) {
        this.listeners.add(callback);
        // Envia estado atual imediatamente
        callback({ status: this.status, qrCode: this.qrCode });
        return () => this.listeners.delete(callback);
    }

    notifyListeners(data) {
        this.listeners.forEach(callback => {
            try { callback(data); } catch (e) { }
        });
    }
}

export const localWA = new LocalWhatsappConnector();
