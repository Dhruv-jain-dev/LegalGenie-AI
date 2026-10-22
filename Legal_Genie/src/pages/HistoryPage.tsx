import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Eye,
  Trash2,
  MessageSquare,
  FileText,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AgentBadge from '@/components/AgentBadge';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import Disclaimer from '@/components/Disclaimer';
import { chatService } from '@/services';
import type { AgentType, Conversation } from '@/types';
import { formatRelative } from '@/lib/utils';

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<AgentType | 'all'>('all');

  useEffect(() => {
    chatService.getConversations().then((convs) => {
      setConversations(convs);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    await chatService.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = conversations
    .filter((c) => (agentFilter === 'all' ? true : c.agent === agentFilter))
    .filter((c) => (search ? c.title.toLowerCase().includes(search.toLowerCase()) : true));

  if (loading) return <LoadingState message="Loading history..." />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Conversation History
        </h1>
        <p className="mt-1 text-ink-500">
          View and manage your past legal conversations with LegalGenie.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value as AgentType | 'all')}
            className="appearance-none rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-8 text-sm text-ink-700 transition-colors focus:border-brand-400 focus:outline-none"
          >
            <option value="all">All Agents</option>
            <option value="legal_qa">Legal Q&A</option>
            <option value="summary">Summary</option>
            <option value="draft">Draft</option>
            <option value="voice">Voice</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HistoryIcon className="h-8 w-8" />}
            title="No conversations found"
            description="Start a new conversation to see it appear in your history."
            action={
              <Link to="/chat">
                <Button leftIcon={<MessageSquare className="h-4 w-4" />}>New Conversation</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Conversation
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 md:table-cell">
                    Document
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 sm:table-cell">
                    Agent
                  </th>
                  <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 sm:table-cell">
                    Messages
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Last Active
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filtered.map((conv) => (
                  <tr key={conv.id} className="group transition-colors hover:bg-ink-50/50">
                    <td className="px-5 py-3.5">
                      <Link to={`/chat/${conv.id}`} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-ink-800 group-hover:text-brand-600">
                          {conv.title}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-5 py-3.5 text-sm text-ink-500 md:table-cell">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-ink-400" />
                        {conv.documentName}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3.5 sm:table-cell">
                      <AgentBadge agent={conv.agent ?? 'legal_qa'} />
                    </td>
                    <td className="hidden px-5 py-3.5 text-sm text-ink-500 sm:table-cell">
                      {conv.messages.length}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-500">
                      {formatRelative(conv.lastActive)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/chat/${conv.id}`}>
                          <button className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(conv.id)}
                          className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-error-50 hover:text-error-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Disclaimer variant="inline" />
    </div>
  );
}
