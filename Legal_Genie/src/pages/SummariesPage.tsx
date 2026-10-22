import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileBarChart,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';
import Disclaimer from '@/components/Disclaimer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { summaryService, documentService } from '@/services';
import type { LegalDocument, Summary } from '@/types';
import { formatDate } from '@/lib/utils';
import { normalizeMarkdown } from '@/lib/normalizeMarkdown';

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selected, setSelected] = useState<Summary | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    summaryService.getSummaries().then(setSummaries).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Your summaries could not be loaded.');
    }).finally(() => setLoading(false));
    documentService.getDocuments().then((docs) => {
      const ready = docs.filter((doc) => doc.status === 'analysed');
      setDocuments(ready); setDocumentId(ready[0]?.id || '');
    }).catch(() => undefined);
  }, []);

  const generate = async () => {
    if (!documentId || generating) return;
    setError(''); setGenerating(true);
    try {
      const summary = await summaryService.generateSummary(documentId);
      setSummaries((items) => [summary, ...items]);
      handleOpen(summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'LegalGenie could not generate this summary.');
    } finally { setGenerating(false); }
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpen = (summary: Summary) => {
    setSelected(summary);
    setOpenSections(new Set(summary.sections.map((s) => s.id)));
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => setSelected(null)}
        >
          Back to Summaries
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
              <FileBarChart className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
                {selected.documentName}
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Generated on {formatDate(selected.generatedAt)}
              </p>
            </div>
          </div>
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
            Download
          </Button>
        </div>

        <div className="space-y-3">
          {selected.sections.map((section) => {
            const isOpen = openSections.has(section.id);
            return (
              <Card key={section.id} className="overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-ink-50/50"
                >
                  <span className="font-display text-base font-bold text-ink-900">
                    {section.title}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-ink-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-ink-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-ink-50 px-5 py-4">
                    <div className="break-words text-sm leading-7 text-ink-600 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li>ul]:mb-0 [&_li>ul]:mt-1 [&_li>ol]:mb-0 [&_li>ol]:mt-1 [&_strong]:font-semibold [&_strong]:text-ink-900 [&_a]:text-brand-600 [&_a]:underline [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-ink-200 [&_th]:bg-ink-50 [&_th]:px-2 [&_th]:py-1.5 [&_td]:border [&_td]:border-ink-200 [&_td]:px-2 [&_td]:py-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeMarkdown(section.content)}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <Disclaimer variant="inline" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Document Summaries
        </h1>
        <p className="mt-1 text-ink-500">
          AI-generated summaries of your legal documents with key terms, obligations, and risks.
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-800">
          <option value="">Select an analysed document</option>
          {documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
        </select>
        <Button onClick={generate} loading={generating} disabled={!documentId || generating} leftIcon={!generating ? <Sparkles className="h-4 w-4" /> : undefined}>
          {generating ? 'Generating...' : 'Generate Summary'}
        </Button>
      </Card>
      {error && <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}

      {loading ? (
        <LoadingState message="Loading summaries..." />
      ) : summaries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileBarChart className="h-8 w-8" />}
            title="No summaries yet"
            description="Open a document and generate a summary to see it here."
            action={
              <Link to="/documents">
                <Button leftIcon={<FileText className="h-4 w-4" />}>Browse Documents</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <Card key={summary.id} hover className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                  <FileBarChart className="h-5 w-5" />
                </div>
                <Badge tone="accent">
                  <Sparkles className="h-3 w-3" />
                  AI Summary
                </Badge>
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-ink-900">
                {summary.documentName}
              </h3>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-400">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(summary.generatedAt)}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-500 line-clamp-3">
                {summary.preview}
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-ink-50 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => handleOpen(summary)}
                >
                  Open
                </Button>
                <button className="rounded-lg border border-ink-200 p-2.5 text-ink-400 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-ink-600">
                  <Download className="h-4 w-4" />
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
