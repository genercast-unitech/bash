
import { z } from 'zod';

// --- Shared Types ---
const IDSchema = z.union([z.string(), z.number()]).transform(val => val.toString());
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}/, { message: "Invalid date format (YYYY-MM-DD)" });

// --- User Schema ---
export const UserSchema = z.object({
    id: IDSchema.optional(), // Auto-generated if missing
    tenantId: z.string().optional().default('master'), // Multi-Tenant
    name: z.string().min(2, "Name too short"),
    email: z.string().email("Invalid email"),
    password: z.string().min(4, "Password too short").optional(), // Optional to allow hashed login
    passwordHash: z.string().optional(), // Store SHA-256 hash here
    role: z.enum(['master', 'admin', 'ceo', 'manager', 'sales', 'tech', 'client'], { errorMap: () => ({ message: "Invalid role" }) }),
    avatar: z.string().url().optional(),
    cpf: z.string().optional(),
    phone: z.string().optional(),
    status: z.enum(['active', 'suspended']).default('active').optional()
});

export const UserListSchema = z.array(UserSchema);

// --- Product Schema ---
export const ProductSchema = z.object({
    id: IDSchema,
    tenantId: z.string().optional(),
    name: z.string().min(2),
    sku: z.string().optional().or(z.literal('')),
    stock: z.number().int().min(0),
    cost: z.number().min(0).optional(), // Purchase cost
    retail: z.number().min(0),
    wholesale: z.number().min(0),
    // V9.0 Smart Stock Fields
    compatibility_tags: z.array(z.string()).optional().default([]), // ["iphone 11", "iphone xr"]
    location_bench: z.string().optional(), // e.g., "A1-04"
    supplier: z.string().optional(),
    minStock: z.number().optional(),
    unit: z.string().optional(),
    manageStock: z.boolean().optional(),
    // Product Media & Details
    photo: z.string().optional(), // Base64 image or URL
    specifications: z.string().optional(), // Compatibility/specifications text
    category: z.string().optional().default('Geral'),
    location: z.string().optional(), // Store/Warehouse Name
    physicalLocation: z.string().optional(), // Gaveta/Prateleira
    box: z.string().optional(), // Caixa 20, etc.
    brand: z.string().optional(), // Samsung, Apple, etc.
    warrantyMonths: z.number().int().min(0).optional().default(0) // Warranty period in months
});

export const ProductListSchema = z.array(ProductSchema);

// --- Client Schema ---
export const ClientSchema = z.object({
    id: IDSchema.optional(),
    tenantId: z.string().optional(),
    name: z.string().optional().default('CONSUMIDOR FINAL'),
    category: z.enum(['client', 'supplier', 'creditor', 'tech']).default('client'),
    type: z.enum(['retail', 'wholesale']).optional().default('retail'),
    document: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(), // Celular
    zip: z.string().optional(), // CEP
    origin: z.string().optional(), // Origem (Loja, Google, etc)
    email: z.string().email().optional().or(z.literal('')).or(z.literal('---')).nullable(),
    // Professional Fields
    barcode: z.string().optional(),
    photoUrl: z.string().optional(),
    createdAt: z.string().optional() // ISO date for metrics
});

export const ClientListSchema = z.array(ClientSchema);

// --- Transaction Schema (Sales) ---
export const SaleItemSchema = z.object({
    id: IDSchema,
    qty: z.number().int().min(1),
    total: z.number().min(0),
    name: z.string(), // snapshot of product name
    price: z.number().min(0), // Unit price snapshot
    warrantyCode: z.string().optional(), // Optional warranty code
    isOS: z.boolean().optional(),
    osId: IDSchema.optional()
});

export const SaleSchema = z.object({
    id: IDSchema.optional(),
    tenantId: z.string().optional(),
    date: z.string(), // ISO string or YYYY-MM-DD
    total: z.number().nonnegative(),
    subtotal: z.number().optional(), // Added field
    items: z.array(SaleItemSchema),
    clientId: IDSchema.optional(),
    clientName: z.string().optional(),
    sellerId: IDSchema.optional(),
    sellerName: z.string().optional(),
    method: z.string().optional(),
    pixBank: z.string().nullable().optional(), // Added for PIX
    discount: z.object({
        type: z.string(),
        value: z.number(),
        amount: z.string() // Usually string from toFixed
    }).optional(),
    installments: z.number().int().min(1).optional(),
    status: z.enum(['completed', 'refunded', 'quote', 'converted']).default('completed'),
    originQuoteId: IDSchema.optional(), // Record source budget
    convertedToId: IDSchema.optional() // Record destination sale
});

// --- Warranty Schema ---
export const WarrantySchema = z.object({
    id: z.string(),
    tenantId: z.string().optional(),
    customer: z.string(),
    device: z.string(),
    expiry: z.string(), // ISO date
    status: z.enum(['active', 'expired', 'void']),
    serial: z.string().optional()
});

export const WarrantyListSchema = z.array(WarrantySchema);

