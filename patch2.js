const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

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

fs.writeFileSync('index.html', html);
