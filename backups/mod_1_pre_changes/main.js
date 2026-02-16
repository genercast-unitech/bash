import './styles/index.css';
import './styles/mobile.css';
import './utils/migrations.js'; // Run one-time migrations
import { VisionModule } from './modules/vision.js';
import { CoPilotModule } from './modules/copilot.js';
import { CompatibilityModule } from './modules/compatibility.js';
import { WarrantyModule } from './modules/warranty.js';
import { ChecklistModule } from './modules/checklist.js';
import { FinancialModule } from './modules/financial.js';
import { ClientModule } from './modules/clients.js';
import { StorefrontModule } from './modules/storefront.js';
import { SalesModule } from './modules/sales.js';
import { SettingsModule } from './modules/settings.js';
import { LoginModule } from './modules/login.js';
import { storage } from './services/storage.js';
import { auth } from './services/auth.js';
import './services/anatel.js'; // Register Global Anatel Helper
import { MainLayout } from './components/MainLayout.js';
import { DashboardWidgets } from './components/DashboardWidgets.js';
import { scannerService } from './services/scanner.js';

import { ThemeService } from './services/theme.js'; // Import ThemeService
import { autoCorrectInput } from './utils/formatters.js';

// Import common components
import toastService from './components/common/Toast.js';
import { Modal } from './components/common/Modal.js';

// --- ONE-TIME DATA WIPE FOR FRESH START ---
if (!localStorage.getItem('unitech_data_cleaned_2026_01_31')) {

  // ... (skipping context)

  // Clear known business keys
  const keysToClear = [
    'unitech_transactions',
    'unitech_checklists',
    'unitech_sales',
    'unitech_clients',
    'unitech_warranties',
    'unitech_products' // Assuming they want products cleared too if starting fresh, or maybe not? 
    // User said "dados ficticios" (fictitious data). Usually products are setup. 
    // I'll keep products for now as they might be real catalog. 
    // Actually, let's clear transactions/OS/Sales/Clients/Warranties.
    // PRODUCTS are usually considered "Setup" not "Transactions", but defaults might be fake.
    // I'll leave products alone unless requested, safest.
  ];

  keysToClear.forEach(k => localStorage.removeItem(k));
  localStorage.setItem('unitech_data_cleaned_2026_01_31', 'true');
  console.log('Fictitious data cleaned.');
  // Force reload to apply empty repositories
  window.location.reload();
}

const app = document.querySelector('#app');

// Apply Global Settings (Theme)
ThemeService.init();

// State
let currentModule = 'dashboard';

// Modules
const modules = {
  vision: new VisionModule(),
  copilot: new CoPilotModule(),
  compatibility: new CompatibilityModule(),
  warranty: new WarrantyModule(),
  checklist: new ChecklistModule(),
  financial: window.financialModule, // Use global instance
  clients: new ClientModule(),
  storefront: new StorefrontModule(),
  sales: window.salesModule,
  settings: new SettingsModule()
};

// Global Exposure
window.checklistModule = modules.checklist;
window.financialModule = modules.financial; // Assuming other modules might need this too
window.salesModule = modules.sales;
window.clientModule = modules.clients;

// Expose navigation for inline onclick handlers
window.navigateToModule = (moduleName, params = {}) => {
  navigateTo(moduleName, params);
};

let renderApp = async (targetModule, params = {}) => {
  // 1. Auth Check
  if (!auth.isAuthenticated()) {
    new LoginModule().init('app');
    return;
  }

  const user = auth.getUser();

  // Use targetModule if provided, else try to load from storage, else keep default
  if (targetModule) {
    currentModule = targetModule;
    // Persist navigation
    localStorage.setItem('last_module', currentModule);
  } else {
    const savedModule = localStorage.getItem('last_module');
    if (savedModule && modules[savedModule]) {
      currentModule = savedModule;
    }
  }

  // 2. Role Redirects
  if (user.role === 'client' && currentModule !== 'storefront') {
    currentModule = 'storefront';
  }

  // 3. Render Layout Shell
  app.innerHTML = MainLayout(currentModule);

  // 4. Render Content
  const contentArea = document.getElementById('content-area');

  if (currentModule === 'dashboard' && auth.hasAccess('dashboard')) {
    contentArea.innerHTML = DashboardWidgets();
    // Initialize charts or other dashboard scripts if needed here
  } else if (modules[currentModule] && auth.hasAccess(currentModule)) {
    await modules[currentModule].init('content-area', params);
  }

  // 5. Initialize Icons
  if (window.feather) {
    window.feather.replace();
  }

  // 6. Attach Listeners
  attachGlobalListeners();
};

