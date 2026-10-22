import { useState, type KeyboardEvent } from 'react';
import { Paperclip, Mic, Send, Loader2, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onVoiceToggle?: () => void;
  voiceActive?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

const suggestions = [
  'Summarize this document',
  'What are my obligations?',
  'Identify potential risks',
  'Explain the termination clause',
  'What important dates should I know?',
];

export default function ChatInput({
  onSend,
  onVoiceToggle,
  voiceActive = false,
  loading = false,
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const send = () => {
    if (!text.trim() || loading || disabled) return;
    onSend(text.trim());
    setText('');
    setShowSuggestions(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-ink-100 bg-white px-4 py-4">
      {/* Suggestions */}
      {showSuggestions && (
        <div className="mb-3 flex flex-wrap gap-2 animate-fade-in">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setText(s);
                setShowSuggestions(false);
              }}
              className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach */}
        <button
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600 disabled:opacity-50"
          aria-label="Attach document"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setShowSuggestions(true)}
            disabled={disabled}
            rows={1}
            placeholder="Ask anything about your legal document..."
            className="w-full resize-none rounded-xl border border-ink-200 bg-ink-50/50 px-4 py-2.5 pr-12 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
            style={{ minHeight: '42px', maxHeight: '160px' }}
          />
        </div>

        {/* Mic */}
        {onVoiceToggle && (
          <button
            onClick={onVoiceToggle}
            disabled={disabled}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 ${
              voiceActive
                ? 'bg-error-50 text-error-600'
                : 'text-ink-400 hover:bg-ink-100 hover:text-ink-600'
            }`}
            aria-label="Voice input"
          >
            {voiceActive ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        {/* Send */}
        <button
          onClick={send}
          disabled={!text.trim() || loading || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-400"
          aria-label="Send"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
