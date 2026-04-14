/**
 * localStorage helpers for chat persistence
 * Saves current session so reload restores instantly
 */

import type { Message, ChatSession } from "./types";

const CURRENT_SESSION_KEY = "fd_copilot_current_session";
const ALL_SESSIONS_KEY = "fd_copilot_sessions";

export function saveCurrentSession(session: ChatSession) {
  try {
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    const all = getAllSessions();
    // Remove any stale local_ entry that this session replaced
    const filtered = all.filter((s) => {
      if (s.id === session.id) return false; // will re-add below
      if (s.id.startsWith("local_") && !session.id.startsWith("local_")) return false; // drop orphaned local draft
      return true;
    });
    filtered.unshift(session);
    localStorage.setItem(ALL_SESSIONS_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {}
}

export function loadCurrentSession(): ChatSession | null {
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAllSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(ALL_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteSession(id: string) {
  try {
    const all = getAllSessions().filter((s) => s.id !== id);
    localStorage.setItem(ALL_SESSIONS_KEY, JSON.stringify(all));
    const current = loadCurrentSession();
    if (current?.id === id) localStorage.removeItem(CURRENT_SESSION_KEY);
  } catch {}
}

export function clearCurrentSession() {
  try {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  } catch {}
}

/** Build a local session object from messages (before backend assigns an id) */
export function buildLocalSession(messages: Message[], existingId?: string): ChatSession {
  const firstUserMsg = messages.find((m) => m.role === "user");
  return {
    id: existingId || "local_" + Date.now(),
    title: firstUserMsg
      ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
      : "New Chat",
    messages,
    createdAt: messages[0]?.timestamp || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