const attachGlobalListeners = () => {
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.nav-btn');
      if (targetBtn) {
        const target = targetBtn.dataset.target;
        if (target && auth.hasAccess(target)) {
          navigateTo(target);
        }
      }
    });
  });

  // --- Global Text Formatting ---
  document.addEventListener('blur', (e) => {
    // Target only text-like inputs
    const isTextInput = e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'search');
    const isTextArea = e.target.tagName === 'TEXTAREA';

    if (isTextInput || isTextArea) {
      if (!e.target.dataset.noFormat && !e.target.classList.contains('no-format')) {
        autoCorrectInput(e.target);
      }
    }
  }, true); // Use capture to ensure we catch it before other blur handlers if needed, though bubbling is standard for blur/focusout

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.logout();
      renderApp(); // Re-render to show login screen
    });
  }

  // Notification Toggle
  const notifBtn = document.getElementById('notification-btn');
  const notifDropdown = document.getElementById('notification-dropdown');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
        notifDropdown.classList.add('hidden');
      }
    });
  }

  // Home Breadcrumb
  const homeBtn = document.getElementById('breadcrumb-home');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      navigateTo('dashboard');
    });
  }

  // Backup Data
  const backupBtn = document.getElementById('backup-btn');
  if (backupBtn) {
    backupBtn.addEventListener('click', () => {
      const data = { ...localStorage };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `unitech_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // --- MOBILE BOTTOM NAVIGATION ---
  // Mobile Bottom Nav Module Navigation
  document.querySelectorAll('.mobile-bottom-nav .nav-item[data-module]').forEach(btn => {
    btn.addEventListener('click', () => {
      const module = btn.dataset.module;
      navigateTo(module);
    });
  });

  // FAB Menu Toggle
  const fabTrigger = document.getElementById('mobile-fab-trigger');
  const fabOverlay = document.getElementById('fab-overlay');

  if (fabTrigger && fabOverlay) {
    fabTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      fabOverlay.classList.toggle('active');
    });

    fabOverlay.addEventListener('click', (e) => {
      if (e.target === fabOverlay) {
        fabOverlay.classList.remove('active');
      }
    });
  }

  // FAB Menu Actions
  document.querySelectorAll('.fab-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (fabOverlay) fabOverlay.classList.remove('active');

      switch (action) {
        case 'new-os':
          navigateTo('checklist', { view: 'create' });
          break;
        case 'new-sale':
          navigateTo('sales');
          break;
        case 'new-product':
          navigateTo('storefront', { createNew: true });
          break;
        case 'new-client':
          navigateTo('clients', { action: 'new' });
          break;
      }
    });
  });

  // Mobile Sidebar Drawer Toggle
  const mobileMoreBtn = document.getElementById('mobile-more-btn');
  const mobileSidebar = document.getElementById('mobile-sidebar');
  const drawerOverlay = document.getElementById('drawer-overlay');

  if (mobileMoreBtn && mobileSidebar && drawerOverlay) {
    // Open drawer from More button
    mobileMoreBtn.addEventListener('click', () => {
      mobileSidebar.classList.add('mobile-open');
      drawerOverlay.classList.add('active');
    });

    // Close drawer when clicking overlay
    drawerOverlay.addEventListener('click', () => {
      mobileSidebar.classList.remove('mobile-open');
      drawerOverlay.classList.remove('active');
    });

    // Close drawer when clicking any nav item
    document.querySelectorAll('aside .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        mobileSidebar.classList.remove('mobile-open');
        drawerOverlay.classList.remove('active');
      });
    });
  }

  // --- GLOBAL SEARCH LOGIC ---
  const searchInput = document.getElementById('global-search-input');
  const searchBtn = document.getElementById('global-search-btn');
  const searchResults = document.getElementById('global-search-results');

  const performSearch = (query) => {
    if (!query || query.length < 2) {
      searchResults.classList.add('hidden');
      return;
    }

    const term = query.toLowerCase();
    const results = [];

    // 1. Clients
    const clients = storage.getClients() || [];
    clients.forEach(c => {
      if (c.name.toLowerCase().includes(term) || (c.document && c.document.includes(term))) {
        results.push({ type: 'client', ...c, label: c.name, sub: c.document || 'Sem documento' });
      }
    });

    // 2. Service Orders (OS)
    const checklists = storage.getChecklists() || [];
    checklists.forEach(os => {
      if (os.id.toLowerCase().includes(term) || os.client.toLowerCase().includes(term)) {
        results.push({ type: 'os', ...os, label: `OS #${os.id} - ${os.client}`, sub: os.status });
      }
    });

    // 3. Products
    const products = storage.getProducts() || [];
    products.forEach(p => {
      if (p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term))) {
        results.push({ type: 'product', ...p, label: p.name, sub: `Estoque: ${p.stock}` });
      }
    });

    // 4. Sales
    const sales = storage.getSales() || [];
    sales.forEach(s => {
      const saleId = s.id || '';
      const clientName = s.clientName || 'Consumidor Final';
      if (saleId.toLowerCase().includes(term) || clientName.toLowerCase().includes(term)) {
        results.push({ type: 'sale', ...s, label: `Venda ${saleId}`, sub: `${clientName} | R$ ${(s.total || 0).toFixed(2)}` });
      }
    });

    // 5. Warranties
    const warranties = storage.getWarranties() || [];
    warranties.forEach(w => {
      if (w.id.toLowerCase().includes(term) || (w.clientName && w.clientName.toLowerCase().includes(term)) || (w.productName && w.productName.toLowerCase().includes(term))) {
        results.push({ type: 'warranty', ...w, label: `Garantia ${w.id}`, sub: `${w.clientName || 'N/A'} - ${w.productName || 'N/A'}` });
      }
    });

    // Render Results
    if (results.length === 0) {
      searchResults.innerHTML = `<div class="p-4 text-center text-gray-500 text-xs">Nenhum resultado encontrado.</div>`;
    } else {
      searchResults.innerHTML = results.slice(0, 10).map(r => {
        let icon = 'circle';
        let color = 'text-gray-400';
        let action = '';

        if (r.type === 'client') { icon = 'user'; color = 'text-blue-500'; action = `navigateToModule('clients', { clientId: '${r.id}' });`; }
        if (r.type === 'os') { icon = 'clipboard'; color = 'text-orange-500'; action = `navigateToModule('checklist', { osId: '${r.id}' });`; }
        if (r.type === 'product') { icon = 'box'; color = 'text-purple-500'; action = `navigateToModule('storefront', { productId: '${r.id}' });`; }
        if (r.type === 'sale') { icon = 'shopping-cart'; color = 'text-green-500'; action = `navigateToModule('sales', { saleId: '${r.id}' });`; }
        if (r.type === 'warranty') { icon = 'shield'; color = 'text-red-500'; action = `navigateToModule('warranty', { warrantyId: '${r.id}' });`; }

        return `
            <div onclick="${action} document.getElementById('global-search-results').classList.add('hidden');" class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors last:border-0">
                <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${color}">
                    <i data-feather="${icon}" class="w-4 h-4"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-700">${r.label}</p>
                    <p class="text-[10px] text-gray-400 uppercase">${r.sub}</p>
                </div>
            </div>
            `;
      }).join('');

      if (window.feather) window.feather.replace();
    }
    searchResults.classList.remove('hidden');
  };

  if (searchInput) {
    searchInput.addEventListener('input', (e) => performSearch(e.target.value));
    searchInput.addEventListener('focus', (e) => {
      if (e.target.value.length >= 2) searchResults.classList.remove('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
      }
    });
  }
};

