"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllSessions, clearCurrentSession } from "@/lib/storage";
import type { Language, ChatSession } from "@/lib/types";

const CHIPS = [
  { label: "Calculate FD returns", icon: "🧮" },
  { label: "Is FD safe?", icon: "🛡️" },
  { label: "Best FD rates today", icon: "📈" },
  { label: "Compare FD vs Mutual Funds", icon: "⚖️" },
  { label: "How to open an FD?", icon: "🏦" },
  { label: "What is TDS on FD?", icon: "📋" },
];

const FD_TOOLS = [
  { icon: "🧮", label: "FD Calculator", desc: "Compute maturity amount" },
  { icon: "🏦", label: "Compare Banks", desc: "Side-by-side rate comparison" },
  { icon: "📊", label: "Tax Estimator", desc: "Estimate TDS on interest" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<Language>("english");
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setRecentSessions(getAllSessions().slice(0, 3));
  }, []);

  function startChat(query?: string) {
    clearCurrentSession();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("lang", language);
    router.push(`/chat?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) startChat(input.trim());
  }

  function resumeChat(sessionId: string) {
    router.push(`/chat?session=${sessionId}&lang=${language}`);
  }

  return (
    <div className="app-bg min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 glass border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="FD Copilot" className="w-full h-full object-cover scale-[2] drop-shadow-lg" />
            </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight tracking-wide">FD Copilot</span>
            <span className="text-blue-300/70 text-xs leading-tight">Your AI Fixed Deposit Advisor</span>
          </div>
        </div>

        {/* Language selector — highlighted as a key feature */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/40 rounded-full px-3 py-1.5">
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider hidden sm:block">🌐 Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
            >
              <option value="english" className="text-black bg-gray-900">English</option>
              <option value="hindi" className="text-black bg-gray-900">हिंदी</option>
              <option value="tamil" className="text-black bg-gray-900">தமிழ்</option>
            </select>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 -mt-8">
        <div className="w-full max-w-2xl flex flex-col items-center gap-6">

          {/* Greeting */}
          <div className="text-center">
            <p className="text-blue-300 text-lg font-medium mb-2">{getGreeting()}</p>
            <h1 className="text-white text-6xl sm:text-4xl font-bold leading-tight">
              How can I help you grow your <br />savings today?
            </h1>
          </div>

          {/* Floating input */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="glass input-glow rounded-2xl px-4 py-3 flex items-center gap-3 transition-all">
              <button
                type="button"
                onClick={() => startChat()}
                className="text-blue-300 hover:text-white transition-colors flex-shrink-0"
                title="New chat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  language === "hindi"
                    ? "FD दरें, रिटर्न, सुरक्षा के बारे में पूछें..."
                    : language === "tamil"
                    ? "FD விகிதங்கள், வருமானம் பற்றி கேளுங்கள்..."
                    : "Ask about FD rates, returns, safety, or investments..."
                }
                className="flex-1 bg-transparent text-white placeholder-blue-300/60 text-base focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex-shrink-0 w-8 h-8 bg-blue-500 hover:bg-blue-400 disabled:opacity-30 rounded-xl flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => startChat(chip.label)}
                className="chip-glow glass text-blue-100 text-sm px-4 py-2 rounded-full hover:bg-white/15 transition-all"
              >
                {chip.icon} {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard cards */}
        <div className="w-full max-w-4xl mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">

          {/* Card 1: Recent Chats */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
              🕐 Recent Chats
            </h3>
            {recentSessions.length === 0 ? (
              <p className="text-white/40 text-sm">No chats yet. Start a conversation above.</p>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => resumeChat(s.id)}
                    className="w-full text-left p-2 rounded-xl hover:bg-white/10 transition-colors group"
                  >
                    <p className="text-white text-sm font-medium truncate group-hover:text-blue-300 transition-colors">
                      {s.title}
                    </p>
                    <p className="text-white/40 text-sm mt-0.5">{timeAgo(s.updatedAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: FD Tools */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
              🛠️ FD Tools
            </h3>
            <div className="space-y-2">
              {FD_TOOLS.map((tool) => (
                <button
                  key={tool.label}
                  onClick={() => startChat(tool.label)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <span className="text-lg">{tool.icon}</span>
                  <div className="text-left">
                    <p className="text-white text-sm font-medium group-hover:text-blue-300 transition-colors">
                      {tool.label}
                    </p>
                    <p className="text-white/40 text-sm">{tool.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: Continue / Quick Start */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
              ⚡ Quick Start
            </h3>
            <div className="space-y-2">
              {[
                { q: "How much will ₹1 lakh become in 2 years at 7.5%?", icon: "💰" },
                { q: "Is 8.5% FD from a small finance bank safe?", icon: "🛡️" },
                { q: "What is 12M tenure in FD?", icon: "📅" },
              ].map((item) => (
                <button
                  key={item.q}
                  onClick={() => startChat(item.q)}
                  className="w-full text-left flex items-start gap-2 p-2 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <span className="text-sm mt-0.5">{item.icon}</span>
                  <p className="text-white/70 text-sm group-hover:text-white transition-colors leading-relaxed">
                    {item.q}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center pb-4 text-white/20 text-xs">
        FD Copilot · Not financial advice · Always verify with your bank
      </footer>
    </div>
  );
}
