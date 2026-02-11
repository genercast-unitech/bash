const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, updateDoc, arrayUnion, serverTimestamp, getDoc } = require('firebase/firestore');

// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyD1ptV9pDATbRmCq_tzumgek_4jelRrlWg",
    authDomain: "distunitech.firebaseapp.com",
    projectId: "distunitech",
    storageBucket: "distunitech.firebasestorage.app",
    messagingSenderId: "638084675410",
    appId: "1:638084675410:web:4042cbb9b4d3d9f8536c8b"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let client = null;
let currentQRCode = null;
let currentStatus = 'DISCONNECTED';
let connectedNumber = null;
let activeStoreId = 'gener-cell@hotmail.com'; // Default, updated on start

// --- FIRESTORE SYNC FUNCTIONS ---

async function syncMessageToFirestore(message) {
    if (!activeStoreId) return;

    // Extract info
    const isMe = message.fromMe;
    const remoteJid = String(message.chatId || message.from || '');
    const phone = remoteJid.split('@')[0];
    const pushName = message.sender?.pushname || message.notifyName || phone;
    const text = message.content || message.body || '';

    // Create Chat ID compatible with frontend: storeId_phone
    const chatId = `${activeStoreId}_${phone}`;
    const chatRef = doc(db, 'whatsapp_chats', chatId);

    // Profile Pic Logic
    let profilePicUrl = null;
    if (client && currentStatus === 'CONNECTED') {
        try {
            profilePicUrl = await client.getProfilePicFromServer(remoteJid).catch(() => null);
        } catch (e) { }
    }

    // Check if chat exists, if not create
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        await setDoc(chatRef, {
            storeId: activeStoreId,
            customerPhone: phone,
            customerName: pushName,
            customerPhoto: profilePicUrl,
            status: 'OPEN',
            claimedBy: null,
            messages: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: text
        });
    } else {
        const updateData = {
            updatedAt: serverTimestamp(),
            lastMessage: text
        };
        if (profilePicUrl) updateData.customerPhoto = profilePicUrl;
        await updateDoc(chatRef, updateData);
    }

    // Add Message
    const newMessage = {
        id: message.id,
        from: isMe ? 'me' : 'other',
        sender: isMe ? 'UniTech' : pushName,
        text: text,
        timestamp: new Date(message.timestamp * 1000).toISOString(),
        file: null // TODO: Handle media
    };

    await updateDoc(chatRef, {
        messages: arrayUnion(newMessage)
    });
}