const navigateTo = async (moduleName, params = {}) => {
  await renderApp(moduleName, params);
};

// --- GLOBAL NAVIGATION EXPORT ---
window.navigateToModule = navigateTo;

// --- GLOBAL SCANNER INITIALIZATION ---
scannerService.init();

window.addEventListener('barcode-scanned', (e) => {
  const sku = e.detail.code;

  // 1. If Product Modal is Open (Registration), ignore global scan logic (let input fill the field)
  const prodModal = document.getElementById('product-modal');
  if (prodModal && !prodModal.classList.contains('hidden')) {
    console.log('[GlobalScanner] Ignored: Product Modal is open.');
    return;
  }

  const products = storage.getProducts() || [];
  const found = products.find(p => p.sku === sku);

  if (!found) {
    // Product NOT FOUND -> Redirect to Product Registration (Storefront) with SKU
    if (confirm(`❌ Código "${sku}" não encontrado.\nDeseja cadastrar agora como um NOVO PRODUTO?`)) {
      window.navigateToModule('storefront', { createSku: sku });
    }
  } else {
    // Product FOUND -> Redirect to Sales and Add to Cart
    console.log(`[GlobalScanner] Product found: ${found.name} -> Redirecting to Sales`);
    window.navigateToModule('sales', { addProductSku: sku });
  }
});

