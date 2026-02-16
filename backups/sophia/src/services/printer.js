/**
 * PrinterService - Serviço de Impressão
 * Responsável pela comunicação com impressoras térmicas/laser
 * 
 * @module services/printer
 */

import { storage } from './storage.js';

export class PrinterService {
    constructor() {
        this.printerConnected = false;
        this.printerType = 'thermal'; // 'thermal' or 'laser'
        this.checkPrinterStatus();
    }

    /**
     * Verifica status da impressora
     */
    checkPrinterStatus() {
        // Simula verificação de impressora
        // Em produção, aqui você faria uma chamada real para verificar a impressora
        setTimeout(() => {
            this.printerConnected = true;
            console.log('[PrinterService] Impressora conectada e pronta');
        }, 100);
    }

    /**
     * Imprime DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)
     * @param {string|Object} saleOrId - ID da venda ou objeto da venda completo
     * @returns {Promise<boolean>}
     */
    async printDANFE(saleOrId) {
        try {
            const saleId = typeof saleOrId === 'string' ? saleOrId : saleOrId.id;
            console.log(`[PrinterService] Preparando NF-e para venda ${saleId}`);

            // Resolve sale object
            let sale;
            if (typeof saleOrId === 'object') {
                sale = saleOrId;
            } else {
                sale = this.getSaleData(saleId);
            }

            if (!sale) throw new Error(`Venda não encontrada (ID: ${saleId})`);

            const content = `
                <div style="font-family: monospace; padding: 20px;">
                    <h2 style="text-align: center;">DANFE NFC-e - Documento Auxiliar</h2>
                    <h3 style="text-align: center;">Nota Fiscal de Consumidor Eletrônica</h3>
                    <hr/>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <p><strong>Venda:</strong> ${sale.id}</p>
                        ${(() => {
                    const osItem = sale.items.find(i => i.isOS || i.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i));
                    if (osItem) {
                        let osId = osItem.osId;
                        if (!osId) {
                            const match = osItem.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i);
                            if (match) osId = match[1];
                        }
                        const label = sale.originQuoteId ? 'VENDA CONCRETIZADA DA OS' : 'REFERENTE OS';
                        return `<p><strong>${label}:</strong> #${osId}</p>`;
                    }
                    return '';
                })()}
                    </div>
                    <p><strong>Data:</strong> ${new Date(sale.date).toLocaleString('pt-BR')}</p>
                    <p><strong>Vendedor:</strong> ${sale.sellerName || 'N/A'}</p>
                    <p><strong>Cliente:</strong> ${sale.clientName || 'Consumidor Final'}</p>
                    <hr/>
                    <table style="width: 100%; text-align: left;">
                        <thead>
                            <tr>
                                <th>Qtd</th>
                                <th>Item</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.items.map(item => `
                                <tr>
                                    <td>${item.qty}x</td>
                                    <td>${item.name}</td>
                                    <td style="text-align: right;">R$ ${(item.total || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        </tbody>
                    </table>
                    <hr/>
                    ${(sale.discount && sale.discount.value > 0) ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span>Subtotal:</span>
                            <span>R$ ${(sale.subtotal).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #000;">
                           <span>Desconto:</span>
                           <span>- R$ ${parseFloat(sale.discount.amount).toFixed(2)}</span>
                        </div>
                        <hr style="border-top: 1px dotted #000; margin: 5px 0;"/>
                    ` : ''}
                    <h3 style="text-align: right;">TOTAL: R$ ${(sale.total || 0).toFixed(2)}</h3>
                    <div style="text-align: center; margin-top: 20px;">
                        <p>Consulte pela Chave de Acesso em:</p>
                        <p>http://nfce.fazenda.mg.gov.br/portalnfce</p>
                        <p>CHAVE DE ACESSO: 3123 0112 3456 7890 1234 5500 1000 0000 0110 0000 1234</p>
                    </div>
                </div>
            `;

            this.openPrintWindow(content);
            return true;
        } catch (error) {
            console.error('[PrinterService] Erro ao imprimir NF-e:', error);
            if (window.toastService) window.toastService.error(`Erro ao imprimir NF-e: ${error.message}`);
            else alert(`Erro ao imprimir NF-e: ${error.message}`);
            return false;
        }
    }

    /**
     * Gera HTML do Cupom Não Fiscal
     * @param {Object} sale - Objeto da venda
     * @returns {string}
     */
    generateCupomHTML(sale) {
        return `
            <div style="font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; background: white; color: black;">
                <h3 style="text-align: center; margin-bottom: 5px; font-size: 18px;">UNITECH CELULARES</h3>
                <p style="text-align: center; font-size: 11px; margin-top: 0; color: #333;">Rua Exemplo, 123 - Centro<br/>Contato: (00) 0000-0000</p>
                <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                <p style="text-align: center; font-weight: bold; margin: 8px 0; font-size: 14px; letter-spacing: 1px;">CUPOM NÃO FISCAL</p>
                <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                ${(() => {
                const osItem = sale.items.find(i => i.isOS || i.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i));
                let label = 'Venda';
                let idDisplay = sale.id;

                if (osItem) {
                    label = sale.originQuoteId ? 'VENDA' : 'CONSERTO';
                    if (osItem.osId) {
                        idDisplay = osItem.osId;
                    } else {
                        const match = osItem.name.match(/(?:CONSERTO OS|OS) #([0-9]+)/i);
                        if (match) idDisplay = match[1];
                    }
                }

                return `<p style="margin: 5px 0; font-size: 13px;"><strong>${label}:</strong> ${idDisplay}<br/>`;
            })()}
                <strong>Data:</strong> ${new Date(sale.date).toLocaleString('pt-BR')}<br/>
                <strong>Vendedor:</strong> ${sale.sellerName || 'N/A'}</p>
                <p style="margin: 8px 0; font-size: 13px;"><strong>Cliente:</strong> ${sale.clientName || 'Consumidor Final'}</p>
                <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding-bottom: 5px;">ITEM</th>
                            <th style="text-align: right; padding-bottom: 5px;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td style="padding: 4px 0;">${item.qty}x ${item.name}</td>
                                <td style="text-align: right; vertical-align: top;">R$ ${(item.total || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
                <div style="font-size: 12px;">
                    ${(sale.discount && sale.discount.value > 0) ? `
                        <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                            <span>Subtotal:</span>
                            <span>R$ ${(sale.subtotal).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 4px 0; font-weight: bold;">
                           <span>Desconto:</span>
                           <span>- R$ ${parseFloat(sale.discount.amount).toFixed(2)}</span>
                        </div>
                         <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                        <span style="font-size: 16px; font-weight: bold;">TOTAL:</span>
                        <span style="font-size: 16px; font-weight: bold;">R$ ${(sale.total || 0).toFixed(2)}</span>
                    </div>
                </div>
                <p style="font-size: 12px; margin: 8px 0;"><strong>Pagamento:</strong> ${(() => {
                const methodMap = {
                    'MONEY': 'DINHEIRO',
                    'CASH': 'DINHEIRO',
                    'CREDIT_CARD_PARCELADO': 'CARTÃO DE CRÉDITO (PARCELADO)',
                    'CREDIT_CARD': 'CARTÃO DE CRÉDITO',
                    'DEBIT_CARD': 'CARTÃO DE DÉBITO',
                    'PIX': 'PIX',
                    'ORCAMENTO': 'ORÇAMENTO',
                    'DINHEIRO': 'DINHEIRO'
                };
                return methodMap[sale.method] || sale.method || 'Dinheiro';
            })()}${sale.pixBank ? `<br/><strong>Banco:</strong> ${sale.pixBank}` : ''}</p>
                <div style="border-top: 1px dashed #000; margin: 15px 0;"></div>
                <p style="text-align: center; font-size: 11px; margin-top: 10px; font-style: italic;">Obrigado pela preferência!</p>
            </div>
        `;
    }

    /**
     * Imprime Cupom Não Fiscal
     * @param {string|Object} saleOrId - ID da venda ou objeto da venda completo
     * @returns {Promise<boolean>}
     */
    async printCUPOM(saleOrId) {
        try {
            const saleId = typeof saleOrId === 'string' ? saleOrId : saleOrId.id;
            // Resolve sale object
            let sale = (typeof saleOrId === 'object') ? saleOrId : this.getSaleData(saleId);
            if (!sale) throw new Error(`Venda não encontrada (ID: ${saleId})`);

            const content = this.generateCupomHTML(sale);
            this.openPrintWindow(content);
            return true;
        } catch (error) {
            console.error('[PrinterService] Erro ao imprimir Cupom:', error);
            return false;
        }
    }

    /**
     * Imprime Comprovante de Estorno
     * @param {string|Object} saleOrId - ID da venda ou objeto de transação
     */
    async printRefundReceipt(saleOrId) {
        try {
            const id = typeof saleOrId === 'string' ? saleOrId : saleOrId.id;
            console.log(`[PrinterService] Preparando Estorno para ${id}`);

            // Resolve object
            let data;
            if (typeof saleOrId === 'object') {
                data = saleOrId;
            } else {
                // Try finding in sales first, then fallback to basic object structure
                data = this.getSaleData(id) || { id, date: new Date(), total: 0, items: [] };
            }

            // Extract OS / Device Info
            let deviceInfo = '';
            let osNumber = '';

            // Check in Sale Items
            if (data.items && Array.isArray(data.items)) {
                const osItem = data.items.find(i => i.isOS || i.name.includes('OS') || i.name.includes('CONSERTO'));
                if (osItem) {
                    // Try to extract OS ID
                    const match = osItem.name.match(/#([0-9]+)/);
                    if (match || osItem.osId) {
                        const osId = osItem.osId || match[1];
                        osNumber = osId;

                        // Look up OS details
                        const checklists = storage.getChecklists();
                        const osData = checklists.find(c => c.id == osId);

                        if (osData) {
                            deviceInfo = `${osData.device} ${osData.model || ''}`;
                        }
                    }
                }
            }

            // Fallback: Check if description in transaction has info
            if (!osNumber && data.description && data.description.includes('OS #')) {
                const match = data.description.match(/OS #([0-9]+)/);
                if (match) {
                    osNumber = match[1];
                    const checklists = storage.getChecklists();
                    const osData = checklists.find(c => c.id == osNumber);
                    if (osData) deviceInfo = `${osData.device} ${osData.model || ''}`;
                }
            }


            const content = `
                <div style="font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto;">
                    <h3 style="text-align: center;">UNITECH CELULARES</h3>
                    <p style="text-align: center; font-size: 12px;">COMPROVANTE DE ESTORNO</p>
                    <hr style="border-top: 1px dashed #000;"/>
                    <p><strong>Origem:</strong> ${id}</p>
                    ${osNumber ? `<p><strong>Ref. OS:</strong> #${osNumber}</p>` : ''}
                    ${deviceInfo ? `<p><strong>Aparelho:</strong> ${deviceInfo}</p>` : ''}
                    <p><strong>Data Estorno:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    <hr style="border-top: 1px dashed #000;"/>
                    <h2 style="text-align: center;">ESTORNADO</h2>
                    <h3 style="text-align: center;">R$ ${(parseFloat(data.total || data.finalValue || 0)).toFixed(2)}</h3>
                    <hr style="border-top: 1px dashed #000;"/>
                    <p style="text-align: center; font-size: 10px;">Assinatura do Responsável</p>
                    <br/><br/>
                    <hr style="border-top: 1px solid #000;"/>
                </div>
            `;

            this.openPrintWindow(content);
            return true;
        } catch (error) {
            console.error('[PrinterService] Erro ao imprimir Estorno:', error);
            if (window.toastService) window.toastService.error(`Erro ao imprimir Estorno: ${error.message}`);
            else alert(`Erro ao imprimir Estorno: ${error.message}`);
            return false;
        }
    }

    /**
     * Helper to get sale data from storage
     */
    getSaleData(vendaId) {
        try {
            const sales = storage.getSales();
            return sales.find(s => s.id === vendaId);
        } catch (e) {
            console.error('Error fetching sale:', e);
            return null;
        }
    }

    /**
     * Opens a print window with the content
     */
    openPrintWindow(content) {
        // Use a specific name to prevent multiple windows if needed, or '_blank' for new ones
        const printWindow = window.open('', '_blank', 'width=450,height=600,menubar=no,toolbar=no,location=no,status=no');

        if (printWindow) {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Impressão - UniTech</title>
                    <meta charset="utf-8">
                    <style>
                        body { 
                            margin: 0; 
                            padding: 15px; 
                            font-family: 'Courier New', Courier, monospace; 
                            font-size: 14px;
                            color: #000;
                            background: #fff;
                        }
                        @media print {
                            @page { margin: 0; }
                            body { margin: 0.5cm; }
                            .no-print { display: none; }
                        }
                        .print-btn {
                            display: block;
                            width: 100%;
                            padding: 10px;
                            background: #000;
                            color: #fff;
                            text-align: center;
                            text-decoration: none;
                            font-weight: bold;
                            margin-bottom: 20px;
                            border-radius: 4px;
                            cursor: pointer;
                        }
                        .print-btn:hover {
                            background: #333;
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print">
                        <button onclick="window.print()" class="print-btn">🖨️ IMPRIMIR AGORA</button>
                    </div>
                    ${content}
                    <script>
                        // Wait for resources to load
                        window.onload = function() {
                            // Small delay to ensure rendering
                            setTimeout(function() {
                                window.focus();
                                window.print();
                            }, 500);
                        }
                    </script>
                </body>
                </html>
            `;

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        } else {
            if (window.toastService) window.toastService.warning('Pop-up bloqueado! Permita pop-ups para imprimir.');
            else alert('Pop-up bloqueado! Permita pop-ups para imprimir.');
        }
    }

    /**
     * Imprime lista de produtos (genérico)
     * @param {Array} items - Lista de itens
     */
    async printProductList(items) {
        console.log('[PrinterService] Imprimindo lista de produtos...');
        // Implementação futura
    }

    /**
     * Gera e baixa XML de Venda (Estilo NFC-e)
     * @param {Object} sale - Objeto da venda
     */
    generateSaleXML(sale) {
        try {
            console.log('[PrinterService] Gerando XML para venda:', sale.id);
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
    <NFe>
        <infNFe Id="NFe${sale.id.replace(/[^0-9]/g, '')}" versao="4.00">
            <ide>
                <cUF>31</cUF>
                <natOp>VENDA DE MERCADORIA</natOp>
                <mod>65</mod>
                <serie>1</serie>
                <nNF>${sale.id.replace(/[^0-9]/g, '').slice(-9)}</nNF>
                <dhEmi>${new Date(sale.date).toISOString()}</dhEmi>
                <tpNF>1</tpNF>
                <idDest>1</idDest>
                <cMunFG>3106200</cMunFG>
                <tpImp>4</tpImp>
                <tpEmis>1</tpEmis>
                <finNFe>1</finNFe>
                <indFinal>1</indFinal>
                <indPres>1</indPres>
                <procEmi>0</procEmi>
                <verProc>UNITECH_V7.5</verProc>
            </ide>
            <emit>
                <CNPJ>00000000000191</CNPJ>
                <xNome>UNITECH CELULARES LTDA</xNome>
                <enderEmit>
                    <xLgr>RUA DA TECNOLOGIA</xLgr>
                    <nro>123</nro>
                    <xBairro>CENTRO</xBairro>
                    <cMun>3106200</cMun>
                    <xMun>BELO HORIZONTE</xMun>
                    <UF>MG</UF>
                    <CEP>30000000</CEP>
                </enderEmit>
            </emit>
            <dest>
                <xNome>${sale.clientName || 'CONSUMIDOR FINAL'}</xNome>
                ${sale.clientId ? `<id>${sale.clientId}</id>` : ''}
            </dest>
            <det nItem="1">
                ${sale.items.map((item, index) => `
                <item nItem="${index + 1}">
                    <prod>
                        <cProd>${item.id}</cProd>
                        <xProd>${item.name}</xProd>
                        <qCom>${item.qty}</qCom>
                        <vUnCom>${parseFloat(item.price || 0).toFixed(2)}</vUnCom>
                        <vProd>${parseFloat(item.total || 0).toFixed(2)}</vProd>
                        ${item.warrantyCode ? `<warrantyCode>${item.warrantyCode}</warrantyCode>` : ''}
                    </prod>
                </item>`).join('')}
            </det>
            <total>
                <ICMSTot>
                    <vProd>${parseFloat(sale.subtotal || sale.total || 0).toFixed(2)}</vProd>
                    <vDesc>${parseFloat(sale.discount?.amount || 0).toFixed(2)}</vDesc>
                    <vNF>${parseFloat(sale.total || 0).toFixed(2)}</vNF>
                </ICMSTot>
            </total>
            <pag>
                <detPag>
                    <tPag>${sale.method === 'Dinheiro' ? '01' : sale.method === 'PIX' ? '17' : '99'}</tPag>
                    <vPag>${parseFloat(sale.total || 0).toFixed(2)}</vPag>
                </detPag>
            </pag>
            <infAdic>
                <infCpl>Vendedor: ${sale.sellerName || 'N/A'}; ID: ${sale.id}</infCpl>
            </infAdic>
        </infNFe>
    </NFe>
</nfeProc>`;

            this.downloadXML(`NFe_${sale.id}.xml`, xmlContent);
            return true;
        } catch (error) {
            console.error('[PrinterService] Erro ao gerar XML:', error);
            if (window.toastService) window.toastService.error('Erro ao gerar XML: ' + error.message);
            else alert('Erro ao gerar XML: ' + error.message);
            return false;
        }
    }

    /**
     * Gera e baixa XML de Relatório Financeiro
     * @param {Array} transactions - Lista de transações
     * @param {Object} metadata - Metadados do relatório (datas, filtros)
     */
    generateFinancialReportXML(transactions, metadata) {
        try {
            console.log('[PrinterService] Gerando XML de Relatório Financeiro');
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<FinancialReport>
    <Header>
        <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
        <Period>
            <Start>${metadata.startDate}</Start>
            <End>${metadata.endDate}</End>
        </Period>
        <Filters>
            <Type>${metadata.type}</Type>
        </Filters>
        <Summary>
            <TotalRevenue>${parseFloat(metadata.stats.revenue || 0).toFixed(2)}</TotalRevenue>
            <TotalExpense>${parseFloat(metadata.stats.expense || 0).toFixed(2)}</TotalExpense>
            <Balance>${parseFloat(metadata.stats.balance || 0).toFixed(2)}</Balance>
        </Summary>
    </Header>
    <Transactions>
        ${transactions.map(t => `
        <Transaction id="${t.id}">
            <Type>${t.type}</Type>
            <Date>${t.dueDate}</Date>
            <Description>${t.description}</Description>
            <Category>${t.category}</Category>
            <Entity>
                <Name>${t.person}</Name>
                <Role>${t.seller || 'System'}</Role>
            </Entity>
            <Value>${parseFloat(t.finalValue || 0).toFixed(2)}</Value>
            <Status>${t.status}</Status>
            <PaymentMethod>${t.method}</PaymentMethod>
        </Transaction>`).join('')}
    </Transactions>
</FinancialReport>`;

            this.downloadXML(`Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.xml`, xmlContent);
            return true;
        } catch (error) {
            console.error('[PrinterService] Erro ao gerar XML Financeiro:', error);
            if (window.toastService) window.toastService.error('Erro ao gerar XML: ' + error.message);
            else alert('Erro ao gerar XML: ' + error.message);
            return false;
        }
    }

    /**
     * Helper para download de arquivo
     */
    downloadXML(filename, content) {
        const blob = new Blob([content], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Abre gaveta de dinheiro
     */
    async openCashDrawer() {
        console.log('[PrinterService] Abrindo gaveta de dinheiro...');
        // Em produção: enviar comando ESC/POS para abrir gaveta
    }
}

// Singleton
const printerService = new PrinterService();

export default printerService;
