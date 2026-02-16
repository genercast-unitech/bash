import { storage } from '../services/storage.js';
import { auth } from '../services/auth.js';

export const MainLayout = (contentModule) => {
   const user = auth.getUser();
   const activeModule = contentModule || 'dashboard';
   const settings = storage.getSettings();
   const companyName = settings.companyName || 'inforOS.';

   // ... existing navItems ...

   // Navigation Items with Keyboard Shortcuts
   const navItems = [
      { id: 'dashboard', label: 'Painel', icon: 'grid', access: 'dashboard' },
      { id: 'sales', label: 'Vendas (PDV)', icon: 'shopping-cart', access: 'sales', shortcut: 'F4' },
      { id: 'checklist', label: 'Ordens de Serviço', icon: 'clipboard', access: 'checklist', shortcut: 'F3' },
      { id: 'clients', label: 'Clientes / Fornecedores', icon: 'users', access: 'clients', shortcut: 'F7' },
      { id: 'storefront', label: 'Produtos', icon: 'shopping-bag', access: 'storefront', shortcut: 'F5' },
      { id: 'financial', label: 'Financeiro', icon: 'dollar-sign', access: 'financial', shortcut: 'F6' },
      { id: 'vision', label: 'Serviços', icon: 'camera', access: 'vision' },
      { id: 'warranty', label: 'Termos e Garantias', icon: 'shield', access: 'warranty' },
      { id: 'copilot', label: 'Suporte (IA)', icon: 'message-circle', access: 'copilot' },
      { id: 'settings', label: 'Configurações', icon: 'settings', access: 'settings' },
   ];

   const renderNavItems = () => {
      return navItems
         .filter(item => auth.hasAccess(item.access))
         .map(item => `
        <button 
          data-target="${item.id}"
          class="nav-btn w-full flex items-center gap-3 px-6 py-4 text-slate-400 hover:text-white hover:bg-white/5 transition-all border-l-4 border-transparent hover:border-unitech-primary ${activeModule === item.id ? 'bg-white/10 text-white border-unitech-primary shadow-lg shadow-black/20' : ''}"
        >
          <div class="relative">
            <i data-feather="${item.icon}" class="w-5 h-5 ${activeModule === item.id ? 'text-unitech-primary' : ''}"></i>
            ${item.id === 'checklist' || item.id === 'warranty' || item.id === 'financial' ?
               '<span class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>' : ''}
          </div>
          <span class="text-[11px] font-black uppercase tracking-[0.15em] flex-1 text-left">${item.label}</span>
          ${item.shortcut ? `<span class="shortcut-badge px-2 py-0.5 bg-slate-800 text-slate-500 text-[9px] font-black font-mono rounded border border-slate-700 group-hover:border-unitech-primary/50 transition-colors uppercase">${item.shortcut}</span>` : ''}
        </button>
      `).join('');
   };

   return `
    <div class="flex h-screen w-full bg-unitech-bg">
      <!-- Sidebar Overlay (Mobile) -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      
      <!-- Sidebar -->
      <aside class="w-72 bg-slate-950 flex flex-col shrink-0 transition-all duration-300 shadow-2xl z-20 border-r border-white/5" id="mobile-sidebar">
        <!-- Brand -->
        <div class="h-20 flex items-center px-8 border-b border-white/5 bg-black/20">
           <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-unitech-primary rounded-xl flex items-center justify-center shadow-lg shadow-unitech-primary/30 overflow-hidden">
                  ${settings.logo
         ? `<img src="${settings.logo}" class="w-full h-full object-cover" />`
         : `<i data-feather="zap" class="w-6 h-6 text-white fill-white"></i>`
      }
               </div>
              <h1 id="app-brand-name" class="text-lg font-black text-white tracking-[0.1em] uppercase">
                  ${(() => {
         const parts = companyName.split(' ');
         if (parts.length > 1) {
            return `${parts[0]}<span class="text-unitech-primary ml-1">${parts.slice(1).join(' ')}</span>`;
         }
         return companyName;
      })()}
              </h1>
           </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-800">
           <div class="px-8 mb-4">
              <span class="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Núcleo Operacional</span>
           </div>
           ${renderNavItems()}
        </nav>

        <!-- Footer / Logout -->
        <div class="p-6 border-t border-white/5 space-y-3 bg-black/10">
           <button id="backup-btn" class="flex items-center gap-4 text-slate-500 hover:text-unitech-primary transition-all w-full px-2 group">
              <div class="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center group-hover:bg-unitech-primary/10 transition-colors">
                 <i data-feather="database" class="w-4 h-4"></i>
              </div>
              <span class="text-[10px] font-black uppercase tracking-widest">Backup na Nuvem</span>
           </button>
           <button id="logout-btn" class="flex items-center gap-4 text-slate-500 hover:text-red-500 transition-all w-full px-2 group">
              <div class="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                 <i data-feather="log-out" class="w-4 h-4"></i>
              </div>
              <span class="text-[10px] font-black uppercase tracking-widest">Encerrar Sessão</span>
           </button>
        </div>
      </aside>

      <!-- Main Content Wrapper -->
      <div class="flex-1 flex flex-col h-full overflow-hidden relative">
        
        <!-- Top Header -->
        <header class="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm z-10">
           
           <!-- Breadcrumb / Page Title -->
           <div class="flex items-center gap-4">
              <div id="breadcrumb-home" class="flex items-center text-[10px] font-black text-slate-400 hover:text-unitech-primary cursor-pointer transition-all uppercase tracking-widest group">
                 <i data-feather="home" class="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform"></i>
                 <span>Controle Unitech</span>
              </div>
              <div class="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
              <span class="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">${activeModule === 'sales' ? 'VENDAS' :
         activeModule === 'checklist' ? 'ORDENS DE SERVIÇO' :
            activeModule === 'clients' ? 'CLIENTES' :
               activeModule === 'storefront' ? 'PRODUTOS' :
                  activeModule === 'financial' ? 'FINANCEIRO' :
                     activeModule === 'warranty' ? 'GARANTIAS' :
                        activeModule === 'settings' ? 'CONFIGURAÇÕES' :
                           activeModule
      }</span>
           </div>

           <!-- Right Actions -->
           <div class="flex items-center gap-6">
              
              <!-- Search -->
              <div class="relative hidden lg:block group">
                 <input type="text" id="global-search-input" placeholder="BUSCA INTELIGENTE: Digite algo..." 
                        class="pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-unitech-primary/5 focus:border-unitech-primary w-80 transition-all font-bold placeholder-slate-400 shadow-inner">
                 <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <i data-feather="search" class="w-4 h-4"></i>
                 </div>
                 
                 <!-- Search Results Dropdown -->
                 <div id="global-search-results" class="hidden absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[70vh] overflow-y-auto animate-scale-in">
                 </div>
              </div>

              <!-- Notifications -->
              <!-- Notifications -->
              <div class="relative">
                  <button id="notification-btn" class="relative p-2 text-gray-500 hover:text-unitech-primary transition-colors">
                     <i data-feather="bell" class="w-5 h-5"></i>
                     <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  </button>
                  
                  <!-- Dropdown -->
                  <div id="notification-dropdown" class="hidden absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-fade-in origin-top-right">
                        <div class="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h4 class="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Últimas Alterações</h4>
                            <div class="flex gap-2 text-gray-400">
                                <i data-feather="settings" class="w-3 h-3 cursor-pointer hover:text-unitech-primary"></i>
                                <i data-feather="check-square" class="w-3 h-3 cursor-pointer hover:text-unitech-primary"></i>
                            </div>
                        </div>
                        <div class="p-8 text-center text-gray-400 text-xs">
                            Nenhuma nova mensagem
                        </div>
                  </div>
              </div>

              <!-- Profile -->
              <div class="flex items-center gap-4 pl-6 border-l border-slate-100">
                 <div class="text-right hidden sm:block">
                    <p class="text-[11px] font-black text-slate-900 leading-none uppercase tracking-wider">${user?.name || 'Master Admin'}</p>
                    <div class="flex items-center justify-end gap-1.5 mt-1">
                       <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                       <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">${user?.role || 'System Root'}</p>
                    </div>
                 </div>
                 <div id="user-profile-btn" class="flex w-12 h-12 bg-slate-900 rounded-[1rem] items-center justify-center text-unitech-primary font-black border-2 border-slate-50 shadow-xl overflow-hidden group cursor-pointer hover:border-unitech-primary transition-all relative">
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-black text-white text-lg transition-transform group-hover:scale-110">
                        ${user?.name?.charAt(0) || 'U'}
                    </div>
                    
                    <!-- Profile Dropdown -->
                    <div id="user-profile-dropdown" class="hidden absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] animate-fade-in origin-top-right overflow-hidden">
                        <div class="p-4 border-b border-gray-50 bg-slate-50">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conta</p>
                            <p class="text-sm font-black text-slate-800 truncate">${user?.name || 'Master Admin'}</p>
                        </div>
                        <button class="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-unitech-primary transition-colors flex items-center gap-2">
                             <i data-feather="user" class="w-4 h-4"></i> Meu Perfil
                        </button>
                        <button id="header-logout-btn" class="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-50">
                             <i data-feather="log-out" class="w-4 h-4"></i> Sair do Sistema
                        </button>
                    </div>
                 </div>
              </div>

           </div>
        </header>

        <!-- Dynamic Content Area -->
        <main id="content-area" class="flex-1 overflow-y-auto bg-gray-100 p-6 overscroll-contain">
           <!-- Module content injected here -->
        </main>

      </div>

      <!-- Mobile Bottom Navigation (Only visible on mobile) -->
      <nav class="mobile-bottom-nav">
        <button class="nav-item ${activeModule === 'dashboard' ? 'active' : ''}" data-module="dashboard">
          <i data-feather="home" class="w-6 h-6"></i>
          <span>Início</span>
        </button>
        
        <button class="nav-item ${activeModule === 'checklist' ? 'active' : ''}" data-module="checklist">
          <i data-feather="clipboard" class="w-6 h-6"></i>
          <span>OS</span>
        </button>
        
        <button class="nav-item nav-item-fab" id="mobile-fab-trigger">
          <div class="fab-button">
            <i data-feather="plus" class="w-7 h-7"></i>
          </div>
        </button>
        
        <button class="nav-item ${activeModule === 'sales' ? 'active' : ''}" data-module="sales">
          <i data-feather="shopping-cart" class="w-6 h-6"></i>
          <span>Vendas</span>
        </button>
        
        <button class="nav-item" id="mobile-more-btn">
          <i data-feather="menu" class="w-6 h-6"></i>
          <span>Mais</span>
        </button>
      </nav>

      <!-- Drawer Overlay -->
      <div class="drawer-overlay" id="drawer-overlay"></div>

      <!-- FAB Overlay Menu -->
      <div class="fab-overlay" id="fab-overlay">
        <div class="fab-menu">
                <button class="fab-menu-item" data-action="new-sale">
                    <i data-feather="shopping-cart" class="w-6 h-6"></i>
                    <span>Nova Venda</span>
                </button>
                <button class="fab-menu-item" data-action="new-os">
                    <i data-feather="clipboard" class="w-6 h-6"></i>
                    <span>Nova OS</span>
                </button>
                <button class="fab-menu-item" data-action="new-product">
                    <i data-feather="box" class="w-6 h-6"></i>
                    <span>Novo Produto</span>
                </button>
                <button class="fab-menu-item" data-action="new-client">
                    <i data-feather="user-plus" class="w-6 h-6"></i>
                    <span>Novo Cliente</span>
                </button>
            </div>
      </div>
    </div>
  `;
};
