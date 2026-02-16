import { storage } from '../services/storage.js';

// --- SYNC REFUNDS (ONE-TIME FIX) ---
// --- SYNC REFUNDS (ONE-TIME FIX) ---
// --- SYNC REFUNDS (ONE-TIME FIX) ---
// Updated Key to force re-run on 2026-02-08 - Attempt 3 (Deep Match)
if (!localStorage.getItem('unitech_refund_sync_2026_02_08_v3')) {
    console.log('[Migration] Starting Refund Sync v3 (Deep Match)...');
    const sales = storage.getSales();
    const transactions = storage.getTransactions();
    let updatedCount = 0;

    sales.filter(s => s.status === 'refunded').forEach(sale => {
        // Find ALL candidates first
        let candidates = transactions.filter(t =>
            (t.metadata && t.metadata.saleId === sale.id) ||
            (t.description && t.description.includes(sale.id))
        );

        // If no direct ID match, look for OS match (ambiguous)
        if (candidates.length === 0) {
            const osItem = sale.items && sale.items.find(i => i.isOS || i.name.includes('OS #'));
            if (osItem) {
                const osIdMatch = osItem.name.match(/OS #([0-9]+)/);
                if (osIdMatch) {
                    const osId = osIdMatch[1];
                    // Filter duplicates by Description
                    candidates = transactions.filter(trans => trans.description && trans.description.includes(`OS #${osId}`));
                }
            }
        }

        // If candidates found, narrow down by VALUE
        let bestMatch = null;
        if (candidates.length > 0) {
            // Try to match value exact (float tolerance)
            bestMatch = candidates.find(c => Math.abs(parseFloat(c.finalValue) - parseFloat(sale.total)) < 0.01 && c.status !== 'refunded');

            // If no exact value match (maybe value changed?), just take the most recent one that isn't refunded? 
            // Or the one with closer creation time?
            if (!bestMatch) {
                // Fallback: Take the first one that is NOT already refunded
                bestMatch = candidates.find(c => c.status !== 'refunded');
            }
        }

        if (bestMatch) {
            console.log(`[Migration] Found BEST match transaction ${bestMatch.id} for refunded sale ${sale.id}. Value: ${bestMatch.finalValue}`);

            bestMatch.status = 'refunded';
            bestMatch.paid = false;

            storage.updateTransaction(bestMatch);
            updatedCount++;
        } else {
            console.warn(`[Migration] No suitable transaction candidate found for Refunded Sale ${sale.id} (Value: ${sale.total})`);
        }
    });

    if (updatedCount > 0) {
        console.log(`[System] Fixed ${updatedCount} refunded transactions.`);
        alert(`Sistema atualizado V3: ${updatedCount} lançamentos estornados foram identificados e corrigidos.`);
        window.location.reload();
    }

    localStorage.setItem('unitech_refund_sync_2026_02_08_v3', 'true');
}
