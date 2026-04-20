"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getAllSessions, deleteSession, clearCurrentSession, buildLocalSession, saveCurrentSession } from "@/lib/storage";
import type { Language, ChatSession, Message } from "@/lib/types";
import CalculatorModal from "@/components/CalculatorModal";
import BookingModal from "@/components/BookingModal";
import TDSCalculatorModal from "@/components/TDSCalculatorModal";
import InvestFlowModal from "@/components/InvestFlowModal";
import ExplainFDModal from "@/components/ExplainFDModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const QUICK_START = [
  { label: "Calculate FD returns", icon: "" },
  { label: "Is FD safe?", icon: "" },
  { label: "Best FD rates today", icon: "" },
  { label: "FD vs Mutual Funds", icon: "" },
  { label: "What is TDS on FD?", icon: "" },
  { label: "Compare FD vs Mutual Funds", icon: "" },
];

const FD_TOOLS: { icon: string; label: string; action: "calculator" | "booking" | "chat" | "navigate" | "tds"; q?: string; href?: string }[] = [
  { icon: "/icons/calculator.svg", label: "FD Calculator", action: "calculator" },
  { icon: "/icons/compare.svg",    label: "Compare FD's", action: "navigate", href: "/compare-fd" },
  { icon: "/icons/tax.svg",        label: "Tax Estimator", action: "tds" },
  { icon: "/icons/writing.svg",    label: "FD Booking Guide", action: "booking" },
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
      : lang === "marathi"
      ? "नमस्कार! मी तुमचा FD सहाय्यक आहे. Fixed Deposit बद्दल काहीही विचारा."
      : lang === "bengali"
      ? "নমস্কার! আমি আপনার FD সহায়ক। Fixed Deposit সম্পর্কে যেকোনো প্রশ্ন করুন।"
      : "Hi! I'm your FD Copilot. Ask me anything about Fixed Deposits — I'll explain in simple language with real numbers.",
  timestamp: new Date().toISOString(),
});

