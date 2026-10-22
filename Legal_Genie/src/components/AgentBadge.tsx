import { Bot, FileText, FilePenLine, Mic } from 'lucide-react';
import type { AgentType } from '@/types';

interface AgentBadgeProps {
  agent: AgentType;
  className?: string;
}

const config: Record<AgentType, { label: string; icon: typeof Bot; tone: string }> = {
  legal_qa: { label: 'Legal Q&A', icon: Bot, tone: 'bg-brand-50 text-brand-700 border-brand-100' },
  summary: { label: 'Summary', icon: FileText, tone: 'bg-accent-50 text-accent-700 border-accent-100' },
  draft: { label: 'Draft', icon: FilePenLine, tone: 'bg-success-50 text-success-700 border-success-100' },
  voice: { label: 'Voice', icon: Mic, tone: 'bg-warning-50 text-warning-700 border-warning-100' },
};

export default function AgentBadge({ agent, className = '' }: AgentBadgeProps) {
  const { label, icon: Icon, tone } = config[agent];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      AI Agent · {label}
    </span>
  );
}
