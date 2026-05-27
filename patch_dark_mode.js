const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

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

// Insert resolveThemeColor after isDarkMode declaration or setup
html = html.replace(/(let isDarkMode = .*?;)/, '$1' + resolveColorFn);

// Now patch drawStroke to use resolveColor
html = html.replace(/ctx\.fillStyle\s*=\s*stroke\.color;/g, 'ctx.fillStyle = resolveThemeColor(stroke.color);');
html = html.replace(/ctx\.strokeStyle\s*=\s*stroke\.color;/g, 'ctx.strokeStyle = resolveThemeColor(stroke.color);');

// Patch drawBackground to use resolveColor
html = html.replace(/ctx\.fillStyle\s*=\s*backgroundColor;/g, 'ctx.fillStyle = resolveThemeColor(backgroundColor);');

// Because eraser destination-out will need to fill the gap with the correctly themed background
html = html.replace(/ctx\.fillStyle\s*=\s*backgroundColor;\s*const\s*topLeft\s*=\s*screenToWorld/g, 'ctx.fillStyle = resolveThemeColor(backgroundColor);\n                      const topLeft = screenToWorld');

// Patch getPenIconSvg
html = html.replace(/const color = config\?\.color \|\| '#000000';/g, "const baseColor = config?.color || '#000000';\n                  const color = resolveThemeColor(baseColor);");

// And in applyThemeMode, trigger UI updates:
html = html.replace(/try {\s*localStorage.setItem\('whiteboardThemeMode', isDarkMode/g, `
                updateMainPenIcon();
                if (penPreview) penPreview.style.backgroundColor = resolveThemeColor(currentColor);
                render();
                try {
                    localStorage.setItem('whiteboardThemeMode', isDarkMode`);


fs.writeFileSync('index.html', html);
