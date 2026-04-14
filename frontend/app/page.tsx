"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { getAllSessions, deleteSession, clearCurrentSession, buildLocalSession, saveCurrentSession } from "@/lib/storage";
import type { Language, ChatSession, Message } from "@/lib/types";
import CalculatorModal from "@/components/CalculatorModal";
import BookingModal from "@/components/BookingModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const QUICK_START = [
  { label: "Calculate FD returns", icon: "" },
  { label: "Is FD safe?", icon: "" },
  { label: "Best FD rates today", icon: "" },
  { label: "FD vs Mutual Funds", icon: "" },
  { label: "How to open an FD?", icon: "" },
  { label: "What is TDS on FD?", icon: "" },
];

const FD_TOOLS: { icon: string; label: string; action: "calculator" | "booking" | "chat"; q?: string }[] = [
  { icon: "/icons/calculator.svg", label: "FD Calculator", action: "calculator" },
  { icon: "/icons/bar-chart.svg",  label: "Compare Banks", action: "chat", q: "Compare bank FD rates" },
  { icon: "/icons/tax.svg",        label: "Tax Estimator", action: "chat", q: "Estimate TDS on FD interest" },
  { icon: "/icons/writing.svg",    label: "Book an FD", action: "booking" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function highlightNumbers(text: string) {
  const parts = text.split(/(₹[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?%)/g);
  return parts.map((part, i) =>
    /₹|%/.test(part)
      ? <span key={i} className="font-semibold text-[#00C6FF] bg-[#00C6FF]/10 px-0.5 rounded">{part}</span>
      : part
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const welcomeMsg = (lang: Language): Message => ({
  id: "welcome",
  role: "assistant",
  content:
    lang === "hindi"
      ? "नमस्ते! मैं आपका FD सहायक हूं। Fixed Deposit के बारे में कोई भी सवाल पूछें।"
      : lang === "tamil"
      ? "வணக்கம்! நான் உங்கள் FD உதவியாளர். Fixed Deposit பற்றி கேளுங்கள்."
      : "Hi! I'm your FD Copilot. Ask me anything about Fixed Deposits — I'll explain in simple language with real numbers.",
  timestamp: new Date().toISOString(),
});

const MODELS = [
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
];

export default function Home() {
  const [language, setLanguage] = useState<Language>("english");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<(text: string) => void>(() => {});

  useEffect(() => { setSessions(getAllSessions()); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    if (!chatStarted) setChatStarted(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...(prev.length === 0 ? [welcomeMsg(language)] : prev), userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/chat`, { message: text, preferredLanguage: language, sessionId });
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: data.response, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, botMsg]);
      if (data.sessionId && data.sessionId !== sessionId) setSessionId(data.sessionId);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, couldn't connect to the server. Make sure the backend is running on port 3001.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [language, sessionId, loading, chatStarted]);

  useEffect(() => { sendRef.current = sendMessage; }, [sendMessage]);

  useEffect(() => {
    if (messages.length <= 1) return;
    // Only persist once we have a real backend session id (not a local draft)
    if (!sessionId) return;
    const session = buildLocalSession(messages, sessionId);
    saveCurrentSession(session);
    setSessions(getAllSessions());
  }, [messages, sessionId]);

  function loadSession(s: ChatSession) {
    setMessages(s.messages);
    setSessionId(s.id);
    setChatStarted(true);
  }

  function newChat() {
    clearCurrentSession();
    setMessages([]);
    setSessionId(undefined);
    setChatStarted(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getAllSessions());
    if (sessionId === id) newChat();
  }

  function handleToolClick(tool: typeof FD_TOOLS[number]) {
    if (tool.action === "calculator") { setShowCalculator(true); return; }
    if (tool.action === "booking") { setShowBooking(true); return; }
    if (tool.q) sendRef.current(tool.q);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) sendMessage(input.trim());
  }

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

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  // The whole layout is: fixed sidebar on left, fixed header above sidebar only,
  // and the right main area fills the rest with its own scroll.
  return (
    <div className="app-bg" style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* ── Left column: header + sidebar, both sticky ── */}
      <div className="relative z-20 flex-shrink-0 flex flex-col" style={{ width: "320px", height: "100vh", background: "rgba(11,15,42,0.95)", borderRight: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Sidebar header — only over left column */}
        <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="FD Copilot" className="w-full h-full object-cover scale-[2]" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">FD Copilot</p>
            <p className="text-[#718096] text-sm leading-tight">AI Fixed Deposit Advisor</p>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <button onClick={newChat}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-white text-base font-medium transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(90deg, rgba(0,114,255,0.2), rgba(0,198,255,0.15))", border: "1px solid rgba(0,198,255,0.25)" }}>
            <svg className="w-4 h-4 text-[#00C6FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* FD Tools */}
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-[#718096] text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="" /> FD Tools
          </p>
          {FD_TOOLS.map((t) => (
            <button key={t.label} onClick={() => handleToolClick(t)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#A0AEC0] hover:text-white hover:bg-white/[0.06] transition-all text-base group">
              <img src={t.icon} alt="" className="w-4 h-4 icon-tint opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="group-hover:text-[#00C6FF] transition-colors">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mx-4 my-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

        {/* Recent Chats — this part scrolls */}
        <div className="px-4 flex-1 overflow-y-auto chat-scroll pb-4 min-h-0">
          <p className="text-[#718096] text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <span className="" /> Recent Chats
          </p>
          {sessions.length === 0 ? (
            <p className="text-[#718096] text-base px-1 mt-2">No chats yet</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id}
                className={`group flex items-center rounded-xl transition-all mb-0.5 ${s.id === sessionId ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}>
                <button onClick={() => loadSession(s)} className="flex-1 min-w-0 text-left px-3 py-2">
                  <p className={`text-base truncate transition-colors ${s.id === sessionId ? "text-white" : "text-[#A0AEC0] group-hover:text-white"}`}>
                    {s.title}
                  </p>
                  <p className="text-[#718096] text-sm mt-0.5">{timeAgo(s.updatedAt)}</p>
                </button>
                <button onClick={(e) => handleDelete(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 mr-2 p-1.5 rounded-lg text-[#718096] hover:text-red-400 hover:bg-red-400/10 transition-all"
                  title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Language selector pinned at bottom of sidebar */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="lang-badge flex items-center gap-2 rounded-xl px-3 py-2">
            <img src="/icons/globe.svg" alt="" className="w-4 h-4 icon-tint opacity-80 flex-shrink-0" />
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-white text-base font-medium focus:outline-none cursor-pointer flex-1">
              <option value="english" className="bg-[#0F1C4D]">English</option>
              <option value="hindi" className="bg-[#0F1C4D]">हिंदी</option>
              <option value="tamil" className="bg-[#0F1C4D]">தமிழ்</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Right column: main chat area ── */}
      <div className="relative z-10 flex-1 flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>

        {/* Sticky top bar — no background, model left, tools right */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Left: model pill */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown((v) => !v)}
              className="model-pill flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-[#00C6FF] inline-block" />
              {currentModel.label}
              <svg className="w-3.5 h-3.5 text-[#718096]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelDropdown && (
              <div className="model-dropdown absolute top-full mt-2 left-0 rounded-xl overflow-hidden z-50 min-w-[180px]">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModelDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                      m.id === selectedModel ? "text-[#00C6FF] bg-white/[0.08]" : "text-[#A0AEC0] hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    {m.id === selectedModel && <span className="w-1.5 h-1.5 rounded-full bg-[#00C6FF] flex-shrink-0" />}
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: tool pills */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCalculator(true)}
              className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white hover:text-white transition-all">
              <img src="/icons/calculator.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
              Calculator
            </button>
            <button onClick={() => setShowBooking(true)}
              className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white hover:text-white transition-all">
              <img src="/icons/writing.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
              Book FD
            </button>
          </div>
        </div>

        {/* Messages or hero — this scrolls */}
        {chatStarted ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 chat-scroll min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex msg-enter ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mr-3 mt-1">
                    <img src="/logo.png" alt="bot" className="w-full h-full object-cover scale-[2]" />
                  </div>
                )}
                <div className={`max-w-[75%] group flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`rounded-2xl px-4 py-3 text-base leading-relaxed ${msg.role === "user" ? "bubble-user rounded-tr-sm" : "bubble-bot rounded-tl-sm"}`}>
                    {msg.role === "assistant"
                      ? <p className="whitespace-pre-wrap">{highlightNumbers(msg.content)}</p>
                      : <p className="whitespace-pre-wrap">{msg.content}</p>
                    }
                  </div>
                  <div className={`flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <span className="text-[#718096] text-xs">{formatTime(msg.timestamp)}</span>
                    {msg.role === "assistant" && msg.id !== "welcome" && (
                      <button onClick={() => copyMessage(msg.content, msg.id)}
                        className="text-[#718096] hover:text-[#00C6FF] transition-colors" title="Copy">
                        {copiedId === msg.id
                          ? <svg className="w-3.5 h-3.5 text-[#00C6FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start msg-enter">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mr-3">
                  <img src="/logo.png" alt="bot" className="w-full h-full object-cover scale-[2]" />
                </div>
                <div className="bubble-bot rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    <span className="typing-dot w-2 h-2 rounded-full block" style={{ background: "#00C6FF" }} />
                    <span className="typing-dot w-2 h-2 rounded-full block" style={{ background: "#00C6FF" }} />
                    <span className="typing-dot w-2 h-2 rounded-full block" style={{ background: "#00C6FF" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
            {/* Blue sphere */}
            <div className="blue-sphere mb-6" />
            <h1 className="text-white text-5xl sm:text-5xl font-bold leading-tight tracking-tight text-center mb-2">
              How can I help you grow your<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#0072FF,#00C6FF)" }}>
                savings today?
              </span>
            </h1>
            <p className="text-[#718096] text-base mt-3">Ask in English, हिंदी, or தமிழ் — I understand all three.</p>
          </div>
        )}

        {/* Input + chips — always pinned at bottom of right column */}
        <div className="flex-shrink-0 px-6 pb-3 pt-2 flex flex-col items-center gap-2">

          <form onSubmit={handleSubmit} className="w-full max-w-4xl">
            <div className="glass-card input-glow rounded-full px-5 py-2.5 flex items-center gap-3 transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
                placeholder={
                  language === "hindi" ? "FD के बारे में पूछें..."
                  : language === "tamil" ? "FD பற்றி கேளுங்கள்..."
                  : "What FD help do you need today?"
                }
                className="flex-1 bg-transparent text-white placeholder-[#718096] text-base focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                  isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "text-[#718096] hover:text-[#00C6FF] hover:bg-white/[0.06]"
                }`}
                title="Voice input"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              <button type="submit" disabled={!input.trim() || loading}
                className="btn-accent flex-shrink-0 w-9 h-9 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>

          {!chatStarted && (
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl mt-3">
              {QUICK_START.map((chip) => (
                <button key={chip.label} onClick={() => sendRef.current(chip.label)}
                  className="chip-glow text-[#A0AEC0] hover:text-white text-sm px-4 py-2 rounded-full transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-[#718096] text-[10px] leading-none mt-1">FD Copilot · Not financial advice · Always verify with your bank</p>
        </div>
      </div>

      {showCalculator && <CalculatorModal language={language} onClose={() => setShowCalculator(false)} />}
      {showBooking && <BookingModal language={language} onClose={() => setShowBooking(false)} />}
    </div>
  );
}
