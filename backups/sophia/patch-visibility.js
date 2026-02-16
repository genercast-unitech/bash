
import fs from 'fs';

function patchFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    replacements.forEach(r => {
        content = content.split(r.target).join(r.replacement);
    });
    fs.writeFileSync(path, content);
    console.log(`Patched ${path}`);
}

// Fix Dashboard Card Titles
patchFile('src/components/DashboardWidgets.js', [
    { target: 'text-gray-400 uppercase font-bold tracking-wider', replacement: 'text-gray-600 uppercase font-bold tracking-wider' }
]);

// Fix Storefront Product Modal
patchFile('src/modules/storefront.js', [
    // Markup inputs next to Retail/Wholesale
    {
        target: 'class="w-16 border border-gray-300 rounded p-2 text-xs text-center focus:ring-2 focus:ring-unitech-primary outline-none bg-gray-50"',
        replacement: 'class="w-16 border border-gray-300 rounded p-2 text-xs text-center focus:ring-2 focus:ring-unitech-primary outline-none bg-white font-bold !text-gray-800"'
    },
    // Placeholder and other general text improvements
    { target: 'placeholder-gray-400', replacement: 'placeholder-gray-500' },
    { target: 'text-gray-500 group-hover:text-gray-700', replacement: 'text-gray-800 group-hover:text-gray-900' }
]);

// Fix Financial Modal suggestions/labels if any (already checking global CSS too)
// Global CSS already has .input-field fix, but some modules don't use it.

console.log('Visibility patch complete.');
