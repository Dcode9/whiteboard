import React, { useState, useEffect } from 'react';
import { DNoteDocument, AppMode, WhiteboardDrawingElement, WhiteboardBlock } from './types/document';
import { createDefaultDocument } from './utils/defaultDoc';
import { Header } from './components/Header';
import { PaginatedDocumentView } from './components/document/PaginatedDocumentView';
import { WhiteboardView } from './components/whiteboard/WhiteboardView';
import { AgentPanel } from './components/agent/AgentPanel';

// Only open the known document shape. Keep unreadable data untouched for recovery.
const isStoredDocument = (value: any): value is DNoteDocument => {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' ||
      typeof value.title !== 'string' || !value.metadata || !Array.isArray(value.blocks)) return false;
  const settings = value.settings;
  if (!settings || !['A4', 'Letter'].includes(settings.pageSize) ||
      !['portrait', 'landscape'].includes(settings.orientation) ||
      !settings.margins || !['top', 'right', 'bottom', 'left'].every(key => Number.isFinite(settings.margins[key])) ||
      typeof settings.header?.text !== 'string' || typeof settings.footer?.text !== 'string' ||
      !settings.theme || typeof settings.theme.bodyFont !== 'string' ||
      typeof settings.theme.headingFont !== 'string' || !Number.isFinite(settings.theme.fontSize)) return false;
  return value.blocks.every((block: any) => {
    if (!block || typeof block.id !== 'string') return false;
    switch (block.type) {
      case 'heading': return typeof block.text === 'string' && [1, 2, 3, 4, 5, 6].includes(block.level);
      case 'paragraph': return Array.isArray(block.runs) && block.runs.every((run: any) => run && typeof run.text === 'string');
      case 'table': return Array.isArray(block.headers) && block.headers.every((cell: any) => typeof cell === 'string') &&
        Array.isArray(block.rows) && block.rows.every((row: any) => Array.isArray(row) && row.every((cell: any) => typeof cell === 'string')) && !!block.style;
      case 'callout': return typeof block.content === 'string';
      case 'math': return typeof block.latex === 'string';
      case 'whiteboard': return Array.isArray(block.elements) && block.elements.every((element: any) => element &&
        typeof element.id === 'string' && typeof element.type === 'string' && typeof element.color === 'string' &&
        (element.points === undefined || (Array.isArray(element.points) && element.points.every((point: any) => point && Number.isFinite(point.x) && Number.isFinite(point.y)))));
      case 'toc': case 'pagebreak': return true;
      default: return false;
    }
  });
};

const loadDocument = () => {
  try {
    const saved = localStorage.getItem('d_note_current_doc');
    if (saved !== null) {
      try {
        const document = JSON.parse(saved);
        if (isStoredDocument(document)) return { document, protectedData: false, storageUnavailable: false };
      } catch {
        // Do not replace an unreadable saved document with the default.
      }
      return { document: createDefaultDocument(), protectedData: true, storageUnavailable: false };
    }
  } catch {
    // Never write over data that could not be checked at startup.
    return { document: createDefaultDocument(), protectedData: false, storageUnavailable: true };
  }
  return { document: createDefaultDocument(), protectedData: false, storageUnavailable: false };
};

export const App: React.FC = () => {
  const [loaded] = useState(loadDocument);
  const [document, setDocument] = useState<DNoteDocument>(loaded.document);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'unavailable' | 'protected'>('saving');
  const [appMode, setAppMode] = useState<AppMode>('document');
  const [isAgentOpen, setIsAgentOpen] = useState(true);

  // Document auto-save is local to this device, not a backend/cloud save.
  useEffect(() => {
    if (loaded.storageUnavailable) {
      setSaveStatus('unavailable');
      return;
    }
    if (loaded.protectedData) {
      setSaveStatus('protected');
      return;
    }
    try {
      localStorage.setItem('d_note_current_doc', JSON.stringify(document));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unavailable');
    }
  }, [document, loaded.protectedData, loaded.storageUnavailable]);

  const handleInsertDrawingToDoc = (elements: WhiteboardDrawingElement[], title: string) => {
    const newBlock: WhiteboardBlock = {
      id: 'wb-' + Date.now(),
      type: 'whiteboard',
      title: title || 'Drawing Snapshot',
      width: 650,
      height: 240,
      elements,
    };
    setDocument((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
    // Switch back to document mode to see the insertion
    setAppMode('document');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Top Navbar */}
      <Header
        document={document}
        saveStatus={saveStatus}
        onUpdateDocument={setDocument}
        appMode={appMode}
        onChangeMode={setAppMode}
        isAgentOpen={isAgentOpen}
        onToggleAgent={() => setIsAgentOpen(!isAgentOpen)}
      />

      {(saveStatus === 'unavailable' || saveStatus === 'protected') && (
        <div role="status" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {saveStatus === 'protected'
            ? 'Existing saved data could not be opened and has not been changed. This session is not saved. Export .docx before leaving.'
            : 'This browser could not save your document on this device. You can keep editing, but export .docx before leaving.'}
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Center Viewports */}
        <div className="flex-1 flex overflow-hidden">
          {/* Keep each workspace mounted so mode changes do not discard drawings. */}
          <div className={appMode === 'whiteboard' ? 'hidden' : appMode === 'split' ? 'w-[55%] h-full overflow-y-auto border-r border-slate-300' : 'flex-1 overflow-y-auto'}>
            <PaginatedDocumentView
              document={document}
              onUpdateDocument={setDocument}
              onExpandWhiteboard={() => setAppMode('whiteboard')}
            />
          </div>
          <div className={appMode === 'document' ? 'hidden' : appMode === 'split' ? 'w-[45%] h-full' : 'flex-1 h-full'}>
            <WhiteboardView onInsertToDocument={handleInsertDrawingToDoc} />
          </div>
        </div>

        {/* AI Agent Sidecar */}
        {isAgentOpen && (
          <AgentPanel
            document={document}
            onUpdateDocument={setDocument}
            onClose={() => setIsAgentOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
