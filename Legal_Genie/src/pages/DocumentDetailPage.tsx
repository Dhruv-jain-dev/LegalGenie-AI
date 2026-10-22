import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  FileBarChart,
  FilePenLine,
  Download,
  Trash2,
  Calendar,
  FileStack,
  HardDrive,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import StatusBadge from '@/components/StatusBadge';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import Disclaimer from '@/components/Disclaimer';
import { documentService, chatService } from '@/services';
import type { LegalDocument } from '@/types';
import { formatDate } from '@/lib/utils';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    documentService
      .getDocument(id)
      .then((d) => {
        if (d) setDoc(d);
        else setError(true);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  const handleAsk = async () => {
    if (!doc) return;
    const conv = await chatService.createConversation(`${doc.name} Review`, doc.id);
    navigate(`/chat/${conv.id}`);
  };

  const handleDelete = async () => {
    if (!doc) return;
    await documentService.deleteDocument(doc.id);
    navigate('/documents');
  };

  const handleDownload = async () => {
    if (doc) await documentService.downloadDocument(doc.id, doc.name);
  };

  if (loading)
    return <LoadingState message="Loading document..." className="pt-20" />;
  if (error || !doc)
    return (
      <ErrorState
        title="Document not found"
        message="This document may have been deleted or is no longer available."
        className="pt-20"
      />
    );

  const info = [
    { label: 'File Name', value: doc.name, icon: FileText },
    { label: 'Upload Date', value: formatDate(doc.uploadedAt), icon: Calendar },
    { label: 'Pages', value: `${doc.pages} pages`, icon: FileStack },
    { label: 'File Size', value: doc.size, icon: HardDrive },
    { label: 'Processing Status', value: doc.status === 'analysed' ? 'Analysed' : doc.status, icon: CheckCircle2 },
  ];

  const actions = [
    {
      title: 'Ask LegalGenie',
      description: 'Ask questions about this document.',
      icon: MessageSquare,
      tone: 'bg-brand-50 text-brand-600',
      onClick: handleAsk,
    },
    {
      title: 'Generate Summary',
      description: 'Get a simplified explanation of the document.',
      icon: FileBarChart,
      tone: 'bg-accent-50 text-accent-600',
      onClick: () => navigate('/summaries'),
    },
    {
      title: 'Create Draft',
      description: 'Create legal drafting based on the document.',
      icon: FilePenLine,
      tone: 'bg-success-50 text-success-600',
      onClick: () => navigate('/drafts'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/documents">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Documents
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
              {doc.name}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={doc.status} />
              <Badge tone="neutral">{doc.type}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={handleDownload}>
            Download
          </Button>
          <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Document Info */}
      <Card className="p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-ink-900">Document Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {info.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl bg-ink-50/50 px-4 py-3">
              <item.icon className="h-5 w-5 text-ink-400" />
              <div>
                <p className="text-xs text-ink-400">{item.label}</p>
                <p className="text-sm font-medium text-ink-800 capitalize">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Actions */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-ink-900">
          <Sparkles className="h-5 w-5 text-brand-500" />
          AI Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {actions.map((action) => (
            <Card key={action.title} hover onClick={action.onClick} className="flex flex-col p-6">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${action.tone}`}>
                <action.icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="font-display text-base font-bold text-ink-900">{action.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{action.description}</p>
            </Card>
          ))}
        </div>
      </div>

      <Disclaimer variant="inline" />
    </div>
  );
}
