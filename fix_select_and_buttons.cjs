const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Fix modal Add buttons visibility
            // From: className="bg-green-600 bg-opacity-20 text-slate-800...
            content = content.replace(/bg-green-600 bg-opacity-20 text-slate-800\s*(px-4 py-2[^"]*)/g, 'btn-primary w-full shadow-glow $1 text-white');
            content = content.replace(/bg-blue-600 bg-opacity-20 text-slate-800\s*(px-4 py-2[^"]*)/g, 'btn-primary w-full shadow-glow $1 text-white');
            content = content.replace(/btn-primary px-4 py-2/g, 'btn-primary px-4 py-2 text-white font-bold w-full');
            // From Settings (if already modified by us manually):
            content = content.replace(/bg-green-600 hover:bg-green-500 text-white font-bold\s*(px-4 py-2[^"]*)/g, 'btn-primary w-full text-white font-bold $1 shadow-glow');

            // In Suppliers.jsx, the button is "btn-primary px-4 py-2" -> Let's make sure it's fully bright and clear
            // "btn-primary" already is nice gradient blue to purple in index.css! It looks like:
            // .btn-primary { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; ... }

            // Fix double select arrow by ensuring appearance-none
            // Any select with input-modern
            content = content.replace(/className=\"input-modern((?:[^\"])*)\"/g, (match, classes) => {
                if (match.includes('select')) {
                    // No, wait, input-modern could be on <input> too. We only want on <select>
                    return match;
                }
                return match;
            });

            // Better select replacement:
            content = content.replace(/(<select[^>]*className=\")([^\"]*)(\")/g, (match, p1, p2, p3) => {
                let classes = p2;
                if (!classes.includes('appearance-none')) classes += ' appearance-none';
                // we leave background as is, in case they need the CSS arrow. Removing the native solves 99% of double arrow issues.
                return p1 + classes + p3;
            });

            // Make labels readable if the modal is dark (rgba(17, 24, 39,)
            // Actually, the modal's background is rgba(17, 24, 39, 0.95). 
            // In Settings.jsx, we see "bg-green-600 bg-opacity-20 text-slate-800" etc.
            // Replace modal text-slate-800 to text-white where appropriate.
            // Using a simple check if file has dark background modal:
            if (content.includes('rgba(17, 24, 39, 0.95)')) {
                // To safely target the modal headers: text-slate-800 -> text-white inside h2 and h3
                content = content.replace(/<[hH][23][^>]*text-slate-800/g, match => match.replace('text-slate-800', 'text-white'));
                content = content.replace(/text-slate-600 mb-1/g, 'text-slate-200 mb-1');
                content = content.replace(/text-slate-500 hover:text-slate-800/g, 'text-slate-300 hover:text-white');
            }

            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed styling in:', fullPath);
            }
        }
    });
}
processDir('src/pages');
processDir('src/components');
