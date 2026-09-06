import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Trash2,
  ShieldCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Bot,
  User as UserIcon,
  AlertCircle,
  Globe
} from 'lucide-react';
import { chatApi, ChatMessageItem, ChatSource } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const Chatbot: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('Sending...');
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { label: "Approval Tiers", query: "What are the discount approval tiers in DealFlow360?" },
    { label: "हिन्दी: छूट नियम", query: "DealFlow360 में छूट की सीमा और मंजूरी की प्रक्रिया क्या है?" },
    { label: "ગુજરાતી: મંજૂરી", query: "ડિસ્કાઉન્ટ મંજૂરી માટે સેલ્સ મેનેજરના નિયમ શું છે?" },
    { label: "Hinglish: Quotes", query: "Mere quotations aur open invoices ka kya status hai?" },
    { label: "Warehouse Split", query: "How does the multi-warehouse allocation engine split orders?" }
  ];

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadHistory();
    }
  }, [isOpen, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const res = await chatApi.getHistory();
      if (res.data && res.data.length > 0) {
        setMessages(res.data);
      } else {
        // Welcome message
        setMessages([
          {
            role: 'assistant',
            content: `Hello ${currentUser?.full_name || 'there'}! I am the DealFlow360 AI Assistant. I can answer questions about pricing, quotations, approvals, multi-warehouse fulfillment, hybrid billing, and your account records in English, हिन्दी, ગુજરાતી, or Hinglish.`,
            language: 'en',
            grounded: true,
            confidence: 1.0,
            response_type: 'knowledge',
            sources: []
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setError(null);
    setInput('');

    const newHistory = [
      ...messages,
      { role: 'user' as const, content: query }
    ];
    setMessages(newHistory);
    setLoading(true);
    setLoadingStage('Sending...');

    // Staged status text so the user sees real progress instead of a frozen UI.
    const stageTimer1 = setTimeout(() => setLoadingStage('Retrieving verified context...'), 400);
    const stageTimer2 = setTimeout(() => setLoadingStage('Generating response...'), 1400);

    try {
      const recentHistory = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await chatApi.sendMessage(
        {
          message: query,
          history: recentHistory
        },
        { timeout: 20000 }
      );

      const assistantMessage: ChatMessageItem = {
        role: 'assistant',
        content: res.data.answer,
        language: res.data.language,
        response_type: res.data.response_type,
        confidence: res.data.confidence,
        grounded: res.data.grounded,
        sources: res.data.sources
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error', err);
      const isTimeout = err.code === 'ECONNABORTED';
      const isRateLimited = err.response?.status === 429;
      let errMsg = err.response?.data?.detail || 'Failed to process request. Please try again.';
      if (isTimeout) errMsg = 'The assistant took too long to respond. Please try again.';
      if (isRateLimited) errMsg = 'Too many requests right now. Please wait a moment and try again.';

      setError(errMsg);
      // Restore the user's input so a failed send doesn't lose their message.
      setInput(query);
      // Remove the optimistic user message we appended before the failed call,
      // so it doesn't look like it was sent successfully.
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setLoading(false);
      setLoadingStage('Sending...');
    }
  };

  const handleClearChat = async () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Conversation history cleared. How can I assist you with DealFlow360 today?',
        language: 'en',
        grounded: true,
        confidence: 1.0,
        response_type: 'knowledge',
        sources: []
      }
    ]);
  };

  const toggleSource = (idx: number) => {
    setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Action Button Launcher */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 group hover:scale-105"
          title="Open DealFlow360 AI Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">DealFlow AI</span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold leading-tight">DealFlow360 Assistant</h3>
                  <span className="bg-blue-500/30 text-blue-300 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-400/20">
                    Flash RAG
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  EN • हिन्दी • ગુજરાતી • Hinglish
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Clear Chat View"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Carousel */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Try:</span>
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p.query)}
                className="shrink-0 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-full transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F8FAFC]">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none whitespace-pre-wrap'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Grounding & Confidence Signals for Assistant */}
                    {!isUser && (msg.grounded || msg.sources?.length) ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                        {msg.grounded && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Grounded ({Math.round((msg.confidence || 0.8) * 100)}%)
                          </span>
                        )}

                        {msg.response_type && (
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-medium capitalize">
                            {msg.response_type.replace('_', ' ')}
                          </span>
                        )}

                        {msg.language && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 uppercase font-semibold">
                            {msg.language}
                          </span>
                        )}

                        {/* Sources Toggle */}
                        {msg.sources && msg.sources.length > 0 && (
                          <button
                            onClick={() => toggleSource(idx)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 ml-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            {msg.sources.length} {msg.sources.length === 1 ? 'Source' : 'Sources'}
                            {expandedSources[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    ) : null}

                    {/* Sources Dropdown Card */}
                    {!isUser && expandedSources[idx] && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                        <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          Verified Sources & Citations
                        </p>
                        {msg.sources.map((s, sIdx) => (
                          <div key={sIdx} className="bg-white border border-slate-200 rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900">{s.title}</span>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {Math.round(s.score * 100)}%
                              </span>
                            </div>
                            <p className="text-slate-500 text-[10px] mt-0.5">{s.section}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-600 flex items-center justify-center animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium animate-pulse">{loadingStage}</span>
              </div>
            )}
            {error && !loading && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask in English, हिन्दी, ગુજરાતી, or Hinglish..."
                disabled={loading}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 rounded-xl transition-colors shrink-0 shadow-sm"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-slate-400 text-center mt-1.5">
              Grounded strictly in verified DealFlow360 RBAC rules, CPQ policies & catalog data.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
