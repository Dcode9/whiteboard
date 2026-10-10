import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Check,
  X,
  Bot,
  User,
  Table,
  PenTool,
  Lightbulb,
  FileSpreadsheet,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { DNoteDocument } from '../../types/document';
import {
  AgentChatMessage,
  ProposedChange,
  sendAgentPrompt,
  applyProposedChange,
} from '../../services/agentService';

interface Props {
  document: DNoteDocument;
  onUpdateDocument: (updated: DNoteDocument) => void;
  onClose: () => void;
}

export const AgentPanel: React.FC<Props> = ({ document: doc, onUpdateDocument, onClose }) => {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      role: 'assistant',
      content:
        "I can help build styled tables, callouts, whiteboard diagrams, and page layouts in your document. What would you like to work on?",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const newMessages: AgentChatMessage[] = [
      ...messages,
      { role: 'user', content: textToSend },
    ];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      let streamingContent = '';
      const { replyText, toolCalls } = await sendAgentPrompt(
        newMessages,
        doc,
        (partialText) => {
          streamingContent = partialText;
          // Clean up the display text by removing the raw JSON tool call blocks from user view
          const cleanText = partialText.replace(/```json:tool_call[\s\S]*?```/g, '\n*(Constructing rich document elements...)*\n');
          setMessages([
            ...newMessages,
            { role: 'assistant', content: cleanText },
          ]);
        }
      );

      // Clean final response for chat display
      const finalCleanText = replyText.replace(/```json:tool_call[\s\S]*?```/g, '').trim();
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: finalCleanText || "I've prepared the document updates below. Click Accept to apply them to your document.",
        },
      ]);

      if (toolCalls.length > 0) {
        setProposedChanges((prev) => [...prev, ...toolCalls]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Failed to connect to D-Ai backend'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptChange = (change: ProposedChange) => {
    const updatedDoc = applyProposedChange(doc, change);
    onUpdateDocument(updatedDoc);
    setProposedChanges((prev) => prev.filter((c) => c.id !== change.id));
  };

  const handleRejectChange = (changeId: string) => {
    setProposedChanges((prev) => prev.filter((c) => c.id !== changeId));
  };

  const handleAcceptAll = () => {
    let current = doc;
    for (const change of proposedChanges) {
      current = applyProposedChange(current, change);
    }
    onUpdateDocument(current);
    setProposedChanges([]);
  };

  const quickPrompts = [
    {
      title: 'Formal Project Proposal',
      prompt: 'Draft a formal project proposal with executive summary, an architecture table with zebra striping, a whiteboard diagram, and callouts.',
      icon: Layers,
    },
    {
      title: 'Financial Model Table',
      prompt: 'Create a styled financial projections table with Q1-Q4 revenue, margins, and a key insights callout.',
      icon: FileSpreadsheet,
    },
    {
      title: 'System Architecture Diagram',
      prompt: 'Generate an architecture diagram on the whiteboard block connecting Web Client, D-Note AST Engine, and Word OpenXML Exporter.',
      icon: PenTool,
    },
  ];

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('d_ai_api_key') || '' : '');
  });

  const saveApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('d_ai_api_key', apiKeyInput.trim());
    }
    setShowKeyModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl w-80 sm:w-96 z-30 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
              D'Note Agent
              <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                D-Ai
              </span>
            </h2>
            <p className="text-[11px] text-slate-600">Direct Word AST Tool Calling</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowKeyModal(!showKeyModal)}
            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-200 transition"
            title="Configure AI API Key (Groq / Gemini)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showKeyModal && (
        <div className="p-3 bg-blue-50/90 border-b border-blue-200 text-xs space-y-2">
          <div className="font-semibold text-blue-900">Custom Model Key (Optional)</div>
          <p className="text-[11px] text-slate-600">
            Paste your Google Gemini (AIza...) or Groq (gsk_...) API key. If empty, D-Ai uses the server key or free fallback.
          </p>
          <input
            type="password"
            placeholder="AIzaSy... or gsk_..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowKeyModal(false)}
              className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded text-[11px]"
            >
              Cancel
            </button>
            <button
              onClick={saveApiKey}
              className="px-3 py-1 bg-blue-600 text-white font-medium rounded text-[11px] hover:bg-blue-700"
            >
              Save Key
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`rounded-xl p-3 max-w-[85%] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-600 text-xs py-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Agent designing rich Word elements...</span>
          </div>
        )}

        {/* Proposed Changes Review Box */}
        {proposedChanges.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Proposed Elements ({proposedChanges.length})
              </span>
              <button
                onClick={handleAcceptAll}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
              >
                Accept All
              </button>
            </div>

            <div className="space-y-1.5">
              {proposedChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100 shadow-xs text-xs"
                >
                  <span className="text-slate-800 font-medium truncate max-w-[180px]">
                    {change.description}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAcceptChange(change)}
                      className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                      title="Accept & Insert"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRejectChange(change.id)}
                      className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition"
                      title="Reject"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Prompts */}
        {messages.length <= 2 && (
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Agent Document Ideas
            </p>
            <div className="space-y-1.5">
              {quickPrompts.map((qp, i) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(qp.prompt)}
                    className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition flex items-start gap-2 text-slate-700 group"
                  >
                    <Icon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 group-hover:text-blue-700">
                        {qp.title}
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">{qp.prompt}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask AI to design tables, diagrams, layouts..."
            className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-xs"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="absolute right-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 transition shadow-xs"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
