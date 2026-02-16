export class MobileBottomNav {
    constructor() {
        this.activeModule = 'dashboard';
    }

    render() {
        return `
            <nav class="mobile-bottom-nav">
                <button class="nav-item ${this.activeModule === 'dashboard' ? 'active' : ''}" data-module="dashboard">
                    <i data-feather="home" class="w-6 h-6"></i>
                    <span>Início</span>
                </button>
                
                <button class="nav-item ${this.activeModule === 'checklist' ? 'active' : ''}" data-module="checklist">
                    <i data-feather="clipboard" class="w-6 h-6"></i>
                    <span>OS</span>
                </button>
                
                <button class="nav-item nav-item-fab" id="mobile-fab-trigger">
                    <div class="fab-button">
                        <i data-feather="plus" class="w-7 h-7"></i>
                    </div>
                </button>
                
                <button class="nav-item ${this.activeModule === 'sales' ? 'active' : ''}" data-module="sales">
                    <i data-feather="shopping-cart" class="w-6 h-6"></i>
                    <span>Vendas</span>
                </button>
                
                <button class="nav-item ${this.activeModule === 'clients' ? 'active' : ''}" data-module="clients">
                    <i data-feather="users" class="w-6 h-6"></i>
                    <span>Clientes</span>
                </button>
            </nav>

            <!-- FAB Menu Overlay -->
            <div class="fab-overlay" id="fab-overlay">
                <div class="fab-menu">
                    <button class="fab-menu-item" data-action="new-os">
                        <i data-feather="clipboard" class="w-6 h-6"></i>
                        <span>Nova OS</span>
                    </button>
                    <button class="fab-menu-item" data-action="new-sale">
                        <i data-feather="shopping-cart" class="w-6 h-6"></i>
                        <span>Nova Venda</span>
                    </button>
                    <button class="fab-menu-item" data-action="new-client">
                        <i data-feather="user-plus" class="w-6 h-6"></i>
                        <span>Novo Cliente</span>
                    </button>
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Navigation items
        document.querySelectorAll('.mobile-bottom-nav .nav-item[data-module]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const module = btn.dataset.module;
                this.activeModule = module;
                window.navigateToModule(module);
                this.updateActiveState();
            });
        });

        // FAB trigger
        const fabTrigger = document.getElementById('mobile-fab-trigger');
        const fabOverlay = document.getElementById('fab-overlay');

        if (fabTrigger && fabOverlay) {
            fabTrigger.addEventListener('click', () => {
                fabOverlay.classList.toggle('active');
            });

            fabOverlay.addEventListener('click', (e) => {
                if (e.target === fabOverlay) {
                    fabOverlay.classList.remove('active');
                }
            });
        }

        // FAB menu actions
        document.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                fabOverlay.classList.remove('active');

                switch (action) {
                    case 'new-os':
                        window.navigateToModule('checklist', { view: 'create' });
                        break;
                    case 'new-sale':
                        window.navigateToModule('sales');
                        break;
                    case 'new-client':
                        window.navigateToModule('clients', { action: 'new' });
                        break;
                }
            });
        });

        // Replace feather icons
        if (window.feather) window.feather.replace();
    }

    updateActiveState() {
        document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.mobile-bottom-nav .nav-item[data-module="${this.activeModule}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    setActive(module) {
        this.activeModule = module;
        this.updateActiveState();
    }
}

export const mobileBottomNav = new MobileBottomNav();
