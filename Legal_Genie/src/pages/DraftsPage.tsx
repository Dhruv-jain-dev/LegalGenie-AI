import { useEffect, useState } from 'react';
import {
  FilePenLine,
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  Save,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Disclaimer from '@/components/Disclaimer';
import LoadingState from '@/components/LoadingState';
import { draftService, documentService } from '@/services';
import type { Draft, DraftType, LegalDocument } from '@/types';

const draftTypes: { value: DraftType; label: string }[] = [
  { value: 'legal_notice', label: 'Legal Notice' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'formal_letter', label: 'Formal Letter' },
  { value: 'contract_clause', label: 'Contract Clause' },
  { value: 'response_letter', label: 'Response Letter' },
  { value: 'other', label: 'Other' },
];

export default function DraftsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [draftType, setDraftType] = useState<DraftType>('legal_notice');
  const [context, setContext] = useState('');
  const [relatedDoc, setRelatedDoc] = useState('');
  const [instructions, setInstructions] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    documentService.getDocuments().then((docs) => {
      setDocuments(docs.filter((d) => d.status === 'analysed'));
      setLoading(false);
    });
  }, []);

  const handleGenerate = async () => {
    if (!context.trim()) return;
    setGenerating(true);
    setDraft(null);
    try {
      const result = await draftService.generateDraft(
        draftType,
        context,
        relatedDoc || undefined,
        instructions || undefined,
      );
      setDraft(result);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingState message="Loading drafts..." />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Drafting Assistant
        </h1>
        <p className="mt-1 text-ink-500">
          Generate initial legal drafts, notices, and clauses with AI assistance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card className="p-6">
          <h2 className="mb-5 font-display text-lg font-bold text-ink-900">Draft Details</h2>
          <div className="space-y-5">
            {/* Draft Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Draft Type</label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as DraftType)}
                className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {draftTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Context */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Context</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={5}
                placeholder="Describe what you need the draft for..."
                className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* Related Document */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Related Document
              </label>
              <select
                value={relatedDoc}
                onChange={(e) => setRelatedDoc(e.target.value)}
                className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="">None</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Instructions */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Additional Instructions
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="Add any specific terms, clauses, or formatting requirements..."
                className="w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <Button
              fullWidth
              size="lg"
              loading={generating}
              disabled={!context.trim()}
              leftIcon={!generating ? <Sparkles className="h-4 w-4" /> : undefined}
              onClick={handleGenerate}
            >
              {generating ? 'Preparing your draft...' : 'Generate Draft'}
            </Button>
          </div>
        </Card>

        {/* Draft Editor */}
        <Card className="flex flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink-900">Generated Draft</h2>
            {draft && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  title="Copy"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  title="Regenerate"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  title="Save Draft"
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {generating ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
              <p className="mt-4 text-sm font-medium text-ink-500">Preparing your draft...</p>
            </div>
          ) : !draft ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-50 text-ink-300">
                <FilePenLine className="h-8 w-8" />
              </div>
              <h3 className="font-display text-base font-bold text-ink-800">No draft yet</h3>
              <p className="mt-1.5 max-w-xs text-sm text-ink-500">
                Fill in the details and click "Generate Draft" to create your legal document.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              {/* Warning */}
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600 mt-0.5" />
                <p className="text-sm text-warning-800">
                  Review this draft with a qualified lawyer before using it for a legal matter.
                </p>
              </div>

              {/* Draft Content */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-ink-100 bg-ink-50/30 p-5">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-700">
                  {draft.content}
                </pre>
              </div>

              <Disclaimer variant="compact" className="mt-3" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
