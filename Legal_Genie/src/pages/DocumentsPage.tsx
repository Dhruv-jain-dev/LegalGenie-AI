import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  Upload,
  Eye,
  Trash2,
  FileWarning,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import StatusBadge from '@/components/StatusBadge';
import UploadZone from '@/components/UploadZone';
import ProcessingStatus from '@/components/ProcessingStatus';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import Disclaimer from '@/components/Disclaimer';
import { documentService } from '@/services';
import type { LegalDocument, DocStatus } from '@/types';
import { formatDate } from '@/lib/utils';

const processingSteps = [
  'Uploading...',
  'Extracting text...',
  'Creating document chunks...',
  'Building search index...',
  'Analysis complete',
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [uploading, setUploading] = useState(false);
  const [processStep, setProcessStep] = useState(0);

  useEffect(() => {
    documentService
      .getDocuments()
      .then((docs) => {
        setDocuments(docs);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProcessStep(0);
    const stepInterval = setInterval(() => {
      setProcessStep((s) => {
        if (s >= processingSteps.length - 1) {
          clearInterval(stepInterval);
          return s;
        }
        return s + 1;
      });
    }, 600);

    try {
      await documentService.uploadDocument(file);
      clearInterval(stepInterval);
      setProcessStep(processingSteps.length);
      setDocuments(await documentService.getDocuments());
      setTimeout(() => { setUploading(false); setProcessStep(0); }, 1200);
    } catch {
      clearInterval(stepInterval);
      setError(true); setUploading(false); setProcessStep(0);
    }
  };

  const handleDelete = async (id: string) => {
    await documentService.deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const filtered = documents
    .filter((d) => (statusFilter === 'all' ? true : d.status === statusFilter))
    .filter((d) => (search ? d.name.toLowerCase().includes(search.toLowerCase()) : true))
    .sort((a, b) =>
      sortBy === 'date'
        ? new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        : a.name.localeCompare(b.name),
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Document Library
        </h1>
        <p className="mt-1 text-ink-500">Upload, analyse and manage your legal documents.</p>
      </div>

      {/* Upload Zone */}
      <Card className="p-6">
        {uploading ? (
          <ProcessingStatus step={processStep} steps={processingSteps} />
        ) : (
          <UploadZone onUpload={handleUpload} />
        )}
      </Card>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DocStatus | 'all')}
              className="appearance-none rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-8 text-sm text-ink-700 transition-colors focus:border-brand-400 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="analysed">Analysed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <button
            onClick={() => setSortBy((s) => (s === 'date' ? 'name' : 'date'))}
            className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <ArrowUpDown className="h-4 w-4 text-ink-400" />
            {sortBy === 'date' ? 'Date' : 'Name'}
          </button>

          <Button leftIcon={<Upload className="h-4 w-4" />} size="sm">
            Upload
          </Button>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <LoadingState message="Loading your documents..." />
      ) : error ? (
        <ErrorState
          title="Couldn't load documents"
          message="There was a problem loading your documents. Please try again."
          onRetry={() => window.location.reload()}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileWarning className="h-8 w-8" />}
            title="No matching documents found"
            description="Try adjusting your search or filter, or upload a new document."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <Card key={doc.id} hover className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <FileText className="h-5 w-5" />
                </div>
                <StatusBadge status={doc.status} />
              </div>

              <Link to={`/documents/${doc.id}`} className="mt-4">
                <h3 className="font-display text-base font-bold text-ink-900 hover:text-brand-600">
                  {doc.name}
                </h3>
              </Link>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{doc.type}</Badge>
                <Badge tone="neutral">{doc.pages} pages</Badge>
                <Badge tone="neutral">{doc.size}</Badge>
              </div>

              <p className="mt-2 text-xs text-ink-400">Uploaded {formatDate(doc.uploadedAt)}</p>

              <div className="mt-4 flex items-center gap-2 border-t border-ink-50 pt-4">
                <Link to={`/documents/${doc.id}`} className="flex-1">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<Eye className="h-4 w-4" />}>
                    Open
                  </Button>
                </Link>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="rounded-lg border border-ink-200 p-2.5 text-ink-400 transition-colors hover:border-error-200 hover:bg-error-50 hover:text-error-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Disclaimer variant="inline" />
    </div>
  );
}
