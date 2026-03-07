const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');

if (!content.includes('import toast')) {
    content = content.replace(/import \{.*?\} from 'lucide-react';/s, match => match + "\nimport toast from 'react-hot-toast';");
}

content = content.replace(/alert\('([^']+نجاح[^']+)'\)/g, "toast.success('$1')");
content = content.replace(/alert\('([^']+)'\)/g, "toast.error('$1')");

fs.writeFileSync('src/pages/Settings.jsx', content);
console.log('Fixed alerts in Settings.jsx');
