"use client";

import { useState } from "react";

type Mode = "app" | "bank";
type Language = "english" | "hindi" | "tamil" | "marathi" | "bengali";

// ── Icons ──────────────────────────────────────────────────────────────────
const icons = {
  amount: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  compare: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  login: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
  bank: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" />
    </svg>
  ),
  form: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  review: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  payment: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
};

// ── App Guide Steps ────────────────────────────────────────────────────────
const APP_STEPS = [
  {
    icon: icons.amount,
    title: "Enter Investment Amount",
    desc: "Choose how much you want to invest — ₹10,000, ₹50,000, ₹1,00,000 or a custom amount. This becomes your principal.",
    tag: "Step 1",
  },
  {
    icon: icons.calendar,
    title: "Select Tenure",
    desc: "Pick how long you want to keep your money invested — 6 months, 1 year, 2 years, or 5 years. Longer tenure usually means higher returns.",
    tag: "Step 2",
  },
  {
    icon: icons.target,
    title: "Choose Your Goal",
    desc: "Safe savings, high returns, monthly income, or tax saving (80C). This helps us recommend the best FD for you.",
    tag: "Step 3",
  },
  {
    icon: icons.compare,
    title: "Compare & Select Bank",
    desc: 'View top FD options ranked for you — see interest rate, maturity amount, and comparison insights. Click "Proceed with this FD".',
    tag: "Step 4",
  },
  {
    icon: icons.user,
    title: "Enter Basic Details",
    desc: "Provide your name and PAN number. Amount and tenure are pre-filled from your earlier choices.",
    tag: "Step 5",
  },
  {
    icon: icons.check,
    title: "FD Created (Simulation)",
    desc: "Your FD is successfully \"booked\". You can see the maturity amount and total returns at a glance.",
    tag: "Done 🎉",
    highlight: true,
  },
];

// ── Real Bank Steps ────────────────────────────────────────────────────────
const BANK_STEPS = [
  {
    icon: icons.login,
    title: "Login to Bank App or Website",
    desc: "Open your bank's mobile app or website. Login using your Customer ID / Username and Password or MPIN.",
    tag: "Step 1",
    imgSlot: 0,
  },
  {
    icon: icons.bank,
    title: "Go to Deposits / FD Section",
    desc: 'Look for options like "Fixed Deposit", "Open FD", or "Term Deposit" in the main menu or home screen.',
    tag: "Step 2",
    imgSlot: 1,
  },
  {
    icon: icons.form,
    title: "Enter FD Details",
    desc: "Enter the amount you want to invest, the tenure (time period), and payout type — monthly interest or at maturity.",
    tag: "Step 3",
    imgSlot: 2,
  },
  {
    icon: icons.review,
    title: "Select Account & Review",
    desc: "Choose the account to debit money from. Review the interest rate, maturity amount, and terms & conditions carefully.",
    tag: "Step 4",
    imgSlot: 3,
  },
  {
    icon: icons.shield,
    title: "Complete KYC / Verification",
    desc: "Enter the OTP sent to your registered mobile or complete Aadhaar verification. This confirms your identity.",
    tag: "Step 5",
    imgSlot: 4,
  },
  {
    icon: icons.payment,
    title: "Payment & Confirmation",
    desc: "Money is debited from your account and the FD is created instantly. You receive a confirmation message and FD receipt.",
    tag: "Done 🎉",
    imgSlot: 5,
    highlight: true,
  },
];

