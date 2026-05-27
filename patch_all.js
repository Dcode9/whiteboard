const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Change board-controls CSS top
html = html.replace(/(\.board-controls\s*\{[^}]*?)top:\s*84px;/s, '$1top: 16px;');
html = html.replace(/(\.board-controls\s*\{[^}]*?)top:\s*76px;/s, '$1top: 16px;');

// 2. Remove floating account container ONLY from whiteboard view
const targetStr = `        <!-- Floating Account Container (shared, will be visible in whiteboard view) -->
        <div class="floating-container header-account-container" style="display: none;">
            <button id="save-drawing-btn-header" onclick="window.promptSaveDrawing()" class="btn-primary" style="display: none;">
                Save
            </button>
            <div id="user-profile-area-whiteboard" style="display: none;">
                <div class="user-profile">
                    <img id="user-avatar-whiteboard" class="user-avatar" src="" alt="User">
                </div>
            </div>
        </div>`;
html = html.replace(targetStr, '');

// 3. JS removals for accountContainer in syncHeaderContainerHeights
html = html.replace(/const\s+accountContainer\s*=\s*document\.querySelector\('#whiteboard-view \.header-account-container'\);\n/g, '');
html = html.replace(/if\s*\(!toolbar\s*\|\|\s*!logoContainer\s*\|\|\s*!accountContainer\)/g, 'if (!toolbar || !logoContainer)');
html = html.replace(/accountContainer\.style\.minHeight\s*=\s*'';\n/g, '');
html = html.replace(/accountContainer\.style\.minHeight\s*=\s*matchedHeight;\n/g, '');

// 4. Dark Mode Resolution Function
const resolveColorFn = `
            function resolveThemeColor(hexColor) {
                if (!hexColor) return hexColor;
                const upper = hexColor.toUpperCase();
                if (isDarkMode) {
                    if (upper === '#000000' || upper === '#000') return '#FFFFFF';
                    if (upper === '#FFFFFF' || upper === '#FFF') return '#121212';
                }
                return hexColor;
            }
`;
html = html.replace(/(let isDarkMode = .*?;)/, '$1' + resolveColorFn);

// 5. Dark Mode context color injections
html = html.replace(/ctx\.fillStyle\s*=\s*stroke\.color;/g, 'ctx.fillStyle = resolveThemeColor(stroke.color);');
html = html.replace(/ctx\.strokeStyle\s*=\s*stroke\.color;/g, 'ctx.strokeStyle = resolveThemeColor(stroke.color);');
html = html.replace(/ctx\.fillStyle\s*=\s*backgroundColor;/g, 'ctx.fillStyle = resolveThemeColor(backgroundColor);');
html = html.replace(/ctx\.fillStyle\s*=\s*backgroundColor;\s*const\s*topLeft\s*=\s*screenToWorld/g, 'ctx.fillStyle = resolveThemeColor(backgroundColor);\n                      const topLeft = screenToWorld');
html = html.replace(/const color = config\?\.color \|\| '#000000';/g, "const baseColor = config?.color || '#000000';\n                  const color = resolveThemeColor(baseColor);");

// 6. UI Update triggers on toggle
html = html.replace(/try {\s*localStorage.setItem\('whiteboardThemeMode', isDarkMode/g, `
                updateMainPenIcon();
                if (penPreview) penPreview.style.backgroundColor = resolveThemeColor(currentColor);
                render();
                try {
                    localStorage.setItem('whiteboardThemeMode', isDarkMode`);

fs.writeFileSync('index.html', html);
