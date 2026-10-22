import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface DisclaimerProps {
  variant?: 'banner' | 'inline' | 'compact';
  className?: string;
}

export default function Disclaimer({ variant = 'inline', className = '' }: DisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div className={`flex items-center gap-2.5 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 ${className}`}>
        <ShieldAlert className="h-4 w-4 shrink-0 text-warning-600" />
        <p className="text-sm text-warning-800">
          LegalGenie provides general legal information and drafting assistance only. It is not a
          lawyer and does not replace advice from a qualified legal professional.
        </p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <p className={`flex items-center gap-1.5 text-xs text-ink-400 ${className}`}>
        <Info className="h-3.5 w-3.5 shrink-0" />
        LegalGenie is not a substitute for professional legal advice.
      </p>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 ${className}`}>
      <AlertTriangle className="h-4 w-4 shrink-0 text-ink-400 mt-0.5" />
      <p className="text-sm text-ink-500">
        LegalGenie provides general legal information and drafting assistance only. It does not
        provide professional legal advice. Please consult a qualified lawyer for your specific situation.
      </p>
    </div>
  );
}
