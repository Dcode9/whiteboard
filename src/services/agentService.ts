import { DNoteDocument, DNoteBlock, TableBlock, CalloutBlock, WhiteboardBlock, MathBlock, HeadingBlock, ParagraphBlock } from '../types/document';

export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProposedChange {
  id: string;
  type: 'insert_blocks' | 'update_layout' | 'update_theme' | 'replace_block';
  description: string;
  payload: any;
  targetBlockId?: string;
  timestamp: number;
}

export const AGENT_SYSTEM_PROMPT = `
You are D'Note AI, an advanced Agent-First document architect embedded inside D'Note.
Unlike standard AIs that simply dump basic Markdown, you directly construct rich, professional Word documents.

You have the ability to call discrete document creation tools by outputting special tool-call blocks in JSON format:
\`\`\`json:tool_call
{
  "tool": "TOOL_NAME",
  "parameters": { ... }
}
\`\`\`

AVAILABLE TOOLS:

1. insert_styled_table:
{
  "tool": "insert_styled_table",
  "parameters": {
    "headers": ["Col1", "Col2", "Col3"],
    "rows": [["A", "B", "C"], ["D", "E", "F"]],
    "style": {
      "zebra": true,
      "headerBg": "#1e40af",
      "headerTextColor": "#ffffff",
      "borderColor": "#cbd5e1",
      "borderWidth": 1
    }
  }
}

2. insert_callout:
{
  "tool": "insert_callout",
  "parameters": {
    "variant": "info" | "warning" | "tip" | "note" | "quote",
    "title": "Optional Callout Title",
    "content": "Detailed text content of the callout."
  }
}

3. insert_whiteboard_diagram:
{
  "tool": "insert_whiteboard_diagram",
  "parameters": {
    "title": "Diagram Title",
    "width": 600,
    "height": 240,
    "elements": [
      { "id": "1", "type": "rect", "x": 40, "y": 60, "width": 140, "height": 60, "color": "#2563eb", "fillColor": "#eff6ff", "strokeWidth": 2, "text": "Client" },
      { "id": "2", "type": "arrow", "points": [{ "x": 190, "y": 90 }, { "x": 260, "y": 90 }], "color": "#64748b", "strokeWidth": 2 },
      { "id": "3", "type": "rect", "x": 270, "y": 60, "width": 140, "height": 60, "color": "#059669", "fillColor": "#ecfdf5", "strokeWidth": 2, "text": "D-Ai Backend" }
    ]
  }
}

4. insert_math_equation:
{
  "tool": "insert_math_equation",
  "parameters": {
    "latex": "E = mc^2",
    "displayMode": "block"
  }
}

5. add_section_heading:
{
  "tool": "add_section_heading",
  "parameters": {
    "level": 1 | 2 | 3,
    "text": "Heading Text"
  }
}

6. insert_paragraph:
{
  "tool": "insert_paragraph",
  "parameters": {
    "runs": [
      { "text": "Normal text " },
      { "text": "bold text", "bold": true, "color": "#2563eb" }
    ]
  }
}

7. configure_page_layout:
{
  "tool": "configure_page_layout",
  "parameters": {
    "pageSize": "A4" | "Letter",
    "orientation": "portrait" | "landscape",
    "margins": { "top": 20, "right": 20, "bottom": 20, "left": 20 },
    "headerText": "Document Header",
    "footerText": "Confidential"
  }
}

GUIDELINES:
- Always accompany tool calls with a brief, clear conversational explanation of what you designed.
- When generating complex documents (proposals, research reports, meeting summaries), use structured tables with nice header backgrounds (#1e40af, #0f766e, #4338ca) and clean callouts to emphasize key takeaways.
- You can invoke multiple tools in a single response to construct multi-part sections.
`;

