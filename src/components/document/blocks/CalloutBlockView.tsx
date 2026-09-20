import React from 'react';
import { CalloutBlock } from '../../../types/document';
import { Info, Lightbulb, AlertTriangle, Bookmark, Quote, Trash2 } from 'lucide-react';

interface Props {
  block: CalloutBlock;
  onChange: (updated: CalloutBlock) => void;
  onDelete: () => void;
}

export const CalloutBlockView: React.FC<Props> = ({ block, onChange, onDelete }) => {
  const variantStyles: Record<string, { border: string; bg: string; text: string; icon: any }> = {
    info: { border: 'border-blue-500', bg: 'bg-blue-50/70', text: 'text-blue-900', icon: Info },
    tip: { border: 'border-emerald-500', bg: 'bg-emerald-50/70', text: 'text-emerald-900', icon: Lightbulb },
    warning: { border: 'border-amber-500', bg: 'bg-amber-50/70', text: 'text-amber-900', icon: AlertTriangle },
    note: { border: 'border-slate-400', bg: 'bg-slate-50', text: 'text-slate-800', icon: Bookmark },
    quote: { border: 'border-purple-500', bg: 'bg-purple-50/70', text: 'text-purple-900', icon: Quote },
  };

  const current = variantStyles[block.variant] || variantStyles.info;
  const IconComponent = current.icon;

  const cycleVariant = () => {
    const variants: CalloutBlock['variant'][] = ['info', 'tip', 'warning', 'note', 'quote'];
    const nextIdx = (variants.indexOf(block.variant) + 1) % variants.length;
    onChange({ ...block, variant: variants[nextIdx] });
  };

  return (
    <div className={`group relative my-3 p-3.5 rounded-r-lg border-l-4 ${current.border} ${current.bg} transition-all`}>
      <div className="flex items-start gap-2.5">
        <button
          onClick={cycleVariant}
          className="mt-0.5 text-slate-500 hover:text-slate-800 transition"
          title="Click to cycle callout style"
        >
          <IconComponent className="w-5 h-5 text-current" />
        </button>

        <div className="flex-1 space-y-1">
          <input
            type="text"
            value={block.title || ''}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Callout Title..."
            className="w-full font-semibold text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded text-slate-900"
          />
          <textarea
            rows={Math.max(1, Math.ceil((block.content || '').length / 90))}
            value={block.content}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder="Callout content..."
            className="w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-400 rounded text-slate-800"
          />
        </div>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
          title="Delete callout"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
