const { app, BrowserWindow, Tray, Menu, Notification } = require('electron');
const path = require('path');
const { startServer } = require('./server-logic.js');

let tray = null;
let win = null;
let isQuitting = false;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });

    app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe')
    });

    function createSimpleWindow() {
        win = new BrowserWindow({
            width: 400,
            height: 550,
            resizable: false,
            autoHideMenuBar: true,
            webPreferences: { nodeIntegration: true }
        });

        win.loadURL(`data:text/html,
            <html>
                <style>
                    body { background: #0f172a; color: white; font-family: 'Segoe UI', sans-serif; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .status-box { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 20px; padding: 30px; margin-bottom: 20px; }
                    .status-icon { background: #22c55e; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; }
                    h1 { font-size: 20px; font-weight: 800; margin: 0; }
                    p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin-top: 10px; }
                    .tray-info { font-size: 11px; color: #475569; margin-top: 40px; text-transform: uppercase; letter-spacing: 1px; }
                </style>
                <body>
                    <div class="status-box">
                        <div class="status-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <h1>CONECTADO AO UNITECH</h1>
                        <p>Tudo pronto! Você já pode enviar mensagens pelo seu sistema web.</p>
                    </div>
                    <p class="tray-info">Rodando em segundo plano</p>
                </body>
            </html>
        `);

        win.on('close', (event) => {
            if (!isQuitting) {
                event.preventDefault();
                win.hide();
                return false;
            }
        });
    }

    app.whenReady().then(() => {
        createSimpleWindow();
        startServer();

        // Removi a referência ao ícone para o build básico funcionar
        tray = new Tray(path.join(__dirname, 'main.js')); // Temporário, bandeja usará o ícone do sistema
        const contextMenu = Menu.buildFromTemplate([
            { label: 'UniTech: Ativo', enabled: false },
            { type: 'separator' },
            { label: 'Abrir Painel', click: () => win.show() },
            {
                label: 'Sair e Desligar', click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('UniTech Connector');
        tray.setContextMenu(contextMenu);

        new Notification({
            title: 'UniTech Conectado!',
            body: 'Seu WhatsApp já está pronto para uso.'
        }).show();
    });
}
