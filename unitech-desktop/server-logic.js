const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

async function startServer() {
    // Import dinâmico necessário pois o Baileys agora é puro ESM
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await import('@whiskeysockets/baileys');

    const server = express();
    server.use(cors());
    server.use(express.json());

    const userDataPath = app.getPath('userData');
    const authPath = path.join(userDataPath, 'whatsapp-auth');
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    let qrCode = null;
    let isConnected = false;

    const connectToWhatsApp = async () => {
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) qrCode = qr;

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                isConnected = false;
                if (shouldReconnect) connectToWhatsApp();
            } else if (connection === 'open') {
                isConnected = true;
                qrCode = null;
            }
        });

        return sock;
    };

    let socket = await connectToWhatsApp();

    server.get('/status', (req, res) => {
        res.json({
            online: true,
            status: isConnected ? 'CONNECTED' : (qrCode ? 'QR_READY' : 'INITIALIZING')
        });
    });

    server.get('/qr', async (req, res) => {
        if (qrCode) {
            const code = await QRCode.toDataURL(qrCode);
            res.json({ qr: code });
        } else {
            res.json({ qr: null });
        }
    });

    server.post('/send-message', async (req, res) => {
        const { number, message } = req.body;
        if (!isConnected) return res.status(400).json({ success: false, error: 'WhatsApp não conectado' });

        try {
            const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
            await socket.sendMessage(jid, { text: message });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    server.listen(3000, () => console.log('Servidor rodando na porta 3000'));
}

module.exports = { startServer };
