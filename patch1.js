const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Change board-controls CSS
html = html.replace(/(\.board-controls\s*\{[^}]*?)top:\s*84px;/s, '$1top: 16px;');

// 2. Remove floating account container from whiteboard view
html = html.replace(/\s*<!-- Floating Account Container.*?<div class="floating-container header-account-container".*?<\/div>\s*<\/div>\s*<\/div>\s*/s, '\n\n');

// 3. Remove .header-account-container from JS
html = html.replace(/const\s+accountContainer\s*=\s*document\.querySelector\('#whiteboard-view \.header-account-container'\);/g, '');

html = html.replace(/if\s*\(!toolbar\s*\|\|\s*!logoContainer\s*\|\|\s*!accountContainer\)\s*return;/g, 'if (!toolbar || !logoContainer) return;');

html = html.replace(/accountContainer\.style\.minHeight\s*=\s*'';/g, '');
html = html.replace(/accountContainer\.style\.minHeight\s*=\s*matchedHeight;/g, '');

fs.writeFileSync('index.html', html);
