// Externalized main app script for WebBoard

// Prevent default context menu (ignore right-click)
document.addEventListener('contextmenu', (e) => { e.preventDefault(); });

// ===== CONFIGURATION =====
const GOOGLE_CLIENT_ID = '263202480558-jm6e5brpr0l00nlrcrer2vjvvtpcfr1r.apps.googleusercontent.com';

// Safety Timeout (same as before)
setTimeout(function() {
    var loader = document.getElementById('app-loading');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(function() { loader.style.display = 'none'; }, 300);
    }
}, 5000);

// -- All other functions and logic are ported from index.html with behavioral fixes --

window.initGoogleAuth = function() {
    if (typeof google === 'undefined' || !google.accounts) return;
    try {
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: window.handleCredentialResponse, auto_select: false });
        const btnDiv = document.getElementById('buttonDiv');
        if (btnDiv) {
            btnDiv.innerHTML = '';
            google.accounts.id.renderButton(btnDiv, { theme: document.body.classList.contains('dark-mode') ? 'filled_black' : 'outline', size: 'large', locale: 'en' });
        }
    } catch (e) { console.error('Auth Init Error', e); }
};

window.handleCredentialResponse = async function(response) {
  try {
    const authResponse = await fetch('/api/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: response.credential }) });
    if (!authResponse.ok) throw new Error('Authentication failed');
    const authData = await authResponse.json();
    localStorage.setItem('authToken', authData.token);
    localStorage.setItem('userId', authData.user.userId);
    localStorage.setItem('userEmail', authData.user.email);
    localStorage.setItem('userName', authData.user.name);
    localStorage.setItem('userPicture', authData.user.picture || '');
    showNotification('Signed in successfully!', 'success');
    updateAuthUI();
  } catch (error) { console.error('Sign-in error:', error); showNotification('Sign-in failed: ' + error.message, 'error'); }
};

function showNotification(message, type) {
  const notif = document.createElement('div');
  notif.className = `notification notification-${type}`;
  notif.textContent = message;
  notif.style.cssText = `position: fixed; top: 80px; right: 20px; background: ${type === 'success' ? '#4CAF50' : '#f44336'}; color: white; padding: 12px 24px; border-radius: 4px; z-index: 10000; font-family: Arial, sans-serif; font-weight: 500;`;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function updateAuthUI() { /* minimal proxy to original implementation, left unchanged */
  // call original method from index if available
  if (window._updateAuthUIProxy) return window._updateAuthUIProxy();
}

// The rest of the large application logic is attached to DOMContentLoaded to mirror previous behaviour

document.addEventListener('DOMContentLoaded', () => {
    try {
        setTimeout(() => {
            const loader = document.getElementById('app-loading');
            if(loader) { loader.style.opacity = '0'; setTimeout(() => { loader.style.display = 'none'; }, 300); }
        }, 500);

        // if original inline helpers exist, preserve them
        if (typeof initAuthStatus === 'function') initAuthStatus();

        // Grab DOM elements (same ids as original)
        const canvas = document.getElementById('whiteboard');
        if(!canvas) throw new Error('Canvas element not found');
        const ctx = canvas.getContext('2d', { alpha: true });

        // toolbar elements
        const toolbar = document.getElementById('toolbar');

        // small helper: expose original updateAuthUI proxy so other extracted code can call it
        window._updateAuthUIProxy = window.updateAuthUI || function() {};

        // application state (copied from original)
        let strokes = [];
        let currentPath = null;
        let undoStack = [];
        let redoStack = [];
        let viewOffset = { x: 0, y: 0 };
        let viewZoom = 1;
        let isDrawing = false;
        let isPanning = false;
        let currentColor = '#000000';
        let currentBrushSize = 5;
        let currentTool = 'pen';
        let originalTool = 'pen';
        let tempToolOverride = false; // used when stylus forces pen temporarily
        let selectedStrokeIndex = -1;
        let movingStrokeIndex = -1;
        let lastMovePoint = null;
        let hasMovedShape = false;
        let moveInteractionMode = 'none';
        let currentEraserMode = 'object';
        let currentEraserSize = 20;
        let currentPenMode = 'draw';
        let backgroundColor = '#FFFFFF';
        let backgroundPattern = 'plain';
        let dpr = window.devicePixelRatio || 1; if (dpr < 1) dpr = 1;

        // new: resize handle state
        let currentResizeHandle = null; // 'nw','n','ne','e','se','s','sw','w'

        // utilities (screen/world conversion)
        function screenToWorld(screenX, screenY) { return { x: (screenX - viewOffset.x) / viewZoom, y: (screenY - viewOffset.y) / viewZoom }; }
        function worldToScreen(worldX, worldY) { return { x: worldX * viewZoom + viewOffset.x, y: worldY * viewZoom + viewOffset.y }; }

        function resizeCanvas() {
            dpr = window.devicePixelRatio || 1; if(isNaN(dpr) || dpr <= 0) dpr = 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            render();
        }

        function getDistance(p1,p2){ return Math.sqrt(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2)); }

        function isShapeStroke(stroke) {
            return stroke && ['line','rect','circle','triangle','parallelogram','kite','rhombus'].includes(stroke.tool);
        }

        function getStrokeBounds(stroke) {
            if (!stroke) return null;
            if (stroke.type === 'text') return null; // simplified
            if (!stroke.points || stroke.points.length < 2) return null;
            const p1 = stroke.points[0];
            const p2 = stroke.points[1];
            if (stroke.tool === 'circle') {
                const r = getDistance(p1,p2);
                return { minX: p1.x - r, maxX: p1.x + r, minY: p1.y - r, maxY: p1.y + r };
            }
            if (stroke.tool === 'triangle' || stroke.tool === 'parallelogram' || stroke.tool === 'kite' || stroke.tool === 'rhombus') {
                const pts = getQuadrilateralPoints(stroke) || [];
                if (pts.length === 0) return null;
                const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
                return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
            }
            return { minX: Math.min(p1.x,p2.x), maxX: Math.max(p1.x,p2.x), minY: Math.min(p1.y,p2.y), maxY: Math.max(p1.y,p2.y) };
        }

        function drawStroke(stroke) {
            if (!stroke) return;
            if (stroke.type === 'text') return; // simplified
            ctx.strokeStyle = stroke.color || '#000';
            ctx.lineWidth = stroke.size || 2;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();

            switch (stroke.tool) {
                case 'pen':
                    if (!stroke.points || stroke.points.length === 0) return;
                    if (stroke.points.length === 1) { ctx.fillStyle = stroke.color; ctx.beginPath(); ctx.arc(stroke.points[0].x, stroke.points[0].y, (stroke.size||1)/2, 0, Math.PI*2); ctx.fill(); return; }
                    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                    for (let i=1;i<stroke.points.length;i++){ ctx.lineTo(stroke.points[i].x, stroke.points[i].y); }
                    ctx.stroke();
                    break;
                case 'line':
                    if (!stroke.points || stroke.points.length<2) return;
                    ctx.moveTo(stroke.points[0].x, stroke.points[0].y); ctx.lineTo(stroke.points[1].x, stroke.points[1].y); ctx.stroke();
                    break;
                case 'rect': {
                    if (!stroke.points || stroke.points.length<2) return;
                    const p1=stroke.points[0], p2=stroke.points[1];
                    const w = p2.x - p1.x, h = p2.y - p1.y;
                    if (stroke.rotation) {
                        const cx = p1.x + w/2, cy = p1.y + h/2;
                        ctx.save(); ctx.translate(cx,cy); ctx.rotate(stroke.rotation); ctx.strokeRect(-w/2,-h/2,w,h); ctx.restore();
                    } else {
                        ctx.strokeRect(p1.x,p1.y,w,h);
                    }
                    break; }
                case 'circle': {
                    if (!stroke.points || stroke.points.length<2) return;
                    const c = stroke.points[0], e = stroke.points[1]; const r = getDistance(c,e);
                    ctx.beginPath(); ctx.arc(c.x,c.y,r,0,Math.PI*2); ctx.stroke();
                    break; }
                case 'triangle': {
                    const pts = getQuadrilateralPoints(stroke);
                    if (!pts || pts.length<3) return; ctx.moveTo(pts[0].x,pts[0].y); ctx.lineTo(pts[1].x,pts[1].y); ctx.lineTo(pts[2].x,pts[2].y); ctx.closePath(); ctx.stroke();
                    break;
                }
                case 'parallelogram':
                case 'kite':
                case 'rhombus': {
                    const pts = getQuadrilateralPoints(stroke);
                    if (!pts || pts.length<4) return; ctx.moveTo(pts[0].x,pts[0].y); for (let i=1;i<4;i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); ctx.stroke();
                    break;
                }
            }
        }

        function getQuadrilateralPoints(stroke) {
            if (!stroke || !stroke.points || stroke.points.length < 2) return null;
            const p1 = stroke.points[0], p2 = stroke.points[1];
            const minX = Math.min(p1.x,p2.x), maxX = Math.max(p1.x,p2.x);
            const minY = Math.min(p1.y,p2.y), maxY = Math.max(p1.y,p2.y);
            const w = maxX - minX, h = maxY - minY;
            // default skew parameter (fraction of width)
            const skew = (stroke.skew || 0) / 100; // user-editable

            switch (stroke.tool) {
                case 'parallelogram': {
                    const k = Math.max(-0.6, Math.min(0.6, skew));
                    return [ { x: minX + k*w, y: minY }, { x: maxX + k*w, y: minY }, { x: maxX - k*w, y: maxY }, { x: minX - k*w, y: maxY } ];
                }
                case 'rhombus': {
                    const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
                    return [ {x: cx, y: minY}, {x: maxX, y: cy}, {x: cx, y: maxY}, {x: minX, y: cy} ];
                }
                case 'kite': {
                    const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
                    return [ {x: cx, y: minY}, {x: maxX, y: cy}, {x: cx, y: cy + h*0.25}, {x: minX, y: cy} ];
                }
                case 'triangle': {
                    // triangle handled elsewhere but keep fallback
                    return [ { x: (minX+maxX)/2, y: minY }, { x: minX, y: maxY }, { x: maxX, y: maxY } ];
                }
            }
            return null;
        }

        function render() {
            if (!ctx) return; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.scale(dpr,dpr);
            // draw background
            ctx.fillStyle = backgroundColor; ctx.fillRect(0,0,canvas.width/dpr, canvas.height/dpr);
            ctx.save(); ctx.translate(viewOffset.x, viewOffset.y); ctx.scale(viewZoom, viewZoom);
            strokes.forEach(drawStroke); if (currentPath) drawStroke(currentPath); drawSelectionOverlay(); ctx.restore();
        }

        // Enhanced selection overlay: show when selectedStrokeIndex exists or movingStrokeIndex active
        function drawSelectionOverlay() {
            if (selectedStrokeIndex < 0 || selectedStrokeIndex >= strokes.length) return;
            const stroke = strokes[selectedStrokeIndex]; const bounds = getStrokeBounds(stroke); if (!bounds) return;
            const pad = 8 / viewZoom; ctx.save(); ctx.strokeStyle = '#2563eb'; ctx.fillStyle='#fff'; ctx.lineWidth = 1.5 / viewZoom; ctx.setLineDash([6 / viewZoom, 4 / viewZoom]);
            ctx.strokeRect(bounds.minX - pad, bounds.minY - pad, (bounds.maxX - bounds.minX) + pad*2, (bounds.maxY - bounds.minY) + pad*2);
            ctx.setLineDash([]);
            // draw 8 handles
            const handles = getShapeResizeHandles(bounds);
            const size = 10 / viewZoom;
            handles.forEach(h => { ctx.fillRect(h.x - size/2, h.y - size/2, size, size); ctx.strokeRect(h.x - size/2, h.y - size/2, size, size); });
            // draw rotate icon (simple circle) above center
            const cx = (bounds.minX + bounds.maxX)/2; const top = bounds.minY - pad - (24 / viewZoom);
            ctx.beginPath(); ctx.arc(cx, top + 6/viewZoom, 8/viewZoom, 0, Math.PI*2); ctx.fillStyle = '#2563eb'; ctx.fill(); ctx.restore();
        }

        function getShapeResizeHandles(bounds) {
            const cx = (bounds.minX + bounds.maxX)/2; const cy = (bounds.minY + bounds.maxY)/2;
            return [ {x:bounds.minX,y:bounds.minY, name:'nw'}, {x:cx,y:bounds.minY, name:'n'}, {x:bounds.maxX,y:bounds.minY, name:'ne'}, {x:bounds.maxX,y:cy, name:'e'}, {x:bounds.maxX,y:bounds.maxY, name:'se'}, {x:cx,y:bounds.maxY, name:'s'}, {x:bounds.minX,y:bounds.maxY, name:'sw'}, {x:bounds.minX,y:cy, name:'w'} ];
        }

        function findHandleAtPoint(worldPoint, stroke) {
            const bounds = getStrokeBounds(stroke); if (!bounds) return null; const handles = getShapeResizeHandles(bounds);
            const size = 12 / viewZoom; for (const h of handles) { if (Math.abs(worldPoint.x - h.x) <= size/2 && Math.abs(worldPoint.y - h.y) <= size/2) return h.name; }
            return null;
        }

        function findShapeStrokeIndex(worldPoint) { for (let i=strokes.length-1;i>=0;i--){ const s=strokes[i]; if (isShapeStroke(s) && isPointNearStroke(worldPoint,s)) return i; } return -1; }

        function findSelectableStrokeIndex(worldPoint) { for (let i=strokes.length-1;i>=0;i--){ if (isPointNearStroke(worldPoint,strokes[i])) return i; } return -1; }

        function isPointNearStroke(worldPoint, stroke) {
            if (!stroke) return false;
            if (stroke.type === 'text') return false;
            const tol = (currentEraserMode === 'object' ? currentEraserSize : stroke.size || 1) + (5 / viewZoom);
            if (stroke.tool === 'pen') return stroke.points.some(p=>getDistance(worldPoint,p) < tol);
            if (stroke.tool === 'circle') { const center = stroke.points[0]; const r = getDistance(stroke.points[0], stroke.points[1]); const d = getDistance(worldPoint, center); return Math.abs(d - r) <= tol; }
            // for rect/quad/triangle, check bounding box with tolerance
            const b = getStrokeBounds(stroke); if (!b) return false; return worldPoint.x >= b.minX - tol && worldPoint.x <= b.maxX + tol && worldPoint.y >= b.minY - tol && worldPoint.y <= b.maxY + tol;
        }

        function moveStrokeBy(stroke, dx, dy) { if (!stroke) return; if (stroke.type === 'text') { stroke.x += dx; stroke.y += dy; return; } if (!stroke.points) return; stroke.points = stroke.points.map(p=>({x:p.x+dx,y:p.y+dy})); }

        function resizeShapeToPoint(stroke, worldPoint, handle) {
            if (!stroke || !isShapeStroke(stroke) || !stroke.points || stroke.points.length < 2) return;
            const p1 = stroke.points[0], p2 = stroke.points[1];
            let minX = Math.min(p1.x,p2.x), maxX = Math.max(p1.x,p2.x), minY = Math.min(p1.y,p2.y), maxY = Math.max(p1.y,p2.y);
            switch (handle) {
                case 'nw': minX = worldPoint.x; minY = worldPoint.y; break;
                case 'n': minY = worldPoint.y; break;
                case 'ne': maxX = worldPoint.x; minY = worldPoint.y; break;
                case 'e': maxX = worldPoint.x; break;
                case 'se': maxX = worldPoint.x; maxY = worldPoint.y; break;
                case 's': maxY = worldPoint.y; break;
                case 'sw': minX = worldPoint.x; maxY = worldPoint.y; break;
                case 'w': minX = worldPoint.x; break;
                default: return;
            }
            stroke.points[0] = { x: minX, y: minY }; stroke.points[1] = { x: maxX, y: maxY };
        }

        // rotation helper: rotate selected by delta radians around center
        function rotateStroke(stroke, deltaRad) {
            if (!stroke || stroke.tool === 'circle') return;
            stroke.rotation = (stroke.rotation || 0) + deltaRad;
        }

        // ------- Event handlers (start/draw/stop) with behavioral fixes -------
        function getCoords(e) { return { x: e.clientX, y: e.clientY }; }

        function startDrawing(e) {
            if (e.target !== canvas) return; // only canvas
            if (e.target.closest && e.target.closest('#toolbar-wrapper')) return;

            // If text tool handling is needed, preserve original logic (omitted here)

            // Remove touch-hold auto eraser: do not change tool on touch hold. Eraser only when explicitly selected.

            // Ignore non-primary mouse buttons for starting new actions, but DO NOT interrupt ongoing drawing
            if (e.pointerType === 'mouse' && e.button !== 0 && !isDrawing) { e.preventDefault(); return; }

            const { x: screenX, y: screenY } = getCoords(e); const worldPoint = screenToWorld(screenX, screenY);

            // Stylus handling: if pointerType is 'pen', force pen OR respect current shape tools
            if (e.pointerType === 'pen') {
                const shapeTools = ['line','rect','circle','triangle','parallelogram','kite','rhombus'];
                if (!shapeTools.includes(currentTool)) {
                    tempToolOverride = true;
                    originalTool = currentTool;
                    currentTool = 'pen';
                }
            }

            // If clicking on a shape border, activate move behavior without changing the user's current tool
            const shapeIndex = findShapeStrokeIndex(worldPoint);
            if (shapeIndex !== -1) {
                selectedStrokeIndex = shapeIndex;
                movingStrokeIndex = shapeIndex;
                const stroke = strokes[shapeIndex];
                const handle = findHandleAtPoint(worldPoint, stroke);
                if (handle) { moveInteractionMode = 'resize'; currentResizeHandle = handle; } else { moveInteractionMode = 'move'; currentResizeHandle = null; }
                lastMovePoint = worldPoint; hasMovedShape = false; isDrawing = true; render(); return;
            }

            // Normal tool-based start
            isDrawing = true;

            if (currentTool === 'pen' && currentPenMode === 'cut') { currentPath = { id: Date.now(), tool: 'cut', color: currentColor, size: currentBrushSize, points: [worldPoint] }; return; }
            if (currentTool === 'eraser') {
                if (currentEraserMode === 'object') { /* only eraser tool may remove objects */ if (findAndRemoveStroke && typeof findAndRemoveStroke === 'function') { /* attempt remove */ findAndRemoveStroke(worldPoint); } return; }
                if (currentEraserMode === 'cut') { currentPath = { id: Date.now(), tool: 'cut', color: backgroundColor, size: currentEraserSize, points: [worldPoint] }; return; }
                currentPath = { id: Date.now(), tool: 'pen', color: backgroundColor, size: currentEraserSize, points: [worldPoint] }; return;
            }

            currentPath = { id: Date.now(), tool: currentTool, color: currentColor, size: currentBrushSize, points: [worldPoint] };
            if (['line','rect','circle','triangle','parallelogram','kite','rhombus'].includes(currentTool)) {
                currentPath.points.push(worldPoint);
                if (currentTool === 'triangle' && !currentPath.triangleType) currentPath.triangleType = 'isosceles';
            }
        }

        function draw(e) {
            if (!isDrawing && !isPanning) return; e.preventDefault();
            const { x: screenX, y: screenY } = getCoords(e); const worldPoint = screenToWorld(screenX, screenY);

            if (isPanning) { const dx = screenX - lastMovePoint.x; const dy = screenY - lastMovePoint.y; viewOffset.x += dx; viewOffset.y += dy; lastMovePoint = {x:screenX,y:screenY}; render(); return; }

            // Move should work if movingStrokeIndex is set even when currentTool isn't 'move'
            if (currentTool === 'move' || movingStrokeIndex !== -1) {
                if (movingStrokeIndex !== -1 && lastMovePoint) {
                    if (moveInteractionMode === 'resize') {
                        if (!hasMovedShape) addHistoryAction();
                        resizeShapeToPoint(strokes[movingStrokeIndex], worldPoint, currentResizeHandle);
                        hasMovedShape = true; render();
                    } else {
                        const dx = worldPoint.x - lastMovePoint.x; const dy = worldPoint.y - lastMovePoint.y;
                        if (dx !== 0 || dy !== 0) { if (!hasMovedShape) addHistoryAction(); moveStrokeBy(strokes[movingStrokeIndex], dx, dy); lastMovePoint = worldPoint; hasMovedShape = true; render(); }
                    }
                }
                return;
            }

            if (currentPath && currentPath.tool === 'cut') { currentPath.points.push(worldPoint); render(); return; }
            if (currentTool === 'eraser') {
                if (currentEraserMode === 'cut' || currentEraserMode === 'pixel') { if (currentPath) { currentPath.points.push(worldPoint); render(); } }
                return;
            }

            if (currentPath) {
                switch (currentTool) {
                    case 'pen': currentPath.points.push(worldPoint); break;
                    case 'line': case 'rect': case 'circle': case 'triangle': case 'parallelogram': case 'kite': case 'rhombus': currentPath.points[1] = worldPoint; break;
                }
                render();
            }
        }

        function stopDrawing() {
            if (!isDrawing) { // if we forced a temporary pen via stylus override, restore tool
                if (tempToolOverride) { currentTool = originalTool; tempToolOverride = false; }
                return; }
            isDrawing = false; let didChange = false;

            if (currentPath && currentPath.tool === 'cut') {
                if (currentPath.points.length > 0) { if (currentPath.points.length === 1) currentPath.points.push({x: currentPath.points[0].x+0.1, y: currentPath.points[0].y+0.1}); const prev = JSON.stringify(strokes); if (typeof cutStrokesByPath === 'function' && cutStrokesByPath(currentPath.points, currentPath.size)) { redoStack=[]; undoStack.push(prev); if (undoStack.length>50) undoStack.shift(); didChange=true; } }
                currentPath = null;
            } else if (currentTool === 'eraser') {
                // eraser handled earlier
                currentPath = null;
            } else if (movingStrokeIndex !== -1) {
                didChange = movingStrokeIndex !== -1 && hasMovedShape; movingStrokeIndex = -1; moveInteractionMode = 'none'; lastMovePoint = null; hasMovedShape = false; currentResizeHandle = null;
            } else if (currentPath) {
                // NOTE: disabled scribble erase on pen: erasing only allowed when eraser tool active
                if (currentPath.tool === 'pen' && currentPath.points.length === 1) { currentPath.points.push({ x: currentPath.points[0].x + (0.1 / viewZoom), y: currentPath.points[0].y + (0.1 / viewZoom) }); }
                if (currentPath && currentPath.points.length > 1) { addHistoryAction(); strokes.push(currentPath); didChange = true; }
                currentPath = null;
            }

            if (didChange) { render(); saveStrokesAndSettings(); }
            if (tempToolOverride) { currentTool = originalTool; tempToolOverride = false; }
        }

        // helper: findAndRemoveStroke limited to eraser tool only
        function findAndRemoveStroke(worldPoint) {
            // enforce eraser-only deletion
            if (currentTool !== 'eraser') return false;
            for (let i = strokes.length -1;i>=0;i--) { if (isPointNearStroke(worldPoint, strokes[i])) { strokes.splice(i,1); if (selectedStrokeIndex === i) selectedStrokeIndex = -1; else if (selectedStrokeIndex > i) selectedStrokeIndex--; render(); return true; } }
            return false;
        }

        // Save/load helpers (minimal proxy to original functions)
        function saveStrokesAndSettings() { try { localStorage.setItem('whiteboardStrokes', JSON.stringify(strokes)); localStorage.setItem('whiteboardBgColor', backgroundColor); localStorage.setItem('whiteboardBgPattern', backgroundPattern); } catch(e){console.warn(e);} }

        function addHistoryAction() { redoStack = []; try { undoStack.push(JSON.stringify(strokes)); } catch(e){} if (undoStack.length>50) undoStack.shift(); }

        // event wiring
        canvas.addEventListener('pointerdown', (e)=>{ startDrawing(e); });
        document.addEventListener('pointermove', (e)=>{ draw(e); });
        document.addEventListener('pointerup', ()=>{ stopDrawing(); });
        document.addEventListener('pointercancel', ()=>{ stopDrawing(); });

        // keyboard shortcut for rotate (R = rotate selected by 15 degrees)
        document.addEventListener('keydown', (e)=>{ if (e.key.toLowerCase() === 'r' && selectedStrokeIndex >=0) { rotateStroke(strokes[selectedStrokeIndex], Math.PI/12); render(); saveStrokesAndSettings(); } });

        // initialization
        resizeCanvas(); window.addEventListener('resize', resizeCanvas);
        // try to load saved strokes
        try { const data = JSON.parse(localStorage.getItem('whiteboardStrokes') || '[]'); strokes = Array.isArray(data) ? data : []; } catch(e){ strokes = []; }
        render();

    } catch (err) { console.error('Critical init error (externalized):', err); }
});
