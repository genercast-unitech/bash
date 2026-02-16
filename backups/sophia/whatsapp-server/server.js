const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

let client = null;
let currentStatus = 'DISCONNECTED';
let currentQRCode = null;
let retryCount = 0;
let wasConnected = false;
const MAX_RETRIES = 3;
const contactCache = {};

// Find chromium path
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

function killChrome() {
    try { execSync('pkill -9 -f chromium || true', { stdio: 'ignore' }); } catch (e) { }
    try { execSync('pkill -9 -f chrome || true', { stdio: 'ignore' }); } catch (e) { }
}

const startClient = async () => {
    if (currentStatus === 'INITIALIZING' || currentStatus === 'CONNECTED') return;

    if (retryCount >= MAX_RETRIES) {
        console.log(`Max ${MAX_RETRIES} tentativas. Use /start para tentar novamente.`);
        currentStatus = 'DISCONNECTED';
        return;
    }

    currentStatus = 'INITIALIZING';
    currentQRCode = null;
    retryCount++;
    console.log(`Tentativa ${retryCount}/${MAX_RETRIES}... Chromium: ${CHROMIUM_PATH}`);

    // Close existing client
    if (client) { try { await client.close(); } catch (e) { } client = null; }
    killChrome();

    // Clean up SingletonLock if it exists
    const lockPath = '/app/tokens/unitech-connection/SingletonLock';
    if (fs.existsSync(lockPath)) {
        try { fs.unlinkSync(lockPath); console.log('Lock file removed.'); } catch (e) { }
    }

    // Wait for Chrome to fully die
    await new Promise(r => setTimeout(r, 5000));

    wppconnect.create({
        session: 'unitech-connection',
        catchQR: (qr) => {
            currentQRCode = qr;
            currentStatus = 'QR_CODE';
            retryCount = 0;
            console.log('>>> QR CODE GERADO! <<<');
        },
        statusFind: (status) => {
            console.log('STATUS:', status);
            if (['connected', 'chatsAvailable'].includes(status)) {
                currentStatus = 'CONNECTED';
                currentQRCode = null;
                retryCount = 0;
                wasConnected = true;
                console.log('>>> CONECTADO! <<<');
                setTimeout(() => preloadContacts(), 5000);
            }
            // Auto-reconnect ONLY if we were previously connected
            if (['disconnectedMobile', 'deleteToken', 'desconnectedMobile'].includes(status)) {
                if (wasConnected) {
                    console.log('Desconectado pelo celular. Novo QR em 20s...');
                    currentStatus = 'DISCONNECTED';
                    client = null;
                    wasConnected = false;
                    killChrome();
                    try { fs.rmSync('/app/tokens/unitech-connection', { recursive: true, force: true }); } catch (e) { }
                    setTimeout(() => { retryCount = 0; startClient(); }, 20000);
                } else {
                    console.log('Status ' + status + ' durante inicializacao - aguardando QR...');
                }
            }
        },
        headless: true,
        useChrome: false,
        puppeteerOptions: {
            executablePath: CHROMIUM_PATH,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-software-rasterizer',
                '--no-first-run',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--js-flags=--max-old-space-size=256'
            ]
        },
        browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--no-first-run',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--js-flags=--max-old-space-size=256'
        ]
    }).then(c => {
        client = c;
        currentStatus = 'CONNECTED';
        retryCount = 0;
        console.log('>>> MOTOR PRONTO! <<<');
    }).catch(e => {
        console.error('ERRO MOTOR:', e.message);
        currentStatus = 'DISCONNECTED';
        client = null;
        killChrome();
        if (retryCount < MAX_RETRIES) {
            const delay = retryCount * 15000;
            console.log(`Retry em ${delay / 1000}s...`);
            setTimeout(() => startClient(), delay);
        }
    });
};

async function preloadContacts() {
    if (!client) return;
    try {
        const contacts = await client.getAllContacts();
        for (const c of contacts) {
            const phone = c.id?.user || c.id?._serialized?.split('@')[0];
            if (phone) {
                contactCache[phone] = {
                    name: c.pushname || c.name || c.shortName || c.formattedName || null,
                    photo: c.profilePicThumbObj?.imgFull || c.profilePicThumbObj?.img || null
                };
            }
        }
        console.log(`Cache: ${Object.keys(contactCache).length} contatos`);
    } catch (e) { console.error('Erro cache:', e.message); }
}

