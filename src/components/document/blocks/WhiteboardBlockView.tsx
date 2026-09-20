import React, { useRef, useState, useEffect } from 'react';
import { WhiteboardBlock, WhiteboardDrawingElement } from '../../../types/document';
import { Pen, Square, Circle, MoveRight, Eraser, Trash2, Maximize2 } from 'lucide-react';

interface Props {
  block: WhiteboardBlock;
  onChange: (updated: WhiteboardBlock) => void;
  onDelete: () => void;
  onExpandToBoard?: () => void;
}

export const WhiteboardBlockView: React.FC<Props> = ({
  block,
  onChange,
  onDelete,
  onExpandToBoard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<'pen' | 'rect' | 'circle' | 'arrow' | 'eraser'>('pen');
  const [activeColor, setActiveColor] = useState('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Redraw canvas whenever block elements change
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid pattern
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw saved elements
    for (const el of block.elements) {
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

        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = '600 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(el.text, x + w / 2, y + h / 2 + 4);
        }
      } else if (el.type === 'circle') {
        const rx = (el.width || 80) / 2;
        const ry = (el.height || 80) / 2;
        const cx = (el.x || 0) + rx;
        const cy = (el.y || 0) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        if (el.fillColor) ctx.fill();
        ctx.stroke();

        if (el.text) {
          ctx.fillStyle = el.color;
          ctx.font = '600 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(el.text, cx, cy + 4);
        }
      } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[el.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 10 * Math.cos(angle - Math.PI / 6), p2.y - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 10 * Math.cos(angle + Math.PI / 6), p2.y - 10 * Math.sin(angle + Math.PI / 6));
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
  };

  useEffect(() => {
    renderCanvas();
  }, [block.elements]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint(coords);

    if (activeTool === 'pen') {
      setCurrentPath([coords]);
    } else if (activeTool === 'eraser') {
      // Remove elements near point
      const filtered = block.elements.filter((el) => {
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
      onChange({ ...block, elements: filtered });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'pen') {
      const nextPath = [...currentPath, coords];
      setCurrentPath(nextPath);

      // Quick preview on canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && nextPath.length >= 2) {
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const pPrev = nextPath[nextPath.length - 2];
        ctx.moveTo(pPrev.x, pPrev.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = getCanvasCoords(e);

    if (activeTool === 'pen' && currentPath.length > 1) {
      const newEl: WhiteboardDrawingElement = {
        id: 'pen-' + Date.now(),
        type: 'path',
        points: currentPath,
        color: activeColor,
        strokeWidth,
      };
      onChange({ ...block, elements: [...block.elements, newEl] });
      setCurrentPath([]);
    } else if (startPoint && (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow')) {
      const x = Math.min(startPoint.x, coords.x);
      const y = Math.min(startPoint.y, coords.y);
      const w = Math.abs(coords.x - startPoint.x);
      const h = Math.abs(coords.y - startPoint.y);

      if (activeTool === 'rect' && w > 5 && h > 5) {
        const newEl: WhiteboardDrawingElement = {
          id: 'rect-' + Date.now(),
          type: 'rect',
          x,
          y,
          width: w,
          height: h,
          color: activeColor,
          fillColor: `${activeColor}15`,
          strokeWidth,
        };
        onChange({ ...block, elements: [...block.elements, newEl] });
      } else if (activeTool === 'circle' && w > 5 && h > 5) {
        const newEl: WhiteboardDrawingElement = {
          id: 'circle-' + Date.now(),
          type: 'circle',
          x,
          y,
          width: w,
          height: h,
          color: activeColor,
          fillColor: `${activeColor}15`,
          strokeWidth,
        };
        onChange({ ...block, elements: [...block.elements, newEl] });
      } else if (activeTool === 'arrow') {
        const newEl: WhiteboardDrawingElement = {
          id: 'arrow-' + Date.now(),
          type: 'arrow',
          points: [startPoint, coords],
          color: activeColor,
          strokeWidth,
        };
        onChange({ ...block, elements: [...block.elements, newEl] });
      }
    }
    setStartPoint(null);
  };

  const clearCanvas = () => {
    onChange({ ...block, elements: [] });
  };

  return (
    <div className="group relative my-4 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      {/* Canvas Header & Drawing Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={block.title || ''}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Canvas Title..."
            className="font-semibold text-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1"
          />

          {/* Tools */}
          <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-1 rounded transition ${activeTool === 'pen' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'}`}
              title="Pen / Stylus"
            >
              <Pen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('rect')}
              className={`p-1 rounded transition ${activeTool === 'rect' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'}`}
              title="Rectangle"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('circle')}
              className={`p-1 rounded transition ${activeTool === 'circle' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'}`}
              title="Circle"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('arrow')}
              className={`p-1 rounded transition ${activeTool === 'arrow' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'}`}
              title="Arrow"
            >
              <MoveRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-1 rounded transition ${activeTool === 'eraser' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'}`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
            {['#2563eb', '#059669', '#dc2626', '#d97706', '#0f172a'].map((c) => (
              <button
                key={c}
                onClick={() => setActiveColor(c)}
                className={`w-3.5 h-3.5 rounded-full border ${activeColor === c ? 'border-blue-600 scale-110' : 'border-slate-300'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearCanvas}
            className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs transition"
          >
            Clear
          </button>
          {onExpandToBoard && (
            <button
              onClick={onExpandToBoard}
              className="p-1 text-slate-500 hover:text-blue-600 transition"
              title="Expand to Full Board"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-500 transition"
            title="Delete drawing canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={block.width || 650}
          height={block.height || 240}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-auto cursor-crosshair touch-none select-none block"
        />
      </div>
    </div>
  );
};
