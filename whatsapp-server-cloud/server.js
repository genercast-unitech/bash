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
app.use(express.json());

// Gerenciador de Sessões
// Estrutura: { [sessionId]: { socket: WASocket, qr: string, status: string } }
const sessions = new Map();

// Diretório de autenticação base
const AUTH_DIR = path.join(__dirname, 'auth_sessions');

// Utilitário de Logger
const logger = pino({ level: 'silent' });

/**
 * Inicia ou restaura uma sessão do WhatsApp
 * @param {string} sessionId - ID único da sessão (ex: 'loja1', 'suporte')
 */
async function startSession(sessionId) {
    const sessionDir = path.join(AUTH_DIR, sessionId);

    // Garante diretório de credenciais
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

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
        syncFullHistory: false, // Otimização para Cloud (menos memória)
        generateHighQualityLinkPreview: true,
    });

    // Armazena referência
    sessions.set(sessionId, {
        socket: sock,
        qr: null,
        status: 'INITIALIZING'
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        const session = sessions.get(sessionId);

        if (qr) {
            console.log(`[${sessionId}] QR Code recebido`);
            qrcode.toDataURL(qr, (err, url) => {
                if (session) {
                    session.qr = url;
                    session.status = 'QR_READY';
                }
            });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log(`[${sessionId}] Conexão fechada. Reconectar: ${shouldReconnect}`, lastDisconnect?.error);

            if (shouldReconnect) {
                session.status = 'RECONNECTING';
                setTimeout(() => startSession(sessionId), 3000); // Backoff simples
            } else {
                session.status = 'DISCONNECTED';
                console.log(`[${sessionId}] Sessão encerrada (Logout).`);
                // Limpar dados de sessão se for logout real
                // fs.rmSync(sessionDir, { recursive: true, force: true });
                sessions.delete(sessionId);
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] CONECTADO COM SUCESSO!`);
            if (session) {
                session.status = 'CONNECTED';
                session.qr = null;
                session.user = sock.user;
            }
        }
    });

    // Tratamento de mensagens (Webhooks futuros)
    sock.ev.on('messages.upsert', async (m) => {
        // Lógica de webhook aqui se necessário
        // console.log(JSON.stringify(m, undefined, 2));
    });
}

// --- API ROUTES ---

// Iniciar uma nova sessão
app.post('/session/start', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId é obrigatório' });

    if (sessions.has(sessionId) && sessions.get(sessionId).status === 'CONNECTED') {
        return res.json({ status: 'ALREADY_CONNECTED', message: 'Sessão já está ativa.' });
    }

    try {
        await startSession(sessionId);
        res.json({ status: 'STARTING', message: `Iniciando sessão ${sessionId}...` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao iniciar sessão' });
    }
});

// Consultar Status e QR Code
app.get('/session/status/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ status: 'NOT_FOUND', message: 'Sessão não existe.' });
    }

    res.json({
        sessionId,
        status: session.status,
        qr: session.qr,
        user: session.user
    });
});

// Enviar Mídia (PDF/Imagem) - Base64
app.post('/session/send-media', async (req, res) => {
    const { sessionId, to, media, filename, caption } = req.body;

    if (!sessionId || !to || !media) return res.status(400).json({ error: 'Dados incompletos (sessionId, to, media)' });

    const session = sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED') {
        return res.status(503).json({ error: 'Sessão não conectada.' });
    }

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        const sock = session.socket;

        // Extrair Base64 limpo (remove prefixo data:image/png;base64, se houver)
        const cleanBase64 = media.includes('base64,') ? media.split('base64,')[1] : media;
        const buffer = Buffer.from(cleanBase64, 'base64');

        let msgPayload;
        // Detectar tipo pelo nome do arquivo ou assumir PDF se não for imagem
        const lowerFile = (filename || '').toLowerCase();
        const isImage = lowerFile.endsWith('.jpg') || lowerFile.endsWith('.jpeg') || lowerFile.endsWith('.png');

        if (isImage) {
            msgPayload = {
                image: buffer,
                caption: caption
            };
        } else {
            // Documento (PDF padrão)
            msgPayload = {
                document: buffer,
                mimetype: 'application/pdf',
                fileName: filename || 'documento.pdf',
                caption: caption
            };
        }

        const sentMsg = await sock.sendMessage(jid, msgPayload);
        res.json({ success: true, id: sentMsg.key.id });

    } catch (error) {
        console.error('Erro ao enviar mídia:', error);
        res.status(500).json({ error: 'Falha no envio de mídia', details: error.message });
    }
});

// Enviar Mensagem
app.post('/session/send', async (req, res) => {
    const { sessionId, to, message, imageUrl } = req.body;

    if (!sessionId || !to) return res.status(400).json({ error: 'Dados incompletos' });

    const session = sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED') {
        return res.status(503).json({ error: 'Sessão não conectada ou inexistente.' });
    }

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        const sock = session.socket;

        let sentMsg;
        if (imageUrl) {
            sentMsg = await sock.sendMessage(jid, {
                image: { url: imageUrl },
                caption: message
            });
        } else {
            sentMsg = await sock.sendMessage(jid, { text: message });
        }

        res.json({ success: true, id: sentMsg.key.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha no envio', details: error.message });
    }
});

// Listar todas as sessões
app.get('/sessions', (req, res) => {
    const activeSessions = [];
    sessions.forEach((val, key) => {
        activeSessions.push({
            id: key,
            status: val.status,
            user: val.user?.id
        });
    });
    res.json(activeSessions);
});

// Endpoint de Saúde para o Google Cloud (Health Check)
app.get('/', (req, res) => {
    res.send('UniTech WhatsApp Cloud Server v2.0 is Running');
});

// Inicialização Automática das Sessões Existentes
fs.readdir(AUTH_DIR, (err, files) => {
    if (!err) {
        files.forEach(file => {
            const stats = fs.statSync(path.join(AUTH_DIR, file));
            if (stats.isDirectory()) {
                console.log(`[AUTO-START] Restaurando sessão: ${file}`);
                startSession(file);
            }
        });
    } else {
        // Se não existir, cria
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor UniTech WhatsApp Cloud rodando na porta ${PORT}`);
});