export default function BookingModal({ language, onClose }: { language?: Language; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("app");

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "linear-gradient(135deg, #0F1C4D 0%, #1A2A6C 100%)",
          border: "1px solid rgba(0,198,255,0.15)",
          maxHeight: "90vh",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#00C6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" />
            </svg>
            <span className="text-white font-bold text-base">FD Booking Guide</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#718096] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08]"
          >
            ✕
          </button>
        </div>

        {/* ── Toggle ── */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={() => setMode("app")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                mode === "app"
                  ? { background: "linear-gradient(90deg,#0072FF,#00C6FF)", color: "#fff", boxShadow: "0 2px 12px rgba(0,114,255,0.35)" }
                  : { color: "#718096" }
              }
            >
              FD Saathi Guide
            </button>
            <button
              onClick={() => setMode("bank")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                mode === "bank"
                  ? { background: "linear-gradient(90deg,#0072FF,#00C6FF)", color: "#fff", boxShadow: "0 2px 12px rgba(0,114,255,0.35)" }
                  : { color: "#718096" }
              }
            >
              Real Bank Process
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto chat-scroll px-5 pb-5 pt-3 space-y-3">

          {/* ══ APP GUIDE ══ */}
          {mode === "app" && (
            <>
              <div className="mb-1">
                <p className="text-white font-bold text-base">How FD booking works in FD Saathi</p>
                <p className="text-[#718096] text-xs mt-0.5">A step-by-step walkthrough of the simulation flow</p>
              </div>

              {/* Steps */}
              <div className="relative">
                <div className="space-y-0">
                  {APP_STEPS.map((s, i) => (
                    <>
                      <div
                        key={i}
                        className="flex gap-3 rounded-xl p-3.5 transition-all"
                        style={{
                          background: s.highlight ? "rgba(0,198,255,0.07)" : "rgba(255,255,255,0.03)",
                          border: s.highlight ? "1px solid rgba(0,198,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* Step number bubble */}
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                          style={{ background: s.highlight ? "linear-gradient(135deg,#0072FF,#00C6FF)" : "rgba(0,198,255,0.12)", border: "1px solid rgba(0,198,255,0.25)" }}
                        >
                          <span style={{ color: s.highlight ? "#fff" : "#00C6FF" }}>{s.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(0,198,255,0.12)", color: "#00C6FF" }}
                            >
                              {s.tag}
                            </span>
                          </div>
                          <p className="text-white text-sm font-semibold leading-snug">{s.title}</p>
                          <p className="text-[#A0AEC0] text-xs mt-1 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                      {i < APP_STEPS.length - 1 && (
                        <div className="flex" style={{ height: "12px" }}>
                          <div style={{ width: "36px", flexShrink: 0 }} className="flex justify-center">
                            <div className="w-0.5 h-full" style={{ background: "linear-gradient(180deg, rgba(0,198,255,0.55) 0%, rgba(0,114,255,0.3) 100%)" }} />
                          </div>
                        </div>
                      )}
                    </>
                  ))}
                </div>
              </div>

              {/* ⚠️ Simulation warning box */}
              <div
                className="rounded-xl p-4 mt-2"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}
              >
                <p className="text-amber-400 font-bold text-sm mb-1">⚠️ This is a simulation</p>
                <p className="text-[#A0AEC0] text-xs leading-relaxed">
                  This demo shows how FD booking works inside FD Saathi. In real life, you need to invest actual money using your bank account, UPI, or net banking to create an FD.
                </p>
              </div>
            </>
          )}

          {/* ══ REAL BANK GUIDE ══ */}
          {mode === "bank" && (
            <>
              <div className="mb-1">
                <p className="text-white font-bold text-base">How to Book an FD in Real Banks</p>
                <p className="text-[#718096] text-xs mt-0.5">Works for SBI, HDFC, ICICI, Axis, Kotak and most other banks</p>
              </div>

              <div className="relative">
                <div className="space-y-0">
                  {BANK_STEPS.map((s, i) => (
                    <>
                      <div
                        key={i}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{
                          background: s.highlight ? "rgba(0,198,255,0.07)" : "rgba(255,255,255,0.03)",
                          border: s.highlight ? "1px solid rgba(0,198,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex gap-3 p-3.5">
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: s.highlight ? "linear-gradient(135deg,#0072FF,#00C6FF)" : "rgba(0,198,255,0.12)", border: "1px solid rgba(0,198,255,0.25)" }}
                          >
                            <span style={{ color: s.highlight ? "#fff" : "#00C6FF" }}>{s.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(0,198,255,0.12)", color: "#00C6FF" }}
                              >
                                {s.tag}
                              </span>
                            </div>
                            <p className="text-white text-sm font-semibold leading-snug">{s.title}</p>
                            <p className="text-[#A0AEC0] text-xs mt-1 leading-relaxed">{s.desc}</p>
                          </div>
                        </div>
                      </div>
                      {i < BANK_STEPS.length - 1 && (
                        <div className="flex" style={{ height: "12px" }}>
                          <div style={{ width: "36px", flexShrink: 0 }} className="flex justify-center">
                            <div className="w-0.5 h-full" style={{ background: "linear-gradient(180deg, rgba(0,198,255,0.55) 0%, rgba(0,114,255,0.3) 100%)" }} />
                          </div>
                        </div>
                      )}
                    </>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div
                className="rounded-xl p-4 mt-2"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}
              >
                <p className="text-indigo-400 font-bold text-sm mb-1">💡 Good to know</p>
                <p className="text-[#A0AEC0] text-xs leading-relaxed">
                  Most banks complete FD booking in under 5 minutes online. Keep your PAN card and Aadhaar handy. Minimum FD amount is usually ₹1,000 – ₹10,000 depending on the bank.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
