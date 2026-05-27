        window.onerror = function(msg, url, line, col, error) {
            var errorBox = document.getElementById('global-error-box');
            if (errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML += '<div><strong>Error:</strong> ' + msg + '<br><small>' + url + ':' + line + '</small></div><hr style="margin:5px 0;border-color:rgba(255,255,255,0.3)">';
            }
            console.error("Global Error:", msg, error);
            // Hide loading screen if error occurs so we can see the error
            var loader = document.getElementById('app-loading');
            if(loader) loader.style.display = 'none';
            return false;
        };
        // Check if Tailwind loaded
        window.onload = function() {
            if (!window.tailwind) {
                console.warn("Tailwind CSS failed to load via CDN.");
            }
        }
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                },
            },
        }

    // ===== CONFIGURATION =====
    // ⚠️ IMPORTANT: Google Sign-In Configuration
    // The default Client ID below is a demo ID and will show "Access blocked: Authorization error"
    // To fix this, you MUST create your own Google OAuth Client ID:
    // 1. Go to https://console.cloud.google.com/apis/credentials
    // 2. Create a new OAuth 2.0 Client ID (Web application type)
    // 3. Add your domain to "Authorized JavaScript origins"
    // 4. Replace the GOOGLE_CLIENT_ID below with your Client ID
    //
    // For detailed instructions, see: ENV_SETUP_GUIDE.md
    const GOOGLE_CLIENT_ID = '263202480558-jm6e5brpr0l00nlrcrer2vjvvtpcfr1r.apps.googleusercontent.com';

    // ===== Consolidated Application Logic =====

    // Safety Timeout: If app doesn't load in 5 seconds, hide loader anyway so user can see what's wrong (or right)
    setTimeout(function() {
        var loader = document.getElementById('app-loading');
        if (loader && loader.style.display !== 'none') {
            console.warn("Loading timeout reached. Forcing loader hide.");
            loader.style.opacity = '0';
            setTimeout(function() { loader.style.display = 'none'; }, 300);
        }
    }, 5000);

    // --- Authentication ---

    window.initGoogleAuth = function() {
        console.log("initGoogleAuth called");
        if (typeof google === 'undefined' || !google.accounts) {
            console.error("Google library not loaded. Check network connection.");
            console.log("typeof google:", typeof google);

            // Show error message to user
            const btnDiv = document.getElementById('buttonDiv');
            if (btnDiv) {
                btnDiv.innerHTML = '<div style="padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-size: 12px; max-width: 300px;">⚠️ Google Sign-In unavailable. Check network connection.</div>';
            }
            return;
        }
        try {
            console.log("Initializing Google Sign-In...");
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: window.handleCredentialResponse,
                auto_select: false
            });

            const btnDiv = document.getElementById('buttonDiv');
            console.log("buttonDiv element:", btnDiv);
            console.log("buttonDiv display style:", btnDiv ? btnDiv.style.display : 'element not found');

            if (btnDiv) {
                // Clear any previous error messages
                btnDiv.innerHTML = '';

                google.accounts.id.renderButton(
                    btnDiv,
                    { theme: 'outline', size: 'large', locale: 'en' }
                );
                console.log("Google Sign-In button rendered successfully");

            } else {
                console.error("buttonDiv element not found!");
            }
        } catch (e) {
            console.error("Auth Init Error:", e);

            // Show error to user
            const btnDiv = document.getElementById('buttonDiv');
            if (btnDiv) {
                btnDiv.innerHTML = '<div style="padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-size: 12px; max-width: 300px;">⚠️ Google Sign-In error: ' + e.message + '</div>';
            }
        }
    };

    window.handleCredentialResponse = async function(response) {
      try {
        console.log("Authenticating with backend...");

        // Send credential to backend
        const authResponse = await fetch('/api/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credential: response.credential })
        });

        if (!authResponse.ok) {
          let errorMessage = 'Authentication failed';
          // Clone response so we can read it multiple times if needed
          const responseClone = authResponse.clone();
          try {
            const errorData = await authResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Response is not JSON, likely HTML error page
            try {
              const errorText = await responseClone.text();
              console.error('Non-JSON error response:', errorText);
            } catch (textError) {
              console.error('Could not read error response');
            }
            errorMessage = `Server error (${authResponse.status})`;
          }
          throw new Error(errorMessage);
        }

        const authData = await authResponse.json();

        // Store auth data
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('userId', authData.user.userId);
        localStorage.setItem('userEmail', authData.user.email);
        localStorage.setItem('userName', authData.user.name);
        localStorage.setItem('userPicture', authData.user.picture || '');

        showNotification('Signed in successfully!', 'success');
        updateAuthUI();
      } catch (error) {
        console.error('Sign-in error:', error);
        showNotification('Sign-in failed: ' + error.message, 'error');
      }
    };

    function showNotification(message, type) {
      const notif = document.createElement('div');
      notif.className = `notification notification-${type}`;
      notif.textContent = message;
      notif.style.cssText = `
        position: fixed; top: 80px; right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white; padding: 12px 24px; border-radius: 4px;
        z-index: 10000; font-family: Arial, sans-serif; font-weight: 500;
      `;
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 3000);
    }

    function updateAuthUI() {
      const token = localStorage.getItem('authToken');
      const userEmail = localStorage.getItem('userEmail');
      const userName = localStorage.getItem('userName');
      const userPicture = localStorage.getItem('userPicture');
      const btnDiv = document.getElementById('buttonDiv');
      const userProfileArea = document.getElementById('user-profile-area');
      const userProfileAreaWhiteboard = document.getElementById('user-profile-area-whiteboard');
      const saveBtn = document.getElementById('save-drawing-btn-header');
      const cloudBoardOption = document.getElementById('cloud-board-option');
      const cloudBoardsSection = document.getElementById('cloud-boards-section');

      console.log("updateAuthUI called - token:", token ? "exists" : "none", "email:", userEmail);

      if (token && userEmail) {
        console.log("User is signed in");
        if(btnDiv) btnDiv.style.display = 'none';
        if(userProfileArea) userProfileArea.style.display = 'block';
                if(userProfileAreaWhiteboard) userProfileAreaWhiteboard.style.display = 'none';
        // Save button visibility will be controlled by updateSaveButtonVisibility based on board type
        if(cloudBoardOption) cloudBoardOption.style.display = 'block';
        if(cloudBoardsSection) cloudBoardsSection.style.display = 'block';

        // Update user profile on homepage
        const userNameEl = document.getElementById('user-name');
        const userAvatarEl = document.getElementById('user-avatar');
        if (userNameEl) userNameEl.textContent = userName || userEmail;
        if (userAvatarEl && userPicture) userAvatarEl.src = userPicture;
        else if (userAvatarEl) userAvatarEl.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';

        // Update user profile on whiteboard
        const userAvatarWhiteboardEl = document.getElementById('user-avatar-whiteboard');
        if (userAvatarWhiteboardEl && userPicture) userAvatarWhiteboardEl.src = userPicture;
        else if (userAvatarWhiteboardEl) userAvatarWhiteboardEl.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';

        // Update cloud boards title
        const cloudBoardsTitle = document.getElementById('cloud-boards-title');
        if (cloudBoardsTitle) cloudBoardsTitle.textContent = `${userName || userEmail}'s Boards`;

        // Load cloud boards
        if (window.loadCloudBoards) window.loadCloudBoards();
      } else {
        console.log("User is NOT signed in");
        if(btnDiv) btnDiv.style.display = 'flex';
        if(userProfileArea) userProfileArea.style.display = 'none';
        if(userProfileAreaWhiteboard) userProfileAreaWhiteboard.style.display = 'none';
        if(saveBtn) saveBtn.style.display = 'none';
        if(cloudBoardOption) cloudBoardOption.style.display = 'none';
        if(cloudBoardsSection) cloudBoardsSection.style.display = 'none';
      }

      // Refresh boards display
      if (window.renderLocalBoards) window.renderLocalBoards();
    }

    window.signOut = function() {
      console.log("Signing out...");
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userPicture');
      updateAuthUI();
      showNotification('Signed out', 'success');
      window.goToHomepage();
      // Re-render button
      setTimeout(() => {
        console.log("Re-initializing Google Sign-In after sign out");
        window.initGoogleAuth();
      }, 100);
    }

    // --- Custom Prompt Modal ---
    let customModalResolve = null;

    window.customPrompt = function(title, placeholder, defaultValue = '') {
      return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalInput = document.getElementById('modal-input');
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');

        // Ensure the modal is not trapped inside a hidden view container
        if (overlay && overlay.parentElement !== document.body) {
          document.body.appendChild(overlay);
        }

        customModalResolve = resolve;

        modalTitle.textContent = title;
        modalInput.placeholder = placeholder;
        modalInput.value = defaultValue;
        overlay.classList.add('active');
        modalInput.focus();
        modalInput.select();

        // Handle Enter key
        const handleEnter = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            confirmBtn.click();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelBtn.click();
          }
        };

        modalInput.addEventListener('keydown', handleEnter);

        const cleanup = () => {
          modalInput.removeEventListener('keydown', handleEnter);
          overlay.classList.remove('active');
          modalInput.value = '';
        };

        cancelBtn.onclick = () => {
          cleanup();
          resolve(null);
        };

        confirmBtn.onclick = () => {
          const value = modalInput.value.trim();
          cleanup();
          resolve(value || null);
        };

        // Click outside to cancel
        overlay.onclick = (e) => {
          if (e.target === overlay) {
            cancelBtn.click();
          }
        };
      });
    }

    // --- View Management ---
    window.goToHomepage = function(options = {}) {
      document.getElementById('homepage-view').classList.add('active');
      document.getElementById('whiteboard-view').classList.remove('active');
      // Save current whiteboard if there's data
      if (window.getCurrentBoardId && window.getCurrentBoardId()) {
        window.saveCurrentLocalBoard();
      }
      window.renderLocalBoards();
      if (localStorage.getItem('authToken')) {
        window.loadCloudBoards();
      }
      if (!options.skipHistory && window.location.pathname !== '/') {
        history.pushState({ view: 'home' }, '', '/');
      }
    }

    window.goToWhiteboard = function(boardId, options = {}) {
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
      if (window.openWhiteboardGuide) {
        setTimeout(() => window.openWhiteboardGuide(false), 400);
      }
      if (!options.skipHistory) {
        const path = boardId ? `/board/${encodeURIComponent(boardId)}` : (currentCloudBoardId ? `/cloud-board/${encodeURIComponent(currentCloudBoardId)}` : '/board/new');
        if (window.location.pathname !== path) {
          history.pushState({ view: 'board', boardId: boardId || null, cloudBoardId: currentCloudBoardId || null }, '', path);
        }
      }
    }

    // --- Larger local persistence (IndexedDB, with localStorage fallback) ---
    const whiteboardStorage = (() => {
      const dbName = 'webboard-local-store';
      const storeName = 'boards';
      let dbPromise = null;

      function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
          if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB unavailable'));
            return;
          }
          const request = indexedDB.open(dbName, 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return dbPromise;
      }

      async function set(key, value) {
        try {
          const db = await openDb();
          await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(value, key);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
        } catch (error) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }

      async function get(key) {
        try {
          const db = await openDb();
          return await new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        } catch (error) {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        }
      }

      return { set, get };
    })();
    window.whiteboardStorage = whiteboardStorage;

    // --- Local Board Management ---
    let currentBoardId = null;
    let currentBoardType = null; // 'local' or 'cloud'
    let currentCloudBoardId = null; // Server-assigned ID for cloud boards
    let currentCloudBoardTitle = null; // Title for cloud boards

    window.getCurrentBoardId = function() {
      return currentBoardId;
    }

    window.getCurrentBoardType = function() {
      return currentBoardType;
    }

    window.setCurrentBoardId = function(id) {
      currentBoardId = id;
    }

    window.updateSaveButtonVisibility = function() {
      const saveBtn = document.getElementById('save-drawing-btn-header');
      const token = localStorage.getItem('authToken');

      // Show save button only for cloud boards when user is signed in
      if (saveBtn) {
        if (token && currentBoardType === 'cloud') {
          saveBtn.style.display = 'block';
        } else {
          saveBtn.style.display = 'none';
        }
      }
    }

    window.createNewBoard = async function(type) {
      if (type === 'cloud' && !localStorage.getItem('authToken')) {
        showNotification('Please sign in to create cloud boards', 'error');
        return;
      }

      const boardTitle = await window.customPrompt('Create New Board', 'Enter board title', 'Untitled Board');
      if (!boardTitle) return;

      const boardId = 'board_' + Date.now();

      if (type === 'local') {
        const board = {
          id: boardId,
          title: boardTitle,
          type: 'local',
          lastModified: Date.now(),
          dataKey: `drawing:${boardId}`,
          data: null
        };
        whiteboardStorage.set(board.dataKey, { strokes: [], backgroundColor: '#FFFFFF', backgroundPattern: 'plain', viewOffset: { x: 0, y: 0 }, viewZoom: 1 });

        const boards = JSON.parse(localStorage.getItem('localBoards') || '[]');
        boards.push(board);
        localStorage.setItem('localBoards', JSON.stringify(boards));

        currentBoardId = boardId;
        currentBoardType = 'local';
        window.goToWhiteboard(boardId);
      } else {
        // For cloud boards, store title and type, then open whiteboard
        // User will manually save when ready
        currentCloudBoardTitle = boardTitle;
        currentCloudBoardId = null; // Will be set after first save
        currentBoardType = 'cloud';
        window.goToWhiteboard(); // No boardId = blank canvas
      }
    }

    window.loadBoard = async function(boardId) {
      const boards = JSON.parse(localStorage.getItem('localBoards') || '[]');
      const board = boards.find(b => b.id === boardId);

      if (board) {
        currentBoardId = boardId;
        currentBoardType = 'local'; // Local board
        currentCloudBoardId = null;
        currentCloudBoardTitle = null;
        if (window.loadDrawingData) {
          const boardData = board.dataKey ? await whiteboardStorage.get(board.dataKey) : board.data;
          window.loadDrawingData(boardData || { strokes: [] });
        }
      }
    }

    window.saveCurrentLocalBoard = function() {
      if (!currentBoardId) return;

      const boards = JSON.parse(localStorage.getItem('localBoards') || '[]');
      const boardIndex = boards.findIndex(b => b.id === currentBoardId);

      if (boardIndex !== -1 && window.getDrawingData) {
        const dataKey = boards[boardIndex].dataKey || `drawing:${boards[boardIndex].id}`;
        boards[boardIndex].dataKey = dataKey;
        boards[boardIndex].data = null;
        whiteboardStorage.set(dataKey, window.getDrawingData());
        boards[boardIndex].lastModified = Date.now();
        localStorage.setItem('localBoards', JSON.stringify(boards));
      }
    }

        window.renameLocalBoard = async function(boardId) {
            const boards = JSON.parse(localStorage.getItem('localBoards') || '[]');
            const boardIndex = boards.findIndex(b => b.id === boardId);
            if (boardIndex === -1) {
                showNotification('Local board not found', 'error');
                return;
            }

            const currentTitle = boards[boardIndex].title || 'Untitled Board';
            const nextTitle = await window.customPrompt('Rename File', 'Edit file name', currentTitle);
            if (!nextTitle) return;

            boards[boardIndex].title = nextTitle;
            boards[boardIndex].lastModified = Date.now();
            localStorage.setItem('localBoards', JSON.stringify(boards));
            window.renderLocalBoards();
            showNotification('File name updated', 'success');
        }

        window.uploadLocalBoardToCloud = async function(boardId) {
            const token = localStorage.getItem('authToken');
            if (!token) {
                showNotification('Please sign in to upload local boards', 'error');
                return;
            }

            const boards = JSON.parse(localStorage.getItem('localBoards') || '[]');
            const boardIndex = boards.findIndex(b => b.id === boardId);
            if (boardIndex === -1) {
                showNotification('Local board not found', 'error');
                return;
            }

            const board = boards[boardIndex];
            const uploadTitle = await window.customPrompt('Upload to Cloud', 'Cloud file name', board.title || 'Untitled Board');
            if (!uploadTitle) return;
            const drawingData = board.dataKey ? await whiteboardStorage.get(board.dataKey) : board.data;

            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: uploadTitle,
                        drawingData: drawingData || { strokes: [] }
                    })
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                boards[boardIndex].lastUploaded = Date.now();
                localStorage.setItem('localBoards', JSON.stringify(boards));
                showNotification(`Uploaded "${uploadTitle}" to cloud`, 'success');
                if (window.loadCloudBoards) {
                    window.loadCloudBoards();
                }
            } catch (error) {
                console.error('Upload local board error:', error);
                showNotification('Failed to upload local board', 'error');
            }
        }

    window.deleteLocalBoard = function(boardId) {
      if (!confirm('Delete this board?')) return;

      const boards = JSON.parse(localStorage.getItem('localBoards') || '[]');
      const filtered = boards.filter(b => b.id !== boardId);
      localStorage.setItem('localBoards', JSON.stringify(filtered));
      window.renderLocalBoards();
      showNotification('Board deleted', 'success');
    }

    window.renderLocalBoards = function() {
      const grid = document.getElementById('local-boards-grid');
      if (!grid) return;

      const boards = JSON.parse(localStorage.getItem('localBoards') || '[]');

      if (boards.length === 0) {
        grid.innerHTML = '<div class="empty-state">No local boards yet. Create one to get started!</div>';
        return;
      }

            const canUploadToCloud = !!localStorage.getItem('authToken');

      grid.innerHTML = boards.map(board => `
        <div class="board-card" onclick="window.goToWhiteboard('${board.id}')">
          <h3>${board.title}</h3>
          <p>${new Date(board.lastModified).toLocaleString()}</p>
          <div class="board-card-actions" onclick="event.stopPropagation()">
                        <button onclick="window.renameLocalBoard('${board.id}')" class="rename-btn">Rename</button>
                        <button onclick="${canUploadToCloud ? `window.uploadLocalBoardToCloud('${board.id}')` : `showNotification('Please sign in to upload local boards', 'error')`}" class="upload-btn">Upload</button>
            <button onclick="window.deleteLocalBoard('${board.id}')" class="delete-btn">Delete</button>
          </div>
        </div>
      `).join('');
    }

    window.loadCloudBoards = async function() {
      const grid = document.getElementById('cloud-boards-grid');
      if (!grid) return;

      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load cloud boards');

        const drawings = await response.json();

        if (drawings.length === 0) {
          grid.innerHTML = '<div class="empty-state">No cloud boards yet.</div>';
          return;
        }

        grid.innerHTML = drawings.map(drawing => `
          <div class="board-card" onclick="window.loadCloudBoard('${drawing.id}')">
            <h3>${drawing.title}</h3>
            <p>${new Date(drawing.createdAt).toLocaleString()}</p>
            <div class="board-card-actions" onclick="event.stopPropagation()">
              <button onclick="window.deleteCloudBoard('${drawing.id}')" class="delete-btn">Delete</button>
            </div>
          </div>
        `).join('');
      } catch (error) {
        console.error('Load cloud boards error:', error);
        grid.innerHTML = '<div class="empty-state">Failed to load cloud boards</div>';
      }
    }

    window.loadCloudBoard = async function(drawingId) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/load/${drawingId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load drawing');

        const drawing = await response.json();
        currentBoardId = null; // Cloud board, not local
        currentBoardType = 'cloud';
        currentCloudBoardId = drawingId; // Set the cloud board ID for updates
        currentCloudBoardTitle = drawing.title;
        window.goToWhiteboard();
        if (window.loadDrawingData) {
          window.loadDrawingData(drawing.drawingData);
        }
      } catch (error) {
        console.error('Load cloud board error:', error);
        showNotification('Failed to load: ' + error.message, 'error');
      }
    }

    window.deleteCloudBoard = async function(drawingId) {
      if (!confirm('Delete this cloud board?')) return;

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/delete/${drawingId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete');

        window.loadCloudBoards();
        showNotification('Board deleted', 'success');
      } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete: ' + error.message, 'error');
      }
    }

    // Manual save for cloud boards - updates existing or creates new
    window.promptSaveDrawing = async function() {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          showNotification('Please sign in first', 'error');
          return;
        }

        // Get the current drawing data
        const drawingData = window.getDrawingData ? window.getDrawingData() : { strokes: [] };

        // Determine if this is an update or new save
        if (currentCloudBoardId) {
          // Update existing board - include ID in the save request
          console.log('Updating existing cloud board with ID:', currentCloudBoardId);
          const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id: currentCloudBoardId, // Include ID to update existing
              title: currentCloudBoardTitle,
              drawingData: drawingData
            })
          });

          if (!response.ok) {
            throw new Error('Failed to update board');
          }

          console.log('Board updated successfully');
          showNotification(`Board "${currentCloudBoardTitle}" updated!`, 'success');
        } else {
          // New save - use title from creation or ask
          const title = currentCloudBoardTitle || await window.customPrompt('Save Board', 'Enter board title', `Board-${new Date().toLocaleDateString()}`);
          if (!title) return;

          console.log('Creating new cloud board with title:', title);
          const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              title: title,
              drawingData: drawingData
            })
          });

          if (!response.ok) {
            throw new Error('Failed to save board');
          }

          const result = await response.json();
          currentCloudBoardId = result.id || result.drawingId; // Store the server-assigned ID
          currentCloudBoardTitle = title;
          console.log('Board created successfully with ID:', currentCloudBoardId);
          showNotification(`Board "${title}" saved!`, 'success');
        }
      } catch (error) {
        console.error('Save error:', error);
        showNotification('Failed to save: ' + error.message, 'error');
      }
    }

    function initAuthStatus() {
      updateAuthUI();
      // Also try to initialize Google Auth if library is already loaded
      if (typeof google !== 'undefined' && google.accounts) {
        console.log("Google library already loaded, initializing...");
        initGoogleAuth();
      } else {
        console.log("Waiting for Google library to load...");
      }
    }

    // --- Main Application ---

    document.addEventListener('DOMContentLoaded', () => {
        try {
            // Remove loading screen after 500ms (debounce)
            setTimeout(() => {
                const loader = document.getElementById('app-loading');
                if(loader) {
                    loader.style.opacity = '0';
                    setTimeout(() => { loader.style.display = 'none'; }, 300);
                }
            }, 500);

            initAuthStatus();

            // --- Homepage UI Initialization ---
            const newBoardBtn = document.getElementById('new-board-btn');
            const newBoardMenu = document.getElementById('new-board-menu');
            const userProfileBtn = document.getElementById('user-profile-btn');
            const userMenu = document.getElementById('user-menu');
            const boardSearch = document.getElementById('board-search');

            // New board dropdown
            if (newBoardBtn && newBoardMenu) {
                newBoardBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    newBoardMenu.classList.toggle('active');
                });

                document.addEventListener('click', () => {
                    newBoardMenu.classList.remove('active');
                });
            }

            // User menu dropdown
            if (userProfileBtn && userMenu) {
                userProfileBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    userMenu.classList.toggle('active');
                });

                document.addEventListener('click', () => {
                    userMenu.classList.remove('active');
                });
            }

            // Board search
            if (boardSearch) {
                boardSearch.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase();
                    document.querySelectorAll('.board-card').forEach(card => {
                        const title = card.querySelector('h3').textContent.toLowerCase();
                        card.style.display = title.includes(query) ? '' : 'none';
                    });
                });
            }

            // Initialize boards on homepage
            window.renderLocalBoards();
            if (localStorage.getItem('authToken')) {
                window.loadCloudBoards();
            }

            // --- All app variables ---
            const canvas = document.getElementById('whiteboard');
            if(!canvas) throw new Error("Canvas element not found");

            // Use 'true' alpha to be safe against compositing bugs in some browsers
            const ctx = canvas.getContext('2d', { alpha: true });

            const toolbar = document.getElementById('toolbar');
            const toolbarDragHandle = document.getElementById('toolbar-drag-handle');
            const customCursorCircle = document.getElementById('custom-cursor-circle');
            const customCursorEraser = document.getElementById('custom-cursor-eraser');
            const toolbarWrapper = document.getElementById('toolbar-wrapper');
            const logoContainer = document.querySelector('#whiteboard-view .header-logo-container');
                        const themeToggleBtn = document.getElementById('theme-toggle-btn');
            const themeToggleIcon = document.getElementById('theme-toggle-icon');
            const zoomSlider = document.getElementById('zoom-slider');
            const zoomValueLabel = document.getElementById('zoom-value-label');

            // (Tool Buttons)
            const moveBtn = document.getElementById('move-btn');
            const penBtn = document.getElementById('pen-btn');
            const eraserBtn = document.getElementById('eraser-btn');
            const textBtn = document.getElementById('text-btn');
            const lineBtn = document.getElementById('line-btn');
            const rectBtn = document.getElementById('rect-btn');
            const circleBtn = document.getElementById('circle-btn');
            const triangleBtn = document.getElementById('triangle-btn');
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            const clearBtn = document.getElementById('clear-btn');
            const guideOpenBtn = document.getElementById('guide-open-btn');
            const splitVerticalBtn = document.getElementById('split-vertical-btn');
            const splitHorizontalBtn = document.getElementById('split-horizontal-btn');
            const splitExitBtn = document.getElementById('split-exit-btn');
            const splitDividerHandle = document.getElementById('split-divider-handle');
            const featureGuide = document.getElementById('feature-guide');
            const guideSpotlight = document.getElementById('guide-spotlight');
            const guideCard = document.getElementById('guide-card');
            const guideTitle = document.getElementById('guide-title');
            const guideBody = document.getElementById('guide-body');
            const guideAnimation = document.getElementById('guide-animation');
            const guideStepCount = document.getElementById('guide-step-count');
            const guidePrevBtn = document.getElementById('guide-prev-btn');
            const guideNextBtn = document.getElementById('guide-next-btn');
            const guideCloseBtn = document.getElementById('guide-close-btn');
            const trianglePopover = document.getElementById('triangle-popover');
            const triangleOptionButtons = trianglePopover ? Array.from(trianglePopover.querySelectorAll('.triangle-option')) : [];

            // Text tool elements
            const textInputOverlay = document.getElementById('text-input-overlay');
            const textInputToolbar = document.getElementById('text-input-toolbar');
            const textInput = document.getElementById('text-input');
            const textFontFamily = document.getElementById('text-font-family');
            const textFontSize = document.getElementById('text-font-size');
            const textBoldBtn = document.getElementById('text-bold');
            const textItalicBtn = document.getElementById('text-italic');
            const textUnderlineBtn = document.getElementById('text-underline');
            const textSubmitBtn = document.getElementById('text-submit');
            const textCancelBtn = document.getElementById('text-cancel');

            // Text formatting state
            let textBold = false;
            let textItalic = false;
            let textUnderline = false;

            // (Canvas Tool)
            const canvasBtn = document.getElementById('canvas-btn');
            const canvasIconBg = document.getElementById('canvas-icon-bg');
            const canvasIconRuled = document.getElementById('canvas-icon-ruled');
            const canvasIconGrid = document.getElementById('canvas-icon-grid');

            // (Popovers)
            const penPopover = document.getElementById('pen-popover');
            const eraserPopover = document.getElementById('eraser-popover');
            const canvasPopover = document.getElementById('canvas-popover');
            const linePopover = document.getElementById('line-popover');
            const penDrawBtn = document.getElementById('pen-draw-btn');

            // (Pen Popover)
            const colorPicker = document.getElementById('color-picker');
            const presetColorsEl = document.getElementById('preset-colors');
            const penTypeButtons = Array.from(document.querySelectorAll('.pen-type-option'));
            const lineStyleButtons = Array.from(document.querySelectorAll('.line-style-option'));
            const pinPenConfigBtn = document.getElementById('pin-pen-config-btn');
            const pinnedPenConfigsEl = document.getElementById('pinned-pen-configs');
            const pinnedPenEditorEl = document.getElementById('pinned-pen-editor');
            const penConfigGroup = document.getElementById('pen-config-group');
            const penConfigCollapseBtn = document.getElementById('pen-config-collapse-btn');
            const penThicknessControl = document.querySelector('.thickness-control[data-type="pen"]');
            const penThicknessInput = penThicknessControl.querySelector('input[type="number"]');
            const penSizeLabel = document.getElementById('pen-size-label');
            const penPreview = document.getElementById('pen-preview');

            // (Eraser Popover)
            const eraserThicknessControl = document.querySelector('.thickness-control[data-type="eraser"]');
            const eraserThicknessInput = eraserThicknessControl.querySelector('input[type="number"]');
            const eraserSizeLabel = document.getElementById('eraser-size-label');
            const objectEraserBtn = document.getElementById('object-eraser-btn');
            const pixelEraserBtn = document.getElementById('pixel-eraser-btn');
            const eraserPreview = document.getElementById('eraser-preview');

            // (Canvas Popover)
            const bgColorPicker = document.getElementById('bg-color-picker');
            const bgPatternSelector = document.getElementById('bg-pattern');

            const toolButtons = [
                { el: moveBtn, tool: 'move' },
                { el: penBtn, tool: 'pen' },
                { el: eraserBtn, tool: 'eraser' },
                { el: textBtn, tool: 'text' },
                { el: lineBtn, tool: 'line' },
                { el: rectBtn, tool: 'rect' },
                { el: circleBtn, tool: 'circle' },
                { el: triangleBtn, tool: 'triangle' },
            ];

            const saveIndicator = document.getElementById('save-indicator');
            const confirmModal = document.getElementById('confirm-modal');
            const cancelClearBtn = document.getElementById('cancel-clear');
            const confirmClearBtn = document.getElementById('confirm-clear');

            // --- (LOCAL STATE) ---
            let strokes = [];
            let currentPath = null;
            let undoStack = [];
            let redoStack = [];

            let viewOffset = { x: 0, y: 0 };
            let viewZoom = 1;
            let lastPanPos = { x: 0, y: 0 };
            let splitView = null;
            let activePaneId = null;

            let isDrawing = false;
            let isPanning = false;
            let didDeleteInStroke = false;
            let wheelSaveTimer = null;

            let currentColor = '#000000';
            let currentBrushSize = 5;
            let currentTool = 'pen';
            let originalTool = 'pen';
            let currentPenType = 'default';
            let currentLineStyle = 'solid';
            let currentResizeHandle = null;
            let rotateStartAngle = 0;
            let rotateStartValue = 0;
            let activeStrokeCenter = null;
            let selectedStrokeIndex = -1;
            let movingStrokeIndex = -1;
            let lastMovePoint = null;
            let hasMovedShape = false;
            let moveInteractionMode = 'none'; // 'none' | 'move' | 'resize'

            let currentEraserMode = 'object';
            let currentEraserSize = 20;
            let currentPenMode = 'draw';
            let currentTriangleType = 'isosceles';

            let backgroundColor = '#FFFFFF';
            let backgroundPattern = 'plain';
            let toolbarDockPosition = localStorage.getItem('whiteboardToolbarDock') || 'top';
            let isDarkMode = localStorage.getItem('whiteboardThemeMode') === 'dark';
            function resolveThemeColor(hexColor) {
                if (!hexColor) return hexColor;
                const upper = hexColor.toUpperCase();
                if (isDarkMode) {
                    if (upper === '#000000' || upper === '#000') return '#FFFFFF';
                    if (upper === '#FFFFFF' || upper === '#FFF') return '#121212';
                }
                return hexColor;
            }


            let isTwoFingerPanning = false;
            let lastTouchMidpoint = { x: 0, y: 0 };
            let lastTouchDistance = 0; // For pinch-zoom
            let isEraserGesture = false;
            let eraserHistorySnapshot = null;
            let splitGesture = null;
            let splitDragState = null;
            let pinnedPenConfigs = [];
            let isPenGroupCollapsed = localStorage.getItem('whiteboardPenGroupCollapsed') === 'true';

            // Hold-to-erase state
            let touchHoldTimer = null;
            const TOUCH_HOLD_DURATION = 500;
            const TOOL_DOUBLE_TAP_DURATION = 300;
            const TOOL_LONG_PRESS_DURATION = 420;
            let toolbarDragState = null;
            let activeToolSettingsTimer = null;
            let activeToolSettingsButton = null;
            let lastToolTapAt = 0;
            let lastToolTapButton = null;
            let suppressNextToolClick = false;
            let zoomSaveTimer = null;

            const MIN_ZOOM = 0.1;
            const MAX_ZOOM = 10.0;
            const ZOOM_STEP = 0.1;
            const PRESET_COLORS = ['#000000', '#EF4444', '#F97316', '#FACC15', '#22C55E', '#06B6D4', '#2563EB', '#7C3AED', '#EC4899', '#64748B', '#FFFFFF', '#A16207'];

            // CRITICAL FIX: High DPI (Retina) Support with Safety Check
            let dpr = window.devicePixelRatio || 1;
            if(dpr < 1) dpr = 1; // Sanity check

            // --- Coordinate Conversion ---
            function getSplitPanes() {
                if (!splitView) return [];
                const width = window.innerWidth;
                const height = window.innerHeight;
                const divider = splitView.coordinate;
                if (splitView.orientation === 'horizontal') {
                    return [
                        { id: 'top', x: 0, y: 0, width, height: Math.max(1, divider), transform: splitView.panes.top },
                        { id: 'bottom', x: 0, y: Math.min(height, divider), width, height: Math.max(1, height - divider), transform: splitView.panes.bottom }
                    ];
                }
                return [
                    { id: 'left', x: 0, y: 0, width: Math.max(1, divider), height, transform: splitView.panes.left },
                    { id: 'right', x: Math.min(width, divider), y: 0, width: Math.max(1, width - divider), height, transform: splitView.panes.right }
                ];
            }

            function getPaneAtScreenPoint(screenX, screenY) {
                if (!splitView) return null;
                return getSplitPanes().find((pane) => (
                    screenX >= pane.x && screenX <= pane.x + pane.width &&
                    screenY >= pane.y && screenY <= pane.y + pane.height
                )) || null;
            }

            function getSplitViewportSize(orientation) {
                return orientation === 'horizontal' ? window.innerHeight : window.innerWidth;
            }

            function clampSplitCoordinate(value, orientation) {
                const size = getSplitViewportSize(orientation);
                const margin = Math.min(96, Math.max(24, size * 0.2));
                return Math.max(margin, Math.min(size - margin, value));
            }

            function updateSplitDividerHandle() {
                if (splitExitBtn) {
                    splitExitBtn.style.display = splitView ? 'inline-flex' : 'none';
                }
                if (!splitDividerHandle) return;
                if (!splitView) {
                    splitDividerHandle.classList.remove('active');
                    splitDividerHandle.removeAttribute('data-orientation');
                    splitDividerHandle.setAttribute('aria-hidden', 'true');
                    return;
                }

                splitView.coordinate = clampSplitCoordinate(splitView.coordinate, splitView.orientation);
                const isHorizontalSplit = splitView.orientation === 'horizontal';
                splitDividerHandle.classList.add('active');
                splitDividerHandle.setAttribute('aria-hidden', 'false');
                splitDividerHandle.setAttribute('aria-orientation', isHorizontalSplit ? 'horizontal' : 'vertical');
                splitDividerHandle.dataset.orientation = isHorizontalSplit ? 'horizontal' : 'vertical';

                if (isHorizontalSplit) {
                    splitDividerHandle.style.left = '0px';
                    splitDividerHandle.style.top = `${splitView.coordinate - 12}px`;
                    splitDividerHandle.style.width = '100vw';
                    splitDividerHandle.style.height = '24px';
                } else {
                    splitDividerHandle.style.left = `${splitView.coordinate - 12}px`;
                    splitDividerHandle.style.top = '0px';
                    splitDividerHandle.style.width = '24px';
                    splitDividerHandle.style.height = '100vh';
                }
            }

            function setSplitCoordinate(nextCoordinate, persist = true) {
                if (!splitView) return;
                splitView.coordinate = clampSplitCoordinate(nextCoordinate, splitView.orientation);
                render();
                if (persist) {
                    saveViewTransform();
                }
            }

            function exitSplitView() {
                if (!splitView) return;
                if (splitDividerHandle && splitDragState?.pointerId != null) {
                    splitDividerHandle.releasePointerCapture?.(splitDragState.pointerId);
                }
                const panes = getSplitPanes();
                const targetPane = activePaneId ? panes.find((pane) => pane.id === activePaneId) : panes[0];
                const nextTransform = targetPane?.transform || { offset: viewOffset, zoom: viewZoom };
                viewOffset = { ...nextTransform.offset };
                viewZoom = nextTransform.zoom;
                splitView = null;
                activePaneId = null;
                splitDragState = null;
                updateSplitDividerHandle();
                syncZoomControls();
                render();
                saveViewTransform();
            }

            function getActiveTransform(screenX = window.innerWidth / 2, screenY = window.innerHeight / 2, paneId = null) {
                if (!splitView) return { offset: viewOffset, zoom: viewZoom };
                const pane = paneId
                    ? getSplitPanes().find((candidate) => candidate.id === paneId)
                    : getPaneAtScreenPoint(screenX, screenY);
                return pane?.transform || { offset: viewOffset, zoom: viewZoom };
            }

            function screenToWorld(screenX, screenY, paneId = null) {
                const transform = getActiveTransform(screenX, screenY, paneId);
                return {
                    x: (screenX - transform.offset.x) / transform.zoom,
                    y: (screenY - transform.offset.y) / transform.zoom
                };
            }
            function worldToScreen(worldX, worldY, paneId = null) {
                const transform = getActiveTransform(window.innerWidth / 2, window.innerHeight / 2, paneId);
                return {
                    x: worldX * transform.zoom + transform.offset.x,
                    y: worldY * transform.zoom + transform.offset.y
                };
            }

            function clampZoom(zoomValue) {
                return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomValue));
            }

            function syncZoomControls() {
                const transform = getActiveTransform();
                if (zoomSlider) {
                    zoomSlider.value = Math.round(transform.zoom * 100);
                }
                if (zoomValueLabel) {
                    zoomValueLabel.textContent = `${Math.round(transform.zoom * 100)}%`;
                }
            }

            function scheduleViewTransformSave() {
                if (zoomSaveTimer) {
                    clearTimeout(zoomSaveTimer);
                }
                zoomSaveTimer = setTimeout(() => {
                    saveViewTransform();
                    zoomSaveTimer = null;
                }, 200);
            }

            function setZoom(nextZoom, anchorScreenX = window.innerWidth / 2, anchorScreenY = window.innerHeight / 2, persist = true) {
                const transform = getActiveTransform(anchorScreenX, anchorScreenY, activePaneId);
                const anchorWorld = screenToWorld(anchorScreenX, anchorScreenY, activePaneId);
                transform.zoom = clampZoom(nextZoom);
                transform.offset.x = anchorScreenX - anchorWorld.x * transform.zoom;
                transform.offset.y = anchorScreenY - anchorWorld.y * transform.zoom;
                if (!splitView) {
                    viewZoom = transform.zoom;
                    viewOffset = transform.offset;
                }
                updatePenCursorSize();
                syncZoomControls();
                render();
                if (persist) {
                    scheduleViewTransformSave();
                }
            }

            function applyThemeMode(mode) {
                isDarkMode = mode === 'dark';
                document.body.classList.toggle('dark-mode', isDarkMode);
                if (themeToggleBtn) {
                    themeToggleBtn.setAttribute('aria-pressed', String(isDarkMode));
                    themeToggleBtn.setAttribute('title', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
                }
                if (themeToggleIcon) {
                    themeToggleIcon.innerHTML = isDarkMode
                        ? '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 1-9-9Z"></path>'
                        : '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93 6.34 6.34"></path><path d="M17.66 17.66 19.07 19.07"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M4.93 19.07 6.34 17.66"></path><path d="M17.66 6.34 19.07 4.93"></path>';
                }
                
                updateMainPenIcon();
                if (penPreview) penPreview.style.backgroundColor = resolveThemeColor(currentColor);
                render();
                try {
                    localStorage.setItem('whiteboardThemeMode', isDarkMode ? 'dark' : 'light');
                } catch (e) {
                    console.warn('Failed to persist theme mode', e);
                }
            }

            function closeAllToolPopovers() {
                penPopover.classList.remove('active');
                eraserPopover.classList.remove('active');
                canvasPopover.classList.remove('active');
                trianglePopover.classList.remove('active');
                linePopover.classList.remove('active');
            }

            function updateToolbarDock(position, persist = true) {
                const validPosition = ['top', 'right', 'bottom', 'left'].includes(position) ? position : 'top';
                toolbarDockPosition = validPosition;
                toolbarWrapper.classList.remove('toolbar-dock-top', 'toolbar-dock-right', 'toolbar-dock-bottom', 'toolbar-dock-left');
                toolbarWrapper.classList.add(`toolbar-dock-${validPosition}`);
                syncHeaderContainerHeights();
                if (persist) {
                    try {
                        localStorage.setItem('whiteboardToolbarDock', validPosition);
                    } catch (e) {
                        console.warn('Failed to persist toolbar dock', e);
                    }
                }
            }

            function snapToolbarDock(clientX, clientY) {
                const edgeBias = Math.min(window.innerWidth, window.innerHeight) * 0.28;
                if (clientX <= edgeBias) {
                    updateToolbarDock('left');
                    return;
                }
                if (clientX >= window.innerWidth - edgeBias) {
                    updateToolbarDock('right');
                    return;
                }
                if (clientY <= edgeBias) {
                    updateToolbarDock('top');
                    return;
                }
                if (clientY >= window.innerHeight - edgeBias) {
                    updateToolbarDock('bottom');
                    return;
                }
                const distances = [
                    { position: 'top', distance: clientY },
                    { position: 'bottom', distance: window.innerHeight - clientY },
                    { position: 'left', distance: clientX },
                    { position: 'right', distance: window.innerWidth - clientX },
                ];
                distances.sort((a, b) => a.distance - b.distance);
                updateToolbarDock(distances[0].position);
            }

            function syncHeaderContainerHeights() {
                if (!toolbar || !logoContainer) return;
                requestAnimationFrame(() => {
                    if (toolbarDockPosition === 'left' || toolbarDockPosition === 'right') {
                        logoContainer.style.minHeight = '';
                                                toolbar.style.minHeight = '';
                        return;
                    }
                    const logoRect = logoContainer.getBoundingClientRect();
                    if (!logoRect.height) return;
                    const matchedHeight = `${Math.round(logoRect.height)}px`;
                    toolbar.style.minHeight = matchedHeight;
                                    });
            }

            function positionTextOverlay(screenX, screenY) {
                if (!textInputOverlay || !textInput) return;
                const margin = 12;
                textInputOverlay.classList.add('active');
                textInputOverlay.setAttribute('aria-hidden', 'false');
                textInputOverlay.style.visibility = 'hidden';
                textInputOverlay.style.left = '0px';
                textInputOverlay.style.top = '0px';
                textInputOverlay.style.maxWidth = `min(560px, ${window.innerWidth - margin * 2}px)`;
                textInputOverlay.style.maxHeight = `min(420px, ${window.innerHeight - margin * 2}px)`;

                const desiredWidth = Math.min(420, Math.max(240, Math.round(window.innerWidth * 0.32)));
                textInputOverlay.style.width = `${desiredWidth}px`;

                const overlayWidth = Math.min(desiredWidth, window.innerWidth - margin * 2);
                const estimatedHeight = Math.min(260, window.innerHeight - margin * 2);
                let left = Math.min(Math.max(margin, screenX + 8), window.innerWidth - overlayWidth - margin);
                let top = screenY + 8;
                let placeToolbarBelow = false;

                if (top + estimatedHeight > window.innerHeight - margin) {
                    top = Math.max(margin, screenY - estimatedHeight - 8);
                    placeToolbarBelow = true;
                }

                textInputOverlay.style.left = `${left}px`;
                textInputOverlay.style.top = `${top}px`;
                textInputOverlay.dataset.toolbarPosition = placeToolbarBelow ? 'bottom' : 'top';
                textInputOverlay.classList.toggle('toolbar-below', placeToolbarBelow);
                textInputOverlay.classList.toggle('toolbar-above', !placeToolbarBelow);
                textInputOverlay.style.visibility = 'visible';
                requestAnimationFrame(() => textInput.focus());
            }

            function openToolPopover(tool, buttonEl) {
                closeAllToolPopovers();
                const popoverMap = {
                    pen: penPopover,
                    eraser: eraserPopover,
                    canvas: canvasPopover,
                    triangle: trianglePopover,
                    line: linePopover,
                };
                const popover = popoverMap[tool];
                if (!popover || !buttonEl) return;
                popover.classList.add('active');
                popover.style.display = 'block';
                positionPopover(popover, buttonEl.getBoundingClientRect());
                popover.style.display = '';
            }

            function selectTool(tool, { keepSettingsOpen = false } = {}) {
                currentTool = tool;
                originalTool = tool;
                if (!keepSettingsOpen) {
                    if (tool === 'pen') {
                        currentPenMode = 'draw';
                        updatePenModeButtons();
                    } else if (tool === 'eraser') {
                        currentEraserMode = 'object';
                        updateEraserModeButtons();
                    }
                }
                updateActiveToolButton(tool);
                if (!keepSettingsOpen) {
                    closeAllToolPopovers();
                }
                if (tool === 'pen') {
                    setPenGroupCollapsed(false);
                } else if (pinnedPenConfigs.length > 0) {
                    setPenGroupCollapsed(true);
                }
            }

            function showToolSettings(tool, buttonEl) {
                selectTool(tool, { keepSettingsOpen: true });
                openToolPopover(tool, buttonEl);
            }

            function updatePenModeButtons() {
                if (penDrawBtn) {
                    penDrawBtn.classList.toggle('active', currentPenMode === 'draw');
                }
            }

            function syncPresetColorButtons() {
                if (!presetColorsEl) return;
                presetColorsEl.querySelectorAll('.preset-color-btn').forEach((button) => {
                    button.classList.toggle('active', button.dataset.color.toLowerCase() === currentColor.toLowerCase());
                });
            }

            function setCurrentColor(color) {
                currentColor = color;
                colorPicker.value = color;
                penPreview.style.backgroundColor = color;
                syncPresetColorButtons();
                updateMainPenIcon();
            }

            function updatePenTypeButtons() {
                penTypeButtons.forEach((button) => {
                    button.classList.toggle('active', button.dataset.penType === currentPenType);
                });
                penPreview.style.opacity = currentPenType === 'highlighter' ? '0.45' : '1';
                penPreview.style.borderRadius = currentPenType === 'spray' ? '999px' : '4px';
                updateMainPenIcon();
            }

            function getPenIconSvg(config, compact = false) {
                const type = config?.type || 'default';
                const baseColor = config?.color || '#000000';
                  const color = resolveThemeColor(baseColor);
                const size = Math.max(1, Number(config?.size || 5));
                const strokeWidth = Math.max(1.6, Math.min(4.2, 1.5 + size / 16));
                const svgAttrs = `fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`;
                if (type === 'spray') {
                    return `<svg viewBox="0 0 24 24" aria-hidden="true" ${svgAttrs} style="--dot-color:${color};--icon-stroke-width:${strokeWidth}"><path d="M5 19h5l9-9-5-5-9 9v5Z"></path><circle cx="17.5" cy="16" r="1.1" fill="${color}" stroke="none"></circle><circle cx="20" cy="19" r="0.8" fill="${color}" stroke="none"></circle><circle cx="15" cy="20" r="0.7" fill="${color}" stroke="none"></circle></svg>`;
                }
                if (type === 'highlighter') {
                    return `<svg viewBox="0 0 24 24" aria-hidden="true" ${svgAttrs} style="--dot-color:${color};--icon-stroke-width:${strokeWidth};opacity:.75"><path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z"></path><path d="M13 6 18 11"></path><path d="M6 20h12" stroke="${color}" stroke-width="4" opacity=".35"></path></svg>`;
                }
                return `<svg viewBox="0 0 24 24" aria-hidden="true" ${svgAttrs} style="--dot-color:${color};--icon-stroke-width:${strokeWidth}"><path d="M14.5 3.5 20.5 9.5 9 21H3v-6Z"></path><path d="M14.5 3.5 10 8"></path>${compact ? '' : `<path d="M4 20c4-2 8-2 13 0" stroke="${color}" stroke-width="${Math.max(2, Math.min(5, size / 2))}" opacity=".65"></path>`}</svg>`;
            }

            function updateMainPenIcon() {
                if (!penBtn) return;
                penBtn.innerHTML = getPenIconSvg({ color: currentColor, size: currentBrushSize, type: currentPenType });
                const svg = penBtn.querySelector('svg');
                if (svg) {
                    svg.classList.add('w-7', 'h-7', 'pointer-events-none');
                }
            }

            function updateLineStyleButtons() {
                lineStyleButtons.forEach((button) => {
                    button.classList.toggle('active', button.dataset.lineStyle === currentLineStyle);
                });
            }

            function getCurrentPenConfig() {
                return {
                    id: `pen_${Date.now()}_${Math.round(Math.random() * 1000)}`,
                    color: currentColor,
                    size: currentBrushSize,
                    type: currentPenType
                };
            }

            function savePinnedPenConfigs() {
                localStorage.setItem('whiteboardPinnedPens', JSON.stringify(pinnedPenConfigs));
            }

            function applyPenConfig(config) {
                if (!config) return;
                currentPenType = config.type || 'default';
                setCurrentColor(config.color || '#000000');
                const input = penThicknessControl.querySelector('input[type="number"]');
                input.value = config.size || 5;
                input.dispatchEvent(new Event('input'));
                updatePenTypeButtons();
                selectTool('pen');
                setPenGroupCollapsed(false);
            }

            function renderPinnedPenConfigs() {
                if (!pinnedPenConfigsEl || !pinnedPenEditorEl) return;
                pinnedPenConfigsEl.innerHTML = '';
                pinnedPenEditorEl.innerHTML = '';
                pinnedPenConfigs.forEach((config, index) => {
                    const button = document.createElement('button');
                    button.className = 'pinned-config-btn';
                    button.type = 'button';
                    button.draggable = true;
                    button.dataset.pinIndex = String(index);
                    button.title = `${config.type || 'default'} pen, ${config.size || 5}px`;
                    button.style.setProperty('--dot-color', config.color || '#000');
                    button.style.setProperty('--dot-opacity', config.type === 'highlighter' ? '0.45' : '1');
                    button.style.setProperty('--icon-stroke-width', `${Math.max(1.6, Math.min(4.2, 1.5 + (config.size || 5) / 16))}`);
                    button.innerHTML = getPenIconSvg(config, true);
                    button.addEventListener('click', (event) => {
                        event.stopPropagation();
                        applyPenConfig(config);
                    });
                    button.addEventListener('dragstart', (event) => {
                        event.dataTransfer.setData('text/plain', String(index));
                        event.dataTransfer.effectAllowed = 'move';
                    });
                    button.addEventListener('dragover', (event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                    });
                    button.addEventListener('drop', (event) => {
                        event.preventDefault();
                        const fromIndex = Number(event.dataTransfer.getData('text/plain'));
                        reorderPinnedPenConfig(fromIndex, index);
                    });
                    pinnedPenConfigsEl.appendChild(button);

                    const row = document.createElement('div');
                    row.className = 'pinned-pen-editor-row';
                    row.draggable = true;
                    row.dataset.pinIndex = String(index);
                    row.innerHTML = `<span>${config.type || 'default'} ${config.size || 5}px</span>`;
                    row.addEventListener('dragstart', (event) => {
                        event.dataTransfer.setData('text/plain', String(index));
                        event.dataTransfer.effectAllowed = 'move';
                    });
                    row.addEventListener('dragover', (event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                    });
                    row.addEventListener('drop', (event) => {
                        event.preventDefault();
                        const fromIndex = Number(event.dataTransfer.getData('text/plain'));
                        reorderPinnedPenConfig(fromIndex, index);
                    });
                    const up = document.createElement('button');
                    up.type = 'button';
                    up.textContent = '^';
                    up.title = 'Move up';
                    up.disabled = index === 0;
                    up.addEventListener('click', () => {
                        [pinnedPenConfigs[index - 1], pinnedPenConfigs[index]] = [pinnedPenConfigs[index], pinnedPenConfigs[index - 1]];
                        savePinnedPenConfigs();
                        renderPinnedPenConfigs();
                    });
                    const down = document.createElement('button');
                    down.type = 'button';
                    down.textContent = 'v';
                    down.title = 'Move down';
                    down.disabled = index === pinnedPenConfigs.length - 1;
                    down.addEventListener('click', () => {
                        [pinnedPenConfigs[index + 1], pinnedPenConfigs[index]] = [pinnedPenConfigs[index], pinnedPenConfigs[index + 1]];
                        savePinnedPenConfigs();
                        renderPinnedPenConfigs();
                    });
                    const remove = document.createElement('button');
                    remove.type = 'button';
                    remove.textContent = 'x';
                    remove.title = 'Remove';
                    remove.addEventListener('click', () => {
                        pinnedPenConfigs.splice(index, 1);
                        savePinnedPenConfigs();
                        renderPinnedPenConfigs();
                    });
                    row.append(up, down, remove);
                    pinnedPenEditorEl.appendChild(row);
                });
            }

            function reorderPinnedPenConfig(fromIndex, toIndex) {
                if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) return;
                if (fromIndex < 0 || fromIndex >= pinnedPenConfigs.length || toIndex < 0 || toIndex >= pinnedPenConfigs.length) return;
                const [movedConfig] = pinnedPenConfigs.splice(fromIndex, 1);
                pinnedPenConfigs.splice(toIndex, 0, movedConfig);
                savePinnedPenConfigs();
                renderPinnedPenConfigs();
            }

            function setPenGroupCollapsed(collapsed) {
                isPenGroupCollapsed = collapsed;
                penConfigGroup.classList.toggle('collapsed', collapsed);
                localStorage.setItem('whiteboardPenGroupCollapsed', collapsed ? 'true' : 'false');
            }

            if (penDrawBtn) {
                penDrawBtn.addEventListener('click', () => {
                    currentPenMode = 'draw';
                    updatePenModeButtons();
                    selectTool('pen', { keepSettingsOpen: true });
                });
            }

            function handleToolPress(tool, buttonEl) {
                if (suppressNextToolClick) {
                    suppressNextToolClick = false;
                    return;
                }
                const now = Date.now();
                const isRepeatTap = lastToolTapButton === buttonEl && (now - lastToolTapAt) < TOOL_DOUBLE_TAP_DURATION;
                lastToolTapButton = buttonEl;
                lastToolTapAt = now;
                activeToolSettingsButton = buttonEl;
                selectTool(tool);
                if (isRepeatTap) {
                    showToolSettings(tool, buttonEl);
                    return;
                }
            }

            function setupToolButton(buttonEl, tool, hasSettings = false) {
                if (!buttonEl) return;
                buttonEl.addEventListener('click', (event) => {
                    event.stopPropagation();
                    handleToolPress(tool, buttonEl);
                });
                if (hasSettings) {
                    buttonEl.addEventListener('pointerdown', (event) => {
                        if (event.pointerType === 'mouse' && event.button !== 0) return;
                        clearTimeout(activeToolSettingsTimer);
                        activeToolSettingsButton = buttonEl;
                        toolbarDragState = toolbarDragState || {};
                        toolbarDragState.lastTapAt = toolbarDragState.lastTapAt || 0;
                        activeToolSettingsTimer = setTimeout(() => {
                            suppressNextToolClick = true;
                            showToolSettings(tool, buttonEl);
                        }, TOOL_LONG_PRESS_DURATION);
                    });
                    const cancelPress = () => {
                        clearTimeout(activeToolSettingsTimer);
                        activeToolSettingsTimer = null;
                    };
                    buttonEl.addEventListener('pointerup', cancelPress);
                    buttonEl.addEventListener('pointerleave', cancelPress);
                    buttonEl.addEventListener('pointercancel', cancelPress);
                    buttonEl.addEventListener('dblclick', (event) => {
                        event.preventDefault();
                        suppressNextToolClick = true;
                        showToolSettings(tool, buttonEl);
                    });
                }
            }

            // --- Canvas Setup ---
            function updateCanvasIconPreview() {
                canvasIconBg.setAttribute('fill', backgroundColor);
                canvasIconRuled.style.display = backgroundPattern === 'ruled' ? 'block' : 'none';
                canvasIconGrid.style.display = backgroundPattern === 'grid' ? 'block' : 'none';

                // Contrast check for icon lines
                const isDarkBg = (parseInt(backgroundColor.substr(1, 2), 16) * 0.299 +
                                  parseInt(backgroundColor.substr(3, 2), 16) * 0.587 +
                                  parseInt(backgroundColor.substr(5, 2), 16) * 0.114) < 186;
                const patternColor = isDarkBg ? '#FFFFFF' : '#d1d5db';
                canvasIconRuled.setAttribute('stroke', patternColor);
                canvasIconGrid.setAttribute('stroke', patternColor);
            }

            function drawBackground(transform = { offset: viewOffset, zoom: viewZoom }) {
                // Safety check for dimensions
                if (canvas.width === 0 || canvas.height === 0) return;

                // We use logical dimensions for drawing here because the context is already scaled by DPR
                const logicalW = canvas.width / dpr;
                const logicalH = canvas.height / dpr;

                ctx.fillStyle = resolveThemeColor(backgroundColor);
                ctx.fillRect(0, 0, logicalW, logicalH);

                if (backgroundPattern === 'plain') return;

                ctx.strokeStyle = '#E2E8F0';
                const isDarkBg = (parseInt(backgroundColor.substr(1, 2), 16) * 0.299 +
                                  parseInt(backgroundColor.substr(3, 2), 16) * 0.587 +
                                  parseInt(backgroundColor.substr(5, 2), 16) * 0.114) < 186;
                if(isDarkBg) ctx.strokeStyle = 'rgba(255,255,255,0.1)';

                ctx.lineWidth = 1;
                ctx.beginPath();

                const worldLineSpacing = 30;
                const screenLineSpacing = worldLineSpacing * transform.zoom;

                if (screenLineSpacing > 5) {
                    const startX = transform.offset.x % screenLineSpacing;
                    const startY = transform.offset.y % screenLineSpacing;

                    if (backgroundPattern === 'ruled') {
                        for (let y = startY; y < logicalH; y += screenLineSpacing) {
                            ctx.moveTo(0, y);
                            ctx.lineTo(logicalW, y);
                        }
                    } else if (backgroundPattern === 'grid') {
                        for (let y = startY; y < logicalH; y += screenLineSpacing) {
                            ctx.moveTo(0, y);
                            ctx.lineTo(logicalW, y);
                        }
                        for (let x = startX; x < logicalW; x += screenLineSpacing) {
                            ctx.moveTo(x, 0);
                            ctx.lineTo(x, logicalH);
                        }
                    }
                    ctx.stroke();
                }
            }

            function resizeCanvas() {
                dpr = window.devicePixelRatio || 1;
                // Safety check for dpr
                if(isNaN(dpr) || dpr <= 0) dpr = 1;

                // Set physical pixel size
                canvas.width = window.innerWidth * dpr;
                canvas.height = window.innerHeight * dpr;

                // Set CSS display size (logical pixels)
                canvas.style.width = `${window.innerWidth}px`;
                canvas.style.height = `${window.innerHeight}px`;

                if (splitView) {
                    splitView.coordinate = clampSplitCoordinate(splitView.coordinate, splitView.orientation);
                }

                render();
            }

            // --- Local Storage ---
            function showSaveIndicator() {
                saveIndicator.style.opacity = '1';
                setTimeout(() => {
                    saveIndicator.style.opacity = '0';
                }, 1500);
            }

            function saveViewTransform() {
                try {
                    const viewState = { offset: viewOffset, zoom: viewZoom, splitView };
                    localStorage.setItem('whiteboardView', JSON.stringify(viewState));
                    whiteboardStorage.set('whiteboardView', viewState);
                } catch (e) {
                    console.error("Error saving view transform", e);
                }
            }

            function saveStrokesAndSettings() {
                try {
                    whiteboardStorage.set('whiteboardStrokes', strokes);
                    try {
                        if (strokes.length <= 200) {
                            localStorage.setItem('whiteboardStrokes', JSON.stringify(strokes));
                        } else {
                            localStorage.removeItem('whiteboardStrokes');
                        }
                    } catch (storageError) {
                        localStorage.removeItem('whiteboardStrokes');
                    }
                    localStorage.setItem('whiteboardBgColor', backgroundColor);
                    localStorage.setItem('whiteboardBgPattern', backgroundPattern);

                    // Also save to current local board if one is active
                    if (window.saveCurrentLocalBoard) {
                        window.saveCurrentLocalBoard();
                    }
                    // Note: Cloud boards now require manual save via "Save" button
                } catch (e) {
                    console.error("Error saving strokes", e);
                }
            }

            async function loadFromStorage() {
                backgroundColor = localStorage.getItem('whiteboardBgColor') || '#FFFFFF';
                backgroundPattern = localStorage.getItem('whiteboardBgPattern') || 'plain';

                bgColorPicker.value = backgroundColor;
                bgPatternSelector.value = backgroundPattern;
                updateCanvasIconPreview();

                const storedViewData = await whiteboardStorage.get('whiteboardView');
                const viewDataStr = localStorage.getItem('whiteboardView');
                if (storedViewData || viewDataStr) {
                    try {
                        const viewData = storedViewData || JSON.parse(viewDataStr);
                        if (viewData) {
                            viewOffset = viewData.offset || { x: 0, y: 0 };
                            viewZoom = viewData.zoom || 1;
                            splitView = viewData.splitView || null;
                        }
                    } catch (e) {
                        viewOffset = { x: 0, y: 0 };
                        viewZoom = 1;
                    }
                }

                const storedStrokes = await whiteboardStorage.get('whiteboardStrokes');
                const strokesData = localStorage.getItem('whiteboardStrokes');
                if (storedStrokes || strokesData) {
                     try {
                        strokes = Array.isArray(storedStrokes) ? storedStrokes : JSON.parse(strokesData);
                     } catch (e) {
                        strokes = [];
                     }
                }

                undoStack = [];
                redoStack = [];
                updateUndoRedoButtons();
                syncZoomControls();

                render();
            }

            // Simple autosave alias
            function autosave() {
                saveStrokesAndSettings();
            }

            // Function to clear canvas for new board
            window.clearCanvasForNewBoard = function() {
                strokes = [];
                undoStack = [];
                redoStack = [];
                selectedStrokeIndex = -1;
                movingStrokeIndex = -1;
                moveInteractionMode = 'none';
                backgroundColor = '#FFFFFF';
                backgroundPattern = 'plain';
                viewOffset = { x: 0, y: 0 };
                viewZoom = 1;
                splitView = null;
                activePaneId = null;

                bgColorPicker.value = backgroundColor;
                bgPatternSelector.value = backgroundPattern;
                updateCanvasIconPreview();
                updateUndoRedoButtons();
                syncZoomControls();
                render();
            }

            // --- History (Undo/Redo) ---
            function addHistoryAction() {
                redoStack = [];
                try {
                    undoStack.push(JSON.stringify(strokes));
                } catch (e) { console.warn("History full"); }
                if (undoStack.length > 50) {
                    undoStack.shift();
                }
                updateUndoRedoButtons();
            }

            function updateUndoRedoButtons() {
                undoBtn.disabled = undoStack.length === 0;
                redoBtn.disabled = redoStack.length === 0;
            }

            function undo() {
                if (undoStack.length === 0) return;
                redoStack.push(JSON.stringify(strokes));
                try {
                    strokes = JSON.parse(undoStack.pop());
                    selectedStrokeIndex = -1;
                    movingStrokeIndex = -1;
                    moveInteractionMode = 'none';
                    updateUndoRedoButtons();
                    render();
                    saveStrokesAndSettings();
                } catch(e) { console.error("Undo error", e); }
            }

            function redo() {
                if (redoStack.length === 0) return;
                undoStack.push(JSON.stringify(strokes));
                try {
                    strokes = JSON.parse(redoStack.pop());
                    selectedStrokeIndex = -1;
                    movingStrokeIndex = -1;
                    moveInteractionMode = 'none';
                    updateUndoRedoButtons();
                    render();
                    saveStrokesAndSettings();
                } catch(e) { console.error("Redo error", e); }
            }

            // --- Shape Drawing Functions ---
            function getStrokeCenter(stroke) {
                const bounds = getStrokeBounds(stroke);
                if (!bounds) return { x: 0, y: 0 };
                return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
            }

            function withStrokeRotation(stroke, drawFn) {
                if (!stroke.rotation) {
                    drawFn();
                    return;
                }
                const center = getStrokeCenter(stroke);
                ctx.save();
                ctx.translate(center.x, center.y);
                ctx.rotate(stroke.rotation);
                ctx.translate(-center.x, -center.y);
                drawFn();
                ctx.restore();
            }

            function rotatePointAround(point, center, angle) {
                if (!angle) return { x: point.x, y: point.y };
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const dx = point.x - center.x;
                const dy = point.y - center.y;
                return {
                    x: center.x + dx * cos - dy * sin,
                    y: center.y + dx * sin + dy * cos
                };
            }

            function pointToStrokeLocal(point, stroke) {
                if (!stroke?.rotation) return point;
                return rotatePointAround(point, getStrokeCenter(stroke), -stroke.rotation);
            }

            function applyLineStyle(stroke) {
                if (stroke.lineStyle === 'dotted') {
                    ctx.setLineDash([0.1, Math.max(4, (stroke.size || 2) * 2.4)]);
                    ctx.lineCap = 'round';
                } else if (stroke.lineStyle === 'dashed') {
                    ctx.setLineDash([Math.max(8, (stroke.size || 2) * 3), Math.max(6, (stroke.size || 2) * 2)]);
                } else {
                    ctx.setLineDash([]);
                }
            }

            function drawSmoothPath(points) {
                if (!points || points.length < 2) return;
                ctx.moveTo(points[0].x, points[0].y);
                if (points.length === 2) {
                    ctx.lineTo(points[1].x, points[1].y);
                    return;
                }
                for (let i = 1; i < points.length - 1; i++) {
                    const midX = (points[i].x + points[i + 1].x) / 2;
                    const midY = (points[i].y + points[i + 1].y) / 2;
                    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
                }
                ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            }

            function drawVariablePen(stroke) {
                const points = stroke.points || [];
                if (points.length < 2) return;
                for (let i = 1; i < points.length; i++) {
                    const prev = points[i - 1];
                    const point = points[i];
                    ctx.beginPath();
                    ctx.lineWidth = point.w || stroke.size || 1;
                    ctx.moveTo(prev.x, prev.y);
                    ctx.lineTo(point.x, point.y);
                    ctx.stroke();
                }
            }

            function drawSprayStroke(stroke) {
                ctx.save();
                ctx.fillStyle = resolveThemeColor(stroke.color);
                const dots = stroke.dots || stroke.points || [];
                dots.forEach((dot) => {
                    ctx.globalAlpha = dot.a || 0.28;
                    ctx.beginPath();
                    ctx.arc(dot.x, dot.y, dot.r || Math.max(0.6, (stroke.size || 4) * 0.08), 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }

            function drawStroke(stroke) {
                // Handle text rendering
                if (stroke.type === 'text') {
                    ctx.fillStyle = resolveThemeColor(stroke.color);

                    // Build font string with formatting
                    let fontStyle = '';
                    if (stroke.italic) fontStyle += 'italic ';
                    if (stroke.bold) fontStyle += 'bold ';

                    const fontSize = stroke.fontSize || 16;
                    const fontFamily = stroke.fontFamily || 'Arial, sans-serif';
                    ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;

                    // Handle multi-line text
                    const lines = stroke.text.split('\n');
                    const lineHeight = fontSize * 1.2;

                    lines.forEach((line, index) => {
                        const y = stroke.y + (index * lineHeight);
                        ctx.fillText(line, stroke.x, y);

                        // Draw underline if needed
                        if (stroke.underline) {
                            const textWidth = ctx.measureText(line).width;
                            ctx.beginPath();
                            ctx.strokeStyle = resolveThemeColor(stroke.color);
                            ctx.lineWidth = Math.max(1, fontSize / 16);
                            ctx.moveTo(stroke.x, y + 2);
                            ctx.lineTo(stroke.x + textWidth, y + 2);
                            ctx.stroke();
                        }
                    });
                    return;
                }

                ctx.strokeStyle = resolveThemeColor(stroke.color);
                ctx.lineWidth = stroke.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                if (stroke.tool === 'pixel-eraser') {
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)';
                    ctx.lineWidth = stroke.size;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    drawSmoothPath(stroke.points);
                    ctx.stroke();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = resolveThemeColor(backgroundColor);
                    const topLeft = screenToWorld(0, 0);
                    const bottomRight = screenToWorld(canvas.width / dpr, canvas.height / dpr);
                    ctx.fillRect(topLeft.x - 20, topLeft.y - 20, (bottomRight.x - topLeft.x) + 40, (bottomRight.y - topLeft.y) + 40);
                    ctx.restore();
                    return;
                }
                if (stroke.tool === 'spray') {
                    drawSprayStroke(stroke);
                    return;
                }
                if (stroke.tool === 'highlighter') {
                    ctx.save();
                    ctx.globalAlpha = 0.34;
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.lineWidth = stroke.size;
                    ctx.beginPath();
                    drawSmoothPath(stroke.points);
                    ctx.stroke();
                    ctx.restore();
                    return;
                }
                ctx.beginPath();
                switch (stroke.tool) {
                    case 'pen':
                        if (stroke.points.length < 2) {
                            // Draw a dot if it's a single point
                             if (stroke.points.length === 1) {
                                ctx.fillStyle = resolveThemeColor(stroke.color);
                                ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size/2, 0, Math.PI*2);
                                ctx.fill();
                             }
                             return;
                        }
                        drawSmoothPath(stroke.points);
                        break;
                    case 'cut':
                        if (stroke.points.length < 2) return;
                        ctx.save();
                        ctx.setLineDash([8, 6]);
                        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
                        ctx.lineWidth = Math.max(2, stroke.size / 2);
                        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                        for (let i = 1; i < stroke.points.length; i++) {
                            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                        }
                        ctx.stroke();
                        ctx.restore();
                        return;
                    case 'line':
                    case 'split':
                        if (stroke.points.length < 2) return;
                        applyLineStyle(stroke);
                        withStrokeRotation(stroke, () => {
                            ctx.beginPath();
                            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                            ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
                            ctx.stroke();
                        });
                        ctx.setLineDash([]);
                        return;
                    case 'rect':
                        if (stroke.points.length < 2) return;
                        const p1 = stroke.points[0];
                        const p2 = stroke.points[1];
                        withStrokeRotation(stroke, () => ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y));
                        return;
                    case 'circle':
                        if (stroke.points.length < 2) return;
                        const center = stroke.points[0];
                        const edge = stroke.points[1];
                        const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
                        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
                        break;
                    case 'triangle':
                        if (stroke.points.length < 2) return;
                        const trianglePoints = getTrianglePoints(stroke);
                        if (!trianglePoints) return;
                        withStrokeRotation(stroke, () => {
                            ctx.beginPath();
                            ctx.moveTo(trianglePoints[0].x, trianglePoints[0].y);
                            ctx.lineTo(trianglePoints[1].x, trianglePoints[1].y);
                            ctx.lineTo(trianglePoints[2].x, trianglePoints[2].y);
                            ctx.closePath();
                            ctx.stroke();
                        });
                        return;
                }
                ctx.setLineDash([]);
                ctx.stroke();
            }

            // --- Main Render Loop ---
            function renderPane(pane) {
                const paneBounds = {
                    minX: (pane.x - pane.transform.offset.x) / pane.transform.zoom,
                    maxX: (pane.x + pane.width - pane.transform.offset.x) / pane.transform.zoom,
                    minY: (pane.y - pane.transform.offset.y) / pane.transform.zoom,
                    maxY: (pane.y + pane.height - pane.transform.offset.y) / pane.transform.zoom,
                };
                const strokePadding = Math.max(12 / pane.transform.zoom, 4);
                const visibleStrokes = strokes.filter((stroke) => {
                    const bounds = getStrokeBounds(stroke);
                    return !bounds || boundsIntersect(bounds, paneBounds, strokePadding);
                });

                ctx.save();
                ctx.beginPath();
                ctx.rect(pane.x, pane.y, pane.width, pane.height);
                ctx.clip();
                drawBackground(pane.transform);
                ctx.translate(pane.transform.offset.x, pane.transform.offset.y);
                ctx.scale(pane.transform.zoom, pane.transform.zoom);
                visibleStrokes.forEach(drawStroke);
                if (currentPath && (!currentPath.paneId || currentPath.paneId === pane.id)) {
                    drawStroke(currentPath);
                }
                if (!activePaneId || activePaneId === pane.id) {
                    drawSelectionOverlay();
                }
                ctx.restore();
            }

            function drawSplitViewOverlay() {
                if (!splitView) return;
                const logicalW = canvas.width / dpr;
                const logicalH = canvas.height / dpr;
                ctx.save();
                ctx.strokeStyle = isDarkMode ? 'rgba(96, 165, 250, 0.88)' : 'rgba(37, 99, 235, 0.76)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 7]);
                ctx.beginPath();
                if (splitView.orientation === 'horizontal') {
                    ctx.moveTo(0, splitView.coordinate);
                    ctx.lineTo(logicalW, splitView.coordinate);
                } else {
                    ctx.moveTo(splitView.coordinate, 0);
                    ctx.lineTo(splitView.coordinate, logicalH);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.88)';
                ctx.strokeStyle = isDarkMode ? 'rgba(96, 165, 250, 0.55)' : 'rgba(37, 99, 235, 0.28)';
                ctx.lineWidth = 1;
                const label = splitView.orientation === 'horizontal' ? 'Split: top / bottom' : 'Split: left / right';
                ctx.font = '12px Inter, system-ui, sans-serif';
                const textWidth = ctx.measureText(label).width;
                const x = splitView.orientation === 'horizontal' ? 12 : splitView.coordinate + 10;
                const y = splitView.orientation === 'horizontal' ? splitView.coordinate + 10 : 78;
                ctx.beginPath();
                ctx.roundRect(Math.min(x, logicalW - textWidth - 30), Math.min(y, logicalH - 34), textWidth + 18, 24, 8);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = isDarkMode ? '#dbeafe' : '#1d4ed8';
                ctx.fillText(label, Math.min(x, logicalW - textWidth - 30) + 9, Math.min(y, logicalH - 34) + 16);
                ctx.restore();
            }

            function render() {
                if (!ctx) return;

                // CRITICAL FIX: Reset transform to identity then clear using physical pixels
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // CRITICAL FIX: Scale by Device Pixel Ratio for crisp text/lines
                // If dpr is weird, default to 1
                if(isNaN(dpr) || dpr <= 0) dpr = 1;
                ctx.scale(dpr, dpr);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                if (splitView) {
                    getSplitPanes().forEach(renderPane);
                    drawSplitViewOverlay();
                } else {
                    drawBackground();
                    ctx.save();
                    ctx.translate(viewOffset.x, viewOffset.y);
                    ctx.scale(viewZoom, viewZoom);
                    strokes.forEach(drawStroke);
                    if (currentPath) {
                        drawStroke(currentPath);
                    }
                    drawSelectionOverlay();
                    ctx.restore();
                }

                updateSplitDividerHandle();
            }

            // --- Object Eraser Logic ---
            function getDistance(p1, p2) {
                return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            }
            function isPointNearStroke(worldPoint, stroke) {
                // Handle text
                if (stroke.type === 'text') {
                    // Better bounding box for text with multi-line support
                    const fontSize = stroke.fontSize || 16;
                    const lines = stroke.text.split('\n');
                    const lineHeight = fontSize * 1.2;
                    const totalHeight = lines.length * lineHeight;

                    // Estimate text width (use longest line)
                    const maxLineLength = Math.max(...lines.map(l => l.length));
                    const textWidth = maxLineLength * fontSize * 0.6; // Approximate

                    return (worldPoint.x >= stroke.x - 10 && worldPoint.x <= stroke.x + textWidth + 10 &&
                            worldPoint.y >= stroke.y - fontSize && worldPoint.y <= stroke.y + totalHeight);
                }

                const testPoint = pointToStrokeLocal(worldPoint, stroke);
                const screenPixelTolerance = 5 / viewZoom;
                const tolerance = (currentEraserMode === 'object' ? currentEraserSize : stroke.size) + screenPixelTolerance;
                switch (stroke.tool) {
                    case 'pen':
                    case 'highlighter':
                    case 'pixel-eraser':
                        return stroke.points.some(p => getDistance(testPoint, p) < tolerance);
                    case 'spray': {
                        const dots = stroke.dots || stroke.points || [];
                        return dots.some(p => getDistance(testPoint, p) < tolerance);
                    }
                    case 'line':
                    case 'split':
                    case 'rect':
                    case 'circle':
                        const p1 = stroke.points[0];
                        const p2 = stroke.points[1];
                        const minX = Math.min(p1.x, p2.x) - tolerance;
                        const maxX = Math.max(p1.x, p2.x) + tolerance;
                        const minY = Math.min(p1.y, p2.y) - tolerance;
                        const maxY = Math.max(p1.y, p2.y) + tolerance;
                        if (stroke.tool === 'circle') {
                            const center = stroke.points[0];
                            const radius = getDistance(stroke.points[0], stroke.points[1]);
                            const distToCenter = getDistance(testPoint, center);
                            return Math.abs(distToCenter - radius) < tolerance;
                        }
                        return (testPoint.x >= minX && testPoint.x <= maxX &&
                                testPoint.y >= minY && testPoint.y <= maxY);
                    case 'triangle': {
                        const trianglePoints = getTrianglePoints(stroke);
                        if (!trianglePoints) return false;
                        const minXTriangle = Math.min(...trianglePoints.map(p => p.x)) - tolerance;
                        const maxXTriangle = Math.max(...trianglePoints.map(p => p.x)) + tolerance;
                        const minYTriangle = Math.min(...trianglePoints.map(p => p.y)) - tolerance;
                        const maxYTriangle = Math.max(...trianglePoints.map(p => p.y)) + tolerance;
                        if (testPoint.x < minXTriangle || testPoint.x > maxXTriangle || testPoint.y < minYTriangle || testPoint.y > maxYTriangle) {
                            return false;
                        }
                        const [a, b, c] = trianglePoints;
                        const area = Math.abs((a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2);
                        const area1 = Math.abs((testPoint.x * (b.y - c.y) + b.x * (c.y - testPoint.y) + c.x * (testPoint.y - b.y)) / 2);
                        const area2 = Math.abs((a.x * (testPoint.y - c.y) + testPoint.x * (c.y - a.y) + c.x * (a.y - testPoint.y)) / 2);
                        const area3 = Math.abs((a.x * (b.y - testPoint.y) + b.x * (testPoint.y - a.y) + testPoint.x * (a.y - b.y)) / 2);
                        return Math.abs(area - (area1 + area2 + area3)) <= Math.max(1.5, tolerance * 0.2);
                    }
                }
                return false;
            }
            function findAndRemoveStroke(worldPoint) {
                // === ENFORCE ERASER-ONLY DELETION ===
                // Only allow deletion if eraser tool is active
                if (currentTool !== 'eraser') return false;

                let didDelete = false;
                for (let i = strokes.length - 1; i >= 0; i--) {
                    if (isPointNearStroke(worldPoint, strokes[i])) {
                        strokes.splice(i, 1);
                        if (selectedStrokeIndex === i) {
                            selectedStrokeIndex = -1;
                        } else if (selectedStrokeIndex > i) {
                            selectedStrokeIndex--;
                        }
                        didDelete = true;
                        break;
                    }
                }
                if (didDelete) {
                    render();
                }
                return didDelete;
            }

            function isShapeStroke(stroke) {
                return stroke && ['line', 'rect', 'circle', 'triangle'].includes(stroke.tool);
            }

            function getStrokeBounds(stroke) {
                if (!stroke) return null;
                if (stroke.type === 'text') {
                    const fontSize = stroke.fontSize || 16;
                    const lines = (stroke.text || '').split('\n');
                    const lineHeight = fontSize * 1.2;
                    const totalHeight = Math.max(1, lines.length) * lineHeight;
                    const normalizedLines = lines.length ? lines : [''];
                    const fontStyle = `${stroke.italic ? 'italic ' : ''}${stroke.bold ? 'bold ' : ''}${fontSize}px ${stroke.fontFamily || 'Arial, sans-serif'}`;
                    let textWidth = 0;
                    if (ctx) {
                        ctx.save();
                        ctx.font = fontStyle;
                        for (const line of normalizedLines) {
                            textWidth = Math.max(textWidth, ctx.measureText(line || ' ').width);
                        }
                        ctx.restore();
                    } else {
                        const maxLineLength = Math.max(1, ...normalizedLines.map((line) => line.length));
                        textWidth = maxLineLength * fontSize * 0.6;
                    }
                    return {
                        minX: stroke.x,
                        maxX: stroke.x + textWidth,
                        minY: stroke.y - fontSize,
                        maxY: stroke.y + totalHeight
                    };
                }
                if (['pen', 'highlighter', 'pixel-eraser', 'spray'].includes(stroke.tool) && (stroke.points?.length || stroke.dots?.length)) {
                    const points = stroke.tool === 'spray' ? (stroke.dots || stroke.points) : stroke.points;
                    const xs = points.map(p => p.x);
                    const ys = points.map(p => p.y);
                    const pad = (stroke.size || 1) / 2;
                    return {
                        minX: Math.min(...xs) - pad,
                        maxX: Math.max(...xs) + pad,
                        minY: Math.min(...ys) - pad,
                        maxY: Math.max(...ys) + pad
                    };
                }
                if (!stroke.points || stroke.points.length < 2) return null;
                const p1 = stroke.points[0];
                const p2 = stroke.points[1];
                if (stroke.tool === 'circle') {
                    const radius = getDistance(p1, p2);
                    return {
                        minX: p1.x - radius,
                        maxX: p1.x + radius,
                        minY: p1.y - radius,
                        maxY: p1.y + radius
                    };
                }
                if (stroke.tool === 'triangle') {
                    const trianglePoints = getTrianglePoints(stroke);
                    if (!trianglePoints) return null;
                    const xs = trianglePoints.map(p => p.x);
                    const ys = trianglePoints.map(p => p.y);
                    return {
                        minX: Math.min(...xs),
                        maxX: Math.max(...xs),
                        minY: Math.min(...ys),
                        maxY: Math.max(...ys)
                    };
                }
                return {
                    minX: Math.min(p1.x, p2.x),
                    maxX: Math.max(p1.x, p2.x),
                    minY: Math.min(p1.y, p2.y),
                    maxY: Math.max(p1.y, p2.y)
                };
            }

            function drawSelectionOverlay() {
                if (currentTool !== 'move' || selectedStrokeIndex < 0 || selectedStrokeIndex >= strokes.length) return;
                const stroke = strokes[selectedStrokeIndex];
                const bounds = getStrokeBounds(stroke);
                if (!bounds) return;
                const pad = 8 / viewZoom;
                ctx.save();
                ctx.strokeStyle = '#2563eb';
                ctx.fillStyle = '#ffffff';
                ctx.lineWidth = 1.5 / viewZoom;
                ctx.setLineDash([6 / viewZoom, 4 / viewZoom]);
                withStrokeRotation(stroke, () => {
                    ctx.strokeRect(bounds.minX - pad, bounds.minY - pad, (bounds.maxX - bounds.minX) + pad * 2, (bounds.maxY - bounds.minY) + pad * 2);
                });
                ctx.setLineDash([]);

                if (isShapeStroke(stroke)) {
                    const handles = getShapeResizeHandles(stroke);
                    const handleSize = 10 / viewZoom;
                    for (const handle of handles) {
                        if (handle.type === 'rotate') {
                            ctx.beginPath();
                            ctx.arc(handle.x, handle.y, handleSize / 1.8, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                            continue;
                        }
                        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
                        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
                    }
                }
                ctx.restore();
            }

            function getShapeResizeHandles(stroke) {
                if (!isShapeStroke(stroke)) return [];
                const bounds = getStrokeBounds(stroke);
                if (!bounds) return [];

                const center = getStrokeCenter(stroke);
                const handles = [
                    // Corners
                    { x: bounds.minX, y: bounds.minY, key: 'nw', type: 'corner', cursor: 'nwse-resize' },
                    { x: bounds.maxX, y: bounds.minY, key: 'ne', type: 'corner', cursor: 'nesw-resize' },
                    { x: bounds.minX, y: bounds.maxY, key: 'sw', type: 'corner', cursor: 'nesw-resize' },
                    { x: bounds.maxX, y: bounds.maxY, key: 'se', type: 'corner', cursor: 'nwse-resize' },
                    // Edges
                    { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY, key: 'n', type: 'edge', cursor: 'ns-resize' },
                    { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY, key: 's', type: 'edge', cursor: 'ns-resize' },
                    { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2, key: 'w', type: 'edge', cursor: 'ew-resize' },
                    { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2, key: 'e', type: 'edge', cursor: 'ew-resize' },
                    { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY - (28 / viewZoom), key: 'rotate', type: 'rotate', cursor: 'grab' },
                ];
                return handles.map((handle) => ({
                    ...handle,
                    ...rotatePointAround(handle, center, stroke.rotation || 0)
                }));
            }

            function getShapeResizeHandlePoint(stroke) {
                // For compatibility, return the first (main) handle
                const handles = getShapeResizeHandles(stroke);
                return handles.length > 0 ? handles[0] : stroke.points[1];
            }

            function isPointOnResizeHandle(worldPoint, stroke) {
                if (!isShapeStroke(stroke)) return false;
                const handles = getShapeResizeHandles(stroke);
                const handleSize = 12 / viewZoom;
                for (const handle of handles) {
                    if (Math.abs(worldPoint.x - handle.x) <= handleSize / 2 &&
                        Math.abs(worldPoint.y - handle.y) <= handleSize / 2) {
                        return handle;
                    }
                }
                return null;
            }

            function getResizeHandleAtPoint(worldPoint, stroke) {
                return isPointOnResizeHandle(worldPoint, stroke);
            }

            function findShapeStrokeIndex(worldPoint) {
                for (let i = strokes.length - 1; i >= 0; i--) {
                    const stroke = strokes[i];
                    if (isShapeStroke(stroke) && isPointNearStroke(worldPoint, stroke)) {
                        return i;
                    }
                }
                return -1;
            }

            function findSelectableStrokeIndex(worldPoint) {
                for (let i = strokes.length - 1; i >= 0; i--) {
                    if (isPointNearStroke(worldPoint, strokes[i])) {
                        return i;
                    }
                }
                return -1;
            }

            function getMoveCursorAtPoint(worldPoint) {
                if (selectedStrokeIndex >= 0 && selectedStrokeIndex < strokes.length) {
                    const selectedStroke = strokes[selectedStrokeIndex];
                    const resizeHandle = isPointOnResizeHandle(worldPoint, selectedStroke);
                    if (resizeHandle) {
                        return resizeHandle.cursor || 'nwse-resize';
                    }
                }
                const hitIndex = findSelectableStrokeIndex(worldPoint);
                return hitIndex !== -1 ? 'move' : 'default';
            }

            function moveStrokeBy(stroke, dx, dy) {
                if (!stroke) return;
                if (stroke.type === 'text') {
                    stroke.x += dx;
                    stroke.y += dy;
                    return;
                }
                if (!stroke.points) return;
                stroke.points = stroke.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
                if (stroke.dots) {
                    stroke.dots = stroke.dots.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
                }
            }

            function resizeShapeToPoint(stroke, worldPoint, handle) {
                if (!stroke || !isShapeStroke(stroke) || !stroke.points || stroke.points.length < 2) return;
                const localPoint = pointToStrokeLocal(worldPoint, stroke);
                if (!handle) {
                    stroke.points[1] = { ...stroke.points[1], x: localPoint.x, y: localPoint.y };
                    return;
                }
                const bounds = getStrokeBounds(stroke);
                if (!bounds) return;
                let minX = bounds.minX;
                let maxX = bounds.maxX;
                let minY = bounds.minY;
                let maxY = bounds.maxY;
                if (handle.key.includes('w')) minX = localPoint.x;
                if (handle.key.includes('e')) maxX = localPoint.x;
                if (handle.key.includes('n')) minY = localPoint.y;
                if (handle.key.includes('s')) maxY = localPoint.y;
                if (minX > maxX) [minX, maxX] = [maxX, minX];
                if (minY > maxY) [minY, maxY] = [maxY, minY];
                if (stroke.tool === 'circle') {
                    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
                    const radiusPoint = { x: maxX, y: center.y };
                    stroke.points[0] = center;
                    stroke.points[1] = radiusPoint;
                    return;
                }
                stroke.points[0] = { x: minX, y: minY };
                stroke.points[1] = { x: maxX, y: maxY };
            }

            function getTrianglePoints(stroke) {
                if (!stroke || !stroke.points || stroke.points.length < 2) return null;
                const start = stroke.points[0];
                const end = stroke.points[1];
                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const maxY = Math.max(start.y, end.y);
                const triangleType = stroke.triangleType || 'isosceles';

                if (triangleType === 'right') {
                    return [
                        { x: minX, y: maxY },
                        { x: minX, y: minY },
                        { x: maxX, y: maxY },
                    ];
                }

                if (triangleType === 'equilateral') {
                    const width = maxX - minX;
                    const height = width * Math.sqrt(3) / 2;
                    const centerX = (minX + maxX) / 2;
                    const baseY = maxY;
                    return [
                        { x: centerX, y: baseY - height },
                        { x: minX, y: baseY },
                        { x: maxX, y: baseY },
                    ];
                }

                if (triangleType === 'inverted') {
                    return [
                        { x: (minX + maxX) / 2, y: minY },
                        { x: minX, y: maxY },
                        { x: maxX, y: maxY },
                    ];
                }

                return [
                    { x: (minX + maxX) / 2, y: minY },
                    { x: minX, y: maxY },
                    { x: maxX, y: maxY },
                ];
            }

            function distancePointToSegment(point, segmentStart, segmentEnd) {
                const dx = segmentEnd.x - segmentStart.x;
                const dy = segmentEnd.y - segmentStart.y;
                if (dx === 0 && dy === 0) return getDistance(point, segmentStart);
                const t = Math.max(0, Math.min(1, ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / (dx * dx + dy * dy)));
                return getDistance(point, {
                    x: segmentStart.x + t * dx,
                    y: segmentStart.y + t * dy,
                });
            }

            function orientation(a, b, c) {
                const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
                if (Math.abs(value) < 1e-9) return 0;
                return value > 0 ? 1 : 2;
            }

            function isPointOnSegment(a, b, c) {
                return Math.min(a.x, c.x) <= b.x + 1e-9 && b.x <= Math.max(a.x, c.x) + 1e-9 &&
                       Math.min(a.y, c.y) <= b.y + 1e-9 && b.y <= Math.max(a.y, c.y) + 1e-9;
            }

            function segmentsIntersect(p1, q1, p2, q2) {
                const o1 = orientation(p1, q1, p2);
                const o2 = orientation(p1, q1, q2);
                const o3 = orientation(p2, q2, p1);
                const o4 = orientation(p2, q2, q1);

                if (o1 !== o2 && o3 !== o4) return true;
                if (o1 === 0 && isPointOnSegment(p1, p2, q1)) return true;
                if (o2 === 0 && isPointOnSegment(p1, q2, q1)) return true;
                if (o3 === 0 && isPointOnSegment(p2, p1, q2)) return true;
                if (o4 === 0 && isPointOnSegment(p2, q1, q2)) return true;
                return false;
            }

            function segmentToSegmentDistance(segmentAStart, segmentAEnd, segmentBStart, segmentBEnd) {
                if (segmentsIntersect(segmentAStart, segmentAEnd, segmentBStart, segmentBEnd)) {
                    return 0;
                }
                return Math.min(
                    distancePointToSegment(segmentAStart, segmentBStart, segmentBEnd),
                    distancePointToSegment(segmentAEnd, segmentBStart, segmentBEnd),
                    distancePointToSegment(segmentBStart, segmentAStart, segmentAEnd),
                    distancePointToSegment(segmentBEnd, segmentAStart, segmentAEnd)
                );
            }

            function getStrokeSegments(stroke) {
                if (!stroke || !stroke.points || stroke.points.length < 2) return [];
                if (stroke.tool === 'pen') {
                    const segments = [];
                    for (let i = 1; i < stroke.points.length; i++) {
                        segments.push([stroke.points[i - 1], stroke.points[i]]);
                    }
                    return segments;
                }
                if (stroke.tool === 'line' || stroke.tool === 'rect' || stroke.tool === 'circle' || stroke.tool === 'triangle') {
                    const points = stroke.tool === 'triangle' ? getTrianglePoints(stroke) : stroke.points;
                    if (!points || points.length < 2) return [];
                    const closedPoints = stroke.tool === 'line' ? points : [...points, points[0]];
                    const segments = [];
                    for (let i = 1; i < closedPoints.length; i++) {
                        segments.push([closedPoints[i - 1], closedPoints[i]]);
                    }
                    return segments;
                }
                return [];
            }

            function pathIntersectsStroke(pathPoints, stroke, tolerance = 6) {
                if (!stroke || stroke.tool !== 'pen' || !stroke.points || stroke.points.length === 0) return false;
                const strokeSegments = getStrokeSegments(stroke);
                if (strokeSegments.length === 0) return false;
                const cutPoints = pathPoints.length > 1 ? pathPoints : [pathPoints[0], { x: pathPoints[0].x + 0.1, y: pathPoints[0].y + 0.1 }];
                for (let i = 1; i < cutPoints.length; i++) {
                    const cutStart = cutPoints[i - 1];
                    const cutEnd = cutPoints[i];
                    for (const [strokeStart, strokeEnd] of strokeSegments) {
                        const thisTolerance = tolerance + (stroke.size ? stroke.size / 2 : 0);
                        if (segmentToSegmentDistance(cutStart, cutEnd, strokeStart, strokeEnd) <= thisTolerance) {
                            return true;
                        }
                    }
                }
                return false;
            }

            function pointInRect(point, rect) {
                return point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY;
            }

            function segmentIntersectsRect(segmentStart, segmentEnd, rect) {
                if (pointInRect(segmentStart, rect) || pointInRect(segmentEnd, rect)) {
                    return true;
                }
                const rectEdges = [
                    [{ x: rect.minX, y: rect.minY }, { x: rect.maxX, y: rect.minY }],
                    [{ x: rect.maxX, y: rect.minY }, { x: rect.maxX, y: rect.maxY }],
                    [{ x: rect.maxX, y: rect.maxY }, { x: rect.minX, y: rect.maxY }],
                    [{ x: rect.minX, y: rect.maxY }, { x: rect.minX, y: rect.minY }],
                ];
                return rectEdges.some(([edgeStart, edgeEnd]) => segmentsIntersect(segmentStart, segmentEnd, edgeStart, edgeEnd));
            }

            function pathIntersectsTextStroke(pathPoints, stroke, tolerance = 6) {
                const bounds = getStrokeBounds(stroke);
                if (!bounds) return false;
                const expandedBounds = {
                    minX: bounds.minX - tolerance,
                    maxX: bounds.maxX + tolerance,
                    minY: bounds.minY - tolerance,
                    maxY: bounds.maxY + tolerance,
                };
                const cutPoints = pathPoints.length > 1 ? pathPoints : [pathPoints[0], { x: pathPoints[0].x + 0.1, y: pathPoints[0].y + 0.1 }];
                for (let i = 1; i < cutPoints.length; i++) {
                    if (segmentIntersectsRect(cutPoints[i - 1], cutPoints[i], expandedBounds)) {
                        return true;
                    }
                }
                return false;
            }

            function getPathBounds(points) {
                if (!Array.isArray(points) || points.length === 0) return null;
                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;
                for (const point of points) {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }
                return { minX, minY, maxX, maxY };
            }

            function boundsIntersect(boundsA, boundsB, padding = 0) {
                if (!boundsA || !boundsB) return false;
                return !(
                    boundsB.minX > boundsA.maxX + padding ||
                    boundsB.maxX < boundsA.minX - padding ||
                    boundsB.minY > boundsA.maxY + padding ||
                    boundsB.maxY < boundsA.minY - padding
                );
            }

            function detectScribble(points) {
                if (!Array.isArray(points) || points.length < 12) return false;

                const zoomSafe = Math.max(0.15, viewZoom || 1);
                const minAmplitude = 3 / zoomSafe;
                let reversalsX = 0;
                let reversalsY = 0;
                let dirX = 0;
                let dirY = 0;
                let lastExtremaX = points[0].x;
                let lastExtremaY = points[0].y;
                let totalAbsDx = 0;
                let totalAbsDy = 0;

                for (let i = 1; i < points.length; i++) {
                    const point = points[i];
                    const previousPoint = points[i - 1];
                    totalAbsDx += Math.abs(point.x - previousPoint.x);
                    totalAbsDy += Math.abs(point.y - previousPoint.y);

                    if (dirX === 0) {
                        if (Math.abs(point.x - lastExtremaX) > minAmplitude) {
                            dirX = Math.sign(point.x - lastExtremaX);
                            lastExtremaX = point.x;
                        }
                    } else if (dirX === 1 && point.x < lastExtremaX - minAmplitude) {
                        reversalsX++;
                        dirX = -1;
                        lastExtremaX = point.x;
                    } else if (dirX === -1 && point.x > lastExtremaX + minAmplitude) {
                        reversalsX++;
                        dirX = 1;
                        lastExtremaX = point.x;
                    } else {
                        if (dirX === 1 && point.x > lastExtremaX) lastExtremaX = point.x;
                        if (dirX === -1 && point.x < lastExtremaX) lastExtremaX = point.x;
                    }

                    if (dirY === 0) {
                        if (Math.abs(point.y - lastExtremaY) > minAmplitude) {
                            dirY = Math.sign(point.y - lastExtremaY);
                            lastExtremaY = point.y;
                        }
                    } else if (dirY === 1 && point.y < lastExtremaY - minAmplitude) {
                        reversalsY++;
                        dirY = -1;
                        lastExtremaY = point.y;
                    } else if (dirY === -1 && point.y > lastExtremaY + minAmplitude) {
                        reversalsY++;
                        dirY = 1;
                        lastExtremaY = point.y;
                    } else {
                        if (dirY === 1 && point.y > lastExtremaY) lastExtremaY = point.y;
                        if (dirY === -1 && point.y < lastExtremaY) lastExtremaY = point.y;
                    }
                }

                const box = getPathBounds(points);
                if (!box) return false;
                const width = Math.max(1e-9, box.maxX - box.minX);
                const height = Math.max(1e-9, box.maxY - box.minY);
                const xTraversalRatio = totalAbsDx / width;
                const yTraversalRatio = totalAbsDy / height;

                return (xTraversalRatio > 2.5 && reversalsX >= 3) || (yTraversalRatio > 2.5 && reversalsY >= 4);
            }

            function countPenStrokeIntersections(pathPoints, stroke, tolerance) {
                const strokeSegments = getStrokeSegments(stroke);
                if (strokeSegments.length === 0) return 0;
                let intersections = 0;
                for (const [strokeStart, strokeEnd] of strokeSegments) {
                    let hit = false;
                    for (let i = 1; i < pathPoints.length; i++) {
                        const scribbleStart = pathPoints[i - 1];
                        const scribbleEnd = pathPoints[i];
                        if (segmentToSegmentDistance(scribbleStart, scribbleEnd, strokeStart, strokeEnd) <= tolerance) {
                            hit = true;
                            break;
                        }
                    }
                    if (hit) intersections++;
                }
                return intersections;
            }

            function getPointsInsideBoundsRatio(points, bounds, padding = 0) {
                if (!Array.isArray(points) || points.length === 0 || !bounds) return 0;
                let inside = 0;
                for (const point of points) {
                    if (
                        point.x >= bounds.minX - padding &&
                        point.x <= bounds.maxX + padding &&
                        point.y >= bounds.minY - padding &&
                        point.y <= bounds.maxY + padding
                    ) {
                        inside++;
                    }
                }
                return inside / points.length;
            }

            function scribbleErasesStroke(pathPoints, stroke, sourceSize) {
                const scribbleBounds = getPathBounds(pathPoints);
                const strokeBounds = getStrokeBounds(stroke);
                if (!scribbleBounds || !strokeBounds) return false;

                const zoomSafe = Math.max(0.15, viewZoom || 1);
                const boundsPadding = Math.max(10 / zoomSafe, sourceSize / zoomSafe);
                if (!boundsIntersect(scribbleBounds, strokeBounds, boundsPadding)) return false;

                if (stroke.tool === 'pen') {
                    const tolerance = Math.max(6 / zoomSafe, sourceSize / zoomSafe) + ((stroke.size || 1) / 2);
                    const intersectionCount = countPenStrokeIntersections(pathPoints, stroke, tolerance);
                    const overlapRatio = getPointsInsideBoundsRatio(stroke.points || [], scribbleBounds, Math.max(sourceSize / zoomSafe, 2 / zoomSafe));
                    const strokeWidth = strokeBounds.maxX - strokeBounds.minX;
                    const strokeHeight = strokeBounds.maxY - strokeBounds.minY;
                    const strokeDiagonal = Math.sqrt(strokeWidth * strokeWidth + strokeHeight * strokeHeight);

                    if (intersectionCount >= 2) return true;
                    if (intersectionCount >= 1 && overlapRatio > 0.2) return true;
                    if (intersectionCount >= 1 && overlapRatio > 0.4) return true;
                    if (strokeDiagonal < (30 / zoomSafe) && overlapRatio > 0.3) return true;
                    return false;
                }

                if (stroke.type === 'text') {
                    let segmentHits = 0;
                    for (let i = 1; i < pathPoints.length; i++) {
                        if (segmentIntersectsRect(pathPoints[i - 1], pathPoints[i], strokeBounds)) {
                            segmentHits++;
                        }
                    }
                    const overlapRatio = getPointsInsideBoundsRatio(pathPoints, strokeBounds, Math.max(sourceSize / zoomSafe, 2 / zoomSafe));
                    return segmentHits >= 2 || (segmentHits >= 1 && overlapRatio > 0.15) || overlapRatio > 0.45;
                }

                return false;
            }

            function eraseStrokesByScribble(pathPoints, sourceSize = currentBrushSize) {
                // Non-eraser gestures are intentionally non-destructive.
                return false;
            }

            function cutStrokesByPath(pathPoints, sourceSize = currentEraserSize) {
                if (currentTool !== 'eraser') return false;
                if (!Array.isArray(pathPoints) || pathPoints.length === 0) return false;
                const zoomSafe = Math.max(0.15, viewZoom || 1);
                const baseToleranceInScreenPx = Math.max(14, sourceSize * 1.8);
                const tolerance = baseToleranceInScreenPx / zoomSafe;
                const before = strokes.length;
                strokes = strokes.filter((stroke) => {
                    if (!stroke) return true;
                    if (stroke.tool === 'pen') {
                        return !pathIntersectsStroke(pathPoints, stroke, tolerance);
                    }
                    if (stroke.type === 'text') {
                        return !pathIntersectsTextStroke(pathPoints, stroke, tolerance);
                    }
                    return true;
                });
                if (selectedStrokeIndex >= strokes.length) {
                    selectedStrokeIndex = -1;
                }
                return strokes.length !== before;
            }

            // --- Drawing Functions ---
            function getCoords(e) {
                return { x: e.clientX, y: e.clientY };
            }

            function snapPointToAxis(start, point) {
                const dx = point.x - start.x;
                const dy = point.y - start.y;
                if (dx === 0 && dy === 0) return point;
                const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
                const snapDegrees = 1.5;
                if (angle <= snapDegrees || Math.abs(angle - 180) <= snapDegrees) {
                    return { x: point.x, y: start.y };
                }
                if (Math.abs(angle - 90) <= snapDegrees) {
                    return { x: start.x, y: point.y };
                }
                return point;
            }

            function widthForSpeed(previousPoint, point, eventTime) {
                const base = currentBrushSize;
                const previousTime = previousPoint.t || eventTime;
                const dt = Math.max(8, eventTime - previousTime);
                const distance = getDistance(previousPoint, point);
                const speed = distance / dt;
                const normalized = Math.max(0, Math.min(1, speed / 1.2));
                const maxShift = Math.max(0.8, base * 0.18);
                return Math.max(1, base + maxShift - normalized * maxShift * 2);
            }

            function addSprayDots(path, point) {
                const radius = Math.max(4, currentBrushSize * 1.2);
                const count = Math.max(4, Math.round(currentBrushSize * 0.9));
                path.dots = path.dots || [];
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.sqrt(Math.random()) * radius;
                    path.dots.push({
                        x: point.x + Math.cos(angle) * distance,
                        y: point.y + Math.sin(angle) * distance,
                        r: Math.max(0.6, currentBrushSize * (0.04 + Math.random() * 0.07)),
                        a: 0.18 + Math.random() * 0.22
                    });
                }
            }

            function makeStrokePoint(worldPoint, eventTime) {
                return { x: worldPoint.x, y: worldPoint.y, t: eventTime, w: currentBrushSize };
            }

            function createSplitBoard(direction, screenX, screenY) {
                const orientation = direction === 'horizontal' ? 'vertical' : 'horizontal';
                const coordinate = orientation === 'horizontal'
                    ? clampSplitCoordinate(screenY, orientation)
                    : clampSplitCoordinate(screenX, orientation);
                const topLeft = { offset: { ...viewOffset }, zoom: viewZoom };
                const bottomRight = { offset: { ...viewOffset }, zoom: viewZoom };
                if (orientation === 'horizontal') {
                    bottomRight.offset.y -= Math.max(160, window.innerHeight * 0.32);
                    splitView = {
                        orientation,
                        coordinate,
                        panes: { top: topLeft, bottom: bottomRight }
                    };
                    activePaneId = 'top';
                } else {
                    bottomRight.offset.x -= Math.max(220, window.innerWidth * 0.34);
                    splitView = {
                        orientation,
                        coordinate,
                        panes: { left: topLeft, right: bottomRight }
                    };
                    activePaneId = 'left';
                }
                render();
                saveViewTransform();
                showNotification('Split view enabled', 'success');
            }

            function splitAtViewportCenter(direction) {
                createSplitBoard(direction, window.innerWidth / 2, window.innerHeight / 2);
            }

            function startDrawing(e) {
                // If not drawing on canvas or overlay, ignore
                if(e.target !== canvas) return;
                closeAllToolPopovers();

                if (e.target.closest('#toolbar-wrapper') || isTwoFingerPanning) {
                    return;
                }

                // === STYLUS DETECTION ===
                // If stylus is detected, force pen tool
                if (e.pointerType === 'pen') {
                    selectTool('pen');
                }

                // === BLOCK RIGHT-CLICK ===
                // Ignore right-click completely
                if (e.pointerType === 'mouse' && e.button !== 0) return;

                // Text tool handling
                if (currentTool === 'text') {
                    const { x: screenX, y: screenY } = getCoords(e);
                    const pane = getPaneAtScreenPoint(screenX, screenY);
                    activePaneId = pane?.id || null;
                    const worldPoint = screenToWorld(screenX, screenY, activePaneId);
                    textInputOverlay.dataset.x = worldPoint.x;
                    textInputOverlay.dataset.y = worldPoint.y;
                    positionTextOverlay(screenX, screenY);
                    return;
                }

                if (e.pointerType === 'touch') {
                    touchHoldTimer = setTimeout(() => {
                        isEraserGesture = true;
                        originalTool = currentTool;
                        currentTool = 'eraser';

                        const { x: screenX, y: screenY } = getCoords(e);
                        const pane = getPaneAtScreenPoint(screenX, screenY);
                        activePaneId = pane?.id || null;
                        const worldPoint = screenToWorld(screenX, screenY, activePaneId);
                        isDrawing = true;
                        didDeleteInStroke = false;
                        if (findAndRemoveStroke(worldPoint)) {
                            didDeleteInStroke = true;
                        }

                    }, TOUCH_HOLD_DURATION);
                }

                if (isEraserGesture) return;
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                e.preventDefault();

                const { x: screenX, y: screenY } = getCoords(e);
                const pane = getPaneAtScreenPoint(screenX, screenY);
                activePaneId = pane?.id || null;
                const worldPoint = screenToWorld(screenX, screenY, activePaneId);
                if (currentTool === 'pan') {
                    isPanning = true;
                    lastPanPos = { x: screenX, y: screenY };
                    canvas.classList.add('panning');
                    return;
                }
                if (currentTool === 'move') {
                    const selectedStroke = selectedStrokeIndex >= 0 ? strokes[selectedStrokeIndex] : null;
                    const resizeHandle = selectedStroke ? isPointOnResizeHandle(worldPoint, selectedStroke) : null;

                    if (resizeHandle) {
                        // === CLICKING ON RESIZE HANDLE ===
                        movingStrokeIndex = selectedStrokeIndex;
                        currentResizeHandle = resizeHandle;
                        if (resizeHandle.type === 'rotate') {
                            moveInteractionMode = 'rotate';
                            activeStrokeCenter = getStrokeCenter(selectedStroke);
                            rotateStartAngle = Math.atan2(worldPoint.y - activeStrokeCenter.y, worldPoint.x - activeStrokeCenter.x);
                            rotateStartValue = selectedStroke.rotation || 0;
                        } else {
                            moveInteractionMode = 'resize';
                        }
                        lastMovePoint = worldPoint;
                        hasMovedShape = false;
                        isDrawing = true;
                        return;
                    }

                    // === CLICKING ON SHAPE BORDER OR ANYWHERE INSIDE ===
                    // Allow selecting by clicking on any part of the shape
                    const selectableIndex = findSelectableStrokeIndex(worldPoint);
                    if (selectableIndex !== -1) {
                        selectedStrokeIndex = selectableIndex;
                        movingStrokeIndex = selectableIndex;
                        moveInteractionMode = 'move';
                        lastMovePoint = worldPoint;
                        hasMovedShape = false;
                        isDrawing = true;
                    } else {
                        selectedStrokeIndex = -1;
                        isDrawing = false;
                        movingStrokeIndex = -1;
                        moveInteractionMode = 'none';
                        lastMovePoint = null;
                        hasMovedShape = false;
                    }
                    render();
                    return;
                }
                isDrawing = true;
                if (currentTool === 'eraser') {
                    if (currentEraserMode === 'object') {
                        eraserHistorySnapshot = null;
                        didDeleteInStroke = false;
                        eraserHistorySnapshot = JSON.stringify(strokes);
                        if (findAndRemoveStroke(worldPoint)) {
                            didDeleteInStroke = true;
                        } else {
                            eraserHistorySnapshot = null;
                        }
                        return;
                    } else { // Pixel eraser
                        currentPath = { id: Date.now(), tool: 'pixel-eraser', color: 'rgba(0,0,0,1)', size: currentEraserSize, points: [worldPoint] };
                        return;
                    }
                }
                const strokeTool = currentTool === 'pen' ? (currentPenType === 'spray' ? 'spray' : currentPenType === 'highlighter' ? 'highlighter' : 'pen') : currentTool;
                const startPoint = makeStrokePoint(worldPoint, e.timeStamp || Date.now());
                currentPath = { id: Date.now(), tool: strokeTool, color: currentColor, size: currentBrushSize, points: [startPoint], paneId: activePaneId };
                if (strokeTool === 'pen') {
                    currentPath.variableWidth = false;
                }
                if (strokeTool === 'spray') {
                    addSprayDots(currentPath, worldPoint);
                }
                if (['line', 'rect', 'circle', 'triangle'].includes(currentTool)) {
                    currentPath.points.push(worldPoint);
                    if (currentTool === 'triangle') {
                        currentPath.triangleType = currentTriangleType;
                    }
                    if (currentTool === 'line') {
                        currentPath.lineStyle = currentLineStyle;
                    }
                }
            }

            function draw(e) {
                if (touchHoldTimer) {
                    clearTimeout(touchHoldTimer);
                    touchHoldTimer = null;
                }

                if ((!isDrawing && !isPanning) || isTwoFingerPanning) return;
                e.preventDefault();

                const { x: screenX, y: screenY } = getCoords(e);
                if (isPanning) {
                    const dx = screenX - lastPanPos.x;
                    const dy = screenY - lastPanPos.y;
                    const transform = getActiveTransform(screenX, screenY, activePaneId);
                    transform.offset.x += dx;
                    transform.offset.y += dy;
                    if (!splitView) {
                        viewOffset = transform.offset;
                    }
                    lastPanPos = { x: screenX, y: screenY };
                    render();
                    return;
                }
                if (isDrawing) {
                    if (splitView && activePaneId) {
                        const pane = getPaneAtScreenPoint(screenX, screenY);
                        if (!pane || pane.id !== activePaneId) {
                            return;
                        }
                    }
                    const worldPoint = screenToWorld(screenX, screenY, activePaneId);
                    if (currentTool === 'move') {
                        if (movingStrokeIndex !== -1 && lastMovePoint) {
                            if (moveInteractionMode === 'resize') {
                                if (!hasMovedShape) {
                                    addHistoryAction();
                                }
                                resizeShapeToPoint(strokes[movingStrokeIndex], worldPoint, currentResizeHandle);
                                hasMovedShape = true;
                                render();
                            } else if (moveInteractionMode === 'rotate') {
                                if (!hasMovedShape) {
                                    addHistoryAction();
                                }
                                const angle = Math.atan2(worldPoint.y - activeStrokeCenter.y, worldPoint.x - activeStrokeCenter.x);
                                strokes[movingStrokeIndex].rotation = rotateStartValue + (angle - rotateStartAngle);
                                hasMovedShape = true;
                                render();
                            } else {
                                const dx = worldPoint.x - lastMovePoint.x;
                                const dy = worldPoint.y - lastMovePoint.y;
                                if (dx !== 0 || dy !== 0) {
                                    if (!hasMovedShape) {
                                        addHistoryAction();
                                    }
                                    moveStrokeBy(strokes[movingStrokeIndex], dx, dy);
                                    lastMovePoint = worldPoint;
                                    hasMovedShape = true;
                                    render();
                                }
                            }
                        }
                        return;
                    }
                    if (currentTool === 'eraser') {
                        if (currentEraserMode === 'object') {
                            if (!eraserHistorySnapshot) {
                                eraserHistorySnapshot = JSON.stringify(strokes);
                            }
                            if (findAndRemoveStroke(worldPoint)) {
                                didDeleteInStroke = true;
                            }
                        } else { // Pixel eraser
                            if (currentPath) {
                                currentPath.points.push(worldPoint);
                                render();
                            }
                        }
                        return;
                    }
                    if (currentPath) {
                        switch (currentTool) {
                            case 'pen':
                                if (currentPath.tool === 'spray') {
                                    currentPath.points.push(worldPoint);
                                    addSprayDots(currentPath, worldPoint);
                                } else if (currentPath.tool === 'highlighter') {
                                    currentPath.points.push(worldPoint);
                                } else {
                                    const point = makeStrokePoint(worldPoint, e.timeStamp || Date.now());
                                    currentPath.points.push(point);
                                }
                                break;
                            case 'line':
                                currentPath.points[1] = snapPointToAxis(currentPath.points[0], worldPoint);
                                break;
                            case 'rect':
                            case 'circle':
                            case 'triangle':
                                currentPath.points[1] = snapPointToAxis(currentPath.points[0], worldPoint);
                                break;
                        }
                        render();
                    }
                }
            }

            function stopDrawing() {
                if (touchHoldTimer) {
                    clearTimeout(touchHoldTimer);
                    touchHoldTimer = null;
                }

                if (isPanning) {
                    isPanning = false;
                    canvas.classList.remove('panning');
                    saveViewTransform();
                }
                if (isDrawing) {
                    isDrawing = false;
                    let didChange = false;
                    if (currentTool === 'eraser') {
                        if (currentEraserMode === 'object') {
                            if (didDeleteInStroke) {
                                if (eraserHistorySnapshot) {
                                    redoStack = [];
                                    undoStack.push(eraserHistorySnapshot);
                                    if (undoStack.length > 50) {
                                        undoStack.shift();
                                    }
                                    updateUndoRedoButtons();
                                }
                                didChange = true;
                            }
                            didDeleteInStroke = false;
                            eraserHistorySnapshot = null;
                        } else { // Pixel eraser
                            if (currentPath && currentPath.points.length > 0) {
                                 if(currentPath.points.length === 1) {
                                    // Extend slighty so single click eraser works
                                    currentPath.points.push({x: currentPath.points[0].x+0.1, y: currentPath.points[0].y+0.1});
                                 }
                                addHistoryAction();
                                strokes.push(currentPath);
                                didChange = true;
                            }
                            currentPath = null;
                        }
                    } else if (currentTool === 'move') {
                        didChange = movingStrokeIndex !== -1 && hasMovedShape;
                        movingStrokeIndex = -1;
                        moveInteractionMode = 'none';
                        currentResizeHandle = null;
                        activeStrokeCenter = null;
                        lastMovePoint = null;
                        hasMovedShape = false;
                    } else if (currentPath) {
                        if (currentPath.tool === 'pen' && currentPath.points.length === 1) {
                            currentPath.points.push({ x: currentPath.points[0].x + (0.1 / viewZoom), y: currentPath.points[0].y + (0.1 / viewZoom) });
                        }
                        if (currentPath && currentPath.points.length > 1) {
                            if (currentPath.tool === 'triangle') {
                                currentPath.triangleType = currentPath.triangleType || currentTriangleType;
                            }
                            addHistoryAction();
                            strokes.push(currentPath);
                            didChange = true;
                        }
                        currentPath = null;
                    }

                    if (didChange) {
                        render();
                        saveStrokesAndSettings();
                    }
                }

                if (isEraserGesture) {
                    isEraserGesture = false;
                    currentTool = originalTool;
                }
            }

            // --- Toolbar Event Listeners ---
            function updateActiveToolButton(activeTool) {
                toolButtons.forEach(btn => {
                    if (btn.tool === activeTool) {
                        btn.el.classList.add('active');
                    } else {
                        btn.el.classList.remove('active');
                    }
                });
                if (activeTool === 'move') {
                    canvas.style.cursor = 'grab';
                } else {
                    // Changed from none to crosshair for safety if custom cursor fails
                    canvas.style.cursor = 'crosshair';
                }
                customCursorCircle.style.display = 'none';
                customCursorEraser.style.display = 'none';
                if (activeTool !== 'move') {
                    selectedStrokeIndex = -1;
                    movingStrokeIndex = -1;
                    moveInteractionMode = 'none';
                }
                render();
            }

            function positionPopover(popover, buttonRect) {
                const popoverWidth = popover.offsetWidth;
                let top = buttonRect.bottom + 12;
                let left = buttonRect.left + (buttonRect.width / 2) - (popoverWidth / 2);
                left = Math.max(16, left);
                if (left + popoverWidth > window.innerWidth - 16) {
                    left = window.innerWidth - 16 - popoverWidth;
                }
                popover.style.top = `${top}px`;
                popover.style.left = `${left}px`;
                popover.style.transform = 'none';
            }

            setupToolButton(penBtn, 'pen', true);
            setupToolButton(eraserBtn, 'eraser', true);
            setupToolButton(textBtn, 'text', false);
            setupToolButton(moveBtn, 'move', false);
            setupToolButton(triangleBtn, 'triangle', true);

            moveBtn.addEventListener('click', () => {
                closeAllToolPopovers();
                selectTool('move');
            });

            function updateEraserModeButtons() {
                objectEraserBtn.classList.toggle('active', currentEraserMode === 'object');
                pixelEraserBtn.classList.toggle('active', currentEraserMode === 'pixel');
            }

            objectEraserBtn.addEventListener('click', () => {
                currentEraserMode = 'object';
                updateEraserModeButtons();
            });

            pixelEraserBtn.addEventListener('click', () => {
                currentEraserMode = 'pixel';
                updateEraserModeButtons();
            });

            triangleOptionButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    currentTriangleType = button.dataset.triangleType || 'isosceles';
                    triangleOptionButtons.forEach((option) => option.classList.toggle('active', option === button));
                });
            });

            // Text formatting button handlers
            if (textBoldBtn) {
                textBoldBtn.addEventListener('click', () => {
                    textBold = !textBold;
                    textBoldBtn.classList.toggle('active', textBold);
                    updateTextInputStyle();
                });
            }

            if (textItalicBtn) {
                textItalicBtn.addEventListener('click', () => {
                    textItalic = !textItalic;
                    textItalicBtn.classList.toggle('active', textItalic);
                    updateTextInputStyle();
                });
            }

            if (textUnderlineBtn) {
                textUnderlineBtn.addEventListener('click', () => {
                    textUnderline = !textUnderline;
                    textUnderlineBtn.classList.toggle('active', textUnderline);
                    updateTextInputStyle();
                });
            }

            // Update textarea style based on formatting
            function updateTextInputStyle() {
                if (textInput) {
                    textInput.style.fontWeight = textBold ? 'bold' : 'normal';
                    textInput.style.fontStyle = textItalic ? 'italic' : 'normal';
                    textInput.style.textDecoration = textUnderline ? 'underline' : 'none';
                    textInput.style.fontFamily = textFontFamily.value;
                    textInput.style.fontSize = textFontSize.value + 'px';
                }
            }

            // Font family change handler
            if (textFontFamily) {
                textFontFamily.addEventListener('change', updateTextInputStyle);
            }

            // Font size change handler
            if (textFontSize) {
                textFontSize.addEventListener('change', updateTextInputStyle);
            }

            // Function to add text to canvas
            function addTextToCanvas() {
                if (textInput && textInput.value.trim()) {
                    const textData = {
                        type: 'text',
                        text: textInput.value,
                        x: parseFloat(textInputOverlay.dataset.x),
                        y: parseFloat(textInputOverlay.dataset.y),
                        color: currentColor,
                        fontSize: parseInt(textFontSize.value),
                        fontFamily: textFontFamily.value,
                        bold: textBold,
                        italic: textItalic,
                        underline: textUnderline,
                        paneId: activePaneId,
                    };
                    addHistoryAction();
                    strokes.push(textData);
                    render();
                    autosave();
                }
                closeTextInput();
            }

            // Function to close text input
            function closeTextInput() {
                textInputOverlay.classList.remove('active');
                textInputOverlay.classList.remove('toolbar-below');
                textInputOverlay.style.visibility = 'hidden';
                textInput.value = '';
                textBold = false;
                textItalic = false;
                textUnderline = false;
                textBoldBtn.classList.remove('active');
                textItalicBtn.classList.remove('active');
                textUnderlineBtn.classList.remove('active');
                textInputOverlay.setAttribute('aria-hidden', 'true');
            }

            // Text submit button
            if (textSubmitBtn) {
                textSubmitBtn.addEventListener('click', addTextToCanvas);
            }

            // Text cancel button
            if (textCancelBtn) {
                textCancelBtn.addEventListener('click', closeTextInput);
            }

            // Text input handling with keyboard shortcuts
            if (textInput) {
                textInput.addEventListener('keydown', (e) => {
                    // Ctrl+B for bold
                    if (e.ctrlKey && e.key === 'b') {
                        e.preventDefault();
                        textBoldBtn.click();
                    }
                    // Ctrl+I for italic
                    else if (e.ctrlKey && e.key === 'i') {
                        e.preventDefault();
                        textItalicBtn.click();
                    }
                    // Ctrl+U for underline
                    else if (e.ctrlKey && e.key === 'u') {
                        e.preventDefault();
                        textUnderlineBtn.click();
                    }
                    // Ctrl+Enter to submit
                    else if (e.ctrlKey && e.key === 'Enter') {
                        e.preventDefault();
                        addTextToCanvas();
                    }
                    // Escape to cancel
                    else if (e.key === 'Escape') {
                        closeTextInput();
                    }
                });
            }

            canvasBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const wasActive = canvasPopover.classList.contains('active');
                closeAllToolPopovers();
                if (!wasActive) {
                    canvasPopover.classList.add('active');
                    canvasPopover.style.display = 'block';
                    const btnRect = canvasBtn.getBoundingClientRect();
                    positionPopover(canvasPopover, btnRect);
                    canvasPopover.style.display = '';
                }
            });

            [lineBtn, rectBtn, circleBtn].forEach(btn => {
                btn.addEventListener('click', () => {
                    const tool = toolButtons.find(b => b.el === btn).tool;
                    closeAllToolPopovers();
                    selectTool(tool);
                });
            });
            setupToolButton(lineBtn, 'line', true);

            undoBtn.addEventListener('click', undo);
            redoBtn.addEventListener('click', redo);

            colorPicker.addEventListener('input', (e) => {
                setCurrentColor(e.target.value);
            });

            function updatePenCursorSize() {
                // Adjust cursor size logic slightly to account for visual zoom
                const cursorSize = Math.max(4, (currentBrushSize * viewZoom));
                customCursorCircle.style.width = `${cursorSize}px`;
                customCursorCircle.style.height = `${cursorSize}px`;
            }

            function setupThicknessControl(controlEl) {
                const input = controlEl.querySelector('input[type="number"]');
                const decBtn = controlEl.querySelector('[data-action="decrease"]');
                const incBtn = controlEl.querySelector('[data-action="increase"]');
                const type = controlEl.dataset.type;
                const updateSize = (newSize) => {
                    newSize = Math.max(1, Math.min(newSize, 500));
                    input.value = newSize;
                    if (type === 'pen') {
                        currentBrushSize = newSize;
                        penSizeLabel.textContent = `${newSize}px`;
                        updatePenCursorSize();
                        penPreview.style.height = `${Math.min(currentBrushSize, 40)}px`;
                        updateMainPenIcon();
                    } else { // eraser
                        currentEraserSize = newSize;
                        eraserSizeLabel.textContent = `${newSize}px`;
                        const previewSize = Math.min(currentEraserSize, 40);
                        eraserPreview.style.width = `${previewSize}px`;
                        eraserPreview.style.height = `${previewSize}px`;
                    }
                };
                input.addEventListener('input', () => updateSize(parseInt(input.value) || 1));
                input.addEventListener('change', () => updateSize(parseInt(input.value) || 1));
                decBtn.addEventListener('click', () => updateSize(parseInt(input.value) - 1));
                incBtn.addEventListener('click', () => updateSize(parseInt(input.value) + 1));
                updateSize(parseInt(input.value));
            }
            setupThicknessControl(penThicknessControl);
            setupThicknessControl(eraserThicknessControl);

            if (presetColorsEl) {
                PRESET_COLORS.forEach((color) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'preset-color-btn';
                    button.dataset.color = color;
                    button.title = color;
                    button.style.backgroundColor = color;
                    button.addEventListener('click', () => setCurrentColor(color));
                    presetColorsEl.appendChild(button);
                });
                syncPresetColorButtons();
            }

            penTypeButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    currentPenType = button.dataset.penType || 'default';
                    updatePenTypeButtons();
                });
            });
            lineStyleButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    currentLineStyle = button.dataset.lineStyle || 'solid';
                    updateLineStyleButtons();
                });
            });
            pinPenConfigBtn?.addEventListener('click', () => {
                pinnedPenConfigs.push(getCurrentPenConfig());
                savePinnedPenConfigs();
                renderPinnedPenConfigs();
                setPenGroupCollapsed(false);
            });
            penConfigCollapseBtn?.addEventListener('click', (event) => {
                event.stopPropagation();
                setPenGroupCollapsed(!isPenGroupCollapsed);
            });
            try {
                pinnedPenConfigs = JSON.parse(localStorage.getItem('whiteboardPinnedPens') || '[]');
            } catch (error) {
                pinnedPenConfigs = [];
            }
            renderPinnedPenConfigs();
            setPenGroupCollapsed(currentTool !== 'pen' && isPenGroupCollapsed);
            updatePenTypeButtons();
            updateLineStyleButtons();

            bgColorPicker.addEventListener('input', (e) => {
                backgroundColor = e.target.value;
                updateCanvasIconPreview();
                render();
                saveStrokesAndSettings();
            });

            bgPatternSelector.addEventListener('change', (e) => {
                backgroundPattern = e.target.value;
                updateCanvasIconPreview();
                render();
                saveStrokesAndSettings();
            });

            clearBtn.addEventListener('click', () => {
                if (currentTool !== 'eraser') {
                    showNotification('Select the eraser before clearing content', 'error');
                    return;
                }
                confirmModal.classList.remove('hidden');
            });
            cancelClearBtn.addEventListener('click', () => {
                confirmModal.classList.add('hidden');
            });
            confirmClearBtn.addEventListener('click', () => {
                if (strokes.length > 0) {
                    addHistoryAction();
                }
                strokes = [];
                selectedStrokeIndex = -1;
                movingStrokeIndex = -1;
                moveInteractionMode = 'none';
                viewOffset = { x: 0, y: 0 };
                viewZoom = 1;
                render();
                saveStrokesAndSettings();
                saveViewTransform();
                confirmModal.classList.add('hidden');
            });

            document.addEventListener('pointerdown', (e) => {
                if (!e.target.closest('#toolbar-wrapper') && !e.target.closest('.popover') && !e.target.closest('#buttonDiv') && !e.target.closest('#authStatus') && !e.target.closest('#save-drawing-btn')) {
                    closeAllToolPopovers();
                }
            });

            // --- Main Event Listeners ---

            function handlePointerDown(e) {
                startDrawing(e);
            }
            function handlePointerUp() {
                stopDrawing();
            }
            canvas.addEventListener('pointerdown', handlePointerDown);
            document.addEventListener('pointermove', draw);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);

            // Touch events for 2-finger pan AND zoom
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 3) {
                    e.preventDefault();
                    isDrawing = false;
                    isPanning = false;
                    isTwoFingerPanning = false;
                    const points = Array.from(e.touches).map((touch) => ({ x: touch.clientX, y: touch.clientY }));
                    const avgX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
                    const avgY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
                    splitGesture = { startX: avgX, startY: avgY, lastX: avgX, lastY: avgY };
                    return;
                }
                if (e.touches.length === 2) {
                    e.preventDefault();
                    isTwoFingerPanning = true;
                    isDrawing = false;
                    isPanning = false;

                    lastTouchMidpoint = {
                        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                    };
                    activePaneId = getPaneAtScreenPoint(lastTouchMidpoint.x, lastTouchMidpoint.y)?.id || null;
                    lastTouchDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                }
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                if (splitGesture && e.touches.length === 3) {
                    e.preventDefault();
                    const points = Array.from(e.touches).map((touch) => ({ x: touch.clientX, y: touch.clientY }));
                    splitGesture.lastX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
                    splitGesture.lastY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
                    return;
                }
                if (isTwoFingerPanning && e.touches.length === 2) {
                    e.preventDefault();

                    // Pan
                    const newMidpoint = {
                        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                    };
                    const deltaX = newMidpoint.x - lastTouchMidpoint.x;
                    const deltaY = newMidpoint.y - lastTouchMidpoint.y;
                    const transform = getActiveTransform(newMidpoint.x, newMidpoint.y, activePaneId);
                    transform.offset.x += deltaX;
                    transform.offset.y += deltaY;
                    if (!splitView) {
                        viewOffset = transform.offset;
                    }
                    lastTouchMidpoint = newMidpoint;

                    // Zoom
                    const newTouchDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    const deltaDistance = newTouchDistance - lastTouchDistance;

                    // Use a slower zoom factor for touch
                    const zoomFactor = 1 + (deltaDistance / 100) * (ZOOM_STEP * 5);
                    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.zoom * zoomFactor));
                    setZoom(newZoom, newMidpoint.x, newMidpoint.y, false);

                    lastTouchDistance = newTouchDistance;
                }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                if (splitGesture && e.touches.length < 3) {
                    const dx = splitGesture.lastX - splitGesture.startX;
                    const dy = splitGesture.lastY - splitGesture.startY;
                    const distance = Math.hypot(dx, dy);
                    if (distance > 32) {
                        const direction = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
                        const splitX = (splitGesture.startX + splitGesture.lastX) / 2;
                        const splitY = (splitGesture.startY + splitGesture.lastY) / 2;
                        createSplitBoard(direction, splitX, splitY);
                    }
                    splitGesture = null;
                    return;
                }
                if (isTwoFingerPanning) {
                    isTwoFingerPanning = false;
                    saveViewTransform();
                }
            });

            canvas.addEventListener('wheel', (e) => {
                if (e.target.closest('#toolbar-wrapper')) return;
                e.preventDefault();
                if (e.ctrlKey) {
                    // Zoom
                    const delta = -Math.sign(e.deltaY) * ZOOM_STEP;
                    activePaneId = getPaneAtScreenPoint(e.clientX, e.clientY)?.id || null;
                    const transform = getActiveTransform(e.clientX, e.clientY, activePaneId);
                    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.zoom + delta));
                    setZoom(newZoom, e.clientX, e.clientY, false);
                } else {
                    // Pan
                    activePaneId = getPaneAtScreenPoint(e.clientX, e.clientY)?.id || null;
                    const transform = getActiveTransform(e.clientX, e.clientY, activePaneId);
                    transform.offset.x -= e.deltaX;
                    transform.offset.y -= e.deltaY;
                    if (!splitView) {
                        viewOffset = transform.offset;
                    }
                }
                render();
                if (wheelSaveTimer) {
                    clearTimeout(wheelSaveTimer);
                }
                wheelSaveTimer = setTimeout(() => {
                    saveViewTransform();
                    wheelSaveTimer = null;
                }, 500);
            }, { passive: false });

            // --- Custom Cursor Logic ---
            document.addEventListener('pointermove', (e) => {
                const clientX = e.clientX;
                const clientY = e.clientY;
                customCursorCircle.style.left = `${clientX}px`;
                customCursorCircle.style.top = `${clientY}px`;
                customCursorEraser.style.left = `${clientX}px`;
                customCursorEraser.style.top = `${clientY}px`;

                if (e.pointerType === 'mouse') {
                    if (e.target === canvas) {
                        if (currentTool === 'eraser') {
                            customCursorCircle.style.display = 'none';
                            customCursorEraser.style.display = 'block';
                            canvas.style.cursor = 'none';
                        } else if (currentTool === 'move') {
                            customCursorCircle.style.display = 'none';
                            customCursorEraser.style.display = 'none';
                            const worldPoint = screenToWorld(clientX, clientY);
                            canvas.style.cursor = getMoveCursorAtPoint(worldPoint);
                        } else if (currentTool !== 'pan' && currentTool !== 'move') {
                            customCursorCircle.style.display = 'block';
                            customCursorEraser.style.display = 'none';
                            canvas.style.cursor = 'none';
                        } else {
                            customCursorCircle.style.display = 'none';
                            customCursorEraser.style.display = 'none';
                            canvas.style.cursor = isPanning ? 'grabbing' : 'grab';
                        }
                    } else {
                        customCursorCircle.style.display = 'none';
                        customCursorEraser.style.display = 'none';
                    }
                } else {
                    customCursorCircle.style.display = 'none';
                    customCursorEraser.style.display = 'none';
                }
            });

            document.addEventListener('mouseleave', () => {
                customCursorCircle.style.display = 'none';
                customCursorEraser.style.display = 'none';
            });

            const guideAnimations = {
                toolbar: '<svg viewBox="0 0 320 96"><rect x="32" y="28" width="256" height="40" rx="14" fill="#e2e8f0"/><circle cx="58" cy="48" r="11" fill="#64748b"/><rect x="84" y="38" width="32" height="20" rx="7" fill="#fff"/><rect x="124" y="38" width="32" height="20" rx="7" fill="#fff"/><rect x="164" y="38" width="32" height="20" rx="7" fill="#bfdbfe"/><path d="M52 48h12M58 42v12" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle r="6" fill="#2563eb"><animateMotion dur="1.8s" repeatCount="indefinite" path="M58 48 L58 18 L252 18 L252 48"/></circle></svg>',
                pen: '<svg viewBox="0 0 320 96"><rect x="62" y="22" width="196" height="52" rx="14" fill="#eef2f7"/><path d="M90 60 C126 28, 170 72, 212 36" fill="none" stroke="#2563eb" stroke-width="7" stroke-linecap="round"/><circle cx="236" cy="44" r="12" fill="#ef4444"/><circle cx="236" cy="44" r="6" fill="#fff"><animate attributeName="r" values="5;11;5" dur="1.5s" repeatCount="indefinite"/></circle></svg>',
                line: '<svg viewBox="0 0 320 96"><rect x="50" y="24" width="220" height="48" rx="12" fill="#f8fafc"/><line x1="82" y1="50" x2="238" y2="50" stroke="#0f172a" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 14"><animate attributeName="stroke-dashoffset" values="0;30" dur="1.2s" repeatCount="indefinite"/></line><path d="M238 34l18 16-18 16" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                eraser: '<svg viewBox="0 0 320 96"><path d="M74 62 C116 32, 156 70, 204 36" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/><g><rect x="146" y="36" width="48" height="24" rx="6" fill="#fca5a5" transform="rotate(-18 170 48)"/><rect x="170" y="36" width="24" height="24" rx="5" fill="#fecaca" transform="rotate(-18 182 48)"/><animateTransform attributeName="transform" type="translate" values="-28 0;46 0;-28 0" dur="1.8s" repeatCount="indefinite"/></g><text x="116" y="84" font-size="12" fill="#64748b">Only this removes strokes</text></svg>',
                split: '<svg viewBox="0 0 320 96"><rect x="50" y="18" width="220" height="60" rx="10" fill="#f8fafc" stroke="#cbd5e1"/><path d="M50 48h220" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 7"/><path d="M108 35 C136 24, 172 24, 208 35" fill="none" stroke="#64748b" stroke-width="6" stroke-linecap="round"><animate attributeName="d" values="M108 35 C136 24, 172 24, 208 35;M108 62 C136 72, 172 72, 208 62;M108 35 C136 24, 172 24, 208 35" dur="1.8s" repeatCount="indefinite"/></path><circle cx="122" cy="48" r="4" fill="#2563eb"/><circle cx="160" cy="48" r="4" fill="#2563eb"/><circle cx="198" cy="48" r="4" fill="#2563eb"/></svg>',
                move: '<svg viewBox="0 0 320 96"><rect x="118" y="28" width="86" height="42" rx="4" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="6 5"/><circle cx="118" cy="28" r="5" fill="#fff" stroke="#2563eb" stroke-width="2"/><circle cx="204" cy="70" r="5" fill="#fff" stroke="#2563eb" stroke-width="2"/><circle cx="161" cy="14" r="6" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"><animateMotion dur="1.8s" repeatCount="indefinite" path="M0 0 A26 26 0 1 1 1 0"/></circle><path d="M161 20v8" stroke="#2563eb" stroke-width="2"/></svg>',
                controls: '<svg viewBox="0 0 320 96"><circle cx="82" cy="48" r="20" fill="#e2e8f0"/><circle cx="134" cy="48" r="20" fill="#dbeafe"/><circle cx="186" cy="48" r="20" fill="#e2e8f0"/><path d="M128 48h12M134 42v12" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/><path d="M180 40h12v16h-12z" fill="none" stroke="#64748b" stroke-width="3"/><circle r="5" fill="#2563eb"><animateMotion dur="1.7s" repeatCount="indefinite" path="M82 24 L134 24 L186 24 L186 48"/></circle></svg>'
            };
            const guideSteps = [
                { target: '#toolbar-wrapper', title: 'Pick A Tool', animation: 'toolbar', body: 'Use the toolbar for drawing, editing, shapes, undo, and canvas settings. Drag the handle to place it on any screen edge.' },
                { target: '#pen-tool-wrapper', title: 'Save Favorite Pens', animation: 'pen', body: 'Open the pen menu to choose color, thickness, highlighter, spray, or default pen. Pin favorite setups so you can switch between them instantly.' },
                { target: '#line-btn', title: 'Lines Snap Cleanly', animation: 'line', body: 'The line menu includes solid, dotted, and dashed styles. Lines and shapes near perfectly straight angles snap into alignment.' },
                { target: '#eraser-tool-wrapper', title: 'Eraser Is The Only Delete', animation: 'eraser', body: 'Nothing else removes your work. Select the eraser when you want object erasing or pixel erasing.' },
                { target: '#whiteboard', title: 'Split The View', animation: 'split', body: 'Swipe with three fingers for a split view. On desktop, use Alt+V for left/right and Alt+H for top/bottom, or use the split buttons.' },
                { target: '#move-btn', title: 'Resize And Rotate', animation: 'move', body: 'Choose Move, select a shape, then drag corners, edges, or the round rotation handle.' },
                { target: '#board-controls', title: 'Board Controls', animation: 'controls', body: 'The top-right controls reopen this guide, toggle dark mode, and manage split views.' }
            ];
            let guideIndex = 0;

            function positionGuide() {
                if (!featureGuide?.classList.contains('active')) return;
                const step = guideSteps[guideIndex];
                const target = document.querySelector(step.target);
                const rect = target ? target.getBoundingClientRect() : { left: 16, top: 16, width: 1, height: 1, right: 17, bottom: 17 };
                const pad = 8;
                guideSpotlight.style.left = `${Math.max(8, rect.left - pad)}px`;
                guideSpotlight.style.top = `${Math.max(8, rect.top - pad)}px`;
                guideSpotlight.style.width = `${Math.max(28, rect.width + pad * 2)}px`;
                guideSpotlight.style.height = `${Math.max(28, rect.height + pad * 2)}px`;

                guideTitle.textContent = step.title;
                guideBody.textContent = step.body;
                if (guideAnimation) {
                    guideAnimation.innerHTML = guideAnimations[step.animation] || '';
                }
                guideStepCount.textContent = `${guideIndex + 1} / ${guideSteps.length}`;
                guidePrevBtn.disabled = guideIndex === 0;
                guideNextBtn.textContent = guideIndex === guideSteps.length - 1 ? 'Done' : 'Next';

                const cardWidth = Math.min(340, window.innerWidth - 24);
                let left = rect.right + 18;
                let top = rect.top;
                if (left + cardWidth > window.innerWidth - 12) {
                    left = Math.max(12, rect.left - cardWidth - 18);
                }
                if (left < 12) {
                    left = 12;
                    top = rect.bottom + 18;
                }
                top = Math.max(12, Math.min(top, window.innerHeight - 230));
                guideCard.style.left = `${left}px`;
                guideCard.style.top = `${top}px`;
                guideCard.style.setProperty('--guide-tip-left', `${Math.max(18, Math.min(cardWidth - 32, rect.left + rect.width / 2 - left))}px`);
                guideCard.style.setProperty('--guide-tip-top', left === 12 && top >= rect.bottom ? '-7px' : '18px');
            }

            function openGuide(force = false) {
                if (!document.getElementById('whiteboard-view')?.classList.contains('active')) return;
                if (!force && localStorage.getItem('whiteboardGuideSeen') === 'true') return;
                guideIndex = 0;
                featureGuide.classList.add('active');
                featureGuide.setAttribute('aria-hidden', 'false');
                positionGuide();
            }

            function closeGuide() {
                featureGuide.classList.remove('active');
                featureGuide.setAttribute('aria-hidden', 'true');
                localStorage.setItem('whiteboardGuideSeen', 'true');
            }

            guideOpenBtn?.addEventListener('click', () => openGuide(true));
            window.openWhiteboardGuide = openGuide;
            guideCloseBtn?.addEventListener('click', closeGuide);
            guidePrevBtn?.addEventListener('click', () => {
                guideIndex = Math.max(0, guideIndex - 1);
                positionGuide();
            });
            guideNextBtn?.addEventListener('click', () => {
                if (guideIndex >= guideSteps.length - 1) {
                    closeGuide();
                    return;
                }
                guideIndex += 1;
                positionGuide();
            });
            window.addEventListener('resize', positionGuide);
            setTimeout(() => openGuide(false), 700);

            // --- Keyboard Shortcuts ---
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z') {
                        e.preventDefault();
                        undo();
                    } else if (e.key === 'y') {
                        e.preventDefault();
                        redo();
                    }
                } else if (e.altKey && e.key.toLowerCase() === 'v') {
                    e.preventDefault();
                    splitAtViewportCenter('horizontal');
                } else if (e.altKey && e.key.toLowerCase() === 'h') {
                    e.preventDefault();
                    splitAtViewportCenter('vertical');
                } else if (e.key === 'Escape' && splitView) {
                    e.preventDefault();
                    exitSplitView();
                } else if (/^[1-9]$/.test(e.key)) {
                    const shortcutTool = getNumberShortcutTools()[Number(e.key) - 1];
                    if (shortcutTool) {
                        e.preventDefault();
                        selectTool(shortcutTool);
                    }
                } else if (e.key === 'Delete') {
                    e.preventDefault();
                    showNotification('Use the eraser to remove content', 'error');
                }
            });

            if (toolbarDragHandle) {
                toolbarDragHandle.addEventListener('pointerdown', (event) => {
                    if (event.button !== undefined && event.button !== 0) return;
                    const rect = toolbarWrapper.getBoundingClientRect();
                    toolbarDragState = {
                        pointerId: event.pointerId,
                        offsetX: event.clientX - rect.left,
                        offsetY: event.clientY - rect.top,
                        lastTapAt: toolbarDragState?.lastTapAt || 0,
                    };
                    toolbarDragHandle.setPointerCapture?.(event.pointerId);
                    toolbarWrapper.style.left = `${rect.left}px`;
                    toolbarWrapper.style.top = `${rect.top}px`;
                    toolbarWrapper.style.transform = 'none';
                });

                const handleToolbarDragMove = (event) => {
                    if (!toolbarDragState || toolbarDragState.pointerId !== event.pointerId) return;
                    event.preventDefault();
                    const nextLeft = event.clientX - toolbarDragState.offsetX;
                    const nextTop = event.clientY - toolbarDragState.offsetY;
                    toolbarWrapper.style.left = `${Math.max(8, Math.min(nextLeft, window.innerWidth - toolbarWrapper.offsetWidth - 8))}px`;
                    toolbarWrapper.style.top = `${Math.max(8, Math.min(nextTop, window.innerHeight - toolbarWrapper.offsetHeight - 8))}px`;
                    toolbarWrapper.style.transform = 'none';
                };

                const handleToolbarDragEnd = (event) => {
                    if (!toolbarDragState || toolbarDragState.pointerId !== event.pointerId) return;
                    toolbarDragState = null;
                    toolbarDragHandle.releasePointerCapture?.(event.pointerId);
                    toolbarWrapper.style.left = '';
                    toolbarWrapper.style.top = '';
                    toolbarWrapper.style.transform = '';
                    snapToolbarDock(event.clientX, event.clientY);
                };

                toolbarDragHandle.addEventListener('pointermove', handleToolbarDragMove);
                toolbarDragHandle.addEventListener('pointerup', handleToolbarDragEnd);
                toolbarDragHandle.addEventListener('pointercancel', handleToolbarDragEnd);
            }

            // --- Initialization ---

            // Must call resize ONCE at startup to set correct pixel ratio
            resizeCanvas();
            const initialLoadPromise = loadFromStorage();
            updateToolbarDock(toolbarDockPosition, false);
            syncHeaderContainerHeights();
            applyThemeMode(isDarkMode ? 'dark' : 'light');
            updateActiveToolButton(currentTool);
            updateUndoRedoButtons();
            updatePenModeButtons();
            updateEraserModeButtons();
            syncZoomControls();
            textInputOverlay.setAttribute('aria-hidden', 'true');
            textInputOverlay.style.visibility = 'hidden';

            // Set initial UI values
            penThicknessInput.value = currentBrushSize;
            penSizeLabel.textContent = `${currentBrushSize}px`;
            eraserThicknessInput.value = currentEraserSize;
            eraserSizeLabel.textContent = `${currentEraserSize}px`;
            updateMainPenIcon();
            penPreview.style.backgroundColor = currentColor;
            penPreview.style.height = `${Math.min(currentBrushSize, 40)}px`;
            const eraserPreviewSize = Math.min(currentEraserSize, 40);
            eraserPreview.style.width = `${eraserPreviewSize}px`;
            eraserPreview.style.height = `${eraserPreviewSize}px`;

            if (themeToggleBtn) {
                themeToggleBtn.addEventListener('click', () => {
                    applyThemeMode(isDarkMode ? 'light' : 'dark');
                });
            }

            splitVerticalBtn?.addEventListener('click', () => splitAtViewportCenter('horizontal'));
            splitHorizontalBtn?.addEventListener('click', () => splitAtViewportCenter('vertical'));
            splitExitBtn?.addEventListener('click', exitSplitView);

            if (splitDividerHandle) {
                splitDividerHandle.addEventListener('pointerdown', (event) => {
                    if (!splitView || (event.button !== undefined && event.button !== 0)) return;
                    event.preventDefault();
                    splitDragState = { pointerId: event.pointerId };
                    splitDividerHandle.setPointerCapture?.(event.pointerId);
                });

                splitDividerHandle.addEventListener('pointermove', (event) => {
                    if (!splitDragState || splitDragState.pointerId !== event.pointerId || !splitView) return;
                    event.preventDefault();
                    setSplitCoordinate(splitView.orientation === 'horizontal' ? event.clientY : event.clientX, false);
                });

                const finishSplitDrag = (event) => {
                    if (!splitDragState || splitDragState.pointerId !== event.pointerId) return;
                    splitDragState = null;
                    splitDividerHandle.releasePointerCapture?.(event.pointerId);
                    saveViewTransform();
                };

                splitDividerHandle.addEventListener('pointerup', finishSplitDrag);
                splitDividerHandle.addEventListener('pointercancel', finishSplitDrag);
            }

            if (zoomSlider) {
                zoomSlider.addEventListener('input', () => {
                    const nextZoom = parseInt(zoomSlider.value, 10) / 100;
                    setZoom(nextZoom, window.innerWidth / 2, window.innerHeight / 2);
                });
            }

            function getToolbarItemId(item) {
                return item?.querySelector?.('button[id]')?.id || item?.id || '';
            }

            function persistToolbarOrder() {
                const order = Array.from(toolbar.children)
                    .filter((item) => item.id !== 'toolbar-drag-handle')
                    .map(getToolbarItemId)
                    .filter(Boolean);
                localStorage.setItem('whiteboardToolbarOrder', JSON.stringify(order));
                updateToolbarShortcutLabels();
            }

            function applyToolbarOrder() {
                let order = [];
                try {
                    order = JSON.parse(localStorage.getItem('whiteboardToolbarOrder') || '[]');
                } catch (error) {
                    order = [];
                }
                if (!Array.isArray(order) || order.length === 0) return;
                const movableItems = Array.from(toolbar.children).filter((item) => item.id !== 'toolbar-drag-handle');
                const itemMap = new Map(movableItems.map((item) => [getToolbarItemId(item), item]));
                order.forEach((id) => {
                    const item = itemMap.get(id);
                    if (item) toolbar.appendChild(item);
                });
                movableItems.forEach((item) => {
                    if (!order.includes(getToolbarItemId(item))) {
                        toolbar.appendChild(item);
                    }
                });
                updateToolbarShortcutLabels();
            }

            function getNumberShortcutTools() {
                return Array.from(toolbar.children)
                    .map((item) => toolButtons.find((entry) => item.contains(entry.el))?.tool)
                    .filter((tool) => ['move', 'pen', 'eraser', 'text', 'line', 'rect', 'circle', 'triangle'].includes(tool))
                    .slice(0, 9);
            }

            function updateToolbarShortcutLabels() {
                const orderedTools = getNumberShortcutTools();
                toolButtons.forEach((entry) => {
                    const label = entry.el.closest('.tool-group, .flex')?.querySelector('.tool-shortcut');
                    if (!label) return;
                    const shortcutIndex = orderedTools.indexOf(entry.tool);
                    label.textContent = shortcutIndex >= 0 ? String(shortcutIndex + 1) : '';
                });
            }

            function setupToolbarReordering() {
                applyToolbarOrder();
                Array.from(toolbar.children).forEach((item) => {
                    if (item.id === 'toolbar-drag-handle') return;
                    item.draggable = true;
                    item.addEventListener('dragstart', (event) => {
                        if (event.target.closest('.pinned-config-btn')) return;
                        event.dataTransfer.setData('text/plain', getToolbarItemId(item));
                        event.dataTransfer.effectAllowed = 'move';
                        item.classList.add('toolbar-reorder-ghost');
                    });
                    item.addEventListener('dragend', () => item.classList.remove('toolbar-reorder-ghost'));
                    item.addEventListener('dragover', (event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        item.classList.add('toolbar-drop-before');
                    });
                    item.addEventListener('dragleave', () => item.classList.remove('toolbar-drop-before'));
                    item.addEventListener('drop', (event) => {
                        event.preventDefault();
                        item.classList.remove('toolbar-drop-before');
                        const draggedId = event.dataTransfer.getData('text/plain');
                        const draggedItem = Array.from(toolbar.children).find((candidate) => getToolbarItemId(candidate) === draggedId);
                        if (!draggedItem || draggedItem === item || draggedItem.id === 'toolbar-drag-handle') return;
                        toolbar.insertBefore(draggedItem, item);
                        persistToolbarOrder();
                    });
                });
                updateToolbarShortcutLabels();
            }

            setupToolbarReordering();

            window.addEventListener('resize', resizeCanvas);
            window.addEventListener('resize', syncHeaderContainerHeights);

            // Expose function to get current drawing data for saving
            window.getDrawingData = function() {
                return {
                    strokes: strokes,
                    backgroundColor: backgroundColor,
                    backgroundPattern: backgroundPattern,
                    viewOffset: viewOffset,
                    viewZoom: viewZoom,
                    splitView: splitView
                };
            };

            // Expose function to load drawing data from saved file
            window.loadDrawingData = function(data) {
                if (!data) return;

                // Clear current drawing
                strokes = [];
                undoStack = [];
                redoStack = [];

                // Load strokes
                if (data.strokes && Array.isArray(data.strokes)) {
                    strokes = data.strokes;
                }

                // Load background settings
                if (data.backgroundColor) {
                    backgroundColor = data.backgroundColor;
                    bgColorPicker.value = backgroundColor;
                    updateCanvasIconPreview();
                }

                if (data.backgroundPattern) {
                    backgroundPattern = data.backgroundPattern;
                    bgPatternSelector.value = backgroundPattern;
                    updateCanvasIconPreview();
                }

                // Load view settings
                if (data.viewOffset) {
                    viewOffset = data.viewOffset;
                }

                if (data.viewZoom) {
                    viewZoom = data.viewZoom;
                }
                splitView = data.splitView || null;
                activePaneId = null;

                // Re-render the canvas
                syncZoomControls();
                render();
                updateUndoRedoButtons();
            };

            window.handleBoardRoute = function(options = {}) {
                const path = window.location.pathname;
                const localMatch = path.match(/^\/board\/([^/]+)$/);
                const cloudMatch = path.match(/^\/cloud-board\/([^/]+)$/);
                if (localMatch && decodeURIComponent(localMatch[1]) !== 'new') {
                    window.goToWhiteboard(decodeURIComponent(localMatch[1]), { skipHistory: true });
                    return;
                }
                if (path === '/board/new') {
                    window.goToWhiteboard(null, { skipHistory: true });
                    return;
                }
                if (cloudMatch) {
                    window.loadCloudBoard(decodeURIComponent(cloudMatch[1]));
                    return;
                }
                window.goToHomepage({ skipHistory: true });
            };

            window.addEventListener('popstate', () => window.handleBoardRoute({ fromPopState: true }));
            initialLoadPromise.finally(() => {
                if (window.location.pathname !== '/') {
                    window.handleBoardRoute();
                } else {
                    history.replaceState({ view: 'home' }, '', '/');
                }
            });

        } catch (criticalError) {
            console.error("Critical Initialization Error:", criticalError);
            const errorBox = document.getElementById('global-error-box');
            if(errorBox) {
                errorBox.style.display = 'block';
                errorBox.innerHTML += `CRITICAL: ${criticalError.message}`;
            }
        }
    });