// Initialize Client
const startClient = (storeId) => {
    if (storeId) activeStoreId = storeId;

    if (currentStatus !== 'DISCONNECTED') return;

    currentStatus = 'INITIALIZING';

    wppconnect.create({
        session: 'unitech-connection',
        catchQR: (base64Qr, asciiQR) => {
            console.log('[WPP] QR Code Received');
            currentQRCode = base64Qr;
            currentStatus = 'QR_CODE';
        },
        statusFind: (statusSession, session) => {
            console.log('[WPP] Status:', statusSession);
            if (['chatsAvailable', 'connected'].includes(statusSession)) {
                currentStatus = 'CONNECTED';
                currentQRCode = null;
            }
            if (statusSession === 'browserClose' || statusSession === 'autocloseCalled') {
                currentStatus = 'DISCONNECTED';
                client = null;
            }
        },
        headless: true,
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: true,
        browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
    })
        .then((wppClient) => {
            client = wppClient;
            currentStatus = 'CONNECTED'; // Force connected on success
            currentQRCode = null;

            const updateDeviceInfo = async () => {
                try {
                    const device = await client.getHostDevice();
                    connectedNumber = device.wid ? device.wid.user : 'Unknown';
                    console.log('[WPP] Connected as:', connectedNumber);

                    // Persistent sync to Firestore (Fixed: use setDoc with merge)
                    const sessionRef = doc(db, 'whatsapp_sessions', activeStoreId);
                    await setDoc(sessionRef, {
                        connectedNumber,
                        status: 'CONNECTED',
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                } catch (e) {
                    console.error('[WPP] Failed to sync device info:', e);
                    setTimeout(updateDeviceInfo, 5000);
                }
            };
            updateDeviceInfo();

            // Listen to messages
            client.onMessage(async (message) => {
                console.log('New Message:', message.from);
                await syncMessageToFirestore(message);
            });

            // Listen to outgoing messages (sent from phone)
            client.onAck(async (ack) => {
                // Optional: Handle message status updates
            });

            // Initial Sync (Fetch last 20 chats)
            syncRecentChats();
        })
        .catch((error) => {
            console.error('Error starting WPPConnect:', error);
            currentStatus = 'DISCONNECTED';
        });
};

async function syncRecentChats() {
    if (!client) return;
    try {
        console.log('Syncing recent chats...');
        const chats = await client.getAllChats();
        // Limit to 20 for perf
        const recent = chats.slice(0, 20);

        for (const chat of recent) {
            // Fetch last 10 messages
            const messages = await client.getMessages(chat.id._serialized, { count: 10 });

            console.log(`Syncing ${messages.length} messages for chat ${chat.id.user}`);

            // Sync all fetched messages to ensure history is populated
            for (const msg of messages) {
                await syncMessageToFirestore(msg);
            }
        }
        console.log('Initial sync complete.');
    } catch (e) {
        console.error('Sync Error:', e);
    }
}

// Endpoints
app.get('/start', (req, res) => {
    const storeId = req.query.storeId;
    startClient(storeId);
    res.json({ message: 'Initializing WPPConnect...' });
});

app.get('/status', (req, res) => {
    res.json({
        status: currentStatus,
        qrCode: currentQRCode,
        connectedNumber: connectedNumber
    });
});

app.get('/sync', async (req, res) => {
    if (!client || currentStatus !== 'CONNECTED') {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    syncRecentChats();
    res.json({ success: true, message: 'Sync process started' });
});

app.get('/chats', async (req, res) => {
    if (!client || currentStatus !== 'CONNECTED') {
        return res.status(503).json({ error: 'WhatsApp not connected', status: currentStatus });
    }
    try {
        const chats = await client.getAllChats();

        // Filter out garbage: status, broadcast, and unnamed groups that look like "numbers"
        const filtered = chats.filter(c => {
            if (c.id.user === 'status' || c.id.user === 'broadcast') return false;
            // Only show groups if they have a name, others are usually system garbage
            if (c.isGroup && !c.name && !c.contact?.name) return false;
            return true;
        });

        const safeChats = filtered.map(c => {
            let chatName = c.name || c.contact?.pushname || c.contact?.name;

            // If still no name and it's not a group, format as phone
            if (!chatName && !c.isGroup) {
                chatName = c.id.user;
                if (chatName.length >= 10) {
                    chatName = '+' + chatName;
                }
            } else if (!chatName) {
                chatName = 'Grupo sem nome';
            }

            // Try to find if we have a cached photo in Firestore for this phone
            let photo = c.contact?.profilePicThumbObj?.imgFull || null;

            let lastMsgText = '';
            if (c.lastMessage) {
                const lm = c.lastMessage;
                const isFromMe = lm.fromMe;
                const prefix = isFromMe ? 'Você: ' : '';

                if (lm.type === 'chat') {
                    lastMsgText = prefix + (lm.body || lm.content || '');
                } else if (lm.type === 'image') {
                    lastMsgText = prefix + '📷 Foto';
                } else if (lm.type === 'video') {
                    lastMsgText = prefix + '🎥 Vídeo';
                } else if (lm.type === 'document') {
                    lastMsgText = prefix + '📄 Arquivo';
                } else if (lm.type === 'audio' || lm.type === 'ptt') {
                    lastMsgText = prefix + '🎤 Áudio';
                } else if (lm.type === 'sticker') {
                    lastMsgText = prefix + '🎨 Figurinha';
                } else {
                    lastMsgText = prefix + (lm.body || lm.content || 'Mensagem');
                }
            }

            return {
                id: c.id._serialized,
                name: chatName,
                phone: c.id.user,
                unreadCount: c.unreadCount || 0,
                timestamp: c.t,
                lastMessage: lastMsgText || '...',
                lastMessageFromMe: c.lastMessage?.fromMe || false,
                lastMessageAck: c.lastMessage?.ack || 0,
                isGroup: c.isGroup,
                pinned: c.pinned || false,
                customerPhoto: photo
            };
        });

        // Sort by timestamp descending
        safeChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        res.json(safeChats);
    } catch (error) {
        console.error('[API] /chats error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/chat/:phone/messages', async (req, res) => {
    if (!client || currentStatus !== 'CONNECTED') {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    try {
        const { phone } = req.params;
        let chatId = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@c.us`;

        let messages = await client.getMessages(chatId, { count: 50 }).catch(() => []);

        // Robustness: if no messages and it's a Brazil number, try the 'other' ID format
        if (messages.length === 0 && chatId.startsWith('55') && !chatId.includes('@g.us')) {
            const user = chatId.split('@')[0];
            let altId = '';
            if (user.length === 13 && user[4] === '9') {
                // remove the '9' (55 + DD + 9 + ...)
                altId = user.slice(0, 4) + user.slice(5) + '@c.us';
            } else if (user.length === 12) {
                // add the '9' (55 + DD + ...)
                altId = user.slice(0, 4) + '9' + user.slice(4) + '@c.us';
            }
            if (altId) {
                const altMsgs = await client.getMessages(altId, { count: 50 }).catch(() => []);
                if (altMsgs.length > 0) messages = altMsgs;
            }
        }

        // In-memory media cache to avoid redundant downloads
        if (!global._wppMediaCache) global._wppMediaCache = new Map();

        const safeMessages = await Promise.all(messages.map(async (m) => {
            let mediaData = null;
            const downloadTypes = ['image', 'audio', 'ptt', 'video', 'document'];
            if (downloadTypes.includes(m.type)) {
                if (global._wppMediaCache.has(m.id)) {
                    mediaData = global._wppMediaCache.get(m.id);
                } else {
                    try {
                        const base64 = await client.downloadMedia(m.id);
                        if (base64) {
                            const mimetype = m.mimetype || (m.type === 'image' ? 'image/jpeg' : m.type === 'video' ? 'video/mp4' : 'audio/ogg');
                            mediaData = base64.startsWith('data:') ? base64 : `data:${mimetype};base64,${base64}`;
                            global._wppMediaCache.set(m.id, mediaData);
                            // Auto-clear cache after 10 mins to save memory
                            setTimeout(() => global._wppMediaCache.delete(m.id), 600000);
                        }
                    } catch (e) {
                        console.error(`[WPP] Error downloading media (${m.type}) for msg ${m.id}:`, e.message);
                    }
                }
            }

            return {
                id: m.id,
                from: m.fromMe ? 'me' : 'other',
                fromMe: m.fromMe,
                text: m.body || m.content || m.text || m.caption || '',
                timestamp: m.t || m.timestamp,
                type: m.type,
                ack: m.ack,
                mediaData: mediaData
            };
        }));
        res.json(safeMessages);
    } catch (error) {
        console.error(`[API] /messages error for ${req.params.phone}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/chat/:phone/read', async (req, res) => {
    if (!client || currentStatus !== 'CONNECTED') {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    try {
        const { phone } = req.params;
        let chatId = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@c.us`;
        await client.sendSeen(chatId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/contact/:phone/profile-pic', async (req, res) => {
    if (!client || currentStatus !== 'CONNECTED') {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    try {
        const { phone } = req.params;
        let chatId = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@c.us`;

        // Try getting from server first (highest quality)
        try {
            const url = await client.getProfilePicFromServer(chatId);
            if (url) return res.json({ url });
        } catch (e) {
            // Fallback to contact info
        }

        const contact = await client.getContact(chatId);
        res.json({ url: contact?.profilePicThumbObj?.imgFull || contact?.profilePicThumbObj?.img || null });
    } catch (error) {
        res.json({ url: null });
    }
});

// Helper to sanitize and validate phone numbers
const formatWhatsAppNumber = async (phone) => {
    if (!client || currentStatus !== 'CONNECTED') {
        throw new Error('STATUS_DISCONNECTED');
    }

    // 1. Basic Sanitization (Remove non-digits)
    let clean = phone.replace(/\D/g, '');

    // 2. Brazil Logic: If 10 or 11 digits (no country code), add 55
    if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
    }

    // Ensure it starts with 55 (UniTech requirement)
    if (!clean.startsWith('55') && clean.length >= 10) {
        clean = '55' + clean;
    }

    // 3. Validation (Similar to sock.onWhatsApp)
    try {
        const result = await client.checkNumberStatus(clean + '@c.us');

        if (result && result.numberExists) {
            return result.id._serialized || result.id;
        }

        // 4. Robustness for Brazil '9' prefix
        if (clean.startsWith('55')) {
            const ddd = clean.slice(2, 4);
            const body = clean.slice(4);
            let alt = '';

            if (body.length === 9 && body.startsWith('9')) {
                alt = '55' + ddd + body.slice(1); // remove 9
            } else if (body.length === 8) {
                alt = '55' + ddd + '9' + body; // add 9
            }

            if (alt) {
                const altResult = await client.checkNumberStatus(alt + '@c.us');
                if (altResult && altResult.numberExists) {
                    return altResult.id._serialized || altResult.id;
                }
            }
        }

        throw new Error('INVALID_WHATSAPP_NUMBER');
    } catch (e) {
        if (e.message === 'INVALID_WHATSAPP_NUMBER') throw e;
        throw new Error(`INTERNAL_RESOLVE_ERROR: ${e.message}`);
    }
};

app.post('/send', async (req, res) => {
    const { phone, message } = req.body;

    try {
        const jid = await formatWhatsAppNumber(phone);
        const result = await client.sendText(jid, message);
        res.json({ success: true, id: result.id });
    } catch (error) {
        console.error('[API] /send error:', error.message);
        const code = error.message === 'STATUS_DISCONNECTED' ? 503 : error.message === 'INVALID_WHATSAPP_NUMBER' ? 400 : 500;
        res.status(code).json({ error: error.message });
    }
});

app.post('/send-media', async (req, res) => {
    const { phone, file, filename, message } = req.body;

    if (!file || !filename) {
        return res.status(400).json({ error: 'Dados do arquivo incompletos.' });
    }

    try {
        const jid = await formatWhatsAppNumber(phone);
        console.log(`[WPP] Enviando mídia: ${filename} para ${jid}`);

        const result = await client.sendFile(jid, file, filename, message || '');
        res.json({ success: true, id: result.id });
    } catch (error) {
        console.error('[API] /send-media error:', error.message);
        const code = error.message === 'STATUS_DISCONNECTED' ? 503 : error.message === 'INVALID_WHATSAPP_NUMBER' ? 400 : 500;
        res.status(code).json({ error: error.message });
    }
});

app.get('/logout', async (req, res) => {
    if (client) {
        try {
            await client.logout();
            await client.close();
        } catch (e) { console.error(e); }
        client = null;
    }
    currentStatus = 'DISCONNECTED';
    currentQRCode = null;
    connectedNumber = null;
    res.json({ status: 'DISCONNECTED' });
});

app.listen(PORT, () => {
    console.log(`
  🚀 WhatsApp Backend Server running on http://localhost:${PORT}
  
  --> Server is ready. Initializing session...
  `);
    // Auto-start client on server launch
    startClient(activeStoreId);
});