export async function sendAgentPrompt(
  messages: AgentChatMessage[],
  currentDoc: DNoteDocument,
  onChunk: (text: string) => void
): Promise<{ replyText: string; toolCalls: ProposedChange[] }> {
  // Add document context to the system prompt
  const docContextPrompt = `
Current Document State:
Title: "${currentDoc.title}"
Page Layout: ${currentDoc.settings.pageSize} (${currentDoc.settings.orientation})
Total Blocks: ${currentDoc.blocks.length}
`;

  const payload = {
    model: 'groq/compound',
    messages: [
      { role: 'system', content: AGENT_SYSTEM_PROMPT + '\n' + docContextPrompt },
      ...messages,
    ],
    stream: true,
  };

  const storedKey = (typeof window !== 'undefined' ? localStorage.getItem('d_ai_api_key') || '' : '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (storedKey) {
    if (storedKey.startsWith('gsk_')) {
      headers['x-groq-key'] = storedKey;
    } else if (storedKey.startsWith('AIza')) {
      headers['x-gemini-key'] = storedKey;
    } else {
      headers['x-groq-key'] = storedKey;
      headers['x-gemini-key'] = storedKey;
    }
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Request failed (${res.status}): ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Response body not readable');

  const decoder = new TextDecoder();
  let fullResponse = '';
  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    sseBuffer += chunk;

    const lines = sseBuffer.split('\n');
    sseBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullResponse += delta;
            onChunk(fullResponse);
          }
        } catch {
          // not JSON, ignore
        }
      }
    }
  }

  // Parse any tool calls in fullResponse
  const toolCalls: ProposedChange[] = [];
  const toolCallRegex = /```json:tool_call\s*([\s\S]*?)\s*```/g;
  let match;

  while ((match = toolCallRegex.exec(fullResponse)) !== null) {
    try {
      const parsedTool = JSON.parse(match[1]);
      const toolName = parsedTool.tool;
      const params = parsedTool.parameters;

      if (toolName === 'insert_styled_table') {
        const tableBlock: TableBlock = {
          id: 'tbl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'table',
          headers: params.headers || ['Col 1', 'Col 2'],
          rows: params.rows || [['A', 'B']],
          style: {
            zebra: params.style?.zebra ?? true,
            headerBg: params.style?.headerBg || '#1e40af',
            headerTextColor: params.style?.headerTextColor || '#ffffff',
            borderColor: params.style?.borderColor || '#cbd5e1',
            borderWidth: params.style?.borderWidth || 1,
          },
        };
        toolCalls.push({
          id: 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'insert_blocks',
          description: `Insert styled table (${tableBlock.headers.join(', ')})`,
          payload: [tableBlock],
          timestamp: Date.now(),
        });
      } else if (toolName === 'insert_callout') {
        const calloutBlock: CalloutBlock = {
          id: 'callout-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'callout',
          variant: params.variant || 'info',
          title: params.title,
          content: params.content || '',
        };
        toolCalls.push({
          id: 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'insert_blocks',
          description: `Insert ${params.variant || 'info'} callout${params.title ? ': ' + params.title : ''}`,
          payload: [calloutBlock],
          timestamp: Date.now(),
        });
      } else if (toolName === 'insert_whiteboard_diagram') {
        const wbBlock: WhiteboardBlock = {
          id: 'wb-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'whiteboard',
          title: params.title || 'Diagram',
          width: params.width || 600,
          height: params.height || 240,
          elements: params.elements || [],
        };
        toolCalls.push({
          id: 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'insert_blocks',
          description: `Insert whiteboard diagram: ${wbBlock.title}`,
          payload: [wbBlock],
          timestamp: Date.now(),
        });
      } else if (toolName === 'insert_math_equation') {
        const mathBlock: MathBlock = {
          id: 'math-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'math',
          latex: params.latex || '',
          displayMode: params.displayMode || 'block',
        };
        toolCalls.push({
          id: 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'insert_blocks',
          description: `Insert LaTeX formula: ${params.latex}`,
          payload: [mathBlock],
          timestamp: Date.now(),
        });
      } else if (toolName === 'add_section_heading') {
        const headingBlock: HeadingBlock = {
          id: 'h-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'heading',
          level: params.level || 2,
          text: params.text || 'Section',
        };
        toolCalls.push({
          id: 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'insert_blocks',
          description: `Add H${params.level || 2}: ${params.text}`,
          payload: [headingBlock],
          timestamp: Date.now(),
        });
      } else if (toolName === 'insert_paragraph') {
        const pBlock: ParagraphBlock = {
          id: 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'paragraph',
          runs: params.runs || [{ text: params.text || '' }],
        };
        toolCalls.push({
          id: 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'insert_blocks',
          description: `Add paragraph: "${(params.runs?.[0]?.text || params.text || '').slice(0, 30)}..."`,
          payload: [pBlock],
          timestamp: Date.now(),
        });
      } else if (toolName === 'configure_page_layout') {
        toolCalls.push({
          id: 'change-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          type: 'update_layout',
          description: `Update page layout to ${params.pageSize || 'A4'} (${params.orientation || 'portrait'})`,
          payload: params,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Failed to parse tool call JSON:', e);
    }
  }

  return { replyText: fullResponse, toolCalls };
}

export function applyProposedChange(
  currentDoc: DNoteDocument,
  change: ProposedChange
): DNoteDocument {
  const updatedDoc: DNoteDocument = JSON.parse(JSON.stringify(currentDoc));

  if (change.type === 'insert_blocks') {
    const newBlocks: DNoteBlock[] = change.payload;
    updatedDoc.blocks = [...updatedDoc.blocks, ...newBlocks];
  } else if (change.type === 'update_layout') {
    const p = change.payload;
    if (p.pageSize) updatedDoc.settings.pageSize = p.pageSize;
    if (p.orientation) updatedDoc.settings.orientation = p.orientation;
    if (p.margins) updatedDoc.settings.margins = { ...updatedDoc.settings.margins, ...p.margins };
    if (p.headerText !== undefined) updatedDoc.settings.header.text = p.headerText;
    if (p.footerText !== undefined) updatedDoc.settings.footer.text = p.footerText;
  }

  updatedDoc.metadata.updatedAt = Date.now();
  return updatedDoc;
}
