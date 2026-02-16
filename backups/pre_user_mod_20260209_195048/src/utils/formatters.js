
/**
 * Global Formatting Utilities
 * Enforces pt-BR locale across the application.
 */

const LOCALE = 'pt-BR';
const CURRENCY = 'BRL';

/**
 * Formats a number as a currency string (e.g., "R$ 1.234,56").
 * @param {number} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: CURRENCY
    }).format(value || 0);
};

/**
 * Formats a CEP string (e.g., "12345-678").
 * @param {string} value 
 * @returns {string}
 */
export const maskCEP = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .substring(0, 9);
};

/**
 * Formats a percentage string (e.g., "10,5%").
 * @param {number} value 
 * @returns {string}
 */
export const formatPercent = (value) => {
    return new Intl.NumberFormat(LOCALE, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format((value || 0) / 100);
};

/**
 * Formats a date string or object to "DD/MM/YYYY".
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDate = (date) => {
    if (!date) return '--/--/----';
    return new Date(date).toLocaleDateString(LOCALE);
};

/**
 * Formats a date string or object to "DD/MM/YYYY HH:mm".
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateTime = (date) => {
    if (!date) return '--/--/---- --:--';
    return new Date(date).toLocaleString(LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Formats text to Title Case, respecting minor words.
 * Handles special cases like keeping "iPhone", "iPad", etc? 
 * For now, generic Title Case as requested + specific "letras maiusculas no inicio".
 * 
 * @param {string} txt 
 * @returns {string}
 */
// Common misspellings (no accents -> accents)
const COMMON_CORRECTIONS = {
    // General Portuguese (Accents & Common Typos)
    'nao': 'não', 'entao': 'então', 'voce': 'você', 'tambem': 'também', 'esta': 'está', 'estao': 'estão',
    'sera': 'será', 'ja': 'já', 'ate': 'até', 'tras': 'trás', 'apos': 'após', 'so': 'só', 'nos': 'nós', 'e': 'é',
    'ola': 'olá', 'atencao': 'atenção', 'descricao': 'descrição', 'situacao': 'situação', 'observacao': 'observação',
    'conclusao': 'conclusão', 'solucao': 'solução', 'informacao': 'informação', 'manutencao': 'manutenção',
    'endereco': 'endereço', 'inicio': 'início', 'saida': 'saída', 'entrada': 'entrada', 'proximo': 'próximo',
    'ultimo': 'último', 'unico': 'único', 'unica': 'única', 'maximo': 'máximo', 'minimo': 'mínimo',
    'nivel': 'nível', 'mes': 'mês', 'tres': 'três', 'portugues': 'português', 'ingles': 'inglês',
    'facil': 'fácil', 'dificil': 'difícil', 'rapido': 'rápido', 'responsavel': 'responsável', 'possivel': 'possível',
    'impossivel': 'impossível', 'incrivel': 'incrível', 'publico': 'público', 'privado': 'privado',
    'numero': 'número', 'video': 'vídeo', 'audio': 'áudio', 'botao': 'botão', 'lampada': 'lâmpada', 'alcool': 'álcool',
    'usuario': 'usuário', 'usuarios': 'usuários', 'codigo': 'código', 'relatorio': 'relatório', 'historico': 'histórico',
    'configuracao': 'configuração', 'pao': 'pão', 'joao': 'joão', 'caminhao': 'caminhão', 'cartao': 'cartão',

    // Tech Specific
    'camera': 'câmera', 'servico': 'serviço', 'orcamento': 'orçamento', 'peca': 'peça', 'pecas': 'peças',
    'tecnico': 'técnico', 'logica': 'lógica', 'placa': 'placa', 'mae': 'mãe', 'voltagem': 'voltagem', 'amperagem': 'amperagem',
    'informatica': 'informática', 'eletronica': 'eletrônica', 'bateria': 'bateria', 'carregador': 'carregador'
};

// Terms with fixed casing (Brands, Acronyms)
const FIXED_TERMS = {
    'iphone': 'iPhone', 'ipad': 'iPad', 'imac': 'iMac', 'ios': 'iOS', 'icloud': 'iCloud', 'airpods': 'AirPods', 'apple': 'Apple',
    'samsung': 'Samsung', 'galaxy': 'Galaxy', 'motorola': 'Motorola', 'moto': 'Moto', 'xiaomi': 'Xiaomi', 'redmi': 'Redmi', 'poco': 'Poco', 'realme': 'Realme', 'lg': 'LG', 'asus': 'Asus', 'lenovo': 'Lenovo', 'dell': 'Dell', 'hp': 'HP', 'acer': 'Acer', 'sony': 'Sony', 'nokia': 'Nokia', 'huawei': 'Huawei', 'zeke': 'Zeke',
    'usb': 'USB', 'usb-c': 'USB-C', 'hdmi': 'HDMI', 'vga': 'VGA', 'dvi': 'DVI', 'lcd': 'LCD', 'oled': 'OLED', 'amoled': 'AMOLED', 'led': 'LED', 'cpu': 'CPU', 'gpu': 'GPU', 'ram': 'RAM', 'rom': 'ROM', 'ssd': 'SSD', 'hdd': 'HDD', 'sd': 'SD', 'microsd': 'microSD', 'sim': 'SIM', 'esim': 'eSIM', 'imei': 'IMEI', 'mac': 'MAC', 'ip': 'IP', 'wifi': 'Wi-Fi', 'bluetooth': 'Bluetooth', 'nfc': 'NFC', 'gps': 'GPS', 'lte': 'LTE', '4g': '4G', '5g': '5G',
    'whatsapp': 'WhatsApp', 'instagram': 'Instagram', 'facebook': 'Facebook', 'google': 'Google', 'android': 'Android', 'windows': 'Windows', 'linux': 'Linux', 'macos': 'macOS',
    'pix': 'PIX', 'cpf': 'CPF', 'cnpj': 'CNPJ', 'rg': 'RG', 'cep': 'CEP', 'cnh': 'CNH', 'mei': 'MEI', 'tabela': 'Tabela', 'os': 'OS'
};

export const formatTitleCase = (txt) => {
    if (!txt) return '';

    // Minor words to keep lowercase (unless first word)
    const minorWords = ['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'com', 'por', 'na', 'no', 'nas', 'nos', 'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'ao', 'aos', 'pelo', 'pela', 'pelos', 'pelas'];

    return txt.toLowerCase().split(/(\s+)/).map((part, index) => {
        if (/^\s+$/.test(part)) return part;

        let word = part;
        const lowerWord = word.toLowerCase();

        // 1. Check Fixed Case Terms (Brands, Acronyms)
        if (FIXED_TERMS[lowerWord]) return FIXED_TERMS[lowerWord];

        // 2. Check Common Corrections (Spelling/Accents Map)
        if (COMMON_CORRECTIONS[lowerWord]) {
            word = COMMON_CORRECTIONS[lowerWord];
        } else {
            // 3. Smart Suffix Heuristics (for Portuguese)
            // Fix -ao, -cao, -oes, -sao
            if (lowerWord.length > 2) {
                if (lowerWord.endsWith('cao')) word = lowerWord.slice(0, -3) + 'ção';
                else if (lowerWord.endsWith('coes')) word = lowerWord.slice(0, -4) + 'ções';
                else if (lowerWord.endsWith('ao') && lowerWord !== 'ao') word = lowerWord.slice(0, -2) + 'ão';
                else if (lowerWord.endsWith('sao') && lowerWord !== 'sao') word = lowerWord.slice(0, -3) + 'são';
            }
        }

        // 4. Serial Numbers / Codes
        if (/\d/.test(word) && /[a-zA-Z]/.test(word)) return word.toUpperCase();

        // 5. Minor Words
        if (index > 0 && minorWords.includes(word.toLowerCase())) return word.toLowerCase();

        // 6. Default Title Case
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join('');
};

/**
 * Auto-corrects common spelling mistakes (Mock / Simple list)
 * User asked for "correction". This is hard without a dictionary, but we can do some basics.
 * For now, just TitleCase is usually what they mean by "correcting" messily typed names.
 */
export const autoCorrectInput = (input) => {
    // Basic trimming and multiple space removal
    let clean = input.value.trim().replace(/\s\s+/g, ' ');

    // Apply TitleCase
    clean = formatTitleCase(clean);

    // Update value if changed
    if (input.value !== clean) {
        input.value = clean;
    }
};
