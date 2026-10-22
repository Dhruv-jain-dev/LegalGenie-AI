import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';

interface LogoProps {
  to?: string;
  compact?: boolean;
  className?: string;
}

export default function Logo({ to = '/', compact = false, className = '' }: LogoProps) {
  return (
    <Link to={to} className={`flex items-center gap-2.5 group ${className}`}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 shadow-glow transition-transform group-hover:scale-105">
        <Scale className="h-5 w-5 text-white" strokeWidth={2.2} />
      </div>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-ink-900">
          LegalGenie
          <span className="text-brand-600"> AI</span>
        </span>
      )}
    </Link>
  );
}
