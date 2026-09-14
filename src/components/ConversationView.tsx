import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Volume2, User, Sparkles, Copy, Check } from 'lucide-react';

interface ConversationViewProps {
  messages: ChatMessage[];
  streamingText: string;
  isModelSpeaking: boolean;
  onSelectPrompt: (prompt: string) => void;
  onReplayAudio?: (text: string) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  streamingText,
  isModelSpeaking,
  onSelectPrompt,
  onReplayAudio,
}) => {
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    {
      label: 'E-Commerce Store (English)',
      text: 'Hi! I need an e-commerce store with credit card payment integration.',
      lang: 'EN',
    },
    {
      label: 'Portfolio Site (Hinglish)',
      text: 'Mujhe ek photography portfolio website banwani hai. Kitna time lagega?',
      lang: 'Hinglish',
    },
    {
      label: 'Business Website (Urdu/Hinglish)',
      text: 'Kya aap custom domain pntr.dev aur hosting setup bhi khud karte hain?',
      lang: 'Urdu',
    },
    {
      label: 'Pricing & Quote (English)',
      text: 'How does HAVEN pricing work, and when do we pay?',
      lang: 'EN',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Live Conversation Transcript
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Under 3 sentences • Multilingual
        </span>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 && !streamingText ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 dark:text-slate-400">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Start Speaking or Tap a Quick Prompt
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
              HAVEN's Voice Agent understands English, Urdu, Hindi, and Hinglish. It will automatically match your language and explain web development services.
            </p>

            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  id={`sample-prompt-${idx}`}
                  onClick={() => onSelectPrompt(p.text)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition text-xs group text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {p.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                      {p.lang}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 line-clamp-2">
                    &ldquo;{p.text}&rdquo;
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                id={`message-${msg.id}`}
                className={`flex gap-3 text-sm ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/70 dark:border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span
                      className={`text-[11px] font-semibold ${
                        msg.role === 'user'
                          ? 'text-indigo-200'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {msg.role === 'assistant' ? 'HAVEN Agent' : 'You (Visitor)'}
                    </span>
                    <span
                      className={`text-[10px] ${
                        msg.role === 'user'
                          ? 'text-indigo-300'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  {msg.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-2">
                      {onReplayAudio && (
                        <button
                          id={`replay-audio-${msg.id}`}
                          onClick={() => onReplayAudio(msg.content)}
                          title="Speak aloud"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        id={`copy-text-${msg.id}`}
                        onClick={() => handleCopy(msg.id, msg.content)}
                        title="Copy text"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Live Streaming Transcript chunk */}
            {streamingText && (
              <div className="flex gap-3 text-sm justify-start">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-xs p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      HAVEN Agent (Live Speech)
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-sm leading-relaxed">{streamingText}</p>
                </div>
              </div>
            )}

            <div ref={scrollEndRef} />
          </>
        )}
      </div>

      {/* Quick Test Chips at bottom */}
      {messages.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
            Try asking:
          </span>
          {samplePrompts.slice(0, 3).map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(p.text)}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
