import React from 'react';
import { DNoteDocument, DNoteBlock, TableBlock, CalloutBlock, WhiteboardBlock, MathBlock, HeadingBlock, ParagraphBlock } from '../../types/document';
import { HeadingBlockView } from './blocks/HeadingBlockView';
import { ParagraphBlockView } from './blocks/ParagraphBlockView';
import { TableBlockView } from './blocks/TableBlockView';
import { CalloutBlockView } from './blocks/CalloutBlockView';
import { MathBlockView } from './blocks/MathBlockView';
import { WhiteboardBlockView } from './blocks/WhiteboardBlockView';
import { Plus, Type, Heading, Table, Lightbulb, PenTool, Hash, FilePlus } from 'lucide-react';

interface Props {
  document: DNoteDocument;
  onUpdateDocument: (updated: DNoteDocument) => void;
  onExpandWhiteboard?: (blockId: string) => void;
}

export const PaginatedDocumentView: React.FC<Props> = ({
  document: doc,
  onUpdateDocument,
  onExpandWhiteboard,
}) => {
  const { settings, blocks } = doc;

  // Split blocks into pages based on page breaks or virtual chunking
  const pages: DNoteBlock[][] = [];
  let currentPage: DNoteBlock[] = [];

  blocks.forEach((block) => {
    if (block.type === 'pagebreak') {
      pages.push(currentPage);
      currentPage = [];
    } else {
      currentPage.push(block);
    }
  });
  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  const handleBlockChange = (index: number, updatedBlock: DNoteBlock) => {
    const nextBlocks = [...blocks];
    nextBlocks[index] = updatedBlock;
    onUpdateDocument({ ...doc, blocks: nextBlocks });
  };

  const handleBlockDelete = (index: number) => {
    const nextBlocks = blocks.filter((_, idx) => idx !== index);
    onUpdateDocument({ ...doc, blocks: nextBlocks });
  };

  const addBlock = (type: DNoteBlock['type']) => {
    let newBlock: DNoteBlock;
    const id = 'blk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    if (type === 'heading') {
      newBlock = { id, type: 'heading', level: 2, text: 'New Section' };
    } else if (type === 'paragraph') {
      newBlock = { id, type: 'paragraph', runs: [{ text: '' }] };
    } else if (type === 'table') {
      newBlock = {
        id,
        type: 'table',
        headers: ['Feature', 'Description', 'Status'],
        rows: [
          ['Architecture', 'Word AST + WebBoard Canvas', 'Active'],
          ['Export', 'Native Office Open XML (.docx)', 'Ready'],
        ],
        style: {
          zebra: true,
          headerBg: '#1e40af',
          headerTextColor: '#ffffff',
          borderColor: '#cbd5e1',
          borderWidth: 1,
        },
      };
    } else if (type === 'callout') {
      newBlock = {
        id,
        type: 'callout',
        variant: 'tip',
        title: 'Document Callout',
        content: 'Add actionable notes or insights here.',
      };
    } else if (type === 'whiteboard') {
      newBlock = {
        id,
        type: 'whiteboard',
        title: 'Drawing Canvas',
        width: 650,
        height: 240,
        elements: [],
      };
    } else if (type === 'math') {
      newBlock = {
        id,
        type: 'math',
        latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}',
        displayMode: 'block',
      };
    } else if (type === 'pagebreak') {
      newBlock = { id, type: 'pagebreak' };
    } else {
      return;
    }

    onUpdateDocument({ ...doc, blocks: [...blocks, newBlock] });
  };

  const isLandscape = settings.orientation === 'landscape';

  // Paper Dimensions:
  // A4 Portrait: 210mm x 297mm -> approx 794px x 1123px (at 96 DPI)
  // A4 Landscape: 297mm x 210mm -> approx 1123px x 794px
  const pageDimensions = isLandscape
    ? { width: '1123px', minHeight: '794px' }
    : { width: '794px', minHeight: '1123px' };

  // Margins in px (1mm ≈ 3.78px)
  const padTop = `${Math.round(settings.margins.top * 3.78)}px`;
  const padRight = `${Math.round(settings.margins.right * 3.78)}px`;
  const padBottom = `${Math.round(settings.margins.bottom * 3.78)}px`;
  const padLeft = `${Math.round(settings.margins.left * 3.78)}px`;

  return (
    <div className="flex flex-col items-center py-8 px-4 bg-slate-100/70 min-h-full font-sans">
      {/* Top Document Ruler */}
      <div
        className="hidden md:flex items-center justify-between text-[10px] text-slate-600 bg-white border border-slate-200 rounded-t shadow-xs px-4 py-1 mb-2 select-none"
        style={{ width: pageDimensions.width }}
      >
        <span className="font-semibold text-slate-700">RULER (0 - {isLandscape ? '297mm' : '210mm'})</span>
        <div className="flex gap-4">
          <span>Margins: {settings.margins.top}mm T / {settings.margins.bottom}mm B / {settings.margins.left}mm L / {settings.margins.right}mm R</span>
          <span>Orientation: {settings.orientation.toUpperCase()}</span>
          <span>Size: {settings.pageSize}</span>
        </div>
      </div>

      {/* Pages Container */}
      <div className="space-y-8 flex flex-col items-center">
        {pages.map((pageBlocks, pageIndex) => (
          <div
            key={pageIndex}
            className="relative bg-white shadow-md hover:shadow-lg border border-slate-200 transition-shadow flex flex-col"
            style={{
              width: pageDimensions.width,
              minHeight: pageDimensions.minHeight,
              paddingTop: padTop,
              paddingRight: padRight,
              paddingBottom: padBottom,
              paddingLeft: padLeft,
            }}
          >
            {/* Header Band */}
            <div
              className="absolute top-0 left-0 right-0 px-8 py-3 border-b border-slate-100 flex items-center text-xs text-slate-600 select-none"
              style={{
                justifyContent:
                  settings.header.alignment === 'center'
                    ? 'center'
                    : settings.header.alignment === 'left'
                    ? 'flex-start'
                    : 'flex-end',
              }}
            >
              <span>{settings.header.text || doc.title}</span>
            </div>

            {/* Main Content Flow */}
            <div className="flex-1 w-full">
              {pageBlocks.map((block) => {
                const globalIndex = blocks.findIndex((b) => b.id === block.id);
                if (block.type === 'heading') {
                  return (
                    <HeadingBlockView
                      key={block.id}
                      block={block}
                      onChange={(u) => handleBlockChange(globalIndex, u)}
                      onDelete={() => handleBlockDelete(globalIndex)}
                    />
                  );
                } else if (block.type === 'paragraph') {
                  return (
                    <ParagraphBlockView
                      key={block.id}
                      block={block}
                      onChange={(u) => handleBlockChange(globalIndex, u)}
                      onDelete={() => handleBlockDelete(globalIndex)}
                    />
                  );
                } else if (block.type === 'table') {
                  return (
                    <TableBlockView
                      key={block.id}
                      block={block}
                      onChange={(u) => handleBlockChange(globalIndex, u)}
                      onDelete={() => handleBlockDelete(globalIndex)}
                    />
                  );
                } else if (block.type === 'callout') {
                  return (
                    <CalloutBlockView
                      key={block.id}
                      block={block}
                      onChange={(u) => handleBlockChange(globalIndex, u)}
                      onDelete={() => handleBlockDelete(globalIndex)}
                    />
                  );
                } else if (block.type === 'math') {
                  return (
                    <MathBlockView
                      key={block.id}
                      block={block}
                      onChange={(u) => handleBlockChange(globalIndex, u)}
                      onDelete={() => handleBlockDelete(globalIndex)}
                    />
                  );
                } else if (block.type === 'whiteboard') {
                  return (
                    <WhiteboardBlockView
                      key={block.id}
                      block={block}
                      onChange={(u) => handleBlockChange(globalIndex, u)}
                      onDelete={() => handleBlockDelete(globalIndex)}
                      onExpandToBoard={() => onExpandWhiteboard?.(block.id)}
                    />
                  );
                }
                return null;
              })}
            </div>

            {/* Footer Band */}
            <div
              className="absolute bottom-0 left-0 right-0 px-8 py-3 border-t border-slate-100 flex items-center text-xs text-slate-600 select-none"
              style={{
                justifyContent:
                  settings.footer.alignment === 'center'
                    ? 'center'
                    : settings.footer.alignment === 'left'
                    ? 'flex-start'
                    : 'flex-end',
              }}
            >
              <span>
                {settings.footer.text ? `${settings.footer.text}  |  ` : ''}
                {settings.footer.showPageNumber && `Page ${pageIndex + 1} of ${pages.length}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* In-Page Quick Insert Action Bar */}
      <div className="sticky bottom-6 mt-6 z-20 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md border border-slate-300 rounded-full shadow-lg">
        <button
          onClick={() => addBlock('paragraph')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <Type className="w-3.5 h-3.5" /> Paragraph
        </button>
        <button
          onClick={() => addBlock('heading')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <Heading className="w-3.5 h-3.5" /> Heading
        </button>
        <button
          onClick={() => addBlock('table')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <Table className="w-3.5 h-3.5" /> Table
        </button>
        <button
          onClick={() => addBlock('callout')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <Lightbulb className="w-3.5 h-3.5" /> Callout
        </button>
        <button
          onClick={() => addBlock('whiteboard')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <PenTool className="w-3.5 h-3.5" /> Whiteboard
        </button>
        <button
          onClick={() => addBlock('math')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <Hash className="w-3.5 h-3.5" /> Math
        </button>
        <button
          onClick={() => addBlock('pagebreak')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition"
        >
          <FilePlus className="w-3.5 h-3.5" /> Page Break
        </button>
      </div>
    </div>
  );
};
