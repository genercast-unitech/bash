/**
 * Service to simulate Anatel "Celular Legal" IMEI check.
 * Since Anatel does not provide a public public API for this, we simulate the behavior.
 */
export const anatelService = {
    /**
     * Checks the status of an IMEI.
     * @param {string} imei - 15 digit IMEI
     * @returns {Promise<{status: 'clean'|'blocked'|'error', message: string, details?: any}>}
     */
    async checkIMEI(imei) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Basic Validation
                if (!imei || !/^\d{15}$/.test(imei.replace(/\D/g, ''))) {
                    resolve({
                        status: 'error',
                        message: 'IMEI Inválido. Digite 15 números.'
                    });
                    return;
                }

                const cleanIMEI = imei.replace(/\D/g, '');

                // Simulated "Blocked" IMEIs for testing
                // Ends with 666 or is exactly the sequence 123456789012345
                if (cleanIMEI.endsWith('666') || cleanIMEI === '123456789012345') {
                    resolve({
                        status: 'blocked',
                        message: 'O IMEI informado possui restrição de uso (Roubo/Furto/Extravio).',
                        details: {
                            date: new Date().toISOString().split('T')[0],
                            reason: 'Roubo/Furto',
                            carrier: 'CLARO/VIVO/TIM'
                        }
                    });
                    return;
                }

                // Default: Clean
                resolve({
                    status: 'clean',
                    message: 'Até o momento, o IMEI informado não possui restrições de uso.',
                    details: {
                        lastUpdate: new Date().toISOString()
                    }
                });
            }, 1500); // 1.5s simulated delay
        });
    }
};

// Global Helper for UI
window.checkAnatel = async () => {
    const input = document.getElementById('anatel-imei-input');
    const btn = document.getElementById('anatel-btn');
    const resultArea = document.getElementById('anatel-result');
    const loader = document.getElementById('anatel-loader');

    if (!input || !btn || !resultArea) return;

    const imei = input.value;

    // UI: Loading Status
    btn.classList.add('hidden');
    loader.classList.remove('hidden');
    resultArea.classList.add('hidden');
    input.disabled = true;

    try {
        const result = await anatelService.checkIMEI(imei);

        // UI: Render Result
        resultArea.classList.remove('hidden');

        if (result.status === 'clean') {
            const now = new Date();
            const timestamp = now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

            resultArea.className = 'mt-4 p-4 rounded-lg bg-green-50 border border-green-200 animate-fade-in';
            resultArea.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="bg-green-100 p-2 rounded-full">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-green-800 uppercase">IMEI Regular</h4>
                    <p class="text-xs text-green-700 mt-1 font-mono">
                        Até o momento o IMEI informado não possui restrições de uso
                    </p>
                     <p class="text-[10px] text-green-600 mt-1 font-mono border-t border-green-200 pt-1 inline-block">
                        Consulta: ${timestamp}
                    </p>
                </div>
            </div>
        `;
        } else if (result.status === 'blocked') {
            resultArea.className = 'mt-4 p-4 rounded-lg bg-red-50 border border-red-200 animate-shake';
            resultArea.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="bg-red-100 p-2 rounded-full">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-red-800 uppercase">Bloqueado / Impedido</h4>
                    <p class="text-xs text-red-700 mt-1">${result.message}</p>
                    <div class="mt-2 text-[10px] bg-red-100/50 p-2 rounded">
                        <strong>Motivo:</strong> ${result.details.reason}<br>
                        <strong>Data:</strong> ${result.details.date}
                    </div>
                </div>
            </div>
        `;
        } else {
            resultArea.className = 'mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200';
            resultArea.innerHTML = `
             <div class="flex items-center gap-2 text-yellow-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span class="text-xs font-bold">${result.message}</span>
             </div>
        `;
        }

    } catch (e) {
        console.error(e);
        alert('Erro ao conectar com servidor da Anatel.');
    } finally {
        // Restore UI
        btn.classList.remove('hidden');
        loader.classList.add('hidden');
        input.disabled = false;
        input.focus();
    }
};
