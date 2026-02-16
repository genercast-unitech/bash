import {
    UserRepository,
    ProductRepository,
    ClientRepository,
    SaleRepository,
    WarrantyRepository,
    ChecklistRepository,
    TransactionRepository,
    AuditLogRepository,
    KnowledgeRepository,
    CategoryRepository,
    LocationRepository,
    PhysicalLocationRepository,
    BoxRepository,
    BrandRepository
} from '../repositories/index.js';

import { audit } from './audit.js';

export class StorageService {
    constructor() {
        // Init is handled by repositories now
    }

    // --- Products ---
    getProducts() { return ProductRepository.getAll(); }

    addProduct(product) {
        return ProductRepository.add(product);
    }

    updateProduct(product) {
        return ProductRepository.update(product.id, product);
    }

    deleteProduct(id) {
        return ProductRepository.delete(id);
    }

    // --- Clients ---
    getClients() { return ClientRepository.getAll(); }

    addClient(client) {
        const existing = ClientRepository.getAll().find(c => c.document === client.document && client.document !== '---' && client.document !== '');
        if (existing) {
            throw new Error(`Cliente já cadastrado com o documento: ${client.document}`);
        }
        return ClientRepository.add(client);
    }

    updateClient(client) {
        return ClientRepository.update(client.id, client);
    }

    deleteClient(id) {
        return ClientRepository.delete(id);
    }

    // --- Users (New Auth) ---
    getUsers() { return UserRepository.getAll(); }

    // MASTER ONLY: Get all users across tenants
    getGlobalUsers() { return UserRepository.getAll(true); }

    addUser(user) { return UserRepository.add(user); }

    updateUser(user) { return UserRepository.update(user.id, user); }

    deleteUser(id) { return UserRepository.delete(id); }

    // --- Sales ---
    getSales() { return SaleRepository.getAll(); }

