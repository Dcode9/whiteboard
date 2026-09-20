import React, { useState } from 'react';
import {
  FileText,
  PenTool,
  Columns2,
  Download,
  Sparkles,
  Settings,
  Cloud,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { DNoteDocument, AppMode } from '../types/document';
import { exportToDocx } from '../services/docxExporter';

interface Props {
  document: DNoteDocument;
  onUpdateDocument: (doc: DNoteDocument) => void;
  appMode: AppMode;
  onChangeMode: (mode: AppMode) => void;
  isAgentOpen: boolean;
  onToggleAgent: () => void;
}

export const Header: React.FC<Props> = ({
  document: doc,
  onUpdateDocument,
  appMode,
  onChangeMode,
  isAgentOpen,
  onToggleAgent,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportToDocx(doc);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export Word document: ' + (err as any).message);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleOrientation = () => {
    onUpdateDocument({
      ...doc,
      settings: {
        ...doc.settings,
        orientation: doc.settings.orientation === 'portrait' ? 'landscape' : 'portrait',
      },
    });
  };

  const setPageSize = (size: 'A4' | 'Letter') => {
    onUpdateDocument({
      ...doc,
      settings: {
        ...doc.settings,
        pageSize: size,
      },
    });
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-40 select-none shadow-xs">
      {/* Brand & Document Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-base shadow-sm">
            D'
          </div>
          <span className="font-bold text-slate-900 tracking-tight hidden sm:inline text-sm">
            D'Note
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <input
          type="text"
          value={doc.title}
          onChange={(e) => onUpdateDocument({ ...doc, title: e.target.value })}
          className="font-medium text-slate-800 text-sm bg-transparent hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-2 py-1 max-w-[180px] sm:max-w-xs transition"
          title="Click to rename document"
        />

        <div className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> Saved
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
        <button
          onClick={() => onChangeMode('document')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
            appMode === 'document'
              ? 'bg-white text-blue-600 shadow-xs font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Document</span>
        </button>

        <button
          onClick={() => onChangeMode('split')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
            appMode === 'split'
              ? 'bg-white text-blue-600 shadow-xs font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Split</span>
        </button>

        <button
          onClick={() => onChangeMode('whiteboard')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
            appMode === 'whiteboard'
              ? 'bg-white text-blue-600 shadow-xs font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Whiteboard</span>
        </button>
      </div>

      {/* Action Buttons: Layout, Export, AI */}
      <div className="flex items-center gap-2">
        {/* Layout Settings Menu */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            title="Page Layout Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {showLayoutMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-3">
              <div>
                <span className="font-semibold text-slate-800 block mb-1.5">Page Size</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['A4', 'Letter'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={`py-1 rounded border text-center transition ${
                        doc.settings.pageSize === size
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-800 block mb-1.5">Orientation</span>
                <button
                  onClick={toggleOrientation}
                  className="w-full py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-center font-medium capitalize"
                >
                  {doc.settings.orientation} (Click to switch)
                </button>
              </div>

              <div>
                <span className="font-semibold text-slate-800 block mb-1.5">Header & Footer</span>
                <input
                  type="text"
                  placeholder="Header text..."
                  value={doc.settings.header.text}
                  onChange={(e) =>
                    onUpdateDocument({
                      ...doc,
                      settings: {
                        ...doc.settings,
                        header: { ...doc.settings.header, text: e.target.value },
                      },
                    })
                  }
                  className="w-full mb-1 px-2 py-1 border border-slate-200 rounded text-xs"
                />
                <input
                  type="text"
                  placeholder="Footer text..."
                  value={doc.settings.footer.text}
                  onChange={(e) =>
                    onUpdateDocument({
                      ...doc,
                      settings: {
                        ...doc.settings,
                        footer: { ...doc.settings.footer, text: e.target.value },
                      },
                    })
                  }
                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Word .docx Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
          title="Export to Microsoft Word (.docx)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export .docx'}</span>
        </button>

        {/* AI Agent Toggle */}
        <button
          onClick={onToggleAgent}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
            isAgentOpen
              ? 'bg-blue-600 text-white shadow-blue-200'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Agent</span>
        </button>
      </div>
    </header>
  );
};
