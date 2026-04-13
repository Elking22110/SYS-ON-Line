import fs from 'fs';

const filePath = 'src/index.css';
const content = fs.readFileSync(filePath, 'utf8');

// The CSS to add
const actionButtonCSS = [
  '',
  '/* action-button: table action icons (Edit / Delete / View) */',
  '.action-button {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  min-width: 36px;',
  '  min-height: 36px;',
  '  width: 36px;',
  '  height: 36px;',
  '  border-radius: 8px;',
  '  border: none;',
  '  cursor: pointer;',
  '  transition: all 0.2s ease;',
  '  position: relative;',
  '  z-index: 10;',
  '  padding: 6px;',
  '  background: transparent;',
  '}',
  '',
  '.action-button svg {',
  '  width: 18px;',
  '  height: 18px;',
  '  pointer-events: none;',
  '  flex-shrink: 0;',
  '}',
  '',
  '.action-button:hover {',
  '  transform: scale(1.15);',
  '}',
  '',
  '.action-button:active {',
  '  transform: scale(0.95);',
  '}',
  '',
].join('\r\n');

// Find the insertion point right after .btn-secondary:hover closing brace
const marker = '.btn-secondary:hover';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('Marker not found! Check file manually.');
  process.exit(1);
}

// Find the closing brace of .btn-secondary:hover
const closingIdx = content.indexOf('}', idx);
if (closingIdx === -1) {
  console.error('Could not find closing brace!');
  process.exit(1);
}

const insertAt = closingIdx + 1;
const newContent = content.slice(0, insertAt) + actionButtonCSS + content.slice(insertAt);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: .action-button CSS class added at position', insertAt);
