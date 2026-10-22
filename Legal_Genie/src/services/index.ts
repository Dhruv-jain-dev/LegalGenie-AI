import type { Conversation, Draft, DraftType, LegalDocument, Summary, User } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const TOKEN_KEY = 'legalgenie_access_token';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function token() { return localStorage.getItem(TOKEN_KEY); }
function setToken(value: string | null) {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const accessToken = token();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) setToken(null);
    throw new ApiError(body.detail || 'The request could not be completed.', response.status);
  }
  return body as T;
}

type AuthResponse = { user: User; accessToken: string };
type ChatResponse = { content: string; sources: { document: string; page: number; snippet?: string }[] };
type VoiceResponse = ChatResponse & { transcript: string };

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const result = await request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(result.accessToken); return result.user;
  },
  async signup(name: string, email: string, organisation: string, password: string): Promise<User> {
    const result = await request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, organisation, password }) });
    setToken(result.accessToken); return result.user;
  },
  profile: () => request<User>('/profile'),
  updateProfile: (user: Pick<User, 'name' | 'email' | 'organisation'>) => request<User>('/profile', { method: 'PUT', body: JSON.stringify(user) }),
  logout: () => setToken(null),
  hasSession: () => Boolean(token()),
};

export const documentService = {
  getDocuments: () => request<LegalDocument[]>('/documents'),
  getDocument: (id: string) => request<LegalDocument>(`/documents/${id}`),
  async uploadDocument(file: File): Promise<LegalDocument> {
    const form = new FormData(); form.append('file', file);
    return request<LegalDocument>('/documents/upload', { method: 'POST', body: form });
  },
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),
  async downloadDocument(id: string, filename: string): Promise<void> {
    const headers = new Headers(); if (token()) headers.set('Authorization', `Bearer ${token()}`);
    const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, { headers });
    if (!response.ok) throw new ApiError('Download failed.', response.status);
    const url = URL.createObjectURL(await response.blob());
    const anchor = Object.assign(document.createElement('a'), { href: url, download: filename });
    anchor.click(); URL.revokeObjectURL(url);
  },
};

export const chatService = {
  getConversations: () => request<Conversation[]>('/conversations'),
  async getConversation(id: string): Promise<Conversation | undefined> { return (await request<Conversation[]>('/conversations')).find((conversation) => conversation.id === id); },
  askQuestion: (conversationId: string, question: string) => request<ChatResponse>(`/conversations/${conversationId}/question`, { method: 'POST', body: JSON.stringify({ question }) }),
  createConversation: (title: string, documentId?: string) => request<Conversation>('/conversations', { method: 'POST', body: JSON.stringify({ title, document_id: documentId || null }) }),
  deleteConversation: (id: string) => request<void>(`/conversations/${id}`, { method: 'DELETE' }),
};

export const summaryService = {
  getSummaries: () => request<Summary[]>('/summaries'),
  generateSummary: (documentId: string) => request<Summary>('/summaries', { method: 'POST', body: JSON.stringify({ document_id: documentId }) }),
};

export const draftService = {
  getDrafts: () => request<Draft[]>('/drafts'),
  generateDraft: (type: DraftType, context: string, relatedDocumentId?: string, additionalInstructions?: string) => request<Draft>('/drafts', { method: 'POST', body: JSON.stringify({ type, context, related_document_id: relatedDocumentId || null, additional_instructions: additionalInstructions || '' }) }),
};

export const voiceService = {
  startSession: (documentId: string, conversationId: string) => request<{ sessionId: string }>('/voice/sessions', { method: 'POST', body: JSON.stringify({ document_id: documentId, conversation_id: conversationId }) }),
  async sendAudio(voiceSessionId: string, audio: Blob): Promise<VoiceResponse> {
    const contentType = audio.type.split(';', 1)[0].toLowerCase();
    const extension = ({ 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/opus': 'opus', 'audio/mp4': 'mp4' } as Record<string, string>)[contentType];
    if (!extension) throw new ApiError('This browser produced an unsupported recording format. Use a browser that records WebM, Ogg, or MP4 audio.', 422);
    const filename = `voice-question.${extension}`;
    console.info('[LegalGenie voice] audio upload metadata', { contentType, filename, byteLength: audio.size });
    const form = new FormData(); form.append('file', audio, filename);
    return request<VoiceResponse>(`/voice/sessions/${voiceSessionId}/audio`, { method: 'POST', body: form });
  },
};
