export type DocStatus = 'analysed' | 'processing' | 'failed';

export interface LegalDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  pages: number;
  size: string;
  status: DocStatus;
}

export type AgentType = 'legal_qa' | 'summary' | 'draft' | 'voice';

export interface SourceCitation {
  document: string;
  page: number;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType;
  sources?: SourceCitation[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  documentId?: string;
  documentName: string;
  agent?: AgentType;
  messages: ChatMessage[];
  lastActive: string;
}

export interface Summary {
  id: string;
  documentName: string;
  generatedAt: string;
  preview: string;
  sections: SummarySection[];
}

export interface SummarySection {
  id: string;
  title: string;
  content: string;
}

export type DraftType =
  | 'legal_notice'
  | 'agreement'
  | 'formal_letter'
  | 'contract_clause'
  | 'response_letter'
  | 'other';

export interface Draft {
  id: string;
  type: DraftType;
  title: string;
  context: string;
  relatedDocument?: string;
  content: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  organisation: string;
}

export interface DashboardStats {
  documentsAnalysed: number;
  conversations: number;
  summaries: number;
  drafts: number;
}
