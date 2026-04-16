"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import CalculatorModal from "@/components/CalculatorModal";
import BookingModal from "@/components/BookingModal";
import Sidebar from "@/components/Sidebar";
import type { Language, Message } from "@/lib/types";
import { loadCurrentSession, getAllSessions, saveCurrentSession } from "@/lib/storage";

export default function ChatPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [language, setLanguage] = useState<Language>((params.get("lang") as Language) || "english");
  const [showCalculator, setShowCalculator] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(undefined);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sessionParam = params.get("session");
    const queryParam = params.get("q");

    if (sessionParam) {
      // First try sessionStorage (set by dashboard for instant load)
      const cached = sessionStorage.getItem("resume_session");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.id === sessionParam) {
            sessionStorage.removeItem("resume_session");
            setSessionId(parsed.id);
            setInitialMessages(parsed.messages);
            return;
          }
        } catch {}
      }
      // Fallback to localStorage
      const all = getAllSessions();
      const found = all.find((s) => s.id === sessionParam);
      if (found) {
        setSessionId(found.id);
        setInitialMessages(found.messages);
        return;
      }
    }

    if (!queryParam) {
      const last = loadCurrentSession();
      if (last) {
        setSessionId(last.id);
        setInitialMessages(last.messages);
        return;
      }
    }

    if (queryParam) setInitialQuery(queryParam);
  }, []);

  function handleNewChat() {
    setSessionId(undefined);
    setInitialMessages(undefined);
    setInitialQuery(undefined);
    router.push(`/chat?lang=${language}`);
    setSidebarOpen(false);
  }

  function handleSelectSession(id: string) {
    const all = getAllSessions();
    const found = all.find((s) => s.id === id);
    if (found) {
      setSessionId(found.id);
      setInitialMessages(found.messages);
      setInitialQuery(undefined);
      setSidebarOpen(false);
    }
  }

  return (
    <div className="app-bg min-h-screen flex relative">
      {/* Decorative orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        activeSessionId={sessionId}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3.5 glass border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[#718096] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => router.push("/")} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                <img src="/logo.png" alt="FD Copilot" className="w-full h-full object-cover scale-[2]" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-white font-bold text-base leading-tight">FD Copilot</span>
                <span className="text-[#718096] text-xs leading-tight">AI FD Advisor</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalculator(true)}
              className="glass text-[#A0AEC0] hover:text-white text-sm px-3 py-2 rounded-full transition-all hover:bg-white/[0.08] hidden sm:flex items-center gap-1.5 border border-white/[0.06]"
            >
              🧮 <span>Calculator</span>
            </button>
            <Link
              href="/fd-plans"
              className="glass text-[#A0AEC0] hover:text-white text-sm px-3 py-2 rounded-full transition-all hover:bg-white/[0.08] hidden sm:flex items-center gap-1.5 border border-white/[0.06]"
            >
              📊 <span>FD Plans</span>
            </Link>
            <button
              onClick={() => setShowBooking(true)}
              className="glass text-[#A0AEC0] hover:text-white text-sm px-3 py-2 rounded-full transition-all hover:bg-white/[0.08] hidden sm:flex items-center gap-1.5 border border-white/[0.06]"
            >
              📋 <span>Invest</span>
            </button>

            {/* Language — highlighted */}
            <div className="lang-badge flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <span className="text-[#00C6FF] text-xs hidden sm:block">🌐</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
              >
                <option value="english" className="text-black bg-gray-900">🇬🇧 EN</option>
                <option value="hindi" className="text-black bg-gray-900">🇮🇳 HI</option>
                <option value="tamil" className="text-black bg-gray-900">🇮🇳 TA</option>
              </select>
            </div>
          </div>
        </header>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            language={language}
            sessionId={sessionId}
            initialMessages={initialMessages}
            initialQuery={initialQuery}
            onSessionCreated={setSessionId}
            onOpenCalculator={() => setShowCalculator(true)}
            onOpenBooking={() => setShowBooking(true)}
          />
        </div>
      </div>

      {showCalculator && <CalculatorModal language={language} onClose={() => setShowCalculator(false)} />}
      {showBooking && <BookingModal language={language} onClose={() => setShowBooking(false)} />}
    </div>
  );
}