// --- Checklist Schema ---
// Complex nested schema for checklist items
const ChecklistItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    status: z.boolean(),
    observation: z.string().optional()
});

export const ChecklistSchema = z.object({
    id: IDSchema.optional(),
    tenantId: z.string().optional(),
    date: z.string(),
    deadline: z.string().optional(),
    device: z.string(),
    deviceInfo: z.object({
        model: z.string().optional(),
        imei: z.string().optional(),
        pass: z.string().optional(),
        pattern: z.string().optional()
    }).optional(),
    equipmentDetails: z.object({
        type: z.string().optional(),
        tag: z.string().optional(),
        brand: z.string().optional(),
        color: z.string().optional(),
        problem: z.string().optional(),
        photos: z.array(z.string()).optional(),
        accessories: z.array(z.string()).optional()
    }).optional(),
    client: z.string(),
    items: z.array(ChecklistItemSchema),
    technician: z.string().optional(),
    attendant: z.string().optional(),
    origin: z.string().optional(), // Added field
    notes: z.string().optional(),
    report: z.string().optional(),
    timeSeconds: z.number().optional(),
    // Financial Fields
    valProd: z.number().default(0),
    valServ: z.number().default(0),
    valTotal: z.number().default(0),
    status: z.enum([
        'Entrada', 'Orçamento', 'Aberto', 'Andamento', 'Concluído', 'Faturado', 'Finalizado',
        'Enviar p/ Cliente', 'Aguard. Resposta', 'Comprar Peça', 'Aguard. Peça', 'Testes Finais', 'Qualidade', 'Realizado', 'Entregar', 'Pronto', 'Cancelado', 'Abandono', 'Garantia',
        'Pendente', 'Autorizada', 'Sem Reparo' // Added missing statuses
    ]).default('Entrada'),
    situation: z.string().optional(),
    priority: z.enum(['Alta', 'Média', 'Baixa', 'Normal']).optional().default('Normal')
});

// --- Transaction Schema (Ledger) ---
export const TransactionSchema = z.object({
    id: IDSchema,
    tenantId: z.string().optional(),
    type: z.enum(['revenue', 'expense']),
    description: z.string(),
    category: z.string(), // E.g., 'Salário Funcionário', 'Venda de Produto'
    person: z.string().optional().default('CONSUMIDOR FINAL'),
    method: z.string().optional().default('PIX'),
    value: z.number().default(0),
    discount: z.number().default(0),
    interest: z.number().default(0),
    taxes: z.number().default(0),
    finalValue: z.number().default(0),
    dueDate: z.string(), // YYYY-MM-DD
    paid: z.boolean().default(false),
    recurrence: z.string().optional(), // "1/12"
    status: z.enum(['active', 'cancelled', 'refunded']).default('active'),
    seller: z.string().optional(), // Name of the salesperson
    items: z.string().optional(), // Snapshot of items (Simplified for reliability)
    metadata: z.any().optional(), // Keep for flexibility
    createdAt: z.string().optional()
});

export const TransactionListSchema = z.array(TransactionSchema);

// --- Audit Log Schema ---
export const AuditLogSchema = z.object({
    id: z.string(),
    tenantId: z.string().optional(),
    timestamp: z.string(), // ISO
    userId: z.string(),
    userEmail: z.string().optional(),
    userName: z.string().optional(),
    action: z.string(), // CREATE, UPDATE, DELETE, LOGIN, LOCK
    entity: z.string(), // Sale, Transaction, Stock, System
    entityId: z.string().optional(),
    details: z.any().optional(), // Metadata, Diff (Old vs New)
    ip: z.string().optional()
});

export const AuditLogListSchema = z.array(AuditLogSchema);

// --- AI Knowledge Schema ---
export const KnowledgeSchema = z.object({
    id: IDSchema,
    tenantId: z.string().optional().default('master'),
    trigger: z.string().min(1),
    response: z.string().min(1),
    type: z.enum(['fact', 'preference', 'logic']).default('fact'),
    createdAt: z.string().optional()
});

export const KnowledgeListSchema = z.array(KnowledgeSchema);

// --- Product Category Schema ---
export const CategorySchema = z.object({
    id: IDSchema,
    tenantId: z.string().optional().default('master'),
    name: z.string().min(2),
    description: z.string().optional(),
    color: z.string().optional().default('#3b82f6')
});

export const CategoryListSchema = z.array(CategorySchema);

// --- Location (Local) Schema ---
export const LocationSchema = z.object({
    id: IDSchema,
    tenantId: z.string().optional().default('master'),
    name: z.string().min(2), // e.g., "Loja Centro", "Estoque A"
    description: z.string().optional(),
    color: z.string().optional().default('#10b981')
});

export const LocationListSchema = z.array(LocationSchema);

// --- Product Brand Schema ---
export const BrandSchema = z.object({
    id: IDSchema,
    tenantId: z.string().optional().default('master'),
    name: z.string().min(1),
    description: z.string().optional(),
    color: z.string().optional().default('#6b7280')
});

export const BrandListSchema = z.array(BrandSchema);
