const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const pino = require('pino');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let sock = null;
let qrCodeBase64 = null;
let connectionStatus = "INITIALIZING";

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ["UniTech Connector", "Chrome", "1.0.0"],
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            connectionStatus = "QR_READY";
            qrcode.toDataURL(qr, (err, url) => {
                qrCodeBase64 = url;
            });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            connectionStatus = "DISCONNECTED";
            qrCodeBase64 = null;
            if (shouldReconnect) {
                console.log('Reconectando motor...');
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            connectionStatus = "CONNECTED";
            qrCodeBase64 = null;
            console.log('>>> MOTOR UNITECH CONECTADO <<<');
        }
    });
}

// GUI Dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>UniTech Connector</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Plus Jakarta Sans', sans-serif; }
                .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
                @keyframes pulse-custom { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                .animate-pulse-custom { animation: pulse-custom 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            </style>
        </head>
        <body class="bg-[#050505] text-white min-h-screen flex items-center justify-center p-6 text-center">
            <div class="max-w-md w-full glass rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div class="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full"></div>
                <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/10 blur-[80px] rounded-full"></div>

                <div class="relative z-10">
                    <div class="w-16 h-16 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                        <svg viewBox="0 0 24 24" class="w-8 h-8 text-white fill-current"><path d="M12.011 20.29c-3.153 0-6.198-1.279-8.524-3.527L2 18.235V5.79h12.446l-1.472 1.47c2.327 2.247 3.606 5.292 3.606 8.445 0 3.153-1.279 6.198-3.527 8.524l1.472 1.472c2.247-2.326 3.527-5.371 3.527-8.524 0-3.153-1.279-6.198-3.527-8.524l-1.472 1.471c2.248 2.327 3.527 5.372 3.527 8.525 0 3.153-1.279 6.198-3.527 8.524l1.472 1.472Z"/></svg>
                    </div>

                    <h1 class="text-2xl font-extrabold tracking-tight mb-2">UniTech <span class="text-emerald-500">Connector</span></h1>
                    <p class="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-10">Motor de Mensageria Local v1.0</p>

                    <div id="status-container" class="space-y-8">
                        <div class="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 rounded-full w-fit mx-auto border border-white/5">
                            <div id="status-dot" class="w-2 h-2 rounded-full bg-slate-500 animate-pulse-custom"></div>
                            <span id="status-text" class="text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciando...</span>
                        </div>

                        <div id="qr-wrapper" class="hidden">
                            <div class="bg-white p-6 rounded-[2rem] shadow-2xl inline-block border-[10px] border-white ring-1 ring-black/5">
                                <img id="qr-image" src="" class="w-48 h-48">
                            </div>
                            <p class="mt-8 text-slate-400 text-xs font-medium">Escaneie o código acima com o seu WhatsApp</p>
                        </div>

                        <div id="connected-wrapper" class="hidden">
                            <div class="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                                <svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h2 class="text-xl font-bold text-white">Pronto para uso!</h2>
                            <p class="text-slate-500 text-xs mt-2 text-center">O seu sistema UniTech já pode enviar mensagens.</p>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                async function update() {
                    try {
                        const statusRes = await fetch('/status');
                        const statusData = await statusRes.json();
                        
                        const dot = document.getElementById('status-dot');
                        const text = document.getElementById('status-text');
                        const qrWrap = document.getElementById('qr-wrapper');
                        const connWrap = document.getElementById('connected-wrapper');
                        const qrImg = document.getElementById('qr-image');

                        text.innerText = statusData.status.replace('_', ' ');
                        
                        if (statusData.status === 'CONNECTED') {
                            dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
                            qrWrap.classList.add('hidden');
                            connWrap.classList.remove('hidden');
                        } else if (statusData.status === 'QR_READY') {
                            dot.className = 'w-2 h-2 rounded-full bg-orange-500 animate-pulse-custom';
                            const qrRes = await fetch('/qr');
                            const qrData = await qrRes.json();
                            if (qrData.qr) {
                                qrImg.src = qrData.qr;
                                qrWrap.classList.remove('hidden');
                                connWrap.classList.add('hidden');
                            }
                        } else {
                            dot.className = 'w-2 h-2 rounded-full bg-slate-500 animate-pulse-custom';
                            qrWrap.classList.add('hidden');
                            connWrap.classList.add('hidden');
                        }
                    } catch (e) { console.error(e); }
                }
                setInterval(update, 2000);
                update();
            </script>
        </body>
        </html>
    `);
});

app.get('/status', (req, res) => {
    res.json({ online: true, status: connectionStatus });
});

app.get('/qr', (req, res) => {
    res.json({ qr: qrCodeBase64 });
});

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    if (!sock || connectionStatus !== 'CONNECTED') {
        return res.status(500).json({ success: false, error: 'Motor Offline' });
    }

    try {
        const jid = number.includes('@') ? number : `${number.replace(/\D/g, '')}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Motor UniTech v1.0 rodando na porta ${PORT}`);
    connectToWhatsApp();
});
