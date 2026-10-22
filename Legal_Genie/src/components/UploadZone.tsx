import { useState, type DragEvent } from 'react';
import { UploadCloud, FileText, AlertCircle, X } from 'lucide-react';
import Disclaimer from './Disclaimer';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  compact?: boolean;
}

export default function UploadZone({ onUpload, compact = false }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds the 10 MB maximum size.');
      return;
    }
    onUpload(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  if (compact) {
    return (
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
            dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-200 bg-ink-50/50'
          }`}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-ink-400" />
          <p className="mt-2 text-sm text-ink-600">
            Drag & drop or{' '}
            <label className="cursor-pointer font-semibold text-brand-600 hover:text-brand-700">
              browse
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          </p>
        </div>
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-error-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 sm:p-16 ${
          dragging ? 'border-brand-400 bg-brand-50 scale-[1.01]' : 'border-ink-200 bg-ink-50/50'
        }`}
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-soft">
          <UploadCloud className="h-8 w-8 text-brand-500" />
        </div>
        <p className="font-display text-lg font-bold text-ink-900">
          Drag & drop your legal PDF here
        </p>
        <p className="mt-1.5 text-sm text-ink-500">
          or click to browse files from your computer
        </p>
        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-700">
          <FileText className="h-4 w-4" />
          Browse Files
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-400">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> PDF support
        </span>
        <span>Max file size: 10 MB</span>
        <span className="flex items-center gap-1.5">
          <Disclaimer variant="compact" />
        </span>
      </div>
    </div>
  );
}
