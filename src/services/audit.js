import { AuditLogRepository } from '../repositories/index.js';
import { auth } from './auth.js';

export class AuditService {
    /**
     * Creates an immutable audit log entry.
     * @param {string} action - Action type (e.g., 'LOGIN', 'SALE_CREATE', 'STOCK_UPDATE')
     * @param {string} entity - Entity being affected (e.g., 'User', 'Sale', 'Product')
     * @param {string} entityId - ID of the entity
     * @param {object} details - Additional details, usually { old: ..., new: ... }
     */
    log(action, entity, entityId, details = {}) {
        try {
            const user = auth.getUser();
            const entry = {
                id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                userId: user ? String(user.id) : 'SYSTEM',
                userEmail: user ? user.email : 'system@internal',
                userName: user ? user.name : 'System/Guest',
                action: action,
                entity: entity,
                entityId: String(entityId || 'N/A'),
                details: details,
                ip: '127.0.0.1' // Mock IP, in real app would come from request
            };

            AuditLogRepository.add(entry);
            console.log(`[AUDIT] ${action} on ${entity} #${entityId}`);
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Non-blocking failure: Audit system failure shouldn't stop operations in Dev
            // In Prod, this might need a fallback queue
        }
    }

    getLogs() {
        return AuditLogRepository.getAll().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}

export const audit = new AuditService();
