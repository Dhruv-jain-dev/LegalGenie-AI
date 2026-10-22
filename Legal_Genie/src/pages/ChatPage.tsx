import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  MessageSquarePlus,
  FileText,
  Sparkles,
  Search,
  Trash2,
  Loader2,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import Disclaimer from '@/components/Disclaimer';
import { useAuth } from '@/context/AuthContext';
import { chatService, documentService } from '@/services';
import type { ChatMessage as ChatMessageType, Conversation, LegalDocument } from '@/types';
import { formatRelative } from '@/lib/utils';

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState('');
  const [search, setSearch] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatService.getConversations().then((convs) => {
      setConversations(convs);
      if (sessionId) {
        const found = convs.find((c) => c.id === sessionId);
        if (found) {
          setActiveConv(found);
          setMessages(found.messages);
        }
      }
      setLoading(false);
    });
    documentService.getDocuments().then(setDocuments).catch(() => undefined);
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = async (text: string) => {
    if (!activeConv) return;

    const userMsg: ChatMessageType = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setSending(true);
    setThinking('Searching document...');

    const thinkTimer = setTimeout(() => setThinking('Reviewing relevant clauses...'), 700);

    try {
      const res = await chatService.askQuestion(activeConv.id, text);
      clearTimeout(thinkTimer);

      const aiMsg: ChatMessageType = {
        id: `m_${Date.now() + 1}`,
        role: 'assistant',
        content: res.content,
        agent: 'legal_qa',
        sources: res.sources,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: ChatMessageType = {
        id: `m_${Date.now() + 1}`,
        role: 'assistant',
        content: "LegalGenie couldn't generate a response right now. Please try again.",
        agent: 'legal_qa',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
      setThinking('');
    }
  };

  const handleNewConversation = async () => {
    const document = documents.find((item) => item.status === 'analysed');
    if (!document) return;
    const conv = await chatService.createConversation('New Conversation', document.id);
    conv.documentName = document.name;
    setConversations((prev) => [conv, ...prev]);
    setActiveConv(conv);
    setMessages([]);
  };

  const handleSelectConv = (conv: Conversation) => {
    setActiveConv(conv);
    setMessages(conv.messages);
  };

  const handleDeleteConv = async (id: string) => {
    await chatService.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConv?.id === id) {
      setActiveConv(null);
      setMessages([]);
    }
  };

  const filteredConvs = conversations.filter((c) =>
    search ? c.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  if (loading)
    return <LoadingState message="Loading conversations..." className="pt-20" />;

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4 lg:h-[calc(100vh-4rem)]">
      {/* Conversation List */}
      <div className="hidden w-72 shrink-0 flex-col md:flex">
        <div className="mb-3">
          <Button fullWidth leftIcon={<MessageSquarePlus className="h-4 w-4" />} onClick={handleNewConversation}>
            New Conversation
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {filteredConvs.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConv(conv)}
              className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                activeConv?.id === conv.id
                  ? 'bg-brand-50 text-brand-700'
                  : 'hover:bg-ink-50 text-ink-700'
              }`}
            >
              <FileText
                className={`mt-0.5 h-4 w-4 shrink-0 ${activeConv?.id === conv.id ? 'text-brand-600' : 'text-ink-400'}`}
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{conv.title}</p>
                <p className="truncate text-xs text-ink-400">{conv.documentName}</p>
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConv(conv.id);
                }}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-ink-400 hover:text-error-500" />
              </span>
            </button>
          ))}
          {filteredConvs.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-ink-400">No conversations found.</p>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900">LegalGenie AI</h2>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                <span className="text-xs text-ink-500">Document-grounded AI</span>
              </div>
            </div>
          </div>
          {activeConv && (
            <Badge tone="brand">
              <FileText className="h-3 w-3" />
              {activeConv.documentName}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
          {!activeConv ? (
            <EmptyState
              icon={<MessageSquarePlus className="h-8 w-8" />}
              title="Start a conversation"
              description="Select a conversation from the sidebar or create a new one to ask questions about your legal documents."
              action={
                <Button leftIcon={<MessageSquarePlus className="h-4 w-4" />} onClick={handleNewConversation}>
                  New Conversation
                </Button>
              }
              className="h-full justify-center"
            />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="Ask your first question"
              description={`Ask anything about "${activeConv.documentName}" and LegalGenie will provide document-grounded answers.`}
              className="h-full justify-center"
            />
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} user={{ name: user?.name ?? 'User' }} />
              ))}
              {sending && (
                <div className="flex items-center gap-2.5 text-sm text-ink-400 animate-fade-in">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                  {thinking || 'Processing...'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onVoiceToggle={() => setVoiceActive((v) => !v)}
          voiceActive={voiceActive}
          loading={sending}
          disabled={!activeConv}
        />
      </div>
    </div>
  );
}