const ACTIVE_MODELS = [
  { label: "LLaMA 3.1 8B", provider: "Groq", color: "#00C6FF", usage: "English" },
  { label: "Mistral 7B", provider: "Hugging Face", color: "#A78BFA", usage: "Hindi / Hinglish" },
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
  const [showTDS, setShowTDS] = useState(false);
  const [showInvest, setShowInvest] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);
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
    if (tool.action === "tds") { setShowTDS(true); return; }
    if (tool.action === "navigate" && tool.href) { router.push(tool.href); return; }
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

  function speakMessage(content: string, id: string) {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();

    const langCode =
      language === "hindi"   ? "hi-IN" :
      language === "tamil"   ? "ta-IN" :
      language === "marathi" ? "mr-IN" :
      language === "bengali" ? "bn-IN" : "en-IN";

    // Strip non-speakable characters (₹ symbol, excessive punctuation)
    // and transliterate common Hinglish/mixed patterns for better TTS
    const cleaned = content
      .replace(/₹/g, " rupees ")
      .replace(/p\.a\./gi, "per annum")
      .replace(/%/g, " percent ")
      .replace(/\s+/g, " ")
      .trim();

    function doSpeak(voices: SpeechSynthesisVoice[]) {
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 0.88;

      // Try to find a voice that matches the target language
      const match =
        voices.find((v) => v.lang === langCode) ||
        voices.find((v) => v.lang.startsWith(langCode.split("-")[0]));

      if (match) {
        utterance.voice = match;
        utterance.lang  = match.lang;
      } else {
        // No regional voice available — speak in English so it's not gibberish
        const enVoice = voices.find((v) => v.lang.startsWith("en"));
        if (enVoice) utterance.voice = enVoice;
        utterance.lang = "en-IN";
      }

      utterance.onstart = () => setSpeakingId(id);
      utterance.onend   = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    }

    // getVoices() is async on first call in Chrome — wait for the list
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        doSpeak(window.speechSynthesis.getVoices());
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
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

  const router = useRouter();

  // The whole layout is: fixed sidebar on left, fixed header above sidebar only,
  // and the right main area fills the rest with its own scroll.
  return (
    <div className="app-bg" style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* ── Left column: header + sidebar, both sticky ── */}
      <div className="relative z-20 flex-shrink-0 flex flex-col" style={{ width: "260px", height: "100vh", background: "rgba(11,15,42,0.95)", borderRight: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Sidebar header — only over left column */}
        <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="FD Copilot" className="w-full h-full object-cover scale-[2]" />
          </div>
          <div>
            <p className="text-white font-semibold text-xl leading-tight tracking-tight">FD Saathi</p>
            <p className="text-[#718096] text-sm leading-tight">AI Fixed Deposit Advisor</p>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0 space-y-2">
          <button onClick={newChat}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-white text-base font-medium transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(90deg, rgba(0,114,255,0.2), rgba(0,198,255,0.15))", border: "1px solid rgba(0,198,255,0.25)" }}>
            <svg className="w-4 h-4 text-[#00C6FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          {/* Invest in FD */}
          <button
            onClick={() => setShowInvest(true)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-white text-base font-medium transition-all hover:scale-[1.02] group"
            style={{ background: "linear-gradient(90deg, rgba(108,99,255,0.2), rgba(0,198,255,0.12))", border: "1px solid rgba(108,99,255,0.3)" }}
          >
            <svg className="w-4 h-4 icon-tint opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <div className="text-left">
              <p className="text-white text-base font-medium leading-tight group-hover:text-[#00C6FF] transition-colors">Invest in FD</p>
              <p className="text-[#718096] text-xs leading-tight">Booking guide</p>
            </div>
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
        <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[#718096] text-xs font-bold uppercase tracking-widest mb-2">Select language to converse</p>
          <div className="lang-badge flex items-center gap-2 rounded-xl px-3 py-2">
            <img src="/icons/globe.svg" alt="" className="w-4 h-4 icon-tint opacity-80 flex-shrink-0" />
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-white text-base font-medium focus:outline-none cursor-pointer flex-1">
              <option value="english" className="bg-[#0F1C4D]">English</option>
              <option value="hindi" className="bg-[#0F1C4D]">हिंदी (hindi)</option>
              <option value="tamil" className="bg-[#0F1C4D]">தமிழ் (tamil)</option>
              <option value="marathi" className="bg-[#0F1C4D]">मराठी (marathi)</option>
              <option value="bengali" className="bg-[#0F1C4D]">বাংলা (bengali)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Right column: main chat area ── */}
      <div className="relative z-10 flex-1 flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>

        {/* Sticky top bar — no background, model left, tools right */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 pr-8 pt-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Left: model info pill */}
          <div className="relative">
            <button
              onClick={() => setShowModels((v) => !v)}
              className="model-pill flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-[#00C6FF] inline-block animate-pulse" />
              AI Models
              <svg className={`w-3.5 h-3.5 text-[#718096] transition-transform ${showModels ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModels && (
              <div className="model-dropdown absolute top-full mt-2 left-0 rounded-xl overflow-hidden z-50 min-w-[260px] p-1">
                <p className="text-[#718096] text-[10px] font-bold uppercase tracking-widest px-3 pt-2 pb-1">Active models</p>
                {ACTIVE_MODELS.map((m) => (
                  <div key={m.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <div>
                        <p className="text-white text-sm font-semibold leading-tight">{m.label}</p>
                        <p className="text-[#718096] text-xs">{m.usage}</p>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}40` }}
                    >
                      {m.provider}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: tool pills */}
          <div className="flex items-center gap-2 mr-2 mt-1">
            <button onClick={() => setShowCalculator(true)}
              className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white hover:text-white transition-all">
              <img src="/icons/calculator.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
              Calculator
            </button>
            <button onClick={() => router.push("/fd-plans")}
              className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white hover:text-white transition-all">
              <img src="/icons/explore.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
              FD Plans
            </button>
            <button onClick={() => router.push("/compare-fd")}
              className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white hover:text-white transition-all">
              <img src="/icons/compare.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
              Compare FD
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
                <div className={`max-w-[75%] flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`rounded-2xl px-4 py-3 text-base leading-relaxed ${msg.role === "user" ? "bubble-user rounded-tr-sm" : "bubble-bot rounded-tl-sm"}`}>
                    {msg.role === "assistant"
                      ? <p className="whitespace-pre-wrap">{highlightNumbers(msg.content)}</p>
                      : <p className="whitespace-pre-wrap">{msg.content}</p>
                    }
                  </div>

                  {/* Always-visible action bar for assistant messages */}
                  {msg.role === "assistant" && msg.id !== "welcome" && (
                    <div className="flex items-center gap-1.5 px-1">
                      {/* TTS — always visible */}
                      <button
                        onClick={() => speakMessage(msg.content, msg.id)}
                        title={speakingId === msg.id ? "Stop" : "Listen"}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={speakingId === msg.id ? {
                          background: "rgba(0,198,255,0.15)",
                          border: "1px solid rgba(0,198,255,0.4)",
                          color: "#00C6FF",
                        } : {
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#718096",
                        }}
                      >
                        {speakingId === msg.id ? (
                          <span className="flex items-end gap-[2px] h-3">
                            {[1,2,3].map((i) => (
                              <span key={i} className="w-[3px] rounded-full bg-[#00C6FF]"
                                style={{ height: `${i === 2 ? 12 : 7}px`, animation: `tts-bar${i} 0.6s ease-in-out infinite alternate` }} />
                            ))}
                          </span>
                        ) : (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          </svg>
                        )}
                        <span>{speakingId === msg.id ? "Stop" : "Listen"}</span>
                      </button>

                      {/* Copy */}
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        title="Copy"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: copiedId === msg.id ? "#00C6FF" : "#718096",
                        }}
                      >
                        {copiedId === msg.id
                          ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        }
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>

                      <span className="text-[#4A5568] text-xs pl-1">{formatTime(msg.timestamp)}</span>
                    </div>
                  )}

                  {msg.role === "user" && (
                    <span className="text-[#4A5568] text-xs px-1">{formatTime(msg.timestamp)}</span>
                  )}
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
              {getGreeting()}, how can I help<br />you grow your{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#0072FF,#00C6FF)" }}>
                savings today?
              </span>
            </h1>
            <p className="text-[#718096] text-base mt-3">Ask in English, हिंदी, தமிழ், मराठी, or বাংলা — I understand all five.</p>
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
                  : language === "marathi" ? "FD बद्दल विचारा..."
                  : language === "bengali" ? "FD সম্পর্কে জিজ্ঞেস করুন..."
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
              {/* Explain FD chip — highlighted entry point */}
              <button
                onClick={() => setShowExplain(true)}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full transition-all font-semibold"
                style={{
                  background: "linear-gradient(90deg, rgba(0,114,255,0.18), rgba(0,198,255,0.12))",
                  border: "1px solid rgba(0,198,255,0.35)",
                  color: "#00C6FF",
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {language === "hindi" ? "यह FD समझाएं" : language === "tamil" ? "FD விளக்கு" : language === "marathi" ? "हे FD समजावा" : language === "bengali" ? "এই FD বুঝিয়ে দাও" : "Explain this FD"}
              </button>
              {/* Open FD chip — highlighted entry point */}
              <button
                onClick={() => sendRef.current("I need help in opening an FD")}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full transition-all font-semibold"
                style={{
                  background: "linear-gradient(90deg, rgba(108,99,255,0.18), rgba(0,198,255,0.10))",
                  border: "1px solid rgba(108,99,255,0.40)",
                  color: "#a78bfa",
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="22" x2="21" y2="22" />
                  <rect x="2" y="11" width="20" height="11" />
                  <polygon points="12 2 2 11 22 11" />
                </svg>{" "}
                {language === "hindi" ? "FD खोलने में मदद" : language === "tamil" ? "FD திறக்க உதவி" : language === "marathi" ? "FD उघडण्यात मदत" : language === "bengali" ? "FD খুলতে সাহায্য" : "Need Help in Opening an FD"}
              </button>
              {QUICK_START.map((chip) => (
                <button key={chip.label} onClick={() => sendRef.current(chip.label)}
                  className="chip-glow text-[#A0AEC0] hover:text-white text-sm px-4 py-2 rounded-full transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-[#718096] text-[10px] leading-none mt-1">FD Saathi · Not financial advice · Always verify with your bank</p>
        </div>
      </div>

      {showCalculator && <CalculatorModal language={language} onClose={() => setShowCalculator(false)} />}
      {showBooking && <BookingModal language={language} onClose={() => setShowBooking(false)} />}
      {showTDS && <TDSCalculatorModal language={language} onClose={() => setShowTDS(false)} />}
      {showInvest && <InvestFlowModal onClose={() => setShowInvest(false)} />}
      {showExplain && (
        <ExplainFDModal
          language={language}
          onClose={() => setShowExplain(false)}
          onExplain={(text) => { setShowExplain(false); sendRef.current(text); }}
        />
      )}
    </div>
  );
}
