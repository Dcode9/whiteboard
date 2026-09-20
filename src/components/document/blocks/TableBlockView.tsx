import React from 'react';
import { TableBlock } from '../../../types/document';
import { Plus, Trash2, Palette } from 'lucide-react';

interface Props {
  block: TableBlock;
  onChange: (updated: TableBlock) => void;
  onDelete: () => void;
}

export const TableBlockView: React.FC<Props> = ({ block, onChange, onDelete }) => {
  const { headers, rows, style } = block;

  const handleHeaderChange = (colIndex: number, value: string) => {
    const nextHeaders = [...headers];
    nextHeaders[colIndex] = value;
    onChange({ ...block, headers: nextHeaders });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = rows.map((r, rIdx) => {
      if (rIdx !== rowIndex) return r;
      const nextRow = [...r];
      nextRow[colIndex] = value;
      return nextRow;
    });
    onChange({ ...block, rows: nextRows });
  };

  const addRow = () => {
    const emptyRow = new Array(headers.length).fill('');
    onChange({ ...block, rows: [...rows, emptyRow] });
  };

  const addColumn = () => {
    const nextHeaders = [...headers, `Col ${headers.length + 1}`];
    const nextRows = rows.map((r) => [...r, '']);
    onChange({ ...block, headers: nextHeaders, rows: nextRows });
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    const nextRows = rows.filter((_, idx) => idx !== rowIndex);
    onChange({ ...block, rows: nextRows });
  };

  const removeColumn = (colIndex: number) => {
    if (headers.length <= 1) return;
    const nextHeaders = headers.filter((_, idx) => idx !== colIndex);
    const nextRows = rows.map((r) => r.filter((_, idx) => idx !== colIndex));
    onChange({ ...block, headers: nextHeaders, rows: nextRows });
  };

  const toggleZebra = () => {
    onChange({
      ...block,
      style: { ...style, zebra: !style.zebra },
    });
  };

  const changeHeaderColor = (color: string) => {
    onChange({
      ...block,
      style: { ...style, headerBg: color },
    });
  };

  return (
    <div className="group relative my-4 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      {/* Table Quick Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Word Table</span>
          <button
            onClick={toggleZebra}
            className={`px-2 py-0.5 rounded text-xs transition ${
              style.zebra ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Zebra Striping
          </button>
          <div className="flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex gap-1">
              {['#1e40af', '#0f766e', '#4338ca', '#334155', '#be123c'].map((c) => (
                <button
                  key={c}
                  onClick={() => changeHeaderColor(c)}
                  className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                  style={{ backgroundColor: c }}
                  title={`Set header color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={addColumn}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 transition text-slate-700"
          >
            <Plus className="w-3 h-3" /> Col
          </button>
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 transition text-slate-700"
          >
            <Plus className="w-3 h-3" /> Row
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-600 transition"
            title="Delete table"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Render Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr style={{ backgroundColor: style.headerBg, color: style.headerTextColor }}>
              {headers.map((h, colIdx) => (
                <th
                  key={colIdx}
                  className="p-2.5 font-semibold border-b border-slate-300 relative group/th"
                >
                  <input
                    type="text"
                    value={h}
                    onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                    className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-white rounded px-1"
                    style={{ color: style.headerTextColor }}
                  />
                  {headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(colIdx)}
                      className="absolute top-1 right-1 opacity-0 group-hover/th:opacity-100 text-white/70 hover:text-white text-[10px]"
                      title="Delete column"
                    >
                      ✕
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const isZebraRow = style.zebra && rowIdx % 2 === 1;
              return (
                <tr
                  key={rowIdx}
                  className={`border-b border-slate-200 transition-colors group/tr ${
                    isZebraRow ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className="p-2 border-r border-slate-200 last:border-r-0">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                        className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-800"
                      />
                    </td>
                  ))}
                  {rows.length > 1 && (
                    <td className="w-6 p-1 text-center">
                      <button
                        onClick={() => removeRow(rowIdx)}
                        className="opacity-0 group-hover/tr:opacity-100 text-slate-400 hover:text-red-500 text-xs"
                        title="Delete row"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