// === ENDPOINTS ===

app.get('/status', (req, res) => res.json({ status: currentStatus, qrCode: currentQRCode }));
app.get('/start', (req, res) => { retryCount = 0; startClient(); res.json({ ok: true }); });

// Chat list
app.get('/chats', async (req, res) => {
    if (!client || currentStatus !== 'CONNECTED') return res.json([]);
    try {
        const chats = await client.getAllChats();
        const result = chats
            .filter(c => !c.id?._serialized?.includes('broadcast') && !c.id?._serialized?.includes('status@'))
            .slice(0, 50)
            .map(c => {
                const phone = c.id?.user || '';
                const cached = contactCache[phone] || {};
                let name = c.name || c.contact?.name || c.contact?.pushname || cached.name;
                if (!name || name === phone) name = phone.length >= 10 ? '+' + phone : phone;
                const photo = c.contact?.profilePicThumbObj?.imgFull || c.contact?.profilePicThumbObj?.img || cached.photo || null;
                let lastMsg = '...';
                if (c.lastMessage) {
                    const lm = c.lastMessage;
                    const pfx = lm.fromMe ? 'Você: ' : '';
                    if (lm.type === 'chat') lastMsg = pfx + (lm.body || '');
                    else if (lm.type === 'image') lastMsg = pfx + '📷 Foto';
                    else if (lm.type === 'video') lastMsg = pfx + '🎥 Vídeo';
                    else if (lm.type === 'audio' || lm.type === 'ptt') lastMsg = pfx + '🎤 Áudio';
                    else if (lm.type === 'document') lastMsg = pfx + '📄 Arquivo';
                    else lastMsg = pfx + (lm.body || 'Mensagem');
                }
                return {
                    id: c.id._serialized, name, phone,
                    unreadCount: c.unreadCount || 0,
                    timestamp: c.t || 0, lastMessage: lastMsg,
                    lastMessageFromMe: c.lastMessage?.fromMe || false,
                    customerPhoto: photo
                };
            });
        result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        res.json(result);
    } catch (e) { res.json([]); }
});

// Messages
app.get('/chat/:phone/messages', async (req, res) => {
    if (!client) return res.json([]);
    try {
        const phone = decodeURIComponent(req.params.phone);
        const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@c.us`;
        const msgs = await client.getMessages(jid, { count: 40 }).catch(() => []);
        res.json(msgs.map(m => ({
            id: m.id, from: m.fromMe ? 'me' : 'other',
            text: m.body || m.caption || '',
            timestamp: m.t, type: m.type, ack: m.ack
        })));
    } catch (e) { res.json([]); }
});

// Mark as read
app.get('/chat/:phone/read', async (req, res) => {
    if (!client) return res.json({ ok: false });
    try {
        const phone = decodeURIComponent(req.params.phone);
        const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@c.us`;
        await client.sendSeen(jid);
        res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
});

// Send text
app.post('/send', async (req, res) => {
    try {
        const jid = req.body.phone.includes('@') ? req.body.phone : `${req.body.phone.replace(/\D/g, '')}@c.us`;
        await client.sendText(jid, req.body.message);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Send media
app.post('/send-media', async (req, res) => {
    try {
        const jid = req.body.phone.includes('@') ? req.body.phone : `${req.body.phone.replace(/\D/g, '')}@c.us`;
        await client.sendFile(jid, req.body.file, req.body.filename, req.body.message || '');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logout + auto-restart
app.get('/logout', async (req, res) => {
    if (client) { try { await client.logout(); await client.close(); } catch (e) { } client = null; }
    currentStatus = 'DISCONNECTED';
    currentQRCode = null;
    killChrome();
    try { fs.rmSync('/app/tokens/unitech-connection', { recursive: true, force: true }); } catch (e) { }
    setTimeout(() => { retryCount = 0; startClient(); }, 10000);
    res.json({ status: 'DISCONNECTED' });
});

app.listen(3001, () => {
    console.log('WhatsApp Unitech PRO v4 - Porta 3001');
    console.log('Chromium path:', CHROMIUM_PATH);
    startClient();
});
