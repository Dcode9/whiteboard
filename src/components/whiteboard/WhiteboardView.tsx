import React, { useRef, useState, useEffect } from 'react';
import {
  Pen,
  Square,
  Circle,
  Triangle,
  Minus,
  MoveRight,
  Eraser,
  Undo,
  Redo,
  Trash2,
  Download,
  FileText,
  Hand,
  ZoomIn,
  ZoomOut,
  Palette,
} from 'lucide-react';
import { WhiteboardDrawingElement } from '../../types/document';

interface Props {
  onInsertToDocument?: (elements: WhiteboardDrawingElement[], title: string) => void;
}

export const WhiteboardView: React.FC<Props> = ({ onInsertToDocument }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'triangle' | 'line' | 'arrow' | 'eraser' | 'pan'>('pen');
  const [color, setColor] = useState('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [elements, setElements] = useState<WhiteboardDrawingElement[]>([]);
  const [history, setHistory] = useState<WhiteboardDrawingElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Save history state
  const saveState = (newElements: WhiteboardDrawingElement[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newElements);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setElements(newElements);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  // Adjust canvas size to window/container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [elements, zoom, pan]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid pattern
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid dots
    ctx.fillStyle = '#cbd5e1';
    const gridSize = 25;
    const startX = -pan.x / zoom;
    const startY = -pan.y / zoom;
    const endX = startX + canvas.width / zoom;
    const endY = startY + canvas.height / zoom;

    for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw elements
    for (const el of elements) {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.fillStyle = el.fillColor || 'transparent';

      if (el.type === 'rect') {
        const x = el.x || 0;
        const y = el.y || 0;
        const w = el.width || 100;
        const h = el.height || 60;
        if (el.fillColor) ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (el.type === 'circle') {
        const rx = (el.width || 80) / 2;
        const ry = (el.height || 80) / 2;
        const cx = (el.x || 0) + rx;
        const cy = (el.y || 0) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'triangle') {
        const x = el.x || 0;
        const y = el.y || 0;
        const w = el.width || 100;
        const h = el.height || 80;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'line' && el.points && el.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        ctx.lineTo(el.points[1].x, el.points[1].y);
        ctx.stroke();
      } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 12 * Math.cos(angle - Math.PI / 6), p2.y - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 12 * Math.cos(angle + Math.PI / 6), p2.y - 12 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = el.color;
        ctx.fill();
      } else if (el.type === 'path' && el.points && el.points.length > 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        el.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  useEffect(() => {
    draw();
  }, [elements, zoom, pan]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Stylus auto-switch to pen
    if (e.pointerType === 'pen' && tool !== 'pen' && tool !== 'eraser') {
      setTool('pen');
    }

    if (tool === 'pan' || e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint(coords);

    if (tool === 'pen') {
      setCurrentPath([coords]);
    } else if (tool === 'eraser') {
      const filtered = elements.filter((el) => {
        if (el.x !== undefined && el.y !== undefined && el.width !== undefined && el.height !== undefined) {
          return !(
            coords.x >= el.x &&
            coords.x <= el.x + el.width &&
            coords.y >= el.y &&
            coords.y <= el.y + el.height
          );
        }
        return true;
      });
      saveState(filtered);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === 'pen') {
      const next = [...currentPath, coords];
      setCurrentPath(next);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && next.length >= 2) {
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const p1 = next[next.length - 2];
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = getCanvasCoords(e);

    if (tool === 'pen' && currentPath.length > 1) {
      const newEl: WhiteboardDrawingElement = {
        id: 'pen-' + Date.now(),
        type: 'path',
        points: currentPath,
        color,
        strokeWidth,
      };
      saveState([...elements, newEl]);
      setCurrentPath([]);
    } else if (startPoint) {
      const x = Math.min(startPoint.x, coords.x);
      const y = Math.min(startPoint.y, coords.y);
      const w = Math.abs(coords.x - startPoint.x);
      const h = Math.abs(coords.y - startPoint.y);

      if (tool === 'rect' && w > 4 && h > 4) {
        saveState([
          ...elements,
          {
            id: 'rect-' + Date.now(),
            type: 'rect',
            x,
            y,
            width: w,
            height: h,
            color,
            fillColor: `${color}15`,
            strokeWidth,
          },
        ]);
      } else if (tool === 'circle' && w > 4 && h > 4) {
        saveState([
          ...elements,
          {
            id: 'circle-' + Date.now(),
            type: 'circle',
            x,
            y,
            width: w,
            height: h,
            color,
            fillColor: `${color}15`,
            strokeWidth,
          },
        ]);
      } else if (tool === 'triangle' && w > 4 && h > 4) {
        saveState([
          ...elements,
          {
            id: 'tri-' + Date.now(),
            type: 'triangle',
            x,
            y,
            width: w,
            height: h,
            color,
            fillColor: `${color}15`,
            strokeWidth,
          },
        ]);
      } else if (tool === 'line') {
        saveState([
          ...elements,
          {
            id: 'line-' + Date.now(),
            type: 'line',
            points: [startPoint, coords],
            color,
            strokeWidth,
          },
        ]);
      } else if (tool === 'arrow') {
        saveState([
          ...elements,
          {
            id: 'arrow-' + Date.now(),
            type: 'arrow',
            points: [startPoint, coords],
            color,
            strokeWidth,
          },
        ]);
      }
    }
    setStartPoint(null);
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `d-note-whiteboard-${Date.now()}.png`;
    a.click();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-50 overflow-hidden select-none">
      {/* Floating Toolbar Dock (WebBoard Design Inspired) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full shadow-lg text-slate-700">
        {/* Selection & Pan */}
        <button
          onClick={() => setTool('pan')}
          className={`p-2 rounded-full transition ${tool === 'pan' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Pan Hand (or Middle Click / Shift+Drag)"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Pen */}
        <button
          onClick={() => setTool('pen')}
          className={`p-2 rounded-full transition ${tool === 'pen' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Pen / Stylus"
        >
          <Pen className="w-4 h-4" />
        </button>

        {/* Shapes */}
        <button
          onClick={() => setTool('rect')}
          className={`p-2 rounded-full transition ${tool === 'rect' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Rectangle"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`p-2 rounded-full transition ${tool === 'circle' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Circle / Ellipse"
        >
          <Circle className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('triangle')}
          className={`p-2 rounded-full transition ${tool === 'triangle' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Triangle"
        >
          <Triangle className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('line')}
          className={`p-2 rounded-full transition ${tool === 'line' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Line"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTool('arrow')}
          className={`p-2 rounded-full transition ${tool === 'arrow' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Arrow Connector"
        >
          <MoveRight className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Eraser */}
        <button
          onClick={() => setTool('eraser')}
          className={`p-2 rounded-full transition ${tool === 'eraser' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-100'}`}
          title="Eraser"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Palette */}
        <div className="flex items-center gap-1 px-1">
          {['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0f172a'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border ${color === c ? 'border-blue-600 scale-125' : 'border-slate-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-40 transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-40 transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Clear */}
        <button
          onClick={() => saveState([])}
          className="p-2 rounded-full hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
          title="Clear Board"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom Left Controls: Zoom & Actions */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full shadow-md text-slate-700">
          <button
            onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
            className="p-1.5 rounded-full hover:bg-slate-100 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold px-2 min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="p-1.5 rounded-full hover:bg-slate-100 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleExportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full shadow-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" /> Export PNG
        </button>

        {onInsertToDocument && elements.length > 0 && (
          <button
            onClick={() => onInsertToDocument(elements, 'Whiteboard Diagram')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-full shadow-md text-xs font-medium hover:bg-blue-700 transition"
          >
            <FileText className="w-3.5 h-3.5" /> Insert into Document
          </button>
        )}
      </div>

      {/* Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full cursor-crosshair touch-none select-none block"
      />
    </div>
  );
};
