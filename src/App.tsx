import React, { useState, useEffect } from 'react';
import { DNoteDocument, AppMode, WhiteboardDrawingElement, WhiteboardBlock } from './types/document';
import { createDefaultDocument } from './utils/defaultDoc';
import { Header } from './components/Header';
import { PaginatedDocumentView } from './components/document/PaginatedDocumentView';
import { WhiteboardView } from './components/whiteboard/WhiteboardView';
import { AgentPanel } from './components/agent/AgentPanel';

export const App: React.FC = () => {
  const [document, setDocument] = useState<DNoteDocument>(() => {
    const saved = localStorage.getItem('d_note_current_doc');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return createDefaultDocument();
  });

  const [appMode, setAppMode] = useState<AppMode>('document');
  const [isAgentOpen, setIsAgentOpen] = useState(true);

  // Auto-save to localStorage & backend
  useEffect(() => {
    try {
      localStorage.setItem('d_note_current_doc', JSON.stringify(document));
    } catch {
      // ignore
    }
  }, [document]);

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
        onUpdateDocument={setDocument}
        appMode={appMode}
        onChangeMode={setAppMode}
        isAgentOpen={isAgentOpen}
        onToggleAgent={() => setIsAgentOpen(!isAgentOpen)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Center Viewports */}
        <div className="flex-1 flex overflow-hidden">
          {appMode === 'document' && (
            <div className="flex-1 overflow-y-auto">
              <PaginatedDocumentView
                document={document}
                onUpdateDocument={setDocument}
                onExpandWhiteboard={() => setAppMode('whiteboard')}
              />
            </div>
          )}

          {appMode === 'whiteboard' && (
            <div className="flex-1 h-full">
              <WhiteboardView onInsertToDocument={handleInsertDrawingToDoc} />
            </div>
          )}

          {appMode === 'split' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
              {/* Document Side (55%) */}
              <div className="w-[55%] h-full overflow-y-auto border-r border-slate-300">
                <PaginatedDocumentView
                  document={document}
                  onUpdateDocument={setDocument}
                  onExpandWhiteboard={() => setAppMode('whiteboard')}
                />
              </div>

              {/* Whiteboard Side (45%) */}
              <div className="w-[45%] h-full">
                <WhiteboardView onInsertToDocument={handleInsertDrawingToDoc} />
              </div>
            </div>
          )}
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
