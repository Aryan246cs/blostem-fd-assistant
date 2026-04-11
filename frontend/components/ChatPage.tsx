"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import CalculatorModal from "@/components/CalculatorModal";
import BookingModal from "@/components/BookingModal";
import Sidebar from "@/components/Sidebar";
import type { Language, Message } from "@/lib/types";
import { loadCurrentSession, getAllSessions, buildLocalSession, saveCurrentSession } from "@/lib/storage";

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
      // Resume a specific session from localStorage
      const all = getAllSessions();
      const found = all.find((s) => s.id === sessionParam);
      if (found) {
        setSessionId(found.id);
        setInitialMessages(found.messages);
        return;
      }
    }

    // Try restoring last session if no query param
    if (!queryParam) {
      const last = loadCurrentSession();
      if (last) {
        setSessionId(last.id);
        setInitialMessages(last.messages);
        return;
      }
    }

    // New chat with optional prefilled query
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
    <div className="app-bg min-h-screen flex">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        activeSessionId={sessionId}
      />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Chat header */}
        <header className="flex items-center justify-between px-4 py-3 glass border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => router.push("/")} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                <img src="/logo.png" alt="FD Copilot" className="w-full h-full object-cover scale-[2] drop-shadow-lg" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-white font-bold text-base leading-tight">FD Copilot</span>
                <span className="text-blue-300/60 text-xs leading-tight">AI FD Advisor</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Tool buttons */}
            <button
              onClick={() => setShowCalculator(true)}
              className="glass text-white/80 hover:text-white text-sm px-3 py-2 rounded-full transition-all hover:bg-white/15 hidden sm:flex items-center gap-1"
            >
              🧮 Calculator
            </button>
            <button
              onClick={() => setShowBooking(true)}
              className="glass text-white/80 hover:text-white text-sm px-3 py-2 rounded-full transition-all hover:bg-white/15 hidden sm:flex items-center gap-1"
            >
              📋 Invest
            </button>

            {/* Language selector — highlighted */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/40 rounded-full px-3 py-1.5">
              <span className="text-blue-300 text-xs hidden sm:block">🌐</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
              >
                <option value="english" className="text-black bg-gray-900">🇬🇧 EN</option>
                <option value="hindi" className="text-black bg-gray-900">🇮🇳 HI</option>
                <option value="tamil" className="text-black bg-gray-900">🇮🇳 TA</option>
              </select>
            </div>
          </div>
        </header>

        {/* Chat interface */}
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

      {showCalculator && (
        <CalculatorModal language={language} onClose={() => setShowCalculator(false)} />
      )}
      {showBooking && (
        <BookingModal language={language} onClose={() => setShowBooking(false)} />
      )}
    </div>
  );
}
