#!/bin/bash

# 1. Atualizar Sistema e Instalar Dependências
apt-get update
apt-get install -y docker.io docker-compose nginx certbot python3-certbot-nginx git curl

# 2. Configurar Diretório da Aplicação
mkdir -p /opt/unitech-whatsapp
cd /opt/unitech-whatsapp

# 3. Criar Arquivos da Aplicação (Injetados via Script)

# package.json
cat << 'EOF' > package.json
{
  "name": "unitech-whatsapp-cloud",
  "version": "2.0.0",
  "description": "Servidor WhatsApp Multi-Tenant Otimizado",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "latest",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "pino": "^8.15.0",
    "qrcode": "^1.5.3"
  }
}
EOF

# Dockerfile
cat << 'EOF' > Dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++ git
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
VOLUME ["/usr/src/app/auth_sessions"]
EXPOSE 8080
CMD ["npm", "start"]
EOF

# server.js (Código Completo Otimizado)
cat << 'EOF' > server.js
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

    sessions.set(sessionId, { socket: sock, qr: null, status: 'INITIALIZING' });

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
            console.log(`[${sessionId}] Conexão fechada. Reconectar: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                session.status = 'RECONNECTING';
                setTimeout(() => startSession(sessionId), 3000);
            } else {
                session.status = 'DISCONNECTED';
                sessions.delete(sessionId);
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] CONECTADO`);
            if (session) {
                session.status = 'CONNECTED';
                session.qr = null;
                session.user = sock.user;
            }
        }
    });
}

// Rotas API
app.post('/session/start', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId necessario' });
    if (sessions.has(sessionId) && sessions.get(sessionId).status === 'CONNECTED') {
        return res.json({ status: 'ALREADY_CONNECTED' });
    }
    await startSession(sessionId);
    res.json({ status: 'STARTING' });
});

app.get('/session/status/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) return res.status(404).json({ status: 'NOT_FOUND' });
    res.json({ status: session.status, qr: session.qr, user: session.user });
});

app.post('/session/send', async (req, res) => {
    const { sessionId, to, message } = req.body;
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED') return res.status(503).json({ error: 'Offline' });

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        await session.socket.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enviar Mídia (PDF/Imagem) - Base64
app.post('/session/send-media', async (req, res) => {
    const { sessionId, to, media, filename, caption } = req.body;

    if (!sessionId || !to || !media) return res.status(400).json({ error: 'Dados incompletos' });

    const session = sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED') return res.status(503).json({ error: 'Offline' });

    try {
        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        const sock = session.socket;

        // Extrair Base64 limpo
        const cleanBase64 = media.includes('base64,') ? media.split('base64,')[1] : media;
        const buffer = Buffer.from(cleanBase64, 'base64');

        let msgPayload;
        const lowerFile = (filename || '').toLowerCase();
        const isImage = lowerFile.endsWith('.jpg') || lowerFile.endsWith('.jpeg') || lowerFile.endsWith('.png');

        if (isImage) {
            msgPayload = { image: buffer, caption: caption };
        } else {
            msgPayload = { document: buffer, mimetype: 'application/pdf', fileName: filename || 'doc.pdf', caption: caption };
        }

        const sentMsg = await sock.sendMessage(jid, msgPayload);
        res.json({ success: true, id: sentMsg.key.id });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.send('UniTech Cloud Running'));

// Recuperar sessões salvas
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR);
fs.readdir(AUTH_DIR, (err, files) => {
    if (!err) files.forEach(f => {
        if(fs.statSync(path.join(AUTH_DIR, f)).isDirectory()) startSession(f);
    });
});

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
EOF

# 4. Criar docker-compose.yml
cat << 'EOF' > docker-compose.yml
version: '3'
services:
  app:
    build: .
    restart: always
    ports:
      - "8080:8080"
    volumes:
      - ./auth_sessions:/usr/src/app/auth_sessions
EOF

# 5. Iniciar Aplicação
docker-compose up -d --build

# 6. Configurar Nginx (Proxy Reverso)
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Reiniciar Nginx para aplicar configs
systemctl restart nginx

# Mensagem de Conclusão no Log do GCP
echo "UniTech WhatsApp Server instalado com sucesso!"
