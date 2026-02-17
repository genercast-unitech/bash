const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const sessions = new Map();
const AUTH_DIR = path.join(__dirname, 'auth_sessions');
const logger = pino({ level: 'silent' });

// Simple In-Memory Store Implementation
const makeSimpleStore = () => {
    const chats = new Map();
    const messages = new Map();
    const contacts = new Map();

    const bind = (ev) => {
        ev.on('chats.set', ({ chats: newChats }) => {
            for (const chat of newChats) {
                const existing = chats.get(chat.id) || {};
                chats.set(chat.id, { ...existing, ...chat });
            }
            saveStore();
        });

        ev.on('chats.upsert', (newChats) => {
            for (const chat of newChats) {
                const existing = chats.get(chat.id) || {};
                chats.set(chat.id, { ...existing, ...chat });
            }
            saveStore();
        });

        ev.on('chats.update', (updates) => {
            for (const update of updates) {
                const existing = chats.get(update.id);
                if (existing) {
                    Object.assign(existing, update);
                }
            }
            saveStore();
        });

        ev.on('contacts.upsert', (newContacts) => {
            for (const contact of newContacts) {
                contacts.set(contact.id, contact);
            }
            saveStore();
        });

        ev.on('messaging-history.set', ({ chats: newChats, contacts: newContacts, messages: newMessages, isLatest }) => {
            console.log(`[Store] Receiving history: ${newChats.length} chats, ${newMessages.length} messages`);
            for (const chat of newChats) {
                const existing = chats.get(chat.id) || {};
                chats.set(chat.id, { ...existing, ...chat });
            }
            for (const contact of newContacts) {
                contacts.set(contact.id, contact);
            }
            for (const msg of newMessages) {
                const jid = msg.key.remoteJid;
                if (!messages.has(jid)) messages.set(jid, []);
                const list = messages.get(jid);
                if (!list.find(m => m.key.id === msg.key.id)) {
                    list.push(msg);
                }
            }
            saveStore();
        });

        ev.on('messages.upsert', (upsert) => {
            const { messages: newMessages, type } = upsert;
            if (type === 'append' || type === 'notify') {
                for (const msg of newMessages) {
                    const jid = msg.key.remoteJid;
                    if (!jid) continue;

                    if (!messages.has(jid)) messages.set(jid, []);
                    const list = messages.get(jid);
                    if (!list.find(m => m.key.id === msg.key.id)) {
                        list.push(msg);
                    }

                    const chat = chats.get(jid);
                    if (chat) {
                        chat.conversationTimestamp = msg.messageTimestamp;
                    } else {
                        chats.set(jid, { id: jid, conversationTimestamp: msg.messageTimestamp });
                    }
                }
                saveStore();
            }
        });
    };

    return {
        chats,
        messages,
        contacts,
        bind,
        getChats: () => Array.from(chats.values()).sort((a, b) => (b.conversationTimestamp || 0) - (a.conversationTimestamp || 0)),
        getMessages: (jid) => messages.get(jid) || []
    };
};

const store = makeSimpleStore();
const STORE_FILE = path.join(__dirname, 'sessions.json');

