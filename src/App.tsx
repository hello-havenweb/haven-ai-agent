import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Sparkles,
  Users,
  Info,
  Send,
  Volume2,
  VolumeX,
  Radio,
  RefreshCw,
  Globe2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { VoiceOrb } from './components/VoiceOrb';
import { ConversationView } from './components/ConversationView';
import { LeadsModal } from './components/LeadsModal';
import { HavenInfoModal } from './components/HavenInfoModal';
import { AudioRecorder, AudioPlayer } from './utils/audio';
import { ConnectionStatus, ChatMessage, Lead } from './types';

export default function App() {
  // Voice & Connection states
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [mode, setMode] = useState<'live' | 'tts'>('live');

  // Conversation & Transcription
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Leads & Information Modals
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLeadsOpen, setIsLeadsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [hasNewLeadBadge, setHasNewLeadBadge] = useState(false);

  // References for WebSocket and Audio
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const isCallActiveRef = useRef(false);
  const currentModelSpeechRef = useRef('');

  // Show temporary toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch initial leads
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        if (data.leads) setLeads(data.leads);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Clean up audio & socket when unmounting
  useEffect(() => {
    return () => {
      endVoiceCall();
    };
  }, []);

  // Initialize Audio Player
  const getAudioPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new AudioPlayer(
        (vol) => setOutputVolume(isAudioMuted ? 0 : vol),
        (isPlaying) => {
          if (isPlaying) {
            setStatus('speaking');
          } else {
            setStatus((prev) => (prev === 'speaking' ? 'listening' : prev));
          }
        }
      );
    }
    return playerRef.current;
  }, [isAudioMuted]);

  // Start Live WebSocket Call
  const startLiveVoiceCall = async () => {
    try {
      setStatus('connecting');
      const player = getAudioPlayer();
      player.stopAll();

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('WebSocket connected to /ws/live');
        setStatus('connected');
        isCallActiveRef.current = true;

        // Start Microphone Recorder
        try {
          const recorder = new AudioRecorder();
          recorderRef.current = recorder;

          await recorder.start(
            (base64Chunk) => {
              if (ws.readyState === WebSocket.OPEN && !isMuted) {
                ws.send(
                  JSON.stringify({
                    type: 'audio',
                    audio: base64Chunk,
                  })
                );
              }
            },
            (vol) => {
              setInputVolume(vol);
            }
          );

          setStatus('listening');
          // Request initial greeting from voice agent
          ws.send(JSON.stringify({ type: 'initial_greeting' }));
        } catch (micErr: any) {
          console.warn('Microphone permission or hardware issue:', micErr);
          showToast('Mic access optional: you can also type messages while listening.');
          setStatus('listening');
          // Still trigger greeting
          ws.send(JSON.stringify({ type: 'initial_greeting' }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'audio' && data.audio) {
            if (!isAudioMuted) {
              player.playChunk(data.audio);
            }
          } else if (data.type === 'model_transcript') {
            const chunk = data.text || '';
            currentModelSpeechRef.current += chunk;
            setStreamingTranscript(currentModelSpeechRef.current);
          } else if (data.type === 'interrupted') {
            player.stopAll();
            currentModelSpeechRef.current = '';
            setStreamingTranscript('');
          } else if (data.type === 'turn_complete') {
            if (currentModelSpeechRef.current.trim()) {
              const newMsg: ChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: currentModelSpeechRef.current.trim(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              setMessages((prev) => [...prev, newMsg]);
              currentModelSpeechRef.current = '';
              setStreamingTranscript('');
            }
            setStatus('listening');
          } else if (data.type === 'lead_recorded' && data.lead) {
            setLeads((prev) => [data.lead, ...prev.filter((l) => l.id !== data.lead.id)]);
            setHasNewLeadBadge(true);
            showToast(`Lead captured: ${data.lead.name} (${data.lead.projectType || 'Custom Website'})`);
          } else if (data.type === 'error') {
            console.error('Live socket error event:', data.error);
            showToast(data.error);
          }
        } catch (parseErr) {
          console.error('Error parsing live WS message:', parseErr);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        setStatus('error');
        showToast('Connection to Live API failed. Switching to standard voice.');
        setMode('tts');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        if (isCallActiveRef.current) {
          endVoiceCall();
        }
      };
    } catch (err: any) {
      console.error('Failed to start live voice session:', err);
      setStatus('error');
      showToast('Live session failed to start: ' + (err?.message || 'Unknown error'));
    }
  };

  // End Voice Call
  const endVoiceCall = () => {
    isCallActiveRef.current = false;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stopAll();
    }
    setStatus('idle');
    setInputVolume(0);
    setOutputVolume(0);
    setStreamingTranscript('');
    currentModelSpeechRef.current = '';
  };

  // Toggle call on/off
  const toggleCall = () => {
    if (status === 'idle' || status === 'error') {
      startLiveVoiceCall();
    } else {
      endVoiceCall();
    }
  };

  // Send a text message (works in both Live Mode and Fallback Mode)
  const handleSendMessage = async (text: string) => {
    const query = text.trim();
    if (!query) return;

    // Add user message to transcript
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput('');

    // If in Live mode and socket is connected:
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: query }));
    } else {
      // Use fallback /api/chat + /api/tts
      try {
        setStatus('speaking');
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            userMessage: query,
          }),
        });

        const data = await res.json();
        if (data.reply) {
          const aiMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, aiMsg]);

          if (data.lead) {
            setLeads((prev) => [data.lead, ...prev]);
            setHasNewLeadBadge(true);
            showToast(`Lead captured: ${data.lead.name}`);
          }

          // Generate spoken audio via TTS if not muted
          if (!isAudioMuted) {
            playTtsAudio(data.reply);
          } else {
            setStatus('idle');
          }
        }
      } catch (err) {
        console.error('Fallback chat error:', err);
        setStatus('idle');
        showToast('Failed to reach HAVEN AI service.');
      }
    }
  };

  // Play TTS audio via /api/tts
  const playTtsAudio = async (text: string) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Zephyr' }),
      });
      if (res.ok) {
        const { audio } = await res.json();
        if (audio) {
          const player = getAudioPlayer();
          player.stopAll();
          player.playChunk(audio);
        }
      }
    } catch (err) {
      console.error('TTS playback error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center font-black text-lg tracking-wider text-white shadow-md shadow-indigo-500/20">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                HAVEN
              </h1>
              <a
                href="https://haven.pntr.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-700 transition"
              >
                haven.pntr.dev
              </a>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Spoken Voice Agent • Website Development & Lead Capture
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Supported Languages Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>English • Urdu • Hindi • Hinglish</span>
          </div>

          {/* Leads Button */}
          <button
            id="view-leads-btn"
            onClick={() => {
              setIsLeadsOpen(true);
              setHasNewLeadBadge(false);
            }}
            className="relative px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Leads</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
              {leads.length}
            </span>
            {hasNewLeadBadge && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>

          {/* Services & Info Button */}
          <button
            id="view-haven-info-btn"
            onClick={() => setIsInfoOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 transition"
            title="HAVEN Services & Details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-800 border border-indigo-500/40 text-slate-100 text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Interactive Voice Console */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between p-6 sm:p-8 rounded-3xl bg-slate-950 border border-slate-800/90 shadow-xl relative overflow-hidden">
          {/* Subtle background ambient mesh */}
          <div className="absolute inset-0 bg-radial-[at_top_center] from-indigo-950/40 via-transparent to-transparent pointer-events-none" />

          {/* Top Status Header */}
          <div className="w-full flex items-center justify-between text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    status === 'speaking'
                      ? 'bg-emerald-400 opacity-75'
                      : status === 'listening'
                      ? 'bg-amber-400 opacity-75'
                      : 'bg-indigo-400 opacity-75'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    status === 'speaking'
                      ? 'bg-emerald-500'
                      : status === 'listening'
                      ? 'bg-amber-500'
                      : 'bg-slate-500'
                  }`}
                />
              </span>
              <span className="font-semibold text-slate-300">
                gemini-3.1-flash-live-preview
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="toggle-audio-mute"
                onClick={() => {
                  setIsAudioMuted(!isAudioMuted);
                  if (!isAudioMuted && playerRef.current) {
                    playerRef.current.stopAll();
                  }
                }}
                className={`p-1.5 rounded-lg border transition ${
                  isAudioMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
                title={isAudioMuted ? 'Unmute AI speaker' : 'Mute AI speaker'}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Center Orb Visualizer */}
          <div className="my-auto py-6 z-10 w-full flex flex-col items-center">
            <VoiceOrb
              status={status}
              inputVolume={inputVolume}
              outputVolume={outputVolume}
              isMuted={isMuted}
            />

            <div className="text-center mt-3 max-w-xs">
              <p className="text-sm font-medium text-slate-200">
                {status === 'idle'
                  ? 'Start a Voice Call with HAVEN'
                  : status === 'connecting'
                  ? 'Establishing Live Audio Channel...'
                  : status === 'speaking'
                  ? 'HAVEN is speaking...'
                  : isMuted
                  ? 'Microphone is currently muted'
                  : 'Speak now — HAVEN is listening'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ask about web development, e-commerce, portfolios, quotes, or hosting setup.
              </p>
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="w-full z-10 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-3">
              {/* Primary Call / Hang Up Button */}
              <button
                id="toggle-voice-call-btn"
                onClick={toggleCall}
                className={`flex-1 max-w-xs py-3.5 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition transform active:scale-95 ${
                  status === 'idle' || status === 'error'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                }`}
              >
                {status === 'idle' || status === 'error' ? (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    <span>Start Voice Call</span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="w-4 h-4" />
                    <span>End Voice Call</span>
                  </>
                )}
              </button>

              {/* Mic Mute / Unmute Button (when active) */}
              {(status === 'listening' || status === 'speaking' || status === 'connected') && (
                <button
                  id="toggle-mic-mute-btn"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-2xl border transition ${
                    isMuted
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>

            {/* Quick Helper Badge */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Live API 24kHz Audio
              </span>
              <span>Fast response &lt; 3 sentences</span>
            </div>
          </div>
        </div>

        {/* Right: Live Conversation Transcript & Interactive Chat */}
        <div className="lg:col-span-7 flex flex-col h-[650px] lg:h-auto">
          <div className="flex-1 flex flex-col">
            <ConversationView
              messages={messages}
              streamingText={streamingTranscript}
              isModelSpeaking={status === 'speaking'}
              onSelectPrompt={(text) => handleSendMessage(text)}
              onReplayAudio={(text) => playTtsAudio(text)}
            />

            {/* Text Input Bar (Visitor can also type questions or lead info) */}
            <form
              id="chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(textInput);
              }}
              className="mt-3 flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800"
            >
              <input
                id="voice-chat-input"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type in English, Urdu, or Hinglish (e.g. 'I want an e-commerce site')..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />

              <button
                id="send-chat-button"
                type="submit"
                disabled={!textInput.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Modals */}
      <LeadsModal
        isOpen={isLeadsOpen}
        onClose={() => setIsLeadsOpen(false)}
        leads={leads}
        onRefresh={fetchLeads}
      />

      <HavenInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
}
