const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Proxy para o servidor WhatsApp na VM Google Cloud
 * Redireciona chamadas HTTPS para HTTP da VM, evitando erros de Mixed Content
 */
exports.whatsapp = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
    // Endereço da VM GCP
    const VM_URL = 'http://34.171.111.211';

    // Constrói a URL de destino mantendo o caminho original
    // Remove /whatsapp do início se estiver presente (depende de como o Firebase roteia)
    // Na verdade, req.path já é o caminho relativo após a função
    const endpoint = req.path;
    const targetUrl = `${VM_URL}${endpoint}`;

    try {
        console.log(`Proxying ${req.method} request to ${targetUrl}`);

        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            options.body = JSON.stringify(req.body);
        }

        // Usa fetch nativo do Node 18+
        const response = await fetch(targetUrl, options);

        // Lê a resposta
        const text = await response.text();

        // Retorna para o cliente com o mesmo status
        try {
            const json = JSON.parse(text);
            res.status(response.status).json(json);
        } catch (e) {
            res.status(response.status).send(text);
        }

    } catch (error) {
        console.error('Proxy connect error:', error);
        res.status(502).json({
            error: 'Falha na conexão com o servidor WhatsApp (VM)',
            details: error.message
        });
    }
});
