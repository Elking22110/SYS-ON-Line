const fs = require('fs');

function fixModalsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Find pieces that look like modals (e.g. Settings.jsx have Add User, Edit User)
    // Wait, let's just target the specific pieces we know from Settings.jsx to be safe
    if (filePath.includes('Settings.jsx')) {
        let modalsPart = content.substring(content.indexOf('showAddUserModal && ('));
        if (modalsPart.length > 0) {
            let newModalsPart = modalsPart
                .replace(/text-slate-800/g, 'text-white')
                .replace(/text-slate-600/g, 'text-slate-300')
                .replace(/text-slate-500 hover:text-slate-800/g, 'text-slate-400 hover:text-white')
                // Add button text readability
                .replace(/bg-green-600 bg-opacity-20 text-white/g, 'bg-green-600 hover:bg-green-500 text-white font-bold')
                .replace(/bg-blue-600 bg-opacity-20 text-white/g, 'bg-blue-600 hover:bg-blue-500 text-white font-bold')
                // Fix double arrows for <select>
                .replace(/className=\"input-modern w-full px-3 py-2 text-right\"(\s*>\s*<option)/g, 'className="input-modern w-full px-3 py-2 text-right appearance-none"$1');

            content = content.replace(modalsPart, newModalsPart);
            fs.writeFileSync(filePath, content);
            console.log('Fixed modals in Settings.jsx');
        }
    }
}

fixModalsInFile('src/pages/Settings.jsx');
