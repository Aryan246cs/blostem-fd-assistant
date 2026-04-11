"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type Language = "english" | "hindi" | "tamil";

// Starter suggestions per language
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

// Highlight ₹ amounts and % in responses
function highlightNumbers(text: string) {
  const parts = text.split(/(₹[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?%)/g);
  return parts.map((part, i) =>
    /₹|%/.test(part) ? (
      <span key={i} className="font-semibold text-green-700 bg-green-50 px-0.5 rounded">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default function ChatInterface({
  language,
  onOpenCalculator,
  onOpenBooking,
}: {
  language: Language;
  onOpenCalculator: () => void;
  onOpenBooking: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        language === "hindi"
          ? "नमस्ते! मैं आपका FD सहायक हूं। Fixed Deposit के बारे में कोई भी सवाल पूछें — मैं सरल भाषा में समझाऊंगा।"
          : language === "tamil"
          ? "வணக்கம்! நான் உங்கள் FD உதவியாளர். Fixed Deposit பற்றி எந்த கேள்வியும் கேளுங்கள்."
          : "Hi! I'm your FD Copilot. Ask me anything about Fixed Deposits — I'll explain in simple language with real numbers.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Listen for external eval queries (from "Is this a good FD?" button)
  useEffect(() => {
    function handleEvalQuery(e: CustomEvent) {
      sendMessage(e.detail);
    }
    window.addEventListener("fd-eval-query", handleEvalQuery as EventListener);
    return () => window.removeEventListener("fd-eval-query", handleEvalQuery as EventListener);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          language === "hindi"
            ? "नमस्ते! मैं आपका FD सहायक हूं। Fixed Deposit के बारे में कोई भी सवाल पूछें।"
            : language === "tamil"
            ? "வணக்கம்! நான் உங்கள் FD உதவியாளர். Fixed Deposit பற்றி கேளுங்கள்."
            : "Hi! I'm your FD Copilot. Ask me anything about Fixed Deposits.",
        timestamp: new Date(),
      },
    ]);
  }, [language]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/chat`, {
        message: text,
        preferredLanguage: language,
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't connect to the server. Make sure the backend is running on port 3001.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Voice input using Web Speech API
  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === "hindi" ? "hi-IN" : language === "tamil" ? "ta-IN" : "en-IN";
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 chat-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0 mt-1">
                ₹
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-green-600 text-white rounded-tr-sm"
                  : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <p className="whitespace-pre-wrap">{highlightNumbers(msg.content)}</p>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {/* Action buttons after assistant messages */}
              {msg.role === "assistant" && msg.id !== "welcome" && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    onClick={onOpenCalculator}
                    className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full hover:bg-green-100 transition-colors"
                  >
                    🧮 Calculate Returns
                  </button>
                  <button
                    onClick={onOpenBooking}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    📋 Invest Now
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0">
              ₹
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1 items-center h-4">
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full block" />
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full block" />
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full block" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS[language].map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:border-green-400 hover:text-green-700 transition-colors shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-400 transition-all">
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
                : "Ask about Fixed Deposits..."
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32"
            style={{ minHeight: "24px" }}
          />
          {/* Mic button */}
          <button
            onClick={toggleVoice}
            className={`p-1.5 rounded-full transition-colors ${
              isListening
                ? "bg-red-100 text-red-600 animate-pulse"
                : "text-gray-400 hover:text-green-600 hover:bg-green-50"
            }`}
            title="Voice input (Chrome only)"
          >
            🎤
          </button>
          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">
          FD Copilot · Not financial advice · Always verify with your bank
        </p>
      </div>
    </div>
  );
}
