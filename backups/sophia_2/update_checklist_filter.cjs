const fs = require('fs');
const path = 'src/modules/checklist.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /filter\(u => \['tech', 'admin', 'ceo', 'manager'\]\.includes\(u\.role\)\)/,
    "filter(u => ['tech', 'admin', 'ceo', 'manager', 'master'].includes(u.role))"
);

fs.writeFileSync(path, content);
console.log('Checklist filter updated.');
