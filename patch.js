const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove .header-account-container from #whiteboard-view
// Actually, I can just replace lines where we have:
// <div class="floating-container header-account-container" style="display: none;">
// ...
// </div>
