import React from 'react';
import { ParagraphBlock, TextRun } from '../../../types/document';

interface Props {
  block: ParagraphBlock;
  onChange: (updated: ParagraphBlock) => void;
  onDelete: () => void;
}

export const ParagraphBlockView: React.FC<Props> = ({ block, onChange, onDelete }) => {
  // Combine all runs into an editable string or render styled runs
  const textContent = block.runs.map((r) => r.text).join('');

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (block.runs.length === 1) {
      onChange({
        ...block,
        runs: [{ ...block.runs[0], text: newText }],
      });
    } else {
      // If single run or empty, replace runs
      onChange({
        ...block,
        runs: [{ text: newText }],
      });
    }
  };

  return (
    <div className="group relative my-1.5 leading-relaxed">
      {block.runs.length > 1 ? (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            onChange({
              ...block,
              runs: [{ text: e.currentTarget.innerText }],
            });
          }}
          className="w-full text-slate-800 text-[11pt] leading-[1.6] focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5"
          style={{ textAlign: block.align || 'left' }}
        >
          {block.runs.map((run, idx) => (
            <span
              key={idx}
              style={{
                fontWeight: run.bold ? 'bold' : 'normal',
                fontStyle: run.italic ? 'italic' : 'normal',
                textDecoration: [
                  run.underline ? 'underline' : '',
                  run.strikethrough ? 'line-through' : '',
                ]
                  .filter(Boolean)
                  .join(' ') || 'none',
                color: run.color || 'inherit',
                backgroundColor: run.highlight || 'transparent',
                fontFamily: run.fontFamily || 'inherit',
                fontSize: run.fontSize ? `${run.fontSize}pt` : 'inherit',
              }}
            >
              {run.text}
            </span>
          ))}
        </div>
      ) : (
        <textarea
          rows={Math.max(1, Math.ceil(textContent.length / 85))}
          value={textContent}
          onChange={handleTextChange}
          placeholder="Type paragraph text or press / for AI commands..."
          className="w-full resize-none bg-transparent text-slate-800 text-[11pt] leading-[1.6] focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 transition"
          style={{
            textAlign: block.align || 'left',
            fontWeight: block.runs[0]?.bold ? 'bold' : 'normal',
            fontStyle: block.runs[0]?.italic ? 'italic' : 'normal',
            color: block.runs[0]?.color || 'inherit',
          }}
        />
      )}
    </div>
  );
};
