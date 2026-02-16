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
        browser: ["UniTech Power Server", "Chrome", "1.0.0"],
        syncFullHistory: false,
        generateHighQualityLinkPreview: true,
    });

    // Update map immediately
    sessions.set(sessionId, { socket: sock, qr: null, status: 'INITIALIZING' });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => { // Async to await qrcode
        const { connection, lastDisconnect, qr } = update;

        // Always get the CURRENT session object from map to avoid stale closures
        // If startSession was called again, we might be updating a dead socket's session, 
        // but we should update the map if this socket is the active one.
        const session = sessions.get(sessionId);

        if (qr) {
            console.log(`[${sessionId}] QR Code received`);
            try {
                // Generate QR Data URL
                const url = await qrcode.toDataURL(qr);
                if (session && session.socket === sock) { // Verify this socket is still the active one
                    session.qr = url;
                    session.qrRaw = qr;
                    session.status = 'QR_READY';
                    console.log(`[${sessionId}] QR Code generated and stored`);
                }
            } catch (err) {
                console.error(`[${sessionId}] QR Generation failed:`, err);
                if (session && session.socket === sock) {
                    session.qrRaw = qr; // Fallback
                    session.status = 'QR_READY';
                }
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log(`[${sessionId}] Connection closed. Reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                if (session && session.socket === sock) session.status = 'RECONNECTING';
                // Slight delay to prevent localized loop, but Baileys handles reconnect internally often?
                // Actually Baileys requires new socket for logic. 
                // We should NOT call startSession immediately if we want to avoid race conditions.
                // But we must.
                setTimeout(() => startSession(sessionId), 3000);
            } else {
                if (session && session.socket === sock) {
                    session.status = 'DISCONNECTED';
                    sessions.delete(sessionId);
                    // Optionally clear files
                    // fs.rmSync(sessionDir, { recursive: true, force: true });
                }
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] CONNECTED`);
            if (session && session.socket === sock) {
                session.status = 'CONNECTED';
                session.qr = null;
                session.user = sock.user;
            }
        }
    });
}

app.post('/session/start', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const existing = sessions.get(sessionId);
    // CRITICAL FIX: Do not restart if already initializing or waiting for QR
    if (existing) {
        if (['CONNECTED', 'INITIALIZING', 'QR_READY', 'RECONNECTING'].includes(existing.status)) {
            console.log(`[${sessionId}] Session already exists in state ${existing.status}, ignoring start request.`);
            return res.json({ status: existing.status, message: 'Session already active' });
        }
    }

    await startSession(sessionId);
    res.json({ status: 'STARTING' });
});

app.get('/session/status/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ status: 'NOT_FOUND' });
    res.json({
        status: session.status,
        qr: session.qr,
        qrRaw: session.qrRaw,
        user: session.user
    });
});

app.post('/session/send', async (req, res) => {
    const { sessionId, to, message } = req.body;
    const session = sessions.get(sessionId);
    // CRITICAL: Ensure we check correct session map object
    if (!session || !session.socket || session.status !== 'CONNECTED') {
        return res.status(503).json({ error: 'Session not connected' });
    }

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        await session.socket.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (error) {
        console.error('Send Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/session/send-media', async (req, res) => {
    const { sessionId, to, media, caption, filename } = req.body;
    // media is expected to be base64 string

    const session = sessions.get(sessionId);
    if (!session || !session.socket || session.status !== 'CONNECTED') {
        return res.status(503).json({ error: 'Session not connected' });
    }

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;

        // Basic Base64 Cleanup
        const cleanBase64 = media.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, 'base64');

        await session.socket.sendMessage(jid, {
            image: buffer,
            caption: caption || '',
            fileName: filename || 'image.jpg'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Send Media Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.send('UniTech Cloud Running'));

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR);
// Restore sessions on boot? 
// Maybe logic here needs to be careful too.
fs.readdir(AUTH_DIR, (err, files) => {
    if (!err) files.forEach(f => {
        if (fs.statSync(path.join(AUTH_DIR, f)).isDirectory()) {
            // startSession(f); // Disable auto-start on boot for now to avoid loops, let frontend request it.
        }
    });
});

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
