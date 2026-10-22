import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  FileBarChart,
  FilePenLine,
  Upload,
  Sparkles,
  Mic,
  ArrowRight,
  MoreVertical,
  Eye,
  Trash2,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import Disclaimer from '@/components/Disclaimer';
import { useAuth } from '@/context/AuthContext';
import { chatService, documentService, draftService, summaryService } from '@/services';
import type { LegalDocument } from '@/types';
import { formatDate } from '@/lib/utils';

const quickActions = [
  { label: 'Upload Document', icon: Upload, to: '/documents', tone: 'bg-brand-50 text-brand-600' },
  { label: 'Ask LegalGenie', icon: Sparkles, to: '/chat', tone: 'bg-accent-50 text-accent-600' },
  { label: 'Summarize Document', icon: FileBarChart, to: '/summaries', tone: 'bg-success-50 text-success-600' },
  { label: 'Create Draft', icon: FilePenLine, to: '/drafts', tone: 'bg-warning-50 text-warning-600' },
  { label: 'Voice Consultation', icon: Mic, to: '/voice', tone: 'bg-error-50 text-error-600' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [counts, setCounts] = useState([0, 0, 0, 0]);

  useEffect(() => {
    Promise.all([documentService.getDocuments(), chatService.getConversations(), summaryService.getSummaries(), draftService.getDrafts()])
      .then(([docs, conversations, summaries, drafts]) => {
        setDocuments(docs);
        setCounts([docs.filter((doc) => doc.status === 'analysed').length, conversations.length, summaries.length, drafts.length]);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const stats = [
    { label: 'Documents Analysed', value: counts[0], icon: FileText, tone: 'bg-brand-50 text-brand-600' },
    { label: 'Conversations', value: counts[1], icon: MessageSquare, tone: 'bg-accent-50 text-accent-600' },
    { label: 'Summaries Generated', value: counts[2], icon: FileBarChart, tone: 'bg-success-50 text-success-600' },
    { label: 'Drafts Created', value: counts[3], icon: FilePenLine, tone: 'bg-warning-50 text-warning-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-ink-500">Your legal workspace, powered by AI.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-500">{stat.label}</p>
                <p className="mt-1 font-display text-3xl font-bold text-ink-900">{stat.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
                <stat.icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to}>
              <Card hover className="flex h-full flex-col items-center gap-3 p-5 text-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.tone}`}>
                  <action.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-ink-800">{action.label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Documents */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Recent Documents</h2>
          <Link to="/documents">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
              View All
            </Button>
          </Link>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <LoadingState message="Loading your documents..." />
          ) : error ? (
            <ErrorState
              title="Couldn't load documents"
              message="There was a problem loading your documents. Please try again."
              onRetry={() => window.location.reload()}
            />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No documents yet"
              description="Upload your first legal PDF to get started with AI-powered analysis."
              action={
                <Link to="/documents">
                  <Button leftIcon={<Upload className="h-4 w-4" />}>Upload Document</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Document
                    </th>
                    <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 sm:table-cell">
                      Type
                    </th>
                    <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 md:table-cell">
                      Uploaded
                    </th>
                    <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400 sm:table-cell">
                      Pages
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {documents.slice(0, 5).map((doc) => (
                    <tr key={doc.id} className="group transition-colors hover:bg-ink-50/50">
                      <td className="px-5 py-3.5">
                        <Link to={`/documents/${doc.id}`} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-ink-800 group-hover:text-brand-600">
                            {doc.name}
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-5 py-3.5 text-sm text-ink-500 sm:table-cell">{doc.type}</td>
                      <td className="hidden px-5 py-3.5 text-sm text-ink-500 md:table-cell">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="hidden px-5 py-3.5 text-sm text-ink-500 sm:table-cell">{doc.pages}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/documents/${doc.id}`}>
                            <button className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          <button className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-error-50 hover:text-error-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Disclaimer variant="inline" />
    </div>
  );
}
