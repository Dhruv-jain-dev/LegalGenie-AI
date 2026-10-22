import { FileText } from 'lucide-react';
import type { SourceCitation } from '@/types';

interface SourceCitationProps {
  sources: SourceCitation[];
  className?: string;
}

export default function SourceCitation({ sources, className = '' }: SourceCitationProps) {
  if (!sources.length) return null;
  return (
    <div className={`mt-3 rounded-lg bg-ink-50 px-3 py-2 ${className}`}>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs text-ink-600 border border-ink-100"
          >
            <FileText className="h-3 w-3 text-brand-500" />
            {s.document} · Page {s.page}
          </span>
        ))}
      </div>
    </div>
  );
}