const loadStore = () => {
    try {
        if (fs.existsSync(STORE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
            if (data.chats) data.chats.forEach(c => store.chats.set(c.id, c));
            if (data.contacts) data.contacts.forEach(c => store.contacts.set(c.id, c));
            if (data.messages) {
                Object.keys(data.messages).forEach(jid => {
                    store.messages.set(jid, data.messages[jid]);
                });
            }
            console.log(`[Store] Loaded ${store.chats.size} chats from disk.`);
        }
    } catch (e) { console.error('[Store] Load error:', e); }
};

const saveStore = () => {
    try {
        const data = {
            chats: Array.from(store.chats.values()),
            contacts: Array.from(store.contacts.values()),
            messages: Object.fromEntries(store.messages)
        };
        fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error('[Store] Save error:', e); }
};

// Auto-save every 30s
setInterval(saveStore, 30000);

loadStore();

async function startSession(sessionId) {
    const sessionDir = path.join(AUTH_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: ["UniTech Cloud", "Chrome", "1.0.0"],
        syncFullHistory: true, // Enable to get real conversation list
        generateHighQualityLinkPreview: true,
    });

    store.bind(sock.ev);

    sessions.set(sessionId, {
        socket: sock,
        qr: null,
        status: 'INITIALIZING'
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const session = sessions.get(sessionId);

        if (qr) {
            try {
                const url = await qrcode.toDataURL(qr);
                if (session) {
                    session.qr = url;
                    session.status = 'QR_READY';
                }
            } catch (err) {
                console.error('QR Error:', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log(`[${sessionId}] Close. Reconnect: ${shouldReconnect}`);

            if (shouldReconnect) {
                if (session) session.status = 'RECONNECTING';
                setTimeout(() => startSession(sessionId), 3000);
            } else {
                if (session) session.status = 'DISCONNECTED';
                sessions.delete(sessionId);
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] CONNECTED`);
            if (session) {
                session.status = 'CONNECTED';
                session.qr = null;
                session.user = sock.user;
            }
        }
    });

    // Webhooks / Listeners could go here
}

app.post('/session/start', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    if (sessions.has(sessionId) && sessions.get(sessionId).status === 'CONNECTED') {
        return res.json({ status: 'ALREADY_CONNECTED' });
    }

    try {
        await startSession(sessionId);
        res.json({ status: 'STARTING' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/session/status/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ status: 'NOT_FOUND' });
    res.json({
        sessionId: req.params.sessionId,
        status: session.status,
        qr: session.qr,
        user: session.user
    });
});

app.get('/session/:sessionId/chats', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session || session.status !== 'CONNECTED') return res.status(503).json({ error: 'Not connected' });

    const chats = store.getChats();
    const enhanced = chats.map(c => {
        const contact = store.contacts.get(c.id);
        return {
            ...c,
            name: contact?.name || contact?.notify || c.name || c.id.split('@')[0]
        };
    });
    res.json({ chats: enhanced });
});

app.get('/session/:sessionId/messages/:jid', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session || session.status !== 'CONNECTED') return res.status(503).json({ error: 'Not connected' });

    const jid = req.params.jid;
    const limit = parseInt(req.query.limit) || 50;
    const msgs = store.getMessages(jid).slice(-limit);
    res.json({ messages: msgs });
});

app.post('/session/send', async (req, res) => {
    const { sessionId, to, message } = req.body;
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED') return res.status(503).json({ error: 'Not connected' });

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        const sent = await session.socket.sendMessage(jid, { text: message });
        res.json({ success: true, id: sent.key.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/session/send-media', async (req, res) => {
    const { sessionId, to, media, filename, caption } = req.body;
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED') return res.status(503).json({ error: 'Not connected' });

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        const matches = media.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            // Fallback for raw base64 without prefix if needed, or error
            // Try to just take it as buffer if no prefix found (old behavior fallback)
            const buffer = Buffer.from(media, 'base64');
            await session.socket.sendMessage(jid, { document: buffer, fileName: filename || 'file', caption });
            return res.json({ success: true, warning: 'Raw base64 used' });
        }

        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        let payload = {};
        if (type.startsWith('image/')) {
            payload = { image: buffer, caption: caption };
        } else if (type.startsWith('video/')) {
            payload = { video: buffer, caption: caption };
        } else if (type.startsWith('audio/')) {
            payload = { audio: buffer, mimetype: type, ptt: true };
        } else {
            payload = { document: buffer, mimetype: type, fileName: filename, caption: caption };
        }

        const sent = await session.socket.sendMessage(jid, payload);
        res.json({ success: true, id: sent.key.id });
    } catch (error) {
        console.error('Send Media Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.send('UniTech WhatsApp Cloud Server v2.1 (Chat Store Enabled)'));

// Auto-start existing sessions
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR);
fs.readdir(AUTH_DIR, (err, files) => {
    if (!err) {
        files.forEach(file => {
            const stats = fs.statSync(path.join(AUTH_DIR, file));
            if (stats.isDirectory()) startSession(file);
        });
    }
});

app.listen(PORT, () => console.log(`Cloud Server running on port ${PORT}`));
