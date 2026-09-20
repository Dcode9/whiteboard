import React, { useEffect, useRef, useState } from 'react';
import { MathBlock } from '../../../types/document';
import katex from 'katex';
import { Trash2, Edit3, Check } from 'lucide-react';

interface Props {
  block: MathBlock;
  onChange: (updated: MathBlock) => void;
  onDelete: () => void;
}

export const MathBlockView: React.FC<Props> = ({ block, onChange, onDelete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [latexInput, setLatexInput] = useState(block.latex);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(block.latex || 'f(x) = 0', containerRef.current, {
          displayMode: block.displayMode === 'block',
          throwOnError: false,
        });
        setHasError(false);
      } catch (err) {
        setHasError(true);
      }
    }
  }, [block.latex, block.displayMode, isEditing]);

  const handleSave = () => {
    onChange({ ...block, latex: latexInput });
    setIsEditing(false);
  };

  return (
    <div className="group relative my-3 p-3 bg-slate-50/60 border border-slate-200 rounded-lg transition hover:border-slate-300">
      <div className="flex items-center justify-between pb-1 mb-2 border-b border-slate-200 text-xs text-slate-500">
        <span className="font-medium text-slate-700">LaTeX Formula (Word Equation)</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onChange({
                ...block,
                displayMode: block.displayMode === 'block' ? 'inline' : 'block',
              })
            }
            className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs transition"
          >
            {block.displayMode === 'block' ? 'Block Mode' : 'Inline Mode'}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-slate-500 hover:text-blue-600 transition"
            title="Edit LaTeX"
          >
            {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-500 transition"
            title="Delete equation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={latexInput}
            onChange={(e) => setLatexInput(e.target.value)}
            className="w-full font-mono text-xs p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
            rows={2}
            placeholder="e.g. \\int_{0}^{1} x^2 dx"
          />
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
          >
            Apply Equation
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          onClick={() => setIsEditing(true)}
          className={`cursor-pointer overflow-x-auto py-2 ${
            block.displayMode === 'block' ? 'text-center' : 'text-left'
          } ${hasError ? 'text-red-500' : 'text-slate-900'}`}
        />
      )}
    </div>
  );
};
