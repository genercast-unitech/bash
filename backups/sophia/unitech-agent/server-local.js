// server-local.js
import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

// --- CONFIGURAÇÃO ---
const AUTH_DIR = path.join(process.cwd(), 'auth_info');
const LOCAL_PORT = 8080;
const API_KEY = "UNITECH_SECRET_TOKEN_123"; // Segurança: Deve bater com o Front-end

const wss = new WebSocketServer({ port: LOCAL_PORT });
console.log(`
  🚀 Agente Unitech Local ATIVO
  ----------------------------------
  Porta: ${LOCAL_PORT}
  Auth: ${AUTH_DIR}
  Status: Aguardando Dashboard...
`);

let sock = null;
let currentQR = null;
let connectionStatus = 'DISCONNECTED';

// Cria pasta de auth se não existir
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function connectToWhatsApp() {
    console.log('[WPP] Iniciando conexão Baileys...');
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        markOnlineOnConnect: true,
        browser: ["Unitech SaaS", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('[WPP] Novo QR Code gerado.');
            currentQR = await QRCode.toDataURL(qr);
            broadcast({ type: 'QR_CODE', data: currentQR });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WPP] Conexão fechada. Reconectando: ${shouldReconnect}`);
            connectionStatus = 'DISCONNECTED';
            broadcast({ type: 'STATUS', data: 'DISCONNECTED' });
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ WhatsApp CONECTADO localmente!');
            connectionStatus = 'CONNECTED';
            currentQR = null;
            broadcast({ type: 'STATUS', data: 'CONNECTED' });
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (m.type === 'notify') {
            const msg = m.messages[0];
            if (!msg.key.fromMe) {
                broadcast({ type: 'NEW_MESSAGE', data: msg });
            }
        }
    });
}

function broadcast(payload) {
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(payload));
        }
    });
}

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const clientKey = url.searchParams.get('apiKey');

    if (clientKey !== API_KEY) {
        console.warn('⚠️ Tentativa de conexão não autorizada detectada.');
        ws.send(JSON.stringify({ type: 'ERROR', message: 'API Key inválida' }));
        ws.terminate();
        return;
    }

    console.log('🔌 Dashboard Unitech conectado ao agente local.');

    // Status imediato
    ws.send(JSON.stringify({ type: 'STATUS', data: connectionStatus }));
    if (currentQR) ws.send(JSON.stringify({ type: 'QR_CODE', data: currentQR }));

    ws.on('message', async (message) => {
        try {
            const command = JSON.parse(message);
            console.log(`[CMD] Recebido: ${command.type}`);

            if (command.type === 'START') {
                if (connectionStatus !== 'CONNECTED') connectToWhatsApp();
            }

            if (command.type === 'SEND_MESSAGE') {
                if (sock && connectionStatus === 'CONNECTED') {
                    const { to, text } = command.data;
                    const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
                    await sock.sendMessage(jid, { text });
                    console.log(`[MSG] Enviada para ${jid}`);
                }
            }
        } catch (e) {
            console.error('[ERR] Falha ao processar comando:', e.message);
        }
    });

    ws.on('close', () => console.log('🔌 Dashboard desconectado.'));
});
