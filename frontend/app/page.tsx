"use client";

import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import CalculatorModal from "@/components/CalculatorModal";
import BookingModal from "@/components/BookingModal";

export default function Home() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [language, setLanguage] = useState<"english" | "hindi" | "tamil">("english");

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            ₹
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base leading-tight">FD Copilot</h1>
            <p className="text-xs text-gray-500">Fixed Deposit Assistant</p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden sm:block">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="english">🇬🇧 English</option>
            <option value="hindi">🇮🇳 हिंदी</option>
            <option value="tamil">🇮🇳 தமிழ்</option>
          </select>
        </div>
      </header>

      {/* Quick Action Buttons */}
      <div className="flex gap-2 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
        <button
          onClick={() => setShowCalculator(true)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-green-700 transition-colors"
        >
          🧮 Calculate Returns
        </button>
        <button
          onClick={() => setShowBooking(true)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-700 transition-colors"
        >
          📋 Invest Now
        </button>
        <button
          onClick={() => {
            // Trigger a chat message asking for FD evaluation
            const evalMsg = language === "hindi"
              ? "मुझे बताएं कि 7% ब्याज पर 1 साल का FD अच्छा है या नहीं?"
              : language === "tamil"
              ? "7% வட்டியில் 1 வருட FD நல்லதா என்று சொல்லுங்கள்?"
              : "Is a 1-year FD at 7% interest rate a good investment?";
            // We'll dispatch a custom event that ChatInterface listens to
            window.dispatchEvent(new CustomEvent("fd-eval-query", { detail: evalMsg }));
          }}
          className="flex-shrink-0 flex items-center gap-1.5 bg-orange-500 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-orange-600 transition-colors"
          title="Ask the AI to evaluate an FD"
        >
          🤔 Is this a good FD?
        </button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          language={language}
          onOpenCalculator={() => setShowCalculator(true)}
          onOpenBooking={() => setShowBooking(true)}
        />
      </div>

      {/* Modals */}
      {showCalculator && (
        <CalculatorModal language={language} onClose={() => setShowCalculator(false)} />
      )}
      {showBooking && (
        <BookingModal language={language} onClose={() => setShowBooking(false)} />
      )}
    </main>
  );
}
