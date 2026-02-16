import { storage } from '../services/storage.js';

const formatNumber = (num) => {
    return num < 10 && num > 0 ? `0${num}` : num;
}

const renderBar = (label, value, color) => {
    // Max value approx 600 for scaling
    const height = Math.max(10, (value / 600) * 100);

    return `
    <div class="flex flex-col items-center gap-2 group w-full cursor-pointer">
       <div class="relative w-full max-w-[40px] flex items-end justify-center h-[200px]"> 
          <div class="w-full rounded-t-md ${color} opacity-90 group-hover:opacity-100 transition-all relative z-10" style="height: ${height}%;">
             <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                 ${value}
             </div>
          </div>
       </div>
       <span class="font-medium truncate w-full text-[10px] text-gray-500">${label}</span>
    </div>
    `;
}

export const DashboardWidgets = () => {
    // 1. Fetch Data
    const products = storage.getProducts() || [];
    const sales = storage.getSales() || [];
    const checklists = storage.getChecklists() || [];
    const clients = storage.getClients() || [];
    const allTransactions = (storage.getTransactions() || []).filter(t => t.status !== 'cancelled' && t.status !== 'refunded');
    // Financial data computed below from transactions

    // 2. Metrics Logic (Existing)
    // Fix: Use Local Date for 'today' to match input types and deadlines correctly
    const now = new Date();
    const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD (Local)
    const currentMonth = today.slice(0, 7); // YYYY-MM (Local)
    const currentYear = today.slice(0, 4); // YYYY (Local)

    // Filter Persistence
    if (!window.dashboardFinancialFilter) window.dashboardFinancialFilter = 'day';
    const filter = window.dashboardFinancialFilter;

    // Helper for week range
    const getWeekRange = () => {
        const curr = new Date(now);
        const first = curr.getDate() - curr.getDay(); // Sunday
        const last = first + 6; // Saturday

        const firstday = new Date(curr.setDate(first)).toLocaleDateString('en-CA');
        const lastday = new Date(curr.setDate(last)).toLocaleDateString('en-CA');
        return { start: firstday, end: lastday };
    };

    // Sales Today (Revenue from ALL transactions today)
    const revenueToday = allTransactions
        .filter(t => t.type === 'revenue' && t.paid && t.dueDate === today)
        .reduce((acc, t) => acc + (parseFloat(t.finalValue) || 0), 0);

    // Products Low Stock (< 5)
    const lowStockCount = products.filter(p => p.stock < 5).length;

    // Checklists / OS Logic
    // Checklists / OS Logic
    // Checklists / OS Logic
    const osTotal = checklists.length;

    // Status Buckets (Dynamic) - NOW USING SITUATION correctly
    const osReview = checklists.filter(c => c.situation === 'Enviar p/ Cliente').length;
    const osWaiting = checklists.filter(c => c.situation === 'Aguard. Resposta').length;
    const osBuying = checklists.filter(c => c.situation === 'Comprar Peça').length;
    const osParts = checklists.filter(c => c.situation === 'Aguard. Peça').length;
    const osTesting = checklists.filter(c => c.situation === 'Testes Finais').length;
    const osQuality = checklists.filter(c => c.situation === 'Qualidade').length;
    const osReady = checklists.filter(c => c.situation === 'Realizado').length;

    // Deadline Logic (Dynamic)
    // Filter out closed/finished statuses for deadlines - USING SITUATION TO CHECK IF ACTIVE
    const activeChecklists = checklists.filter(c => !['Realizado', 'Entregar', 'Concluído', 'Finalizado', 'Cancelado', 'Abandono', 'Faturado', 'Recusada', 'Sem Reparo', 'Descarte'].includes(c.situation));

    const overdueCount = activeChecklists.filter(c => c.deadline && c.deadline < today).length;
    const dueTodayCount = activeChecklists.filter(c => {
        const isDeadline = c.deadline === today;
        const createdDate = c.date ? new Date(c.date).toLocaleDateString('en-CA') : null;
        const isCreated = createdDate === today;
        return isDeadline || isCreated;
    }).length;

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];
    const dueTomorrowCount = activeChecklists.filter(c => c.deadline === tomorrow).length;

    const onTimeCount = activeChecklists.filter(c => (!c.deadline || c.deadline > today)).length;

    // Priority Buckets (Dynamic) - Exclude Realizado situations
    const activePriorityChecklists = checklists.filter(c => c.situation !== 'Realizado');
    const priorityHigh = activePriorityChecklists.filter(c => c.priority === 'Alta').length;
    const priorityMedium = activePriorityChecklists.filter(c => c.priority === 'Normal' || c.priority === 'Média').length;
    const priorityLow = activePriorityChecklists.filter(c => c.priority === 'Baixa').length;
    const priorityNull = checklists.filter(c => c.priority === 'Realizada' || c.situation === 'Realizado').length;

    // Filter by Selection for Dashboard Summary
    let financialTransactions = allTransactions;
    if (filter === 'day') {
        financialTransactions = allTransactions.filter(t => t.dueDate === today);
    } else if (filter === 'week') {
        const range = getWeekRange();
        financialTransactions = allTransactions.filter(t => t.dueDate >= range.start && t.dueDate <= range.end);
    } else if (filter === 'month') {
        financialTransactions = allTransactions.filter(t => t.dueDate && t.dueDate.startsWith(currentMonth));
    } else if (filter === 'year') {
        financialTransactions = allTransactions.filter(t => t.dueDate && t.dueDate.startsWith(currentYear));
    }

    // Totals - Use finalValue as it represents the net amount
    const revenueTotal = financialTransactions.filter(t => t.type === 'revenue' && t.paid)
        .reduce((acc, t) => acc + (parseFloat(t.finalValue) || 0), 0);

    const expenseTotal = financialTransactions.filter(t => t.type === 'expense' && t.paid)
        .reduce((acc, t) => acc + (parseFloat(t.finalValue) || 0), 0);

    const receivables = financialTransactions.filter(t => t.type === 'revenue' && !t.paid)
        .reduce((acc, t) => acc + (parseFloat(t.finalValue) || 0), 0);

    const payables = financialTransactions.filter(t => t.type === 'expense' && !t.paid)
        .reduce((acc, t) => acc + (parseFloat(t.finalValue) || 0), 0);

    // Calculate Margin roughly (Revenue - Expense)
    // Note: This is Cash Flow margin, not Profit margin (which needs COGS).
    /* Legacy Logic Removed for Clarity
    const salesTotal = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
    const osRevenue = checklists...
    const cogs = ...
    */

    // Stats for System
    const clientsToday = clients.filter(c => c.createdAt && c.createdAt.startsWith(today)).length;
    const osToday = checklists.filter(c => c.date && c.date.startsWith(today)).length;

    const osMonth = checklists.filter(c => c.date && c.date.startsWith(currentMonth)).length;
    const clientsMonth = clients.filter(c => c.createdAt && c.createdAt.startsWith(currentMonth)).length;

    // 3. Render
    return `
      <div class="space-y-1 animate-fade-in pb-12 pt-2">
         <!-- Section: Quick Actions -->
         <div>
            <!-- Removed Title for cleaner look as per new screenshot -->
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5">
                
                <button onclick="window.navigateToModule('checklist')" class="mobile-card-btn bg-white rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-unitech-primary group text-left flex items-center gap-3 h-16 md:h-28 relative overflow-hidden active:scale-95">
                    
                    <div class="relative z-10 flex-shrink-0">
                        <div class="w-10 h-10 md:w-16 md:h-16 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg group-hover:bg-unitech-primary transition-colors">
                            <i data-feather="clipboard" class="w-5 h-5 md:w-8 md:h-8"></i>
                        </div>
                    </div>

                    <div class="relative z-10 flex flex-col justify-center flex-1">
                        <span class="text-[11px] md:text-sm font-black text-slate-800 uppercase tracking-tighter">Ordens de Serviço</span>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[8px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest">${activeChecklists.length} Ativas</span>
                        </div>
                    </div>
                     <span class="shortcut-badge px-1.5 py-0.5 bg-slate-50 text-slate-300 text-[8px] font-black font-mono rounded border border-gray-100 group-hover:text-unitech-primary transition-all uppercase tracking-tighter absolute right-2 top-2">F3</span>
                </button>

                <button onclick="window.navigateToModule('sales')" class="mobile-card-btn bg-white rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-unitech-primary group text-left flex items-center gap-3 h-16 md:h-28 relative overflow-hidden active:scale-95">
                    
                    <div class="relative z-10 flex-shrink-0">
                        <div class="w-10 h-10 md:w-16 md:h-16 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg group-hover:bg-purple-600 transition-colors">
                            <i data-feather="shopping-cart" class="w-5 h-5 md:w-8 md:h-8"></i>
                        </div>
                    </div>

                    <div class="relative z-10 flex flex-col justify-center flex-1">
                        <span class="text-[11px] md:text-sm font-black text-slate-800 uppercase tracking-tighter">Nova Venda (PDV)</span>
                        <div class="flex items-center gap-2 mt-0.5">
                             <div class="px-1.5 py-0.5 rounded-full bg-purple-50 text-[7px] md:text-[9px] font-black text-purple-600 border border-purple-100 uppercase">R$ ${revenueToday.toFixed(2)} Hoje</div>
                        </div>
                    </div>
                     <span class="shortcut-badge px-1.5 py-0.5 bg-slate-50 text-slate-300 text-[8px] font-black font-mono rounded border border-gray-100 group-hover:text-purple-600 transition-all uppercase tracking-tighter absolute right-2 top-2">F4</span>
                </button>

                <button onclick="window.navigateToModule('storefront')" class="mobile-card-btn bg-white rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-unitech-primary group text-left flex items-center gap-3 h-16 md:h-28 relative overflow-hidden active:scale-95">
                    
                    <div class="relative z-10 flex-shrink-0">
                        <div class="w-10 h-10 md:w-16 md:h-16 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg group-hover:bg-orange-600 transition-colors">
                            <i data-feather="shopping-bag" class="w-5 h-5 md:w-8 md:h-8"></i>
                        </div>
                    </div>

                    <div class="relative z-10 flex flex-col justify-center flex-1">
                        <span class="text-[11px] md:text-sm font-black text-slate-800 uppercase tracking-tighter">Produtos</span>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[8px] md:text-[10px] font-black text-orange-600 uppercase tracking-widest">${formatNumber(products.length)} Cadastrados</span>
                        </div>
                    </div>
                </button>

                <button onclick="window.navigateToModule('financial')" class="mobile-card-btn bg-white rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-gray-100 hover:border-unitech-primary group text-left flex items-center gap-3 h-16 md:h-28 relative overflow-hidden active:scale-95">
                    
                    <div class="relative z-10 flex-shrink-0">
                        <div class="w-10 h-10 md:w-16 md:h-16 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-colors">
                            <i data-feather="dollar-sign" class="w-5 h-5 md:w-8 md:h-8"></i>
                        </div>
                    </div>

                    <div class="relative z-10 flex flex-col justify-center flex-1">
                        <span class="text-[11px] md:text-sm font-black text-slate-800 uppercase tracking-tighter">Financeiro</span>
                         <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ativo</span>
                        </div>
                    </div>
                     <span class="shortcut-badge px-1.5 py-0.5 bg-slate-50 text-slate-300 text-[8px] font-black font-mono rounded border border-gray-100 group-hover:text-emerald-600 transition-all uppercase tracking-tighter absolute right-2 top-2">F6</span>
                </button>

            </div>
         </div>

         <!-- Section: Status Cards -->
         <div class="grid grid-cols-1 lg:grid-cols-2 gap-2 mobile-show">
            
            <!-- Cards: Prazo -->
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div class="flex items-center gap-2 mb-3">
                  <i data-feather="clock" class="w-4 h-4 text-unitech-primary"></i>
                  <h3 class="text-xs font-bold text-gray-800">Situação OS</h3>
               </div>
               
               <div class="grid grid-cols-4 gap-2">
                  <button onclick="window.navigateToModule('checklist', { filter: 'overdue' })" class="bg-unitech-error text-white rounded-lg p-2 text-center shadow-sm relative overflow-hidden group hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold relative z-10">${overdueCount}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 relative z-10 line-clamp-1">Vencidas</div>
                     <div class="absolute -right-2 -bottom-2 opacity-10"><i data-feather="alert-octagon" class="w-12 h-12"></i></div>
                  </button>
                   <button onclick="window.navigateToModule('checklist', { filter: 'today' })" class="bg-unitech-warning text-white rounded-lg p-2 text-center shadow-sm relative overflow-hidden hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold relative z-10">${dueTodayCount}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 relative z-10 line-clamp-1">Hoje</div>
                  </button>
                   <button onclick="window.navigateToModule('checklist', { filter: 'tomorrow' })" class="bg-blue-500 text-white rounded-lg p-2 text-center shadow-sm relative overflow-hidden hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold relative z-10">${dueTomorrowCount}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 relative z-10 line-clamp-1">Amanhã</div>
                  </button>
                   <button onclick="window.navigateToModule('checklist', { filter: 'ontime' })" class="bg-unitech-success text-white rounded-lg p-2 text-center shadow-sm relative overflow-hidden hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold relative z-10">${onTimeCount}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 relative z-10 line-clamp-1">No Prazo</div>
                  </button>
               </div>
            </div>

             <!-- Cards: Prioridade -->
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
               <div class="flex items-center gap-2 mb-3">
                  <i data-feather="alert-circle" class="w-4 h-4 text-unitech-primary"></i>
                  <h3 class="text-xs font-bold text-gray-800">Prioridade</h3>
               </div>
               
               <div class="grid grid-cols-4 gap-2">
                  <button onclick="window.navigateToModule('checklist', { filter: 'priority-alta' })" class="bg-unitech-error text-white rounded-lg p-2 text-center shadow-sm hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold">${priorityHigh}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 line-clamp-1">Alta</div>
                  </button>
                   <button onclick="window.navigateToModule('checklist', { filter: 'priority-normal' })" class="bg-unitech-warning text-white rounded-lg p-2 text-center shadow-sm hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold">${priorityMedium}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 line-clamp-1">Normal</div>
                  </button>
                   <button onclick="window.navigateToModule('checklist', { filter: 'priority-baixa' })" class="bg-unitech-success text-white rounded-lg p-2 text-center shadow-sm hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold">${priorityLow}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 line-clamp-1">Baixa</div>
                  </button>
                   <button onclick="window.navigateToModule('checklist', { filter: 'priority-realizada' })" class="bg-gray-400 text-white rounded-lg p-2 text-center shadow-sm hover:opacity-90 transition-opacity">
                     <div class="text-xl font-bold">${priorityNull}</div>
                     <div class="text-[8px] uppercase font-bold opacity-80 mt-0.5 line-clamp-1">Realizada</div>
                  </button>
               </div>
            </div>

         </div>



         <!-- Section: OS Chart (HIDDEN) -->

         <!-- Section: Financial Summary -->
          <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mobile-hide">
             <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-2">
                    <i data-feather="credit-card" class="w-5 h-5 text-indigo-500"></i>
                    <h3 class="font-bold text-gray-800">Resumo Financeiro</h3>
                </div>
                <div class="flex bg-gray-100 p-1 rounded-lg">
                    <button onclick="window.setDashboardFilter('day')" class="px-3 py-1 rounded text-[10px] font-bold transition-all ${filter === 'day' ? 'bg-white shadow text-unitech-primary' : 'text-gray-400 hover:text-gray-600'}">DIA</button>
                    <button onclick="window.setDashboardFilter('week')" class="px-3 py-1 rounded text-[10px] font-bold transition-all ${filter === 'week' ? 'bg-white shadow text-unitech-primary' : 'text-gray-400 hover:text-gray-600'}">SEMANA</button>
                    <button onclick="window.setDashboardFilter('month')" class="px-3 py-1 rounded text-[10px] font-bold transition-all ${filter === 'month' ? 'bg-white shadow text-unitech-primary' : 'text-gray-400 hover:text-gray-600'}">MÊS</button>
                    <button onclick="window.setDashboardFilter('year')" class="px-3 py-1 rounded text-[10px] font-bold transition-all ${filter === 'year' ? 'bg-white shadow text-unitech-primary' : 'text-gray-400 hover:text-gray-600'}">ANO</button>
                </div>
             </div>
             
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <!-- Receitas -->
                  <div onclick="window.navigateToModule('financial', { situation: 'Pago', type: 'revenue' })" class="p-4 rounded-lg border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 flex items-center gap-4 relative overflow-hidden cursor-pointer hover:border-green-400 hover:shadow-lg transition-all group">
                     <div class="w-12 h-12 rounded-lg bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20 flex-shrink-0">
                         <i data-feather="trending-up" class="w-6 h-6"></i>
                     </div>
                     <div class="min-w-0">
                         <p class="text-2xl font-bold text-gray-800 dark:text-white truncate">R$ ${revenueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Receitas Recebidas</p>
                     </div>
                 </div>

                  <!-- Despesas -->
                  <div onclick="window.navigateToModule('financial', { situation: 'Pago', type: 'expense' })" class="p-4 rounded-lg border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 flex items-center gap-4 relative overflow-hidden cursor-pointer hover:border-red-400 hover:shadow-lg transition-all group">
                     <div class="w-12 h-12 rounded-lg bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
                         <i data-feather="trending-down" class="w-6 h-6"></i>
                     </div>
                     <div class="min-w-0">
                         <p class="text-2xl font-bold text-gray-800 dark:text-white truncate">R$ ${expenseTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Despesas Pagas</p>
                     </div>
                 </div>

                  <!-- A Receber -->
                  <div onclick="window.navigateToModule('financial', { situation: 'Pendente', type: 'revenue' })" class="p-4 rounded-lg border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 flex items-center gap-4 relative overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all group">
                     <div class="w-12 h-12 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                         <i data-feather="clock" class="w-6 h-6"></i>
                     </div>
                     <div class="min-w-0">
                         <p class="text-2xl font-bold text-gray-800 dark:text-white truncate">R$ ${receivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">A Receber</p>
                     </div>
                 </div>

                  <!-- A Pagar -->
                  <div onclick="window.navigateToModule('financial', { situation: 'Pendente', type: 'expense' })" class="p-4 rounded-lg border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700 flex items-center gap-4 relative overflow-hidden cursor-pointer hover:border-orange-400 hover:shadow-lg transition-all group">
                     <div class="w-12 h-12 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
                         <i data-feather="hourglass" class="w-6 h-6"></i>
                     </div>
                     <div class="min-w-0">
                         <p class="text-2xl font-bold text-gray-800 dark:text-white truncate">R$ ${payables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">A Pagar</p>
                     </div>
                 </div>
             </div>
             </div>
          </div>

          <!-- Section: Financial Comparison (REMOVED) -->

          <!-- Section: System Stats -->
          <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
             <div class="flex items-center gap-2 mb-6">
                  <i data-feather="server" class="w-5 h-5 text-indigo-500"></i>
                  <h3 class="font-bold text-gray-800">Estatísticas do Sistema</h3>
             </div>
             
             <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 
                  <div class="bg-indigo-50/50 p-4 rounded-lg flex items-center gap-4 border border-indigo-100">
                      <div class="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <i data-feather="users" class="w-6 h-6"></i>
                      </div>
                      <div>
                          <p class="text-2xl font-bold text-gray-800">${clientsMonth}</p>
                          <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Clientes (Mês)</p>
                      </div>
                  </div>

                  <div class="bg-purple-50/50 p-4 rounded-lg flex items-center gap-4 border border-purple-100">
                      <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                          <i data-feather="tag" class="w-6 h-6"></i>
                      </div>
                      <div>
                          <p class="text-2xl font-bold text-gray-800">${osMonth}</p>
                          <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">OS (Mês)</p>
                      </div>
                  </div>

                  <div class="bg-blue-50/50 p-4 rounded-lg flex items-center gap-4 border border-blue-100">
                      <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                          <i data-feather="user-plus" class="w-6 h-6"></i>
                      </div>
                      <div>
                          <p class="text-2xl font-bold text-gray-800">${clientsToday}</p>
                          <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Clientes (Hoje)</p>
                      </div>
                  </div>

                  <div class="bg-violet-50/50 p-4 rounded-lg flex items-center gap-4 border border-violet-100">
                      <div class="w-12 h-12 bg-violet-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                          <i data-feather="file-text" class="w-6 h-6"></i>
                      </div>
                      <div>
                          <p class="text-2xl font-bold text-gray-800">${osToday}</p>
                          <p class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">OS (Hoje)</p>
                      </div>
                  </div>

             </div>
          </div>



          <!-- Section: Tools / integrations -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Widget: Anatel Celular Legal -->
              <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100 overflow-hidden relative group">
                  <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                  
                  <div class="flex items-center justify-between mb-6 relative z-10">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                             <i data-feather="smartphone" class="w-4 h-4"></i>
                        </div>
                        <h3 class="font-bold text-gray-800">Celular Legal</h3>
                      </div>
                      <span class="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200 font-mono">ANATEL.GOV</span>
                  </div>

                  <p class="text-xs text-gray-500 mb-4 leading-relaxed">
                      Verifique se o aparelho possui registro de roubo, furto ou extravio na base de dados nacional (CEMADO/EIR).
                  </p>
                  
                  <div class="flex flex-col md:flex-row gap-2">
                      <div class="relative flex-1">
                          <input type="text" id="anatel-imei-input" 
                              maxlength="15"
                              oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                              placeholder="Digite o IMEI (15 dígitos)..." 
                              class="w-full bg-white border border-gray-300 !text-black text-sm rounded-lg pl-4 pr-12 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono placeholder-gray-500"
                          >
                          <!-- Loader -->
                          <div id="anatel-loader" class="absolute right-4 top-1/2 -translate-y-1/2 hidden">
                              <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                          </div>
                      </div>
                      <button id="anatel-btn" onclick="checkAnatel()" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-wide transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                          Consultar
                      </button>
                  </div>

                  <div id="anatel-result" class="hidden">
                      <!-- Results injected here -->
                  </div>
              </div>
              
              <!-- Placeholder for next widget -->
              <div class="bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg shadow-sm border border-gray-100 border-dashed flex flex-col items-center justify-center text-center opacity-60">
                  <i data-feather="tool" class="w-8 h-8 text-gray-300 mb-3"></i>
                  <h4 class="font-bold text-gray-400">Ferramentas Adicionais</h4>
                  <p class="text-xs text-gray-400 mt-1">Integrações futuras aparecerão aqui</p>
              </div>

          </div>

      </div>
    `;
};

// Global filter helper - ensures re-rendering works correctly
window.setDashboardFilter = (filter) => {
    window.dashboardFinancialFilter = filter;
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.innerHTML = DashboardWidgets();
        if (window.feather) window.feather.replace();
    }
};

