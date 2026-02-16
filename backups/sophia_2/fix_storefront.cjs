const fs = require('fs');
const path = 'c:/Users/gener/.gemini/antigravity/playground/tensor-hawking/src/modules/storefront.js';
let content = fs.readFileSync(path, 'utf8');

// Fix malformed tags like < div -> <div
content = content.replace(/< (\w+)/g, '<$1');
// Fix malformed closing tags like </div > -> </div>
content = content.replace(/<\/(\w+) >/g, '</$1>');
// Fix malformed comments like < !-- -> <!-- and -- > -> -->
content = content.replace(/< !--/g, '<!--');
content = content.replace(/-- >/g, '-->');
// Fix malformed attributes like style = " -> style="
content = content.replace(/(\w+) = "/g, '$1="');
// Fix spaces in options
content = content.replace(/< option/g, '<option');

fs.writeFileSync(path, content);
console.log('Fixed storefront.js tags and attributes');
