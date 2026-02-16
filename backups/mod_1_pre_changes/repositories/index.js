import {
    UserSchema,
    ProductSchema,
    ClientSchema,
    BrandSchema,
    SaleSchema,
    WarrantySchema,
    ChecklistSchema,
    TransactionSchema,
    AuditLogSchema,
    KnowledgeSchema,
    CategorySchema,
    LocationSchema
} from '../schemas/index.js';

import {
    db,
    collection,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc
} from '../services/db.js';

// --- Base Repository ---
class BaseRepository {
    constructor(collectionName, schema, defaultData = []) {
        this.collectionName = collectionName;
        this.schema = schema;
        this.defaultData = defaultData;
        this.data = []; // Local memory cache for sync performance
        this.unsubscribe = null;
        this.isSeeding = false;
        this.init();
    }

    getCurrentTenantId() {
        try {
            const user = JSON.parse(localStorage.getItem('unitech_current_user'));
            return user ? (user.tenantId || 'master') : 'master';
        } catch (e) {
            return 'master';
        }
    }

    init() {
        const colRef = collection(db, this.collectionName);

        // Real-time synchronization
        this.unsubscribe = onSnapshot(colRef, (snapshot) => {
            const items = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));

            // Auto-Seeding if Firestore is empty and we have defaults
            if (items.length === 0 && this.defaultData.length > 0 && !this.isSeeding) {
                this.isSeeding = true;
                console.log(`[Firestore] Seeding empty collection: ${this.collectionName}`);
                this.defaultData.forEach(async (item) => {
                    await this.add(item);
                });
                this.isSeeding = false;
                return;
            }

            this.data = items;
            // console.log(`[Firestore] Synced ${this.collectionName}: ${items.length} items`);
        });
    }

    getAll(allowBypass = false) {
        try {
            const currentTenant = this.getCurrentTenantId();

            // Safe parsing of cached data
            const validData = this.data.filter(item => {
                const result = this.schema.safeParse(item);
                if (!result.success) {
                    console.warn(`[Firestore] Invalid Item skipped in ${this.collectionName}:`, item.id, result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`));
                    return false;
                }
                return true;
            });

            if (allowBypass && currentTenant === 'master') {
                return validData;
            }

            return validData.filter(item => item.tenantId === currentTenant);
        } catch (error) {
            console.error(`Data Integrity Error [${this.collectionName}]:`, error);
            return [];
        }
    }

    async add(item) {
        try {
            if (!item.tenantId) {
                item.tenantId = this.getCurrentTenantId();
            }

            // Clean data according to Zod
            const validItem = this.schema.parse(item);
            const colRef = collection(db, this.collectionName);

            // If item has a specific ID (forced ID), use setDoc, else addDoc
            if (validItem.id) {
                const id = String(validItem.id);
                const docRef = doc(colRef, id);
                await setDoc(docRef, validItem);
            } else {
                await addDoc(colRef, validItem);
            }
            return true;
        } catch (error) {
            console.error(`Error Adding to [${this.collectionName}]:`, error);
            throw error;
        }
    }

    async update(id, updates) {
        try {
            const docRef = doc(db, this.collectionName, String(id));
            // Use merge to preserve existing fields not in updates
            await setDoc(docRef, updates, { merge: true });
            return true;
        } catch (error) {
            console.error(`Error Updating [${this.collectionName}]:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const docRef = doc(db, this.collectionName, String(id));
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error(`Error Deleting [${this.collectionName}]:`, error);
            throw error;
        }
    }
}

// --- Domain Repositories ---

export const UserRepository = new BaseRepository('unitech_users', UserSchema, [
    { id: 999, tenantId: 'master', name: 'Master Admin', email: 'master@unitech.com', password: 'master', role: 'master', avatar: 'https://ui-avatars.com/api/?name=Master+Admin&background=000&color=fff' }
]);

// V9.0 Smart Stock Seeds (Compatibility Tags)
export const ProductRepository = new BaseRepository('unitech_products', ProductSchema, []);

// Initial seed data for clients
const defaultClients = [];

export const ClientRepository = new BaseRepository('unitech_clients', ClientSchema, defaultClients);
export const SaleRepository = new BaseRepository('unitech_sales', SaleSchema, []);

// --- Warranty Repository ---
const defaultWarranties = [];
export const WarrantyRepository = new BaseRepository('unitech_warranties', WarrantySchema, defaultWarranties);

// --- Checklist Repository ---
const defaultChecklists = [];
export const ChecklistRepository = new BaseRepository('unitech_checklists', ChecklistSchema, defaultChecklists);

// --- Transaction Repository ---

const defaultTransactions = [];

export const TransactionRepository = new BaseRepository('unitech_transactions', TransactionSchema, defaultTransactions);

// --- Audit Repository ---
export const AuditLogRepository = new BaseRepository('unitech_audit_logs', AuditLogSchema, []);

// --- AI Knowledge Repository ---
export const KnowledgeRepository = new BaseRepository('unitech_knowledge', KnowledgeSchema, [
    { id: 1, trigger: 'unitech', response: 'UniTech é o sistema líder em gestão de assistências técnicas, focado em alta performance e design tático.', type: 'fact' }
]);

// --- Product Category Repository ---
export const CategoryRepository = new BaseRepository('unitech_categories', CategorySchema, [
    { id: 1, name: 'Baterias', color: '#ef4444' },
    { id: 2, name: 'Telas / Displays', color: '#3b82f6' },
    { id: 3, name: 'Acessórios', color: '#10b981' },
    { id: 4, name: 'Periféricos', color: '#f59e0b' },
    { id: 5, name: 'Geral', color: '#6b7280' }
]);

// --- Location Repository ---
export const LocationRepository = new BaseRepository('unitech_locations', LocationSchema, [
    { id: 1, name: 'Loja Principal', color: '#10b981' },
    { id: 2, name: 'Estoque Central', color: '#6366f1' }
]);

export const PhysicalLocationRepository = new BaseRepository('unitech_physical_locations', LocationSchema, [
    { id: 1, name: 'Gaveta 01', color: '#f59e0b' },
    { id: 2, name: 'Prateleira A', color: '#8b5cf6' }
]);

// --- Box Repository (New) ---
export const BoxRepository = new BaseRepository('unitech_boxes', LocationSchema, [
    { id: 1, name: 'Caixa 01', color: '#ec4899' },
    { id: 2, name: 'Caixa 20', color: '#8b5cf6' }
]);

// --- Brand Repository (New) ---
export const BrandRepository = new BaseRepository('unitech_brands', BrandSchema, [
    { id: 1, name: 'Apple', color: '#000000' },
    { id: 2, name: 'Samsung', color: '#1428a0' },
    { id: 3, name: 'Motorola', color: '#ff0000' },
    { id: 4, name: 'Xiaomi', color: '#ff6900' }
]);
