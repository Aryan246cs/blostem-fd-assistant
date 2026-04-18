"use client";

import { useState } from "react";
import fdPlans from "@/data/fdPlans.json";
import type { FDPlan } from "@/lib/types";

// ── Maturity calculation: compound interest, quarterly compounding ──
// A = P * (1 + r/n)^(n*t)  where n=4 (quarterly)
function calcMaturity(principal: number, ratePercent: number, years: number): number {
  const r = ratePercent / 100;
  const n = 4;
  return Math.round(principal * Math.pow(1 + r / n, n * years));
}

function tenureToYears(tenure: string): number {
  if (tenure === "6 months") return 0.5;
  if (tenure === "1 year") return 1;
  if (tenure === "2 years") return 2;
  if (tenure === "5 years") return 5;
  return 1;
}

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

type Goal = "safe" | "returns" | "income" | "tax";
type Step = "welcome" | "amount" | "duration" | "goal" | "results" | "booking" | "success";

interface RankedPlan extends FDPlan {
  maturity: number;
  rank: number;
}

function getBookingSteps(bank: string, amount: number, tenure: string) {
  return [
    { step: `Open ${bank}'s official website or mobile app`, detail: "Look for the 'Fixed Deposit' or 'Deposits' section on the homepage." },
    { step: `Click on "Fixed Deposit" or "Open FD"`, detail: "You will see a 'Book FD' or 'Open New FD' button prominently displayed." },
    { step: `Enter amount: ${fmt(amount)}`, detail: "Type the principal amount in the FD amount field. Minimum amount varies by bank." },
    { step: `Select tenure: ${tenure}`, detail: "Choose your preferred tenure from the dropdown or calendar picker." },
    { step: "Complete KYC using Aadhaar / PAN", detail: "Keep your Aadhaar and PAN card handy. Most banks do instant e-KYC." },
    { step: "Pay via UPI / Net Banking / Debit Card", detail: "You will be redirected to a payment page. Choose your preferred payment method." },
    { step: "Download your FD receipt", detail: "After successful payment, download or save your FD confirmation receipt." },
  ];
}

