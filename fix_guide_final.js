const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The guide has next buttons: guide-btn-next but it might not be visible due to z-index or styling.
// Let's ensure z-index is super high, and the button has text "Next".
html = html.replace('.guide-overlay {', `.guide-overlay {
            z-index: 2147483647;`);

html = html.replace(`            // Auto-start guide if not seen
            if (!localStorage.getItem('whiteboardGuideSeen')) {
                // Let other initializations settle before showing
                setTimeout(() => {
                    guideOverlay.classList.add('active');
                    updateGuide();
                }, 1000);
            }`, `            // Auto-start guide if not seen (Moved to board load)
            window.showGuideIfNeeded = function() {
                if (!localStorage.getItem('whiteboardGuideSeen') && document.getElementById('whiteboard-view').classList.contains('active')) {
                    setTimeout(() => {
                        guideOverlay.classList.add('active');
                        updateGuide();
                    }, 500);
                }
            };`);

// Add showGuideIfNeeded to goToWhiteboard
html = html.replace(`    window.goToWhiteboard = function(boardId) {
      document.getElementById('homepage-view').classList.remove('active');
      document.getElementById('whiteboard-view').classList.add('active');
      if (boardId) {
        window.loadBoard(boardId);
      } else {
        // New board - clear everything to start fresh
        if (window.clearCanvasForNewBoard) {
          window.clearCanvasForNewBoard();
        }
      }
      // Update save button visibility based on board type
      if (window.updateSaveButtonVisibility) {
        window.updateSaveButtonVisibility();
      }
    }`, `    window.goToWhiteboard = function(boardId) {
      document.getElementById('homepage-view').classList.remove('active');
      document.getElementById('whiteboard-view').classList.add('active');
      if (boardId) {
        window.loadBoard(boardId);
      } else {
        // New board - clear everything to start fresh
        if (window.clearCanvasForNewBoard) {
          window.clearCanvasForNewBoard();
        }
      }
      // Update save button visibility based on board type
      if (window.updateSaveButtonVisibility) {
        window.updateSaveButtonVisibility();
      }

      if (window.showGuideIfNeeded) {
        window.showGuideIfNeeded();
      }
    }`);

// Also add a fallback trigger when the page loads if it started directly in whiteboard view (which shouldn't happen, but just in case)
html = html.replace(`            initPinning();

            // Must call resize ONCE at startup to set correct pixel ratio
            resizeCanvas();`, `            initPinning();

            // Must call resize ONCE at startup to set correct pixel ratio
            resizeCanvas();

            // Just in case it loaded directly to whiteboard
            if (window.showGuideIfNeeded) window.showGuideIfNeeded();`);

fs.writeFileSync('index.html', html);
console.log('Fixed guide timing');
