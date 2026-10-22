import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileSearch,
  MessageSquareText,
  FileBarChart,
  FilePenLine,
  Mic,
  History,
  Upload,
  Search,
  Sparkles,
  ShieldCheck,
  Lock,
  Eye,
  Cpu,
  Scale,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Disclaimer from '@/components/Disclaimer';

const features = [
  {
    icon: FileSearch,
    title: 'Document Intelligence',
    description: 'Upload and analyse legal PDFs with AI-powered text extraction and indexing.',
  },
  {
    icon: MessageSquareText,
    title: 'AI Legal Q&A',
    description: 'Ask questions and receive answers grounded in your uploaded documents.',
  },
  {
    icon: FileBarChart,
    title: 'Smart Summaries',
    description: 'Turn lengthy legal documents into understandable, structured summaries.',
  },
  {
    icon: FilePenLine,
    title: 'Drafting Assistant',
    description: 'Generate initial notices, agreements, letters and clauses in seconds.',
  },
  {
    icon: Mic,
    title: 'Voice Consultation',
    description: 'Speak naturally and receive AI-generated general legal information.',
  },
  {
    icon: History,
    title: 'Conversation History',
    description: 'Continue previous legal discussions from your workspace anytime.',
  },
];

const steps = [
  { num: '01', title: 'Upload', description: 'Upload a legal PDF to your private workspace.', icon: Upload },
  { num: '02', title: 'Analyse', description: 'LegalGenie extracts and indexes the document.', icon: Search },
  { num: '03', title: 'Ask', description: 'Ask questions or request summaries and drafts.', icon: Sparkles },
  { num: '04', title: 'Understand', description: 'Receive AI-generated, document-grounded responses.', icon: FileSearch },
];

const securityItems = [
  { icon: Lock, title: 'Private Workspace', description: 'Your documents stay within your workspace.' },
  { icon: ShieldCheck, title: 'Secure Storage', description: 'Documents are stored with controlled access.' },
  { icon: Eye, title: 'Controlled Access', description: 'Only you can access your uploaded documents.' },
  { icon: Cpu, title: 'AI-Assisted Analysis', description: 'AI processes your documents to provide insights.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-brand-50/40 via-transparent to-transparent" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-accent-200/20 blur-3xl" />
        <div className="absolute left-10 top-40 h-64 w-64 rounded-full bg-brand-200/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              AI-Powered Legal Document Assistant
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl animate-slide-up">
              Understand Legal Documents.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
                Faster. Smarter.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-500 animate-slide-up">
              Upload legal documents, ask questions, generate summaries, prepare drafts, and interact
              with your documents using AI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-slide-up">
              <Link to="/signup">
                <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start Using LegalGenie
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg">
                  See How It Works
                </Button>
              </a>
            </div>
            <div className="mt-6">
              <Disclaimer variant="compact" className="justify-center" />
            </div>
          </div>

          {/* Product Mockup */}
          <div className="mx-auto mt-16 max-w-5xl animate-slide-up">
            <div className="rounded-2xl border border-ink-100 bg-white shadow-lift overflow-hidden">
              <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-error-300" />
                  <div className="h-3 w-3 rounded-full bg-warning-300" />
                  <div className="h-3 w-3 rounded-full bg-success-300" />
                </div>
                <div className="ml-3 flex items-center gap-2 text-xs text-ink-400">
                  <Scale className="h-3.5 w-3.5" />
                  legalgenie.ai/workspace
                </div>
              </div>
              <div className="flex h-[400px]">
                {/* Mini sidebar */}
                <div className="hidden w-48 shrink-0 border-r border-ink-100 bg-ink-50/50 p-3 sm:block">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-600 to-accent-600" />
                    <span className="font-display text-sm font-bold text-ink-900">LegalGenie</span>
                  </div>
                  <div className="space-y-1">
                    {['Dashboard', 'Documents', 'Chat', 'Summaries', 'Drafts'].map((item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                          i === 2 ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-500'
                        }`}
                      >
                        <div className={`h-3 w-3 rounded ${i === 2 ? 'bg-brand-500' : 'bg-ink-200'}`} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Chat mockup */}
                <div className="flex-1 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success-500" />
                    <span className="text-xs font-medium text-ink-500">Document-grounded AI</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[70%] rounded-xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">
                        What are the termination conditions in this agreement?
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[80%] space-y-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                          <Sparkles className="h-3 w-3" />
                          AI Agent · Legal Q&A
                        </div>
                        <div className="rounded-xl rounded-bl-sm bg-ink-50 px-3 py-2 text-sm text-ink-700">
                          Based on the uploaded agreement, the termination clause allows either party to
                          end the employment with 30 days written notice...
                        </div>
                        <div className="flex gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-ink-600 border border-ink-100">
                            <FileSearch className="h-3 w-3 text-brand-500" />
                            Employment Agreement.pdf · Page 8
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Everything you need to work with legal documents
            </h2>
            <p className="mt-4 text-lg text-ink-500">
              A complete AI-powered toolkit for document analysis, Q&A, summaries, drafting, and voice.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} hover className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <feature.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="font-display text-lg font-bold text-ink-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-ink-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-ink-500">
              From upload to understanding in four simple steps.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[60%] top-8 hidden h-px w-full bg-ink-200 md:block" />
                )}
                <div className="relative flex flex-col items-center text-center md:items-start">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-soft border border-ink-100">
                    <step.icon className="h-7 w-7 text-brand-600" strokeWidth={2} />
                  </div>
                  <span className="mt-4 font-display text-sm font-bold text-brand-600">{step.num}</span>
                  <h3 className="mt-1 font-display text-lg font-bold text-ink-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/signup">
              <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              Your documents stay within your workspace
            </h2>
            <p className="mt-4 text-lg text-ink-500">
              We take document privacy seriously and provide controlled access to your legal materials.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {securityItems.map((item) => (
              <Card key={item.title} className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success-50 text-success-600">
                  <item.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="font-display text-base font-bold text-ink-900">{item.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About / CTA */}
      <section id="about" className="bg-ink-950 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for legal professionals and teams
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-300">
            LegalGenie AI combines document intelligence, AI Q&A, smart summaries, drafting assistance,
            and voice consultation into a single, professional workspace.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup">
              <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Create Your Workspace
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="border-ink-700 text-white hover:bg-ink-900 hover:border-ink-600">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="mt-8">
            <Disclaimer variant="compact" className="justify-center text-ink-400" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-600">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-sm font-bold text-ink-900">LegalGenie AI</span>
          </div>
          <p className="text-xs text-ink-400">
            LegalGenie provides general legal information and is not a substitute for professional legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
