
import fs from 'fs';
const path = 'src/components/DashboardWidgets.js';
let content = fs.readFileSync(path, 'utf8');

// Function to replace the <div> for a specific card label
function patchCard(label, situation, type, hoverColor) {
    const regex = new RegExp(`<!-- ${label} -->\\s+<div class="([^"]+)">`, 'g');
    const replacement = `<!-- ${label} -->\n                  <div onclick="window.navigateToModule('financial', { situation: '${situation}', type: '${type}' })" class="$1 cursor-pointer hover:border-${hoverColor} hover:shadow-lg transition-all group">`;
    content = content.replace(regex, replacement);
}

patchCard('Receitas', 'Pago', 'revenue', 'green-400');
patchCard('Despesas', 'Pago', 'expense', 'red-400');
patchCard('A Receber', 'Pendente', 'revenue', 'blue-400');
patchCard('A Pagar', 'Pendente', 'expense', 'orange-400');

fs.writeFileSync(path, content);
console.log('Dashboard patched successfully.');
