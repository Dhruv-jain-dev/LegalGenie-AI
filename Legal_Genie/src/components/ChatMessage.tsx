import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '@/types';
import { normalizeMarkdown } from '@/lib/normalizeMarkdown';
import AgentBadge from './AgentBadge';
import SourceCitation from './SourceCitation';
import UserAvatar from './UserAvatar';

interface ChatMessageProps {
  message: ChatMessageType;
  user: { name: string };
}

export default function ChatMessage({ message, user }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3 animate-fade-in">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-3 text-sm leading-relaxed text-white shadow-soft">
          {message.content}
        </div>
        <UserAvatar name={user.name} size="sm" className="mt-0.5" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600">
        <User className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[80%] space-y-2">
        {message.agent && <AgentBadge agent={message.agent} />}
        <div className="break-words rounded-2xl rounded-tl-sm border border-ink-100 bg-white px-4 py-3 text-sm leading-7 text-ink-700 shadow-soft">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mb-3 mt-1 font-display text-xl font-bold leading-tight text-ink-900">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-2 mt-5 font-display text-lg font-bold leading-tight text-ink-900">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 mt-4 font-display text-base font-bold leading-tight text-ink-900">{children}</h3>,
              p: ({ children }) => <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>,
              ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-brand-500">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-brand-600">{children}</ol>,
              li: ({ children }) => <li className="pl-1 [&>ul]:mb-0 [&>ul]:mt-1 [&>ol]:mb-0 [&>ol]:mt-1">{children}</li>,
              hr: () => <hr className="my-4 border-0 border-t border-ink-100" />,
              strong: ({ children }) => <strong className="font-semibold text-ink-900">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="break-words font-medium text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700">{children}</a>,
              code: ({ children, className, node, ...props }) => {
                const isBlock = node?.position?.start.line !== node?.position?.end.line;
                return isBlock
                  ? <code {...props} className={`${className || ''} block overflow-x-auto rounded-lg bg-ink-900 p-3 font-mono text-xs leading-6 text-ink-50`}>{children}</code>
                  : <code {...props} className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[0.8em] text-ink-800">{children}</code>;
              },
              pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-lg bg-ink-900">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-brand-300 pl-3 text-ink-600">{children}</blockquote>,
              table: ({ children }) => <div className="mb-3 overflow-x-auto"><table className="w-full border-collapse text-left text-xs">{children}</table></div>,
              th: ({ children }) => <th className="border border-ink-200 bg-ink-50 px-2 py-1.5 font-semibold text-ink-900">{children}</th>,
              td: ({ children }) => <td className="border border-ink-200 px-2 py-1.5 align-top">{children}</td>,
            }}
          >
            {normalizeMarkdown(message.content)}
          </ReactMarkdown>
        </div>
        {message.sources && message.sources.length > 0 && <SourceCitation sources={message.sources} />}
      </div>
    </div>
  );
}
