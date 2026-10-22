import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Loader2, Square, PhoneOff, Sparkles, MessageSquare } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Disclaimer from '@/components/Disclaimer';
import { chatService, documentService, voiceService } from '@/services';
import type { LegalDocument } from '@/types';

type VoiceState = 'idle' | 'listening' | 'processing' | 'responding';

export default function VoicePage() {
  const [state, setState] = useState<VoiceState>('idle');
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [voiceSessionId, setVoiceSessionId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const submittingRef = useRef(false);

  useEffect(() => {
    documentService.getDocuments().then((items) => {
      const ready = items.filter((item) => item.status === 'analysed');
      setDocuments(ready); setDocumentId(ready[0]?.id || '');
    }).catch(() => setError('Your documents could not be loaded.'));
    return () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stopTracks = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };

  const submitAudio = async (audio: Blob, sessionId: string) => {
    if (!sessionId || !audio.size || submittingRef.current) return;
    submittingRef.current = true; setState('processing');
    try {
      const result = await voiceService.sendAudio(sessionId, audio);
      setTranscript(result.transcript); setResponse(result.content); setState('responding');
      if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(result.content));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'LegalGenie could not process this recording.'); setState('idle');
    } finally { submittingRef.current = false; }
  };

  const startRecording = async () => {
    if (!documentId || state === 'listening' || state === 'processing') return;
    setError(''); setTranscript(''); setResponse('');
    try {
      let currentConversationId = conversationId;
      let currentVoiceSessionId = voiceSessionId;
      if (!currentConversationId) {
        const conversation = await chatService.createConversation('Voice Consultation', documentId);
        currentConversationId = conversation.id; setConversationId(conversation.id);
        const voiceSession = await voiceService.startSession(documentId, conversation.id);
        currentVoiceSessionId = voiceSession.sessionId; setVoiceSessionId(voiceSession.sessionId);
      }
      if (!currentVoiceSessionId) throw new Error('Voice session could not be started.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'].find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stopTracks();
        const elapsedMs = performance.now() - recordingStartedAtRef.current;
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        console.info('[LegalGenie voice] recording completed', { recorderMimeType: recorder.mimeType, blobContentType: audio.type, byteLength: audio.size, elapsedMs: Math.round(elapsedMs) });
        if (elapsedMs < 150) { setError('Please record for at least a moment before stopping.'); setState('idle'); }
        else if (audio.size) void submitAudio(audio, currentVoiceSessionId);
        else { setError('No audio was captured. Please try again.'); setState('idle'); }
      };
      recorder.start(250); recordingStartedAtRef.current = performance.now(); setState('listening');
    } catch (cause) {
      stopTracks(); setError(cause instanceof Error && cause.name === 'NotAllowedError' ? 'Microphone permission is required for voice consultation.' : 'Your microphone could not be started.'); setState('idle');
    }
  };

  const stopRecording = () => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); };
  const end = () => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); stopTracks(); window.speechSynthesis?.cancel(); setState('idle'); setTranscript(''); setResponse(''); };
  const cfg = { idle: { label: 'Tap to Speak', color: 'bg-brand-600 hover:bg-brand-700' }, listening: { label: 'Listening...', color: 'bg-error-500' }, processing: { label: 'Transcribing and analysing...', color: 'bg-warning-500' }, responding: { label: 'LegalGenie responded', color: 'bg-accent-600' } }[state];

  return <div className="space-y-8">
    <div><h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Voice Consultation</h1><p className="mt-1 text-ink-500">Speak naturally about an uploaded document. Your voice turns are saved in the linked conversation.</p></div>
    <Card className="flex flex-col items-center px-6 py-12">
      <select value={documentId} onChange={(e) => { setDocumentId(e.target.value); setConversationId(''); setVoiceSessionId(''); }} disabled={state !== 'idle'} className="mb-8 w-full max-w-md rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800">
        <option value="">Select an analysed document</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
      </select>
      <div className="relative">
        {state !== 'idle' && <><span className={`absolute inset-0 rounded-full ${cfg.color} opacity-20 animate-pulse-ring`} /><span className={`absolute inset-0 rounded-full ${cfg.color} opacity-10 animate-pulse-ring`} style={{ animationDelay: '0.6s' }} /></>}
        <button onClick={state === 'listening' ? stopRecording : startRecording} disabled={!documentId || state === 'processing' || submittingRef.current} className={`relative flex h-32 w-32 items-center justify-center rounded-full ${cfg.color} text-white shadow-lift transition-all duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70`}>
          {state === 'processing' ? <Loader2 className="h-12 w-12 animate-spin" /> : state === 'listening' ? <Square className="h-10 w-10" fill="currentColor" /> : <Mic className="h-12 w-12" />}
        </button>
      </div>
      <p className="mt-8 font-display text-lg font-bold text-ink-900">{cfg.label}</p>
      {state === 'listening' && <div className="mt-6 flex h-12 items-center gap-1">{Array.from({ length: 12 }, (_, index) => <span key={index} className="w-1 rounded-full bg-brand-400 animate-wave" style={{ height: '100%', animationDelay: `${index * 0.08}s` }} />)}</div>}
      {error && <div className="mt-6 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
      {transcript && <div className="mt-8 w-full max-w-2xl rounded-2xl border border-ink-100 bg-ink-50/50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">You said</p><p className="mt-2 text-sm leading-relaxed text-ink-700">{transcript}</p></div>}
      {response && <div className="mt-4 w-full max-w-2xl animate-fade-in"><div className="mb-3 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600"><Sparkles className="h-4 w-4 text-white" /></div><span className="text-sm font-semibold text-ink-900">LegalGenie Response</span></div><div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-5"><p className="text-sm leading-relaxed text-ink-700">{response}</p></div></div>}
      {conversationId && <Link to={`/chat/${conversationId}`} className="mt-6"><Button variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />}>View conversation</Button></Link>}
      {(response || state === 'responding') && <Button variant="outline" className="mt-4" leftIcon={<PhoneOff className="h-4 w-4" />} onClick={end}>End Consultation</Button>}
    </Card>
    <Disclaimer variant="inline" />
  </div>;
}
