import { storage } from '../services/storage.js';

export class CoPilotModule {
  constructor() {
    const savedContext = storage.getAIContext();
    this.messages = savedContext.length > 0 ? savedContext : [
      { sender: 'ai', text: 'UNI-TECH AI ONLINE. Sistema pronto. Memória neural carregada. Digite seu comando.' }
    ];
  }

  async init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="h-full flex flex-col bg-[#0a0a0a] text-gray-100 overflow-hidden font-sans">
        <!-- AI Header -->
        <div class="p-6 border-b border-white/5 bg-[#0f0f0f] flex justify-between items-center relative overflow-hidden group">
            <!-- Decorative Background Glow -->
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-unitech-primary/10 blur-[80px] rounded-full group-hover:bg-unitech-primary/20 transition-all"></div>
            
            <div class="flex items-center gap-4 relative z-10">
                <div class="relative">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-unitech-primary to-orange-600 flex items-center justify-center shadow-lg shadow-unitech-primary/20">
                        <i data-feather="cpu" class="w-6 h-6 text-black"></i>
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0f0f0f] rounded-full flex items-center justify-center">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
                    </div>
                </div>
                <div>
                    <h3 class="text-lg font-black uppercase tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">UniTech Core Intelligence</h3>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[9px] font-bold text-unitech-primary bg-unitech-primary/10 px-1.5 py-0.5 rounded border border-unitech-primary/20 uppercase tracking-widest">Neural v2.5</span>
                        <span class="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Node: UTC_BRAVO_7</span>
                    </div>
                </div>
            </div>

            <button id="btn-clear-chat" class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all flex items-center gap-2 text-gray-400 hover:text-white group">
                <i data-feather="trash-2" class="w-3 h-3 text-red-400 group-hover:text-red-500"></i> Limpar Console
            </button>
        </div>

        <!-- Chat Area -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth" style="background-image: radial-gradient(#ffffff04 1px, transparent 0); background-size: 30px 30px;">
             ${this.renderMessages()}
        </div>

        <!-- Suggested Actions -->
        <div id="suggested-actions" class="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-[#0f0f0f]/50 backdrop-blur-sm border-t border-white/5">
             ${this.renderSuggestedActions()}
        </div>

        <!-- Input Area -->
        <div class="p-6 bg-[#0f0f0f] border-t border-white/5 relative">
             <!-- Ambient Glow -->
             <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-unitech-primary/30 to-transparent"></div>

             <form id="chat-form" class="relative max-w-5xl mx-auto flex gap-4">
                <div class="relative flex-1 group">
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-unitech-primary group-focus-within:text-orange-400 transition-colors">
                        <i data-feather="terminal" class="w-4 h-4"></i>
                    </div>
                    <input type="text" id="chat-input" 
                        class="w-full bg-black/50 border border-white/10 rounded-2xl p-4 pl-12 text-sm text-gray-200 placeholder-gray-600 focus:border-unitech-primary/50 focus:ring-4 focus:ring-unitech-primary/5 outline-none transition-all font-medium" 
                        placeholder="Digite sua dúvida técnica ou comando do sistema..." autocomplete="off">
                </div>
                <button type="submit" class="bg-gradient-to-r from-unitech-primary to-orange-600 hover:scale-[1.02] active:scale-[0.98] text-black px-8 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-unitech-primary/20 transition-all flex items-center gap-2">
                    <i data-feather="send" class="w-4 h-4"></i> Enviar
                </button>
             </form>
             <p class="text-[10px] text-center text-gray-600 mt-4 uppercase tracking-[0.2em] font-bold">Unitech Industrial AI • Professional Bench Assistant</p>
        </div>
      </div>
    `;

    this.scrollToBottom();
    const form = document.getElementById('chat-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserMessage();
    });

    const clearChatBtn = document.getElementById('btn-clear-chat');
    if (clearChatBtn) {
      clearChatBtn.addEventListener('click', () => {
        this.messages = [{ sender: 'ai', text: 'MEMORIA LIMPA. Sistema reiniciado.' }];
        storage.clearAIContext();
        const msgContainer = document.getElementById('chat-messages');
        if (msgContainer) msgContainer.innerHTML = this.renderMessages();
      });
    }

    // Attach suggested actions listeners
    this.attachActionListeners();

    if (window.feather) window.feather.replace();
  }

  renderMessages() {
    return this.messages.map(msg => {
      const isAI = msg.sender === 'ai';
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="flex ${isAI ? 'justify-start' : 'justify-end'} animate-slide-up">
          <div class="flex flex-col ${isAI ? 'items-start' : 'items-end'} max-w-[80%]">
             <div class="flex items-center gap-2 mb-1.5 px-1">
                ${isAI ? `
                    <div class="w-5 h-5 rounded bg-unitech-primary/20 flex items-center justify-center">
                        <i data-feather="cpu" class="w-3 h-3 text-unitech-primary"></i>
                    </div>
                    <span class="text-[10px] font-black text-unitech-primary uppercase tracking-wider">UniTech AI</span>
                ` : `
                    <span class="text-[10px] font-black text-gray-500 uppercase tracking-wider">Operador</span>
                    <div class="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                        <i data-feather="user" class="w-3 h-3 text-gray-400"></i>
                    </div>
                `}
                <span class="text-[9px] text-gray-600 font-mono">${time}</span>
             </div>

             <div class="relative group">
                <!-- Message Bubble -->
                <div class="${isAI
          ? 'bg-[#1a1a1a] border border-white/5 text-gray-200 rounded-2xl rounded-tl-none shadow-xl'
          : 'bg-unitech-primary text-black font-bold rounded-2xl rounded-tr-none shadow-lg shadow-unitech-primary/10'
        } p-4 text-sm leading-relaxed">
                   ${this.formatMessageText(msg.text)}
                </div>

                <!-- Subtle Decorative Element for AI -->
                ${isAI ? `<div class="absolute -left-1 top-2 w-px h-8 bg-gradient-to-b from-unitech-primary to-transparent opacity-50"></div>` : ''}
             </div>
          </div>
        </div>
      `;
    }).join('');
  }

  formatMessageText(text) {
    if (text.includes('•') || text.includes(':')) {
      return text.split('\n').map(line => {
        if (line.startsWith('•')) {
          return `<div class="flex gap-2 items-start mt-1">
                            <span class="text-unitech-primary mt-1">•</span>
                            <span>${line.substring(1).trim()}</span>
                        </div>`;
        }
        if (line.includes(':')) {
          const [key, ...val] = line.split(':');
          return `<div class="mb-1"><span class="text-xs uppercase font-black opacity-60 tracking-tighter">${key}:</span> <span class="font-medium">${val.join(':')}</span></div>`;
        }
        return `<p class="mb-1">${line}</p>`;
      }).join('');
    }
    return `<p>${text}</p>`;
  }

  renderSuggestedActions() {
    const actions = [
      { label: 'Valor do Estoque', query: 'Qual o valor total do meu estoque?' },
      { label: 'Ranking de Clientes', query: 'Quem são meus melhores clientes?' },
      { label: 'Status de Garantias', query: 'Como estão as garantias?' },
      { label: 'Situacao do Estoque', query: 'Qual a situação do estoque?' },
      { label: 'Vendas de Hoje', query: 'Quanto vendemos hoje?' },
      { label: 'Faturamento do Mês', query: 'Qual o faturamento deste mês?' },
      { label: 'OS Pendentes', query: 'Quantas OS pendentes temos?' },
      { label: 'Entradas de Hoje', query: 'Quantas OS entraram hoje?' }
    ];

    return actions.map(action => `
        <button class="suggested-action-btn flex-shrink-0 px-4 py-2 bg-white/5 hover:bg-unitech-primary hover:text-black border border-white/10 hover:border-unitech-primary rounded-xl text-[10px] font-black uppercase tracking-wider transition-all" data-query="${action.query}">
            ${action.label}
        </button>
    `).join('');
  }

  attachActionListeners() {
    const container = document.getElementById('suggested-actions');
    if (!container) return;

    container.querySelectorAll('.suggested-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query;
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = query;
          this.handleUserMessage();
        }
      });
    });
  }

  handleUserMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    this.addMessage('user', text);
    input.value = '';

    const thinkingId = 'thinking-' + Date.now();
    this.addMessage('ai', 'PROCESSANDO...', thinkingId);

    setTimeout(() => {
      const response = this.processQuery(text.toLowerCase());
      const thinkingMsgIndex = this.messages.findIndex(m => m.id === thinkingId);
      if (thinkingMsgIndex !== -1) {
        this.messages[thinkingMsgIndex].text = response;
        const container = document.getElementById('chat-messages');
        if (container) {
          container.innerHTML = this.renderMessages();
          this.scrollToBottom();
        }
      }
    }, 800);
  }

  addMessage(sender, text, id = null) {
    this.messages.push({ sender, text, id });
    storage.setAIContext(this.messages);
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML = this.renderMessages();
      this.scrollToBottom();
      if (window.feather) window.feather.replace();
    }
  }

  scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  processQuery(rawQuery) {
    const query = rawQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // AI LEARNING LOGIC
    if (/lembre-se|aprenda|anota ai|guarda ai/.test(query)) {
      const fact = rawQuery.replace(/^(lembre-se|aprenda|anota ai|guarda ai)\s*:?\s*/i, '').trim();
      if (fact) {
        storage.addKnowledge({
          fact,
          category: 'user_preference',
          tags: fact.toLowerCase().split(' ').filter(w => w.length > 3)
        });
        return "MEMÓRIA NEURAL ATUALIZADA. Fato registrado com sucesso.";
      }
    }

    // CHECK LEARNED KNOWLEDGE
    const knowledge = storage.getKnowledge();
    const bestMatch = knowledge.find(k => {
      const keywords = k.tags || [];
      return keywords.some(kw => query.includes(kw)) || query.includes(k.fact.toLowerCase());
    });
    if (bestMatch && query.length > 5) {
      return `MEMÓRIA RECURSIVA:\n\n${bestMatch.fact}`;
    }

    // STOCK
    if (/estoque|produto|peca|item|qtd|catalogo/.test(query)) {
      const products = storage.getProducts();
      if (/baixo|acabando|pouco|fim/.test(query)) {
        const low = products.filter(p => p.stock < 5);
        if (low.length === 0) return "Todos os níveis de estoque estão nominais (acima de 5 un).";
        return `ALERTA DE ESTOQUE BAIXO:\n\n${low.map(p => `• [${p.sku}] ${p.name}: ${p.stock} un`).join('\n')}`;
      }
      if (/valor|preco|custo/.test(query)) {
        const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
        return `VALORIZAÇÃO DE ESTOQUE:\n\nO valor total em mercadorias é de R$ ${totalValue.toFixed(2)}.`;
      }
      const total = products.reduce((acc, p) => acc + p.stock, 0);
      return `Inventário total contabiliza ${total} itens em ${products.length} categorias.`;
    }

    // SERVICE ORDERS
    if (/os|ordem|servico|checklist/.test(query)) {
      const checklists = storage.getChecklists();
      if (/pendente|aberto|analise/.test(query)) {
        const pending = checklists.filter(c => !['FINALIZADO', 'CONCLUIDO', 'ENTREGUE'].includes((c.situation || '').toUpperCase()));
        return `CONTROLE DE FLUXO:\n\nExistem ${pending.length} Ordens de Serviço pendentes.`;
      }
      if (/hoje|entrada/.test(query)) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayOS = checklists.filter(c => c.date && c.date.startsWith(todayStr));
        return `ENTRADAS DE HOJE: ${todayOS.length} novas OS registradas.`;
      }
      if (/garantia|termo|vencid/.test(query)) {
        const now = new Date();
        const activeWarranty = checklists.filter(c => c.deadline && new Date(c.deadline) > now);
        return `SITUAÇÃO DE GARANTIAS:\n\n• Ativas: ${activeWarranty.length}\n• Emitidos: ${checklists.length}`;
      }
      return `O sistema possui ${checklists.length} Ordens de Serviço no histórico.`;
    }

    // SALES / FINANCE
    if (/venda|faturamento|dinheiro|caixa|receita|lucro/.test(query)) {
      const sales = storage.getSales();
      if (/hoje|dia|agora/.test(query)) {
        const todayStr = new Date().toDateString();
        const todaySales = sales.filter(s => new Date(s.date).toDateString() === todayStr);
        const total = todaySales.reduce((acc, s) => acc + s.total, 0);
        return `RELATÓRIO DIÁRIO:\n\n• Transações: ${todaySales.length}\n• Total: R$ ${total.toFixed(2)}`;
      }
      if (/mes|30 dias|mensal/.test(query)) {
        const now = new Date();
        const thisMonthSales = sales.filter(s => {
          const d = new Date(s.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const total = thisMonthSales.reduce((acc, s) => acc + s.total, 0);
        return `DESEMPENHO MENSAL:\n\n• Volume: ${thisMonthSales.length}\n• Faturamento: R$ ${total.toFixed(2)}`;
      }
      const total = sales.reduce((acc, s) => acc + s.total, 0);
      return `FATURAMENTO GLOBAL: R$ ${total.toFixed(2)} em ${sales.length} vendas.`;
    }

    // CLIENTS
    if (/cliente|usuario|pessoa/.test(query)) {
      const clients = storage.getClients();
      if (/ranking|melhor|top|frequente/.test(query)) {
        const sales = storage.getSales();
        const clientSales = {};
        sales.forEach(s => { clientSales[s.client] = (clientSales[s.client] || 0) + s.total; });
        const ranked = Object.entries(clientSales).sort(([, a], [, b]) => b - a).slice(0, 3);
        if (ranked.length === 0) return "Sem dados suficientes para ranking.";
        return `TOP CLIENTES:\n\n${ranked.map(([n, v], i) => `${i + 1}. ${n}: R$ ${v.toFixed(2)}`).join('\n')}`;
      }
      return `Base possui ${clients.length} clientes registrados.`;
    }

    // TECHNICAL
    if (/curto|esquenta|consumo|quente|liga/.test(query)) {
      return "DIAGNÓSTICO (POWER):\n\n1. Verifique C1202 na VDD_MAIN.\n2. Valide CI de Carga.\n3. Injete tensão e use câmera térmica.";
    }
    if (/tela|display|imagem|touch/.test(query)) {
      return "DIAGNÓSTICO (IMAGEM):\n\n1. Confira conector FPC.\n2. Filtros FL nas MIPI.\n3. Force reinicialização.";
    }

    return `Comando não reconhecido. Tente:\n- "Valor do estoque"\n- "Ranking de clientes"\n- "Vendas do mês"`;
  }
}
