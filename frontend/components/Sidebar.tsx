"use client";

import { useEffect, useState } from "react";
import { getAllSessions, deleteSession } from "@/lib/storage";
import type { ChatSession } from "@/lib/types";
import InvestFlowModal from "@/components/InvestFlowModal";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Sidebar({
  open,
  onClose,
  onNewChat,
  onSelectSession,
  activeSessionId,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  activeSessionId?: string;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showInvest, setShowInvest] = useState(false);

  useEffect(() => {
    setSessions(getAllSessions());
  }, [open]);

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteSession(id);
    setSessions(getAllSessions());
  }

  return (
    <>
      <aside
      className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full"
      } lg:relative lg:translate-x-0 lg:z-auto ${open ? "lg:flex" : "lg:hidden"}`}
      style={{
        background: "linear-gradient(180deg, #0B0F2A 0%, #0F1C4D 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C6FF] inline-block" />
          Chat History
        </span>
        <button onClick={onClose} className="text-[#718096] hover:text-white transition-colors lg:hidden p-1 rounded-lg hover:bg-white/[0.06]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 py-3 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(90deg, rgba(0,114,255,0.2) 0%, rgba(0,198,255,0.15) 100%)",
            border: "1px solid rgba(0,198,255,0.25)",
          }}
        >
          <svg className="w-4 h-4 text-[#00C6FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>

        {/* Invest in FD */}
        <button
          onClick={() => setShowInvest(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-[1.02] group"
          style={{
            background: "linear-gradient(90deg, rgba(108,99,255,0.2) 0%, rgba(0,198,255,0.12) 100%)",
            border: "1px solid rgba(108,99,255,0.3)",
          }}
        >
          <svg className="w-4 h-4 icon-tint opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <div className="text-left">
            <p className="text-white text-sm font-medium leading-tight group-hover:text-[#00C6FF] transition-colors">Invest in FD</p>
            <p className="text-[#718096] text-xs leading-tight">Booking guide</p>
          </div>
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 chat-scroll">
        {sessions.length === 0 ? (
          <p className="text-[#718096] text-xs text-center mt-8">No previous chats</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSession(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group flex items-start justify-between gap-2 ${
                s.id === activeSessionId
                  ? "text-white"
                  : "text-[#A0AEC0] hover:text-white hover:bg-white/[0.05]"
              }`}
              style={
                s.id === activeSessionId
                  ? { background: "rgba(0,198,255,0.08)", border: "1px solid rgba(0,198,255,0.2)" }
                  : {}
              }
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-[#718096] text-xs mt-0.5">{timeAgo(s.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => handleDelete(e, s.id)}
                className="opacity-0 group-hover:opacity-100 text-[#718096] hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </button>
          ))
        )}
      </div>
    </aside>
    {showInvest && <InvestFlowModal onClose={() => setShowInvest(false)} />}
  </>;
}

