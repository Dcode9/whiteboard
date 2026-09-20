// Document AST Definitions for D'Note

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  highlight?: string;
  fontSize?: number; // pt
  fontFamily?: string;
  link?: string;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  align?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  runs: TextRun[];
}

export interface HeadingBlock {
  id: string;
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableBlock {
  id: string;
  type: 'table';
  headers: string[];
  rows: string[][];
  columnWidths?: number[];
  style: {
    zebra: boolean;
    headerBg: string;
    headerTextColor: string;
    borderColor: string;
    borderWidth: number; // pt
  };
}

export interface CalloutBlock {
  id: string;
  type: 'callout';
  variant: 'info' | 'warning' | 'tip' | 'note' | 'quote';
  title?: string;
  content: string;
}

export interface WhiteboardDrawingElement {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'line' | 'arrow' | 'text';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
  strokeWidth: number;
  fillColor?: string;
  text?: string;
}

export interface WhiteboardBlock {
  id: string;
  type: 'whiteboard';
  title?: string;
  width: number;
  height: number;
  elements: WhiteboardDrawingElement[];
  svgSnapshot?: string;
}

export interface MathBlock {
  id: string;
  type: 'math';
  latex: string;
  displayMode: 'block' | 'inline';
}

export interface TableOfContentsBlock {
  id: string;
  type: 'toc';
  title?: string;
  maxDepth: number;
}

export interface PageBreakBlock {
  id: string;
  type: 'pagebreak';
}

export type DNoteBlock =
  | ParagraphBlock
  | HeadingBlock
  | TableBlock
  | CalloutBlock
  | WhiteboardBlock
  | MathBlock
  | TableOfContentsBlock
  | PageBreakBlock;

export interface DNoteSettings {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;    // mm
    right: number;  // mm
    bottom: number; // mm
    left: number;   // mm
  };
  header: {
    text: string;
    alignment: 'left' | 'center' | 'right';
  };
  footer: {
    text: string;
    showPageNumber: boolean;
    alignment: 'left' | 'center' | 'right';
  };
  theme: {
    primaryColor: string;
    headingFont: string;
    bodyFont: string;
    fontSize: number; // base pt
  };
}

export interface DNoteDocument {
  id: string;
  title: string;
  metadata: {
    createdAt: number;
    updatedAt: number;
    author: string;
    version: number;
  };
  settings: DNoteSettings;
  blocks: DNoteBlock[];
}

export type AppMode = 'document' | 'split' | 'whiteboard';
