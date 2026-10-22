import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import Disclaimer from '@/components/Disclaimer';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-950 p-12 lg:flex">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -left-10 bottom-20 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-white">
            LegalGenie<span className="text-brand-400"> AI</span>
          </span>
        </Link>

        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            Understand legal documents.
            <br />
            Faster. Smarter.
          </h2>
          <p className="mt-4 max-w-md text-ink-300">
            Upload, analyse, and interact with your legal documents using AI-powered Q&A, summaries,
            drafts, and voice consultation.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Document-grounded AI responses with source citations',
              'Smart summaries of lengthy legal documents',
              'Generate initial legal drafts in seconds',
              'Voice-based legal consultation',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-ink-200">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-ink-400">
          LegalGenie provides general legal information and is not a substitute for professional legal advice.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-600">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">
              LegalGenie<span className="text-brand-600"> AI</span>
            </span>
          </Link>

          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-2 text-sm text-ink-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6">
            <Disclaimer variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
}
