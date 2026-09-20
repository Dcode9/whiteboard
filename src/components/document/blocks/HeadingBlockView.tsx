import React from 'react';
import { HeadingBlock } from '../../../types/document';

interface Props {
  block: HeadingBlock;
  onChange: (updated: HeadingBlock) => void;
  onDelete: () => void;
}

export const HeadingBlockView: React.FC<Props> = ({ block, onChange, onDelete }) => {
  const levelClasses: Record<number, string> = {
    1: 'text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 border-b border-slate-200 pb-2 mb-3 mt-4',
    2: 'text-xl sm:text-2xl font-semibold tracking-tight text-slate-800 mt-4 mb-2',
    3: 'text-lg sm:text-xl font-medium text-slate-800 mt-3 mb-1',
    4: 'text-base sm:text-lg font-medium text-slate-700 mt-2 mb-1',
    5: 'text-sm sm:text-base font-semibold text-slate-600 mt-2 mb-1',
    6: 'text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mt-2 mb-1',
  };

  return (
    <div className="group relative my-1">
      <input
        type="text"
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        placeholder={`Heading ${block.level}...`}
        className={`w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 transition ${levelClasses[block.level] || levelClasses[1]}`}
        style={{ textAlign: block.align || 'left' }}
      />
    </div>
  );
};
