# 📜 Histórico de Modificações - UniTech
Este arquivo registra sequencialmente todas as alterações solicitadas para facilitar controle de versão e rollback.

---

### [MOD-001] Otimização Global Mobile CSS
- **Arquivo**: `src/styles/mobile.css`
- **Descrição**: Regras universais CSS para otimizar todos os 12 módulos para mobile.

### [MOD-002] Reordenação do Menu Lateral (Sidebar)
- **Arquivo**: `src/components/MainLayout.js`
- **Descrição**: Moveu "Vendas (PDV)" para ser o primeiro item após Painel.

### [MOD-003] Reordenação do Menu FAB
- **Arquivo**: `src/components/MainLayout.js`
- **Descrição**: Moveu "Nova Venda" para o topo do menu flutuante.

### [MOD-004] Ativação da Barra Inferior Mobile
- **Arquivo**: `src/main.js`
- **Descrição**: Adicionou event listeners para os botões da barra inferior (Home, OS, Vendas, etc.).

### [MOD-005] Remoção de Script Duplicado
- **Arquivo**: `src/components/MainLayout.js`
- **Descrição**: Removeu handlers inline duplicados que conflitavam com main.js.

### [MOD-006] Correção Z-Index Sidebar
- **Arquivo**: `src/styles/mobile.css`
- **Descrição**: Ajustou z-index do Sidebar para 1001 (acima do overlay).

### [MOD-007] Refinamento do Layout do Carrinho
- **Arquivo**: `src/modules/sales.js`
- **Descrição**: Corrigiu scroll, espaçamento de cards e layout compacto.

### [MOD-008] Correção de Sobreposição Sidebar
- **Arquivo**: `src/styles/mobile.css`
- **Descrição**: Z-index elevado para 1200 para cobrir barra de navegação.

### [MOD-009] Limpeza de Atalhos Desktop no Mobile
- **Arquivo**: `src/components/MainLayout.js`, `src/styles/mobile.css`
- **Descrição**: Ocultou badges "F3", "F4", etc. em telas mobile.

### [MOD-010] Refinamentos Visuais Dashboard e Checklist
- **Arquivo**: `src/modules/checklist.js`, `src/styles/mobile.css`
- **Descrição**: Ajuste de padding na busca do checklist e redução de tamanho dos cards do dashboard.

---
**Status Atual:** Aguardando MOD-011.