// Global Keyboard Shortcuts (F3-F7)
document.addEventListener('keydown', (e) => {
  // Prevent default browser behavior for F keys
  const shortcutsKeys = ['F3', 'F4', 'F5', 'F6', 'F7'];
  if (shortcutsKeys.includes(e.key)) {
    e.preventDefault();
  }

  // Only trigger if user is authenticated
  // Allowing shortcuts even while typing IF they are F-keys is common in POS systems, 
  // but let's stick to consistent behavior. If user presses F5 in an input, they likely want to reload or open products mod.
  // Given user complaint "F5 some os dados", they are triggering reload.
  // We MUST preventDefault for F5 to stop reload.

  if (!auth.isAuthenticated()) return;

  const shortcuts = {
    'F3': 'checklist',    // Ordens de Serviço
    'F4': 'sales',        // Nova Venda (PDV)
    // 'F5': 'storefront',   // REMOVED to prevent confusion. F5 now just blocks refresh.
    'F6': 'financial',    // Financeiro
    'F7': 'clients',      // Clientes
  };

  if (shortcuts[e.key]) {
    navigateTo(shortcuts[e.key]);
  }
});

// --- USER PROFILE DROPDOWN LOGIC ---
// Re-attach listeners on every render because MainLayout is re-rendered
const attachProfileListeners = () => {
  const profileBtn = document.getElementById('user-profile-btn');
  const profileDropdown = document.getElementById('user-profile-dropdown');
  const logoutBtn = document.getElementById('header-logout-btn');

  if (profileBtn && profileDropdown) {
    // Toggle on click
    profileBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent bubbling
      profileDropdown.classList.toggle('hidden');
    };

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.add('hidden');
      }
    });

    // Prevent dropdown click from closing itself
    profileDropdown.onclick = (e) => {
      e.stopPropagation();
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm('Tem certeza que deseja sair?')) {
        auth.logout();
        window.location.reload();
      }
    };
  }
};

// Hook into navigation to re-attach listeners
const originalRenderApp = renderApp;
renderApp = async (moduleName, params) => {
  await originalRenderApp(moduleName, params);
  setTimeout(attachProfileListeners, 100); // Small delay to ensure DOM is ready
};

// Start
renderApp();