    async addSale(sale) {
        const result = await SaleRepository.add(sale);
        if (result) {
            if (sale.status !== 'quote') {
                // Update Stock Logic
                const products = ProductRepository.getAll();
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach(item => {
                        const product = products.find(p => p.id === item.id);
                        if (product) {
                            ProductRepository.update(product.id, {
                                stock: product.stock - item.qty
                            });
                        }
                    });
                }

                // Create Financial Transaction
                const hasService = sale.items && sale.items.some(i => i.isOS || i.type === 'service');
                let description = `Venda PDV: #${sale.id}`;

                if (hasService) {
                    const osItem = sale.items.find(i => i.isOS);
                    const osId = osItem && osItem.osId ? osItem.osId : sale.id;
                    description = `CONSERTO OS #${osId}`;
                }

                const transaction = {
                    id: `TR-${Date.now()}`,
                    type: 'revenue',
                    description: description,
                    category: hasService ? 'Conserto' : 'Venda de Produto',
                    person: sale.clientName || 'CONSUMIDOR FINAL',
                    seller: sale.sellerName || 'Vendedor Padrão',
                    method: sale.method || 'PIX',
                    value: sale.total,
                    finalValue: sale.total,
                    dueDate: new Date().toLocaleDateString('en-CA'), // Use local YYYY-MM-DD to avoid UTC issues
                    paid: true,
                    createdAt: new Date().toISOString(),
                    items: (sale.items || []).map(i => `${i.qty}x ${i.name}`).join(', '),
                    metadata: {
                        saleId: sale.id, // Direct link to sale
                        items: (sale.items || []).map(i => `${i.qty}x ${i.name}`).join(', '),
                        time: new Date().toLocaleTimeString('pt-BR')
                    }
                };

                try {
                    const added = TransactionRepository.add(transaction);
                    if (!added) {
                        console.error("Failed to add transaction (Validation Error):", transaction);
                        alert("Atenção: A venda foi salva, mas houve erro ao gerar o financeiro/recibo. Verifique o console.");
                    } else {
                        // AUDIT: Transaction Created
                        audit.log('TRANSACTION_CREATE', 'Transaction', transaction.id, { value: transaction.value, type: transaction.type });
                    }
                } catch (err) {
                    console.error("Exception adding transaction:", err);
                }

                // AUDIT: Sale Created & Stock Updated
                audit.log('SALE_CREATE', 'Sale', sale.id, { total: sale.total, method: sale.method });
                if (sale.items) {
                    sale.items.forEach(i => audit.log('STOCK_DEDUCT', 'Product', i.id, { qty: i.qty, reason: `Sale #${sale.id}` }));
                }
            } else {
                audit.log('QUOTE_CREATE', 'Sale', sale.id, { total: sale.total });
            }
        }
        return result;
    }

    async updateSale(sale) {
        const result = await SaleRepository.update(sale.id, sale);

        // Fix: Auto-Refund Financial Transaction (Mark as Refunded)
        if (result && sale.status === 'refunded') {
            const allTransactions = TransactionRepository.getAll();
            // Find transaction linked to this sale
            const transaction = allTransactions.find(t =>
                (t.metadata && t.metadata.saleId === sale.id) ||
                t.description.includes(sale.id)
            );

            if (transaction) {
                // Instead of delete, we update the status
                TransactionRepository.update(transaction.id, {
                    status: 'refunded',
                    paid: false, // Optional: mark as unpaid to overlap
                    // We keep the value for record but will filter in UI
                });
                console.log(`[Storage] Auto-refunded transaction ${transaction.id} for Sale ${sale.id} (Status Updated)`);

                // AUDIT: Refund
                audit.log('SALE_REFUND', 'Sale', sale.id, { refundedBy: sale.refundedBy });
                audit.log('TRANSACTION_REFUND', 'Transaction', transaction.id, { reason: `Refund Sale #${sale.id}` });
            }
        } else if (result) {
            audit.log('SALE_UPDATE', 'Sale', sale.id, { status: sale.status });
        }

        return result;
    }

    deleteSale(id) {
        return SaleRepository.delete(id);
    }

    // --- Warranties ---
    getWarranties() {
        return WarrantyRepository.getAll();
    }

    addWarranty(warranty) {
        return WarrantyRepository.add(warranty);
    }

    // --- Checklists ---
    getNextOSId() {
        try {
            const current = parseInt(localStorage.getItem('unitech_os_sequence') || '0');
            const next = current + 1;
            localStorage.setItem('unitech_os_sequence', next.toString());
            return next.toString().padStart(2, '0');
        } catch (e) {
            console.error('Error generating OS ID:', e);
            return `ERR-${Date.now()}`;
        }
    }

    getNextClientId() {
        try {
            const current = parseInt(localStorage.getItem('unitech_client_sequence') || '1000');
            const next = current + 1;
            localStorage.setItem('unitech_client_sequence', next.toString());
            return next.toString();
        } catch (e) {
            console.error('Error generating Client ID:', e);
            return Math.floor(Math.random() * 10000).toString();
        }
    }

    getChecklists() {
        return ChecklistRepository.getAll();
    }

    addChecklist(checklist) {
        const result = ChecklistRepository.add(checklist);
        // Fix: Check 'situation' as well because 'status' might default to 'Entrada'
        const isCompleted = ['Faturado', 'Finalizado', 'Concluído', 'Realizado', 'Autorizada'].includes(checklist.situation) ||
            ['Faturado', 'Finalizado', 'Concluído'].includes(checklist.status);

        // Transaction creation moved to PDV (Conserto Payment)
        // if (result && checklist.valTotal > 0 && isCompleted) { ... }
        return result;
    }

    updateChecklist(checklist) {
        return ChecklistRepository.update(checklist.id, checklist);
    }

    deleteChecklist(id) {
        return ChecklistRepository.delete(id);
    }

    // --- Transactions ---
    getTransactions() {
        return TransactionRepository.getAll();
    }

    addTransaction(transaction) {
        return TransactionRepository.add(transaction);
    }

    updateTransaction(transaction) {
        return TransactionRepository.update(transaction.id, transaction);
    }

    deleteTransaction(id) {
        return TransactionRepository.delete(id);
    }

    // --- Global Settings ---
    // --- Global Settings (Multi-Tenant) ---
    getCurrentTenantId() {
        try {
            const user = JSON.parse(localStorage.getItem('unitech_current_user'));
            return user ? (user.tenantId || 'master') : 'master';
        } catch (e) { return 'master'; }
    }

    getSettings() {
        const defaultSettings = {
            companyName: 'UniTech Soluções',
            cnpj: '',
            phone: '',
            email: '',
            address: '',
            logo: null,
            backupEmail: '',
            // Theme Defaults
            theme: {
                primary: '#3b82f6',
                secondary: '#1e293b',
                bg: '#f3f4f6',
                surface: '#ffffff',
                fontHeading: 'Inter',
                fontBody: 'Inter'
            },
            ui: {
                format: 'compact',
                dateCurrency: 'brl'
            },
            pixBanks: []
        };

        const currentTenant = this.getCurrentTenantId();

        try {
            const rawMulti = localStorage.getItem('unitech_settings_multi');
            let multiSettings = JSON.parse(rawMulti || '[]');

            const tenantSettings = multiSettings.find(s => s.tenantId === currentTenant);

            if (tenantSettings) {
                // Merge valid settings
                return { ...defaultSettings, ...tenantSettings };
            }

            // Fallback / Migration for Legacy 'master'
            const legacy = localStorage.getItem('unitech_settings');
            if (legacy && currentTenant === 'master') {
                const legacyObj = JSON.parse(legacy);
                legacyObj.tenantId = 'master';

                multiSettings.push(legacyObj);
                localStorage.setItem('unitech_settings_multi', JSON.stringify(multiSettings));

                return { ...defaultSettings, ...legacyObj };
            }

            return defaultSettings;
        } catch (e) {
            console.error('Settings load error:', e);
            return defaultSettings;
        }
    }

    saveSettings(settings) {
        try {
            const currentTenant = this.getCurrentTenantId();
            settings.tenantId = currentTenant; // Ensure ID matches context

            const rawMulti = localStorage.getItem('unitech_settings_multi');
            let multiSettings = JSON.parse(rawMulti || '[]');

            const index = multiSettings.findIndex(s => s.tenantId === currentTenant);

            if (index !== -1) {
                multiSettings[index] = { ...multiSettings[index], ...settings };
            } else {
                multiSettings.push(settings);
            }

            localStorage.setItem('unitech_settings_multi', JSON.stringify(multiSettings));
            return true;
        } catch (e) {
            console.error('Settings save error:', e);
            return false;
        }
    }

    // --- Tenant Management ---
    purgeTenantData(tenantId) {
        if (!tenantId || tenantId === 'master') return false;

        const repositories = [
            UserRepository,
            ProductRepository,
            ClientRepository,
            SaleRepository,
            WarrantyRepository,
            ChecklistRepository,
            TransactionRepository,
            AuditLogRepository
        ];

        let success = true;
        repositories.forEach(repo => {
            try {
                const raw = localStorage.getItem(repo.key);
                if (raw) {
                    const data = JSON.parse(raw);
                    const filtered = data.filter(item => item.tenantId !== tenantId);
                    localStorage.setItem(repo.key, JSON.stringify(filtered));
                }
            } catch (e) {
                console.error(`Error purging ${repo.key} for tenant ${tenantId}`, e);
                success = false;
            }
        });

        // Purge Settings
        try {
            const rawMulti = localStorage.getItem('unitech_settings_multi');
            let multiSettings = JSON.parse(rawMulti || '[]');
            const newSettings = multiSettings.filter(s => s.tenantId !== tenantId);
            localStorage.setItem('unitech_settings_multi', JSON.stringify(newSettings));
        } catch (e) { success = false; }

        return success;
    }

    // --- AI Knowledge ---
    getKnowledge() { return KnowledgeRepository.getAll(); }
    addKnowledge(k) { return KnowledgeRepository.add({ ...k, id: Date.now() }); }
    deleteKnowledge(id) { return KnowledgeRepository.delete(id); }

    // --- AI Context ---
    getAIContext() {
        try {
            const raw = localStorage.getItem('unitech_ai_context');
            return JSON.parse(raw || '[]');
        } catch (e) { return []; }
    }
    setAIContext(ctx) {
        // Keep last 15 messages for context
        localStorage.setItem('unitech_ai_context', JSON.stringify(ctx.slice(-15)));
    }
    clearAIContext() {
        localStorage.removeItem('unitech_ai_context');
    }

    // --- Categories ---
    getCategories() { return CategoryRepository.getAll(); }
    addCategory(cat) { return CategoryRepository.add(cat); }
    updateCategory(cat) { return CategoryRepository.update(cat.id, cat); }
    deleteCategory(id) { return CategoryRepository.delete(id); }

    // --- Locations ---
    getLocations() { return LocationRepository.getAll(); }
    addLocation(loc) { return LocationRepository.add(loc); }
    updateLocation(loc) { return LocationRepository.update(loc.id, loc); }
    deleteLocation(id) { return LocationRepository.delete(id); }

    // --- Physical Locations (Drawers/Shelves) ---
    getPhysicalLocations() { return PhysicalLocationRepository.getAll(); }
    addPhysicalLocation(loc) { return PhysicalLocationRepository.add(loc); }
    updatePhysicalLocation(loc) { return PhysicalLocationRepository.update(loc.id, loc); }
    deletePhysicalLocation(id) { return PhysicalLocationRepository.delete(id); }

    // --- Boxes (New) ---
    getBoxes() { return BoxRepository.getAll(); }
    addBox(box) { return BoxRepository.add(box); }
    updateBox(box) { return BoxRepository.update(box.id, box); }
    deleteBox(id) { return BoxRepository.delete(id); }

    // --- Knowledge ---
    getKnowledge() { return KnowledgeRepository.getAll(); }
    addKnowledge(k) { return KnowledgeRepository.add(k); }
    deleteKnowledge(id) { return KnowledgeRepository.delete(id); }

    // --- Brands (New) ---
    getBrands() { return BrandRepository.getAll(); }
    addBrand(brand) { return BrandRepository.add(brand); }
    updateBrand(brand) { return BrandRepository.update(brand.id, brand); }
    deleteBrand(id) { return BrandRepository.delete(id); }

    // --- Bulk Operations ---
    async clearFinancialData() {
        const tenantId = this.getCurrentTenantId();
        const sales = this.getSales();
        const transactions = this.getTransactions();

        let count = 0;

        // Delete Sales for this tenant
        for (const s of sales) {
            if (s.tenantId === tenantId) {
                await SaleRepository.delete(s.id);
                count++;
            }
        }

        // Delete Transactions for this tenant
        for (const t of transactions) {
            if (t.tenantId === tenantId) {
                await TransactionRepository.delete(t.id);
                count++;
            }
        }

        audit.log('FINANCIAL_RESET', 'System', tenantId, { recordsCleared: count });
        return count;
    }
}

export const storage = new StorageService();
