
import { db } from '../../../firebase.js';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDoc, serverTimestamp, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { storage } from '../../../services/storage.js';

class WhatsappService {
    constructor() {
        this.storeId = storage.getCurrentTenantId() || 'gener-cell@hotmail.com';
        this.status = 'DISCONNECTED';
        this.listeners = [];
        this.currentQRCode = null;
        this.connectedNumber = null;
        this.statusInterval = null;

        // Remote Cloud API Configuration
        this.baseUrl = 'http://34.44.188.71:3001';

        // Inicia a verificação de status automática
        this.startStatusMonitoring();
    }

    startStatusMonitoring() {
        if (this.statusInterval) clearInterval(this.statusInterval);

        // Poll status every 5 seconds
        this.statusInterval = setInterval(() => {
            this.checkStatus();
        }, 5000);

        // Initial check
        this.checkStatus();
    }

    async checkStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            const data = await response.json();

            const oldStatus = this.status;
            this.status = data.status || 'DISCONNECTED';
            this.currentQRCode = data.qrCode;
            this.connectedNumber = data.connectedNumber;

            if (oldStatus !== this.status || this.currentQRCode) {
                this.notifyListeners({
                    status: this.status,
                    qrCode: this.currentQRCode,
                    number: this.connectedNumber
                });
            }
        } catch (err) {
            if (this.status !== 'OFFLINE') {
                this.status = 'OFFLINE';
                this.notifyListeners({ status: 'OFFLINE' });
            }
        }
    }

    async connectInstance() {
        try {
            this.status = 'STARTING';
            this.notifyListeners({ status: 'STARTING' });
            await fetch(`${this.baseUrl}/start?storeId=${this.storeId}`);
            this.checkStatus();
        } catch (err) {
            console.error('Falha ao conectar instância:', err);
        }
    }

    async disconnectInstance() {
        try {
            await fetch(`${this.baseUrl}/logout`);
            this.status = 'DISCONNECTED';
            this.currentQRCode = null;
            this.checkStatus();
        } catch (err) {
            console.error('Falha ao desconectar:', err);
        }
    }

    notifyListeners(data) {
        this.listeners.forEach(listener => {
            try {
                listener(data);
            } catch (err) {
                console.error('Error in listener', err);
            }
        });
    }

    onSessionStatusChange(callback) {
        this.listeners.push(callback);
        // Send current state
        callback({
            status: this.status,
            qrCode: this.currentQRCode,
            connectedNumber: this.connectedNumber
        });
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // --- Firestore Data Methods ---

    getRecentChats(callback) {
        const chatsRef = collection(db, 'whatsapp_chats');
        const q = query(chatsRef, where('storeId', '==', this.storeId));

        return onSnapshot(q, (snapshot) => {
            const chats = [];
            snapshot.forEach((doc) => {
                chats.push({ id: doc.id, ...doc.data() });
            });
            chats.sort((a, b) => {
                const tA = a.updatedAt?.toMillis() || 0;
                const tB = b.updatedAt?.toMillis() || 0;
                return tB - tA;
            });
            callback(chats);
        });
    }

    async getOrCreateChat(customerPhone, customerName) {
        const chatId = `${this.storeId}_${customerPhone}`;
        const chatRef = doc(db, 'whatsapp_chats', chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                storeId: this.storeId,
                customerPhone,
                customerName,
                status: 'OPEN',
                messages: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
        return chatId;
    }

    // --- Messaging (Via Cloud API) ---

    async getLiveChats() {
        if (this.status !== 'CONNECTED') return [];
        try {
            const response = await fetch(`${this.baseUrl}/chats`);
            if (!response.ok) return [];
            return await response.json();
        } catch (err) {
            console.error('Erro ao buscar chats ao vivo:', err);
            return [];
        }
    }

    async getLiveMessages(chatId) {
        if (this.status !== 'CONNECTED') return [];
        const phone = chatId.includes('_') ? chatId.split('_')[1] : chatId;
        try {
            const response = await fetch(`${this.baseUrl}/chat/${encodeURIComponent(phone)}/messages`);
            if (!response.ok) return [];
            return await response.json();
        } catch (err) {
            console.error('Erro ao buscar mensagens ao vivo:', err);
            return [];
        }
    }

    async markAsRead(chatId) {
        if (this.status !== 'CONNECTED') return;
        const phone = chatId.includes('_') ? chatId.split('_')[1] : chatId;
        try {
            await fetch(`${this.baseUrl}/chat/${encodeURIComponent(phone)}/read`);
        } catch (err) {
            console.error('Erro ao marcar como lida:', err);
        }
    }

    async sendMessage(chatId, text) {
        if (!chatId || !text) return;
        const phone = chatId.includes('_') ? chatId.split('_')[1] : chatId;

        try {
            const response = await fetch(`${this.baseUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, message: text })
            });

            if (!response.ok) throw new Error('API_ERROR');
            const result = await response.json();
            // Notify listeners that a message was sent
            this._messageSentListeners.forEach(cb => { try { cb(chatId); } catch (e) { } });
            return result;
        } catch (err) {
            console.error('Erro ao enviar mensagem:', err);
            throw err;
        }
    }

    async sendMedia(chatId, fileBase64, filename, caption = '') {
        const phone = chatId.includes('_') ? chatId.split('_')[1] : chatId;
        try {
            const response = await fetch(`${this.baseUrl}/send-media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, file: fileBase64, filename, message: caption })
            });
            if (!response.ok) throw new Error('API_ERROR');
            const result = await response.json();
            // Notify listeners that a message was sent
            this._messageSentListeners.forEach(cb => { try { cb(chatId); } catch (e) { } });
            return result;
        } catch (err) {
            console.error('Erro ao enviar mídia:', err);
            throw err;
        }
    }

    // Message sent event system
    _messageSentListeners = [];

    onMessageSent(callback) {
        this._messageSentListeners.push(callback);
        return () => {
            this._messageSentListeners = this._messageSentListeners.filter(l => l !== callback);
        };
    }

    onChatUpdate(chatId, callback) {
        if (!chatId) return () => { };
        const chatRef = doc(db, 'whatsapp_chats', chatId);
        return onSnapshot(chatRef, (doc) => {
            if (doc.exists()) callback(doc.data());
        });
    }

    getMessages(chatId, callback) {
        if (!chatId) return () => { };
        const chatRef = doc(db, 'whatsapp_chats', chatId);
        return onSnapshot(chatRef, (doc) => {
            if (doc.exists()) callback(doc.data().messages || []);
            else callback([]);
        });
    }

    parseTimestamp(t) {
        if (!t) return 0;
        if (typeof t === 'number') return t < 3000000000 ? t * 1000 : t;
        if (typeof t === 'string') return new Date(t).getTime();
        if (t.toMillis) return t.toMillis();
        if (t.seconds) return t.seconds * 1000;
        return new Date(t).getTime() || 0;
    }
}

export const whatsappService = new WhatsappService();
window.whatsappService = whatsappService;
