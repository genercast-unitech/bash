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
    this.addMessage('ai', '<div class="flex gap-1 items-center px-1 py-1"><span class="w-1.5 h-1.5 bg-unitech-primary rounded-full animate-bounce"></span><span class="w-1.5 h-1.5 bg-unitech-primary rounded-full animate-bounce [animation-delay:0.2s]"></span><span class="w-1.5 h-1.5 bg-unitech-primary rounded-full animate-bounce [animation-delay:0.4s]"></span><span class="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Analisando dados...</span></div>', thinkingId);

    setTimeout(() => {
      const response = this.processQuery(text.toLowerCase());
      const thinkingMsgIndex = this.messages.findIndex(m => m.id === thinkingId);
      if (thinkingMsgIndex !== -1) {
        this.messages[thinkingMsgIndex].text = response;
        const container = document.getElementById('chat-messages');
        if (container) {
          container.innerHTML = this.renderMessages();
          this.scrollToBottom();
          if (window.feather) window.feather.replace();
        }
      }
    }, 1200);
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
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }

  processQuery(rawQuery) {
    const query = rawQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // 1. CORE BUSINESS INTELLIGENCE

    // SALES & REVENUE
    if (/(venda|faturamento|ganho|caixa|receita|dinheiro|vendeu|lucro)/.test(query)) {
      const sales = storage.getSales();
      const now = new Date();

      if (/(hoje|agora|dia)/.test(query)) {
        const todaySales = sales.filter(s => new Date(s.date).toDateString() === now.toDateString());
        const total = todaySales.reduce((acc, s) => acc + s.total, 0);
        if (todaySales.length === 0) return "SITUAÇÃO DO DIA: Ainda não registramos vendas hoje. Que tal baixar um relatório de metas?";
        return `ANÁLISE DE VENDAS (HOJE):\n\n• Volume: ${todaySales.length} transações\n• Faturamento: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Ticket Médio: R$ ${(total / todaySales.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nO desempenho está dentro da média esperada para este horário.`;
      }

      if (/(mes|mensal|30 dias)/.test(query)) {
        const monthSales = sales.filter(s => {
          const d = new Date(s.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const total = monthSales.reduce((acc, s) => acc + s.total, 0);
        return `PERFORMANCE MENSAL:\n\n• Total Acumulado: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Vendas Realizadas: ${monthSales.length}\n\nDeseja ver o ranking dos produtos mais vendidos este mês?`;
      }

      const totalGlobal = sales.reduce((acc, s) => acc + s.total, 0);
      return `HISTÓRICO GLOBAL:\nTotal de R$ ${totalGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${sales.length} transações processadas.`;
    }

    // INVENTORY & STOCK
    if (/(estoque|produto|item|peca|mercadoria|quantidade|sku)/.test(query)) {
      const products = storage.getProducts();

      if (/(baixo|acabando|falta|reposicao)/.test(query)) {
        const low = products.filter(p => (p.stock || 0) <= (p.minStock || 5));
        if (low.length === 0) return "ESTOQUE OTIMIZADO: Todos os itens estão com níveis acima da margem de segurança.";
        return `ALERTAS DE REPOSIÇÃO:\n\n${low.slice(0, 10).map(p => `• ${p.name}: ${p.stock} un (Mín: ${p.minStock || 5})`).join('\n')}\n${low.length > 10 ? `\n...e mais ${low.length - 10} itens.` : ''}`;
      }

      if (/(valor|custo|preco|patrimonio)/.test(query)) {
        const totalCost = products.reduce((acc, p) => acc + ((p.cost || 0) * (p.stock || 0)), 0);
        const totalRetail = products.reduce((acc, p) => acc + ((p.retail || 0) * (p.stock || 0)), 0);
        return `VALORIZAÇÃO DE ATIVOS:\n\n• Custo de Aquisição: R$ ${totalCost.toLocaleString('pt-BR')}\n• Valor Estimado de Venda: R$ ${totalRetail.toLocaleString('pt-BR')}\n• Lucro Estimado (Bruto): R$ ${(totalRetail - totalCost).toLocaleString('pt-BR')}`;
      }

      const totalItems = products.reduce((acc, p) => acc + (p.stock || 0), 0);
      return `RESUMO DO INVENTÁRIO:\nPossuímos ${products.length} SKUs ativos totalizando ${totalItems} unidades em estoque físico.`;
    }

    // CLIENTS & CRM
    if (/(cliente|crm|quem|melhor|ranking)/.test(query)) {
      const clients = storage.getClients();
      const sales = storage.getSales();

      if (/(ranking|melhor|fiel|top)/.test(query)) {
        const spendMap = {};
        sales.forEach(s => {
          const key = s.clientName || 'Consumidor Final';
          spendMap[key] = (spendMap[key] || 0) + s.total;
        });
        const ranked = Object.entries(spendMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (ranked.length === 0) return "Ainda não há dados de vendas suficientes para gerar um ranking de fidelidade.";
        return `TOP 5 CLIENTES (MAIOR FATURAMENTO):\n\n${ranked.map(([name, val], i) => `${i + 1}. ${name}: R$ ${val.toLocaleString('pt-BR')}`).join('\n')}`;
      }
      return `BANCO DE DADOS: Temos ${clients.length} clientes cadastrados na sua base de dados.`;
    }

    // SERVICE ORDERS (OS)
    if (/(os|ordem|servico|conserto|reparo|checklist)/.test(query)) {
      const checklists = storage.getChecklists();

      if (/(pendente|aberta|hoje|entrada)/.test(query)) {
        const active = checklists.filter(c => !['FINALIZADO', 'CONCLUIDO', 'ENTREGUE'].includes((c.situation || '').toUpperCase()));
        return `FLUXO DE BANCADA:\n\n• OS Pendentes: ${active.length}\n• Total no Histórico: ${checklists.length}\n\nDeseja filtrar por técnico ou por tempo de espera?`;
      }
      return `GESTÃO TÉCNICA: Identificamos ${checklists.length} registros de ordens de serviço no ecossistema.`;
    }

    // 2. TECHNICAL HARDWARE REPAIR KNOWLEDGE (BENCH ASSISTANT)
    if (/(curto|consumo|esquenta|vbat|vmain|power|ligar|nao liga)/.test(query)) {
      return `DIAGNÓSTICO TÉCNICO (FALHA DE POWER):\n\n1. Verifique consumo na fonte (0-20mA: Oscilador/CPU; 50-150mA: Memória/Boot; >500mA: Curto Direto).\n2. Verifique VBAT e VDD_MAIN para capacitores em curto.\n3. Injete tensão baixa (1V a 2V) e use rosin ou câmera térmica para localizar componente aquecendo.\n4. Comum em aparelhos molhados: oxidação no CI de Carga (Tristar/Hydra ou equivalente).`;
    }

    if (/(imagem|tela|touch|fpc|luz|positiva)/.test(query)) {
      return `DIAGNÓSTICO (IMAGEM E TOUCH):\n\n1. Verifique conector FPC sob microscópio para pinos tortos ou oxidados.\n2. Meça trilhas MIPI e linhas de 1.8V / 5.7V (LCM).\n3. Confira filtros FL (bobinas) próximos ao conector.\n4. Touch travado: Verifique tensões de alimentação do controlador de touch ou substitua o frontal para teste.`;
    }

    if (/(carregar|carga|usb|bateria|fake charging)/.test(query)) {
      return `FALHA DE CARREGAMENTO:\n\n1. Meça tensão no conector da bateria (deve estar > 3.7V para iniciar).\n2. Teste com Dock Test (linhas D+ e D-).\n3. Substitua o Flex de Carga para descartar periférico.\n4. Falha persistente: Analise o controlador USB/U2 ou CI de gerenciamento de energia (PMIC).`;
    }

    // 3. AI LEARNING CAPABILITY
    if (/(aprenda|lembre-se|anota ai|guarda ai)/.test(query)) {
      const fact = query.replace(/(aprenda|lembre-se|anota ai|guarda ai)\s*:?\s*/i, '').trim();
      if (fact) {
        storage.addKnowledge({
          fact,
          category: 'user_preference',
          tags: fact.split(' ').filter(w => w.length > 3)
        });
        return "SISTEMA ATUALIZADO: Salvei essa informação na minha memória de longo prazo. Estará disponível para consultas futuras.";
      }
    }

    // CHECK LEARNED KNOWLEDGE
    const knowledge = storage.getKnowledge();
    const match = knowledge.find(k => k.tags?.some(t => query.includes(t)) || query.includes(k.fact.toLowerCase()));
    if (match) return `MEMÓRIA RECURSIVA:\n\n${match.fact}`;

    // DEFAULT
    return "Não compreendi o comando. Sou um assistente técnico e de negócios. Tente perguntar sobre:\n\n- \"Quanto faturamos este mês?\"\n- \"Quais produtos estão acabando?\"\n- \"Dicas para celular em curto\"\n- \"Melhores clientes do ano\"";
  }
}