export default function InvestFlowModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [duration, setDuration] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [rankedPlans, setRankedPlans] = useState<RankedPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<RankedPlan | null>(null);
  const [simName, setSimName] = useState("");
  const [simPan, setSimPan] = useState("");
  const [simSubmitted, setSimSubmitted] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  function computeRankings(amt: number, dur: string, g: Goal): RankedPlan[] {
    const years = tenureToYears(dur);
    const plans = (fdPlans as FDPlan[]).map((p) => ({
      ...p,
      maturity: calcMaturity(amt, p.maxRate, years),
    }));

    // Sort by goal
    plans.sort((a, b) => {
      if (g === "safe") {
        // Prefer large PSU/private banks (lower rate = safer), then by rate desc
        const safeOrder = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"];
        const ai = safeOrder.indexOf(a.bank);
        const bi = safeOrder.indexOf(b.bank);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return b.maxRate - a.maxRate;
      }
      if (g === "tax") {
        // Tax saving FDs are typically 5-year; prefer banks with good 5yr rates
        return b.maxRate - a.maxRate;
      }
      // "returns" and "income" → highest rate first
      return b.maxRate - a.maxRate;
    });

    return plans.slice(0, 5).map((p, i) => ({ ...p, rank: i + 1 }));
  }

  function handleAmountSelect(val: number) {
    setAmount(val);
    setShowCustom(false);
    setStep("duration");
  }

  function handleCustomSubmit() {
    const val = parseFloat(customAmount.replace(/,/g, ""));
    if (!val || val < 1000) return;
    setAmount(val);
    setShowCustom(false);
    setStep("duration");
  }

  function handleDuration(d: string) {
    setDuration(d);
    setStep("goal");
  }

  function handleGoal(g: Goal) {
    setGoal(g);
    const ranked = computeRankings(amount!, duration!, g);
    setRankedPlans(ranked);
    setStep("results");
  }

  function handleProceed(plan: RankedPlan) {
    setSelectedPlan(plan);
    setStep("booking");
  }

  async function handleSimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!simName.trim() || !simPan.trim() || !selectedPlan) return;
    setBookingLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_URL}/book-fd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: amount,
          rate: selectedPlan.maxRate,
          tenure: tenureToYears(duration!),
          bankName: selectedPlan.bank,
          holderName: simName,
        }),
      });
      const data = await res.json();
      setBookingRef(data.bookingReference ?? "FD" + Date.now().toString().slice(-8));
    } catch {
      setBookingRef("FD" + Date.now().toString().slice(-8));
    } finally {
      setBookingLoading(false);
      setSimSubmitted(true);
      setStep("success");
    }
  }

  const topPlan = rankedPlans[0];
  const lastPlan = rankedPlans[rankedPlans.length - 1];
  const insightDiff = topPlan && lastPlan ? topPlan.maturity - lastPlan.maturity : 0;

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
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#00C6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-white font-bold text-base">Invest in FD</span>
            {step !== "welcome" && step !== "success" && (
              <span className="text-[#718096] text-xs ml-1">
                · {step === "amount" ? "Step 1/4" : step === "duration" ? "Step 2/4" : step === "goal" ? "Step 3/4" : step === "results" ? "Step 4/4" : "Booking"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#718096] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08]"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto chat-scroll p-5 space-y-4">

          {/* ── WELCOME ── */}
          {step === "welcome" && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(0,198,255,0.1)", border: "1px solid rgba(0,198,255,0.25)" }}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#00C6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <p className="text-white text-xl font-bold mb-2">Let's help you open an FD in 2 minutes 😊</p>
                <p className="text-[#A0AEC0] text-sm leading-relaxed">I'll ask a few simple questions and show you the best FD options tailored for you.</p>
              </div>
              <button
                onClick={() => setStep("amount")}
                className="btn-accent px-8 py-3 font-semibold text-base w-full"
              >
                Get Started →
              </button>
            </div>
          )}

          {/* ── AMOUNT ── */}
          {step === "amount" && (
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold text-base mb-1">How much would you like to invest?</p>
                <p className="text-[#718096] text-sm">Choose an amount or enter a custom value.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[10000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAmountSelect(val)}
                    className="chip-glow glass text-white text-sm font-semibold px-4 py-3 rounded-xl border border-white/[0.08] hover:border-[#00C6FF]/40 transition-all text-left"
                  >
                    <span className="text-[#00C6FF] text-base font-bold">{fmt(val)}</span>
                    <br />
                    <span className="text-[#718096] text-xs">{val === 10000 ? "Starter" : val === 50000 ? "Popular" : "Premium"}</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  className="chip-glow glass text-white text-sm font-semibold px-4 py-3 rounded-xl border border-white/[0.08] hover:border-[#00C6FF]/40 transition-all text-left"
                >
                  <span className="text-[#A0AEC0] text-base font-bold">Custom</span>
                  <br />
                  <span className="text-[#718096] text-xs">Enter amount</span>
                </button>
              </div>
              {showCustom && (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount (min ₹1,000)"
                    className="w-full rounded-xl px-3 py-2.5 text-base text-white placeholder-[#718096] focus:outline-none focus:ring-2 focus:ring-[#00C6FF]/50 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    autoFocus
                  />
                  <button
                    onClick={handleCustomSubmit}
                    className="btn-accent w-full py-2.5 font-semibold text-sm"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── DURATION ── */}
          {step === "duration" && (
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold text-base mb-1">For how long?</p>
                <p className="text-[#718096] text-sm">Select your preferred FD tenure.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["6 months", "1 year", "2 years", "5 years"].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDuration(d)}
                    className="chip-glow glass text-white text-sm font-semibold px-4 py-3 rounded-xl border border-white/[0.08] hover:border-[#00C6FF]/40 transition-all"
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("amount")} className="text-[#718096] text-xs hover:text-[#A0AEC0] transition-colors">
                ← Back
              </button>
            </div>
          )}

          {/* ── GOAL ── */}
          {step === "goal" && (
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold text-base mb-1">What's your goal?</p>
                <p className="text-[#718096] text-sm">This helps us rank the best FDs for you.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: "safe" as Goal, label: "Safe savings", sub: "Low risk, trusted banks",
                    svg: <svg className="w-5 h-5 icon-tint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                  },
                  {
                    id: "returns" as Goal, label: "High returns", sub: "Maximize interest earned",
                    svg: <svg className="w-5 h-5 icon-tint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
                  },
                  {
                    id: "income" as Goal, label: "Monthly income", sub: "Regular payout option",
                    svg: <svg className="w-5 h-5 icon-tint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
                  },
                  {
                    id: "tax" as Goal, label: "Tax saving", sub: "80C deduction eligible",
                    svg: <svg className="w-5 h-5 icon-tint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                  },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleGoal(g.id)}
                    className="chip-glow glass text-left px-4 py-3 rounded-xl border border-white/[0.08] hover:border-[#00C6FF]/40 transition-all"
                  >
                    {g.svg}
                    <p className="text-white text-sm font-semibold mt-1.5">{g.label}</p>
                    <p className="text-[#718096] text-xs">{g.sub}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("duration")} className="text-[#718096] text-xs hover:text-[#A0AEC0] transition-colors">
                ← Back
              </button>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === "results" && (
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold text-base">Top FD Options for You</p>
                <p className="text-[#718096] text-xs mt-0.5">
                  {fmt(amount!)} · {duration} · {goal === "safe" ? "Safe savings" : goal === "returns" ? "High returns" : goal === "income" ? "Monthly income" : "Tax saving"}
                </p>
              </div>

              {rankedPlans.map((plan) => (
                <RecommendationCard
                  key={plan.bank}
                  plan={plan}
                  onProceed={() => handleProceed(plan)}
                />
              ))}

              {/* Insight line */}
              {insightDiff > 0 && (
                <div
                  className="rounded-xl px-4 py-3 text-sm flex items-start gap-2.5"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}
                >
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"/>
                    <line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                    <line x1="2" y1="12" x2="6" y2="12"/>
                    <line x1="18" y1="12" x2="22" y2="12"/>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                  <span className="text-emerald-400">
                    Choosing {topPlan.bank} gives you {fmt(insightDiff)} more than {lastPlan.bank}.
                  </span>
                </div>
              )}

              <button onClick={() => setStep("goal")} className="text-[#718096] text-xs hover:text-[#A0AEC0] transition-colors">
                ← Change preferences
              </button>
            </div>
          )}

          {/* ── BOOKING STEPS ── */}
          {step === "booking" && selectedPlan && (
            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold text-base">🏦 {selectedPlan.bank} FD Booking Steps</p>
                <p className="text-[#718096] text-xs mt-0.5">Follow these steps to open your FD</p>
              </div>

              <div className="space-y-3">
                {getBookingSteps(selectedPlan.bank, amount!, duration!).map((s, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ background: "linear-gradient(90deg,#0072FF,#00C6FF)" }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{s.step}</p>
                      <p className="text-[#718096] text-xs mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Simulated booking form */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(0,198,255,0.05)", border: "1px solid rgba(0,198,255,0.2)" }}
              >
                <p className="text-[#00C6FF] text-sm font-semibold">Simulate FD Booking</p>
                <form onSubmit={handleSimSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#718096] focus:outline-none focus:ring-2 focus:ring-[#00C6FF]/50"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <input
                    type="text"
                    value={simPan}
                    onChange={(e) => setSimPan(e.target.value.toUpperCase())}
                    placeholder="PAN Number (e.g. ABCDE1234F)"
                    maxLength={10}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#718096] focus:outline-none focus:ring-2 focus:ring-[#00C6FF]/50"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="rounded-xl px-3 py-2.5 text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <p className="text-[#718096] text-xs">Amount</p>
                      <p className="text-white font-semibold">{fmt(amount!)}</p>
                    </div>
                    <div
                      className="rounded-xl px-3 py-2.5 text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <p className="text-[#718096] text-xs">Tenure</p>
                      <p className="text-white font-semibold">{duration}</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!simName.trim() || !simPan.trim() || bookingLoading}
                    className="btn-accent w-full py-2.5 font-semibold text-sm"
                  >
                    {bookingLoading ? "Booking..." : "Confirm FD (Simulation)"}
                  </button>
                </form>
              </div>

              <button onClick={() => setStep("results")} className="text-[#718096] text-xs hover:text-[#A0AEC0] transition-colors">
                ← Back to results
              </button>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && selectedPlan && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }}
              >
                🎉
              </div>
              <div>
                <p className="text-white text-xl font-bold mb-2">FD Booked Successfully!</p>
                <p className="text-[#A0AEC0] text-sm leading-relaxed">
                  (Simulation) Your investment of {fmt(amount!)} with {selectedPlan.bank} for {duration} is now growing safely.
                </p>
              </div>
              <div
                className="w-full rounded-xl p-4 space-y-2 text-left"
                style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)" }}
              >
                {bookingRef && (
                  <div className="flex justify-between text-sm pb-2 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-[#A0AEC0]">Booking Reference</span>
                    <span className="text-emerald-400 font-bold tracking-widest">{bookingRef}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0AEC0]">Bank</span>
                  <span className="text-white font-semibold">{selectedPlan.bank}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0AEC0]">Principal</span>
                  <span className="text-white font-semibold">{fmt(amount!)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0AEC0]">Tenure</span>
                  <span className="text-white font-semibold">{duration}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0AEC0]">Interest Rate</span>
                  <span className="text-[#00C6FF] font-bold">{selectedPlan.maxRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A0AEC0]">Maturity Amount</span>
                  <span className="text-emerald-400 font-bold">{fmt(selectedPlan.maturity)}</span>
                </div>
              </div>
              <p className="text-[#718096] text-xs">This is a simulation. Always verify and complete the actual booking on the bank's official website.</p>
              <button onClick={onClose} className="btn-accent px-8 py-2.5 font-semibold text-sm w-full">
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ plan, onProceed }: { plan: RankedPlan; onProceed: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);

  const rankColors: Record<number, string> = {
    1: "linear-gradient(90deg,#FFD700,#FFA500)",
    2: "linear-gradient(90deg,#C0C0C0,#A8A8A8)",
    3: "linear-gradient(90deg,#CD7F32,#A0522D)",
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3 transition-all"
      style={{
        background: plan.rank === 1 ? "rgba(0,198,255,0.06)" : "rgba(255,255,255,0.03)",
        border: plan.rank === 1 ? "1px solid rgba(0,198,255,0.25)" : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Bank logo */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {imgFailed ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: "#00C6FF" }}>
                {plan.bank.charAt(0)}
              </span>
            ) : (
              <img
                src={plan.logo}
                alt={plan.bank}
                className="w-6 h-6 object-contain"
                onError={() => setImgFailed(true)}
              />
            )}
            {/* Rank badge overlay */}
            <div
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: rankColors[plan.rank] || "rgba(255,255,255,0.25)" }}
            >
              {plan.rank}
            </div>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">{plan.bank}</p>
            <p className="text-[#718096] text-xs">{plan.type}</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-lg font-extrabold"
            style={{ background: "linear-gradient(90deg,#0072FF,#00C6FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            {plan.maxRate}%
          </p>
          <p className="text-[#718096] text-xs">p.a.</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#718096] text-xs">Maturity Amount</p>
          <p className="text-emerald-400 font-bold text-base">{fmt(plan.maturity)}</p>
        </div>
        <button
          onClick={onProceed}
          className="btn-accent px-4 py-2 text-xs font-semibold"
        >
          Proceed with this FD
        </button>
      </div>
    </div>
  );
}
