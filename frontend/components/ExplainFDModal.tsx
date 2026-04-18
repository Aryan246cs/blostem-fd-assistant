"use client";

import { useState } from "react";
import type { Language } from "@/lib/types";

const EXAMPLES = [
  "Suryoday SFB — 8.50% p.a. — 12M tenor",
  "SBI FD — 6.80% p.a. — 2 year — cumulative",
  "HDFC Bank — 7.10% p.a. — 15 months — non-cumulative",
  "Bajaj Finance FD — 8.05% p.a. — 36M — DICGC insured",
];

const UI: Record<Language, {
  title: string; sub: string; label: string;
  placeholder: string; btn: string; exampleLabel: string;
}> = {
  english: {
    title: "Explain this FD",
    sub: "Paste any FD offer — we'll break it down in plain language",
    label: "FD offer string",
    placeholder: 'e.g. "Suryoday SFB — 8.50% p.a. — 12M tenor"',
    btn: "Explain in simple language →",
    exampleLabel: "Try an example",
  },
  hindi: {
    title: "यह FD समझाएं",
    sub: "कोई भी FD ऑफर पेस्ट करें — हम इसे आसान भाषा में समझाएंगे",
    label: "FD ऑफर",
    placeholder: 'जैसे "Suryoday SFB — 8.50% p.a. — 12M tenor"',
    btn: "आसान भाषा में समझाएं →",
    exampleLabel: "उदाहरण आज़माएं",
  },
  tamil: {
    title: "இந்த FD விளக்குங்கள்",
    sub: "எந்த FD சலுகையையும் ஒட்டுங்கள் — எளிய மொழியில் விளக்குகிறோம்",
    label: "FD சலுகை",
    placeholder: '"Suryoday SFB — 8.50% p.a. — 12M tenor"',
    btn: "எளிய மொழியில் விளக்கு →",
    exampleLabel: "உதாரணம் முயற்சிக்கவும்",
  },
  marathi: {
    title: "हे FD समजावून सांगा",
    sub: "कोणताही FD ऑफर पेस्ट करा — आम्ही सोप्या भाषेत सांगतो",
    label: "FD ऑफर",
    placeholder: '"Suryoday SFB — 8.50% p.a. — 12M tenor"',
    btn: "सोप्या भाषेत समजावून सांगा →",
    exampleLabel: "उदाहरण वापरा",
  },
  bengali: {
    title: "এই FD বুঝিয়ে দিন",
    sub: "যেকোনো FD অফার পেস্ট করুন — সহজ ভাষায় বুঝিয়ে দেব",
    label: "FD অফার",
    placeholder: '"Suryoday SFB — 8.50% p.a. — 12M tenor"',
    btn: "সহজ ভাষায় বুঝিয়ে দিন →",
    exampleLabel: "উদাহরণ দেখুন",
  },
};

export default function ExplainFDModal({
  language = "english",
  onClose,
  onExplain,
}: {
  language?: Language;
  onClose: () => void;
  onExplain: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const u = UI[language] ?? UI.english;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onExplain(`Explain this FD offer in simple terms: "${trimmed}"`);
    onClose();
  }

  function useExample(ex: string) {
    setValue(ex);
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "linear-gradient(135deg, #0F1C4D 0%, #1A2A6C 100%)",
          border: "1px solid rgba(0,198,255,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5">
            {/* magnifier + spark icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#00C6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <div>
              <p className="text-white font-bold text-base leading-tight">{u.title}</p>
              <p className="text-[#718096] text-xs leading-tight">{u.sub}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#718096] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Textarea */}
          <div className="space-y-1.5">
            <label className="text-[#A0AEC0] text-xs font-semibold uppercase tracking-wider">
              {u.label}
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={u.placeholder}
              rows={3}
              autoFocus
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#4A5568] resize-none focus:outline-none focus:ring-2 focus:ring-[#00C6FF]/50 transition-all leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>

          {/* Example chips */}
          <div className="space-y-2">
            <p className="text-[#718096] text-xs font-semibold">{u.exampleLabel}</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => useExample(ex)}
                  className="text-left text-xs px-3 py-2 rounded-lg transition-all truncate"
                  style={{
                    background: value === ex ? "rgba(0,198,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: value === ex ? "1px solid rgba(0,198,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
                    color: value === ex ? "#00C6FF" : "#A0AEC0",
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={!value.trim()}
            className="btn-accent w-full py-3 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {u.btn}
          </button>
        </form>
      </div>
    </div>
  );
}
