"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import type { Language, Message } from "@/lib/types";
import { buildLocalSession, saveCurrentSession } from "@/lib/storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const SUGGESTIONS: Record<Language, string[]> = {
  english: [
    "What is a Fixed Deposit?",
    "Is FD safe for my savings?",
    "What are current FD rates?",
    "How is FD interest calculated?",
    "FD vs Mutual Fund — which is better?",
  ],
  hindi: [
    "Fixed Deposit क्या है?",
    "क्या FD सुरक्षित है?",
    "अभी FD पर कितना ब्याज मिलता है?",
    "FD पर टैक्स कैसे लगता है?",
  ],
  tamil: [
    "Fixed Deposit என்றால் என்ன?",
    "FD பாதுகாப்பானதா?",
    "தற்போதைய FD வட்டி விகிதம் என்ன?",
  ],
};

// Highlight ₹ amounts and % values in green
function highlightNumbers(text: string) {
  const parts = text.split(/(₹[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?%)/g);
  return parts.map((part, i) =>
    /₹|%/.test(part) ? (
      <span key={i} className="font-semibold text-emerald-400 bg-emerald-400/10 px-0.5 rounded">
        {part}
      </span>
    ) : (
      part
    )
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatInterface({
  language,
  sessionId: externalSessionId,
  initialMessages,
  initialQuery,
  onSessionCreated,
  onOpenCalculator,
  onOpenBooking,
}: {
  language: Language;
  sessionId?: string;
  initialMessages?: Message[];
  initialQuery?: string;
  onSessionCreated?: (id: string) => void;
  onOpenCalculator: () => void;
  onOpenBooking: () => void;
}) {
  const welcomeMsg = (): Message => ({
    id: "welcome",
    role: "assistant",
    content:
      language === "hindi"
        ? "नमस्ते! मैं आपका FD सहायक हूं। Fixed Deposit के बारे में कोई भी सवाल पूछें।"
        : language === "tamil"
        ? "வணக்கம்! நான் உங்கள் FD உதவியாளர். Fixed Deposit பற்றி கேளுங்கள்."
        : "Hi! I'm your FD Copilot. Ask me anything about Fixed Deposits — I'll explain in simple language with real numbers.",
    timestamp: new Date().toISOString(),
  });

  const [messages, setMessages] = useState<Message[]>(
    initialMessages && initialMessages.length > 0 ? initialMessages : [welcomeMsg()]
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(externalSessionId);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fire initial query once
  useEffect(() => {
    if (initialQuery) {
      setTimeout(() => sendMessage(initialQuery), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever messages change
  useEffect(() => {
    if (messages.length <= 1) return;
    const session = buildLocalSession(messages, sessionId);
    saveCurrentSession(session);
  }, [messages, sessionId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/chat`, {
        message: text,
        preferredLanguage: language,
        sessionId,
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Sync backend session id
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        onSessionCreated?.(data.sessionId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't connect to the server. Make sure the backend is running on port 3001.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [language, sessionId, loading, onSessionCreated]);

  function copyMessage(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = language === "hindi" ? "hi-IN" : language === "tamil" ? "ta-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => setInput(e.results[0][0].transcript);
    recognition.start();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 57px)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 chat-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex msg-enter ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Assistant avatar */}
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 mt-1 shadow-lg">
                ₹
              </div>
            )}

            <div className={`max-w-[78%] group ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              {/* Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 text-base leading-relaxed shadow-lg ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm"
                    : "glass-light text-gray-800 rounded-tl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <p className="whitespace-pre-wrap">{highlightNumbers(msg.content)}</p>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Action buttons under assistant messages */}
                {msg.role === "assistant" && msg.id !== "welcome" && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={onOpenCalculator}
                      className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors"
                    >
                      🧮 Calculate Returns
                    </button>
                    <button
                      onClick={onOpenBooking}
                      className="text-sm bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      📋 Invest Now
                    </button>
                  </div>
                )}
              </div>

              {/* Timestamp + copy/regenerate */}
              <div className={`flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <span className="text-white/30 text-sm">{formatTime(msg.timestamp)}</span>
                {msg.role === "assistant" && msg.id !== "welcome" && (
                  <>
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="text-white/30 hover:text-white/70 transition-colors"
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        // Regenerate: resend the last user message
                        const lastUser = [...messages].reverse().find((m) => m.role === "user");
                        if (lastUser) sendMessage(lastUser.content);
                      }}
                      className="text-white/30 hover:text-white/70 transition-colors"
                      title="Regenerate"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start msg-enter">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0 shadow-lg">
              ₹
            </div>
            <div className="glass-light rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
              <div className="flex gap-1 items-center h-4">
                <span className="typing-dot w-2 h-2 bg-blue-400 rounded-full block" />
                <span className="typing-dot w-2 h-2 bg-blue-400 rounded-full block" />
                <span className="typing-dot w-2 h-2 bg-blue-400 rounded-full block" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS[language].map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="chip-glow glass text-blue-100 text-sm px-4 py-2 rounded-full hover:bg-white/15 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area — sticky bottom */}
      <div className="px-4 pb-4 pt-2">
        <div className="glass input-glow rounded-2xl px-4 py-3 flex items-end gap-3 transition-all max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              language === "hindi"
                ? "FD के बारे में पूछें..."
                : language === "tamil"
                ? "FD பற்றி கேளுங்கள்..."
                : "Ask about FD rates, returns, safety..."
            }
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-blue-300/50 text-base resize-none focus:outline-none max-h-32"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={toggleVoice}
            className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
              isListening
                ? "bg-red-500/30 text-red-400 animate-pulse"
                : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
            title="Voice input (Chrome)"
          >
            🎤
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-8 h-8 bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-white/20 text-xs text-center mt-2">
          FD Copilot · Not financial advice · Always verify with your bank
        </p>
      </div>
    </div>
  );
}
