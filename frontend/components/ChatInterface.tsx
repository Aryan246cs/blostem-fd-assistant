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
  marathi: [
    "Fixed Deposit म्हणजे काय?",
    "FD सुरक्षित आहे का?",
    "सध्याचे FD व्याज दर किती आहेत?",
  ],
  bengali: [
    "Fixed Deposit কী?",
    "FD কি নিরাপদ?",
    "বর্তমান FD সুদের হার কত?",
  ],
};

function highlightNumbers(text: string) {
  const parts = text.split(/(₹[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?%)/g);
  return parts.map((part, i) =>
    /₹|%/.test(part) ? (
      <span key={i} className="font-semibold text-[#00C6FF] bg-[#00C6FF]/10 px-0.5 rounded">
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
        : language === "marathi"
        ? "नमस्कार! मी तुमचा FD सहाय्यक आहे. Fixed Deposit बद्दल काहीही विचारा."
        : language === "bengali"
        ? "নমস্কার! আমি আপনার FD সহায়ক। Fixed Deposit সম্পর্কে যেকোনো প্রশ্ন করুন।"
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
  // Keep a ref to sendMessage so the initialQuery effect always calls the latest version
  const sendMessageRef = useRef<(text: string) => void>(() => {});

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

  // Keep ref current so initialQuery effect always calls the latest sendMessage
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fire initial query once on mount via ref — avoids stale closure issues
  const firedInitialQuery = useRef(false);
  useEffect(() => {
    if (initialQuery && !firedInitialQuery.current) {
      firedInitialQuery.current = true;
      const t = setTimeout(() => sendMessageRef.current(initialQuery), 50);
      return () => clearTimeout(t);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const session = buildLocalSession(messages, sessionId);
    saveCurrentSession(session);
  }, [messages, sessionId]);

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
    recognition.lang = language === "hindi" ? "hi-IN" : language === "tamil" ? "ta-IN" : language === "marathi" ? "mr-IN" : language === "bengali" ? "bn-IN" : "en-IN";
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
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 61px)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 chat-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex msg-enter ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* Bot avatar */}
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mr-3 mt-1 shadow-glow-blue">
                <img src="/logo.png" alt="bot" className="w-full h-full object-cover scale-[2]" />
              </div>
            )}

            <div className={`max-w-[78%] group flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {/* Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 text-base leading-relaxed ${
                  msg.role === "user"
                    ? "bubble-user rounded-tr-sm"
                    : "bubble-bot rounded-tl-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <p className="whitespace-pre-wrap">{highlightNumbers(msg.content)}</p>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Action buttons under bot messages */}
                {msg.role === "assistant" && msg.id !== "welcome" && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={onOpenCalculator}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#00C6FF]/30 text-[#00C6FF] hover:bg-[#00C6FF]/10 transition-all"
                    >
                      🧮 Calculate Returns
                    </button>
                    <button
                      onClick={onOpenBooking}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#6C63FF]/30 text-[#6C63FF] hover:bg-[#6C63FF]/10 transition-all"
                    >
                      📋 Invest Now
                    </button>
                  </div>
                )}
              </div>

              {/* Timestamp + actions */}
              <div className={`flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <span className="text-[#718096] text-xs">{formatTime(msg.timestamp)}</span>
                {msg.role === "assistant" && msg.id !== "welcome" && (
                  <>
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="text-[#718096] hover:text-[#00C6FF] transition-colors"
                      title="Copy"
                    >
                      {copiedId === msg.id ? (
                        <svg className="w-3.5 h-3.5 text-[#00C6FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        const lastUser = [...messages].reverse().find((m) => m.role === "user");
                        if (lastUser) sendMessage(lastUser.content);
                      }}
                      className="text-[#718096] hover:text-[#00C6FF] transition-colors"
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
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mr-3 shadow-glow-blue">
              <img src="/logo.png" alt="bot" className="w-full h-full object-cover scale-[2]" />
            </div>
            <div className="bubble-bot rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="typing-dot w-2 h-2 rounded-full block" style={{ background: "#00C6FF" }} />
                <span className="typing-dot w-2 h-2 rounded-full block" style={{ background: "#00C6FF" }} />
                <span className="typing-dot w-2 h-2 rounded-full block" style={{ background: "#00C6FF" }} />
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
                className="chip-glow glass text-[#A0AEC0] hover:text-white text-sm px-4 py-2 rounded-full border border-white/[0.08] transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="glass-card input-glow rounded-2xl px-4 py-3 flex items-end gap-3 transition-all max-w-3xl mx-auto">
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
                : language === "marathi"
                ? "FD बद्दल विचारा..."
                : language === "bengali"
                ? "FD সম্পর্কে জিজ্ঞেস করুন..."
                : "What FD help do you need today?"
            }
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-[#718096] text-base resize-none focus:outline-none max-h-32"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={toggleVoice}
            className={`p-1.5 rounded-full transition-all flex-shrink-0 ${
              isListening
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "text-[#718096] hover:text-[#00C6FF] hover:bg-white/[0.06]"
            }`}
            title="Voice input (Chrome)"
          >
            🎤
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="btn-accent flex-shrink-0 w-9 h-9 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[#718096] text-xs text-center mt-2">
          FD Copilot · Not financial advice · Always verify with your bank
        </p>
      </div>
    </div>
  );
}
