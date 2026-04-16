"use client";

import { useState, useMemo } from "react";

type Language = "english" | "hindi" | "tamil" | "marathi" | "bengali";

// TDS rules (FY 2024-25)
const TDS_RATE = 0.10;           // 10% if PAN provided
const TDS_RATE_NO_PAN = 0.20;    // 20% if no PAN
const THRESHOLD_REGULAR = 40000; // ₹40,000 for regular citizens
const THRESHOLD_SENIOR = 50000;  // ₹50,000 for senior citizens (80TTB)

const inputCls = "w-full rounded-xl px-3 py-2.5 text-base text-white placeholder-[#718096] focus:outline-none focus:ring-2 focus:ring-[#00C6FF]/50 transition-all";
const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" };

function fmt(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-[#A0AEC0] text-sm">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-[#00C6FF]" : "text-white"}`}>{value}</span>
    </div>
  );
}

export default function TDSCalculatorModal({ language, onClose }: { language: Language; onClose: () => void }) {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [isSenior, setIsSenior] = useState(false);
  const [hasPAN, setHasPAN] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const result = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const t = parseFloat(tenure);
    if (!p || !r || !t || p <= 0 || r <= 0 || t <= 0) return null;

    // Compound interest (quarterly) for total interest earned
    const n = 4;
    const maturity = p * Math.pow(1 + r / 100 / n, n * t);
    const totalInterest = maturity - p;

    const threshold = isSenior ? THRESHOLD_SENIOR : THRESHOLD_REGULAR;
    const tdsRate = hasPAN ? TDS_RATE : TDS_RATE_NO_PAN;
    const tdsApplicable = totalInterest > threshold;
    const tdsAmount = tdsApplicable ? (totalInterest - threshold) * tdsRate : 0;
    // Note: TDS is deducted on full interest once threshold crossed per bank per year
    // Simplified: apply on total interest above threshold
    const netInterest = totalInterest - tdsAmount;
    const netMaturity = p + netInterest;

    return {
      principal: p,
      totalInterest,
      maturity,
      threshold,
      tdsRate: tdsRate * 100,
      tdsApplicable,
      tdsAmount,
      netInterest,
      netMaturity,
      interestPct: (totalInterest / maturity) * 100,
    };
  }, [principal, rate, tenure, isSenior, hasPAN]);

  function handleCalculate() {
    setError("");
    if (!principal || !rate || !tenure) { setError("Please fill all fields."); return; }
    if (parseFloat(principal) <= 0 || parseFloat(rate) <= 0 || parseFloat(tenure) <= 0) {
      setError("All values must be greater than 0."); return;
    }
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg,#0F1C4D 0%,#1A2A6C 100%)", border: "1px solid rgba(0,198,255,0.15)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="font-bold text-white text-lg flex items-center gap-2">
            <img src="/icons/tax.svg" alt="" className="w-5 h-5 icon-tint" />
            TDS Estimator
          </h2>
          <button onClick={onClose} className="text-[#718096] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08]">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto chat-scroll">

          {/* Inputs */}
          <div>
            <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Principal Amount (₹)</label>
            <input type="number" value={principal} onChange={(e) => { setPrincipal(e.target.value); setSubmitted(false); }}
              placeholder="e.g. 500000" className={inputCls} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Interest Rate (%)</label>
              <input type="number" value={rate} onChange={(e) => { setRate(e.target.value); setSubmitted(false); }}
                placeholder="e.g. 7.5" step="0.1" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Tenure (Years)</label>
              <input type="number" value={tenure} onChange={(e) => { setTenure(e.target.value); setSubmitted(false); }}
                placeholder="e.g. 2" step="0.5" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setIsSenior(!isSenior); setSubmitted(false); }}
              className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
              style={isSenior
                ? { background: "rgba(0,198,255,0.12)", border: "1px solid rgba(0,198,255,0.4)" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-sm font-semibold text-white">Senior Citizen</span>
              <div className={`w-4 h-4 rounded-full border-2 transition-all ${isSenior ? "bg-[#00C6FF] border-[#00C6FF]" : "border-[#718096]"}`} />
            </button>
            <button
              onClick={() => { setHasPAN(!hasPAN); setSubmitted(false); }}
              className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
              style={hasPAN
                ? { background: "rgba(0,198,255,0.12)", border: "1px solid rgba(0,198,255,0.4)" }
                : { background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.3)" }}
            >
              <span className="text-sm font-semibold text-white">PAN Provided</span>
              <div className={`w-4 h-4 rounded-full border-2 transition-all ${hasPAN ? "bg-[#00C6FF] border-[#00C6FF]" : "border-red-400"}`} />
            </button>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#718096" }}>
              Threshold: {isSenior ? "₹50,000" : "₹40,000"} / bank / year
            </span>
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#718096" }}>
              TDS Rate: {hasPAN ? "10%" : "20%"} {!hasPAN && "(no PAN)"}
            </span>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={handleCalculate} className="btn-accent w-full py-2.5 font-semibold text-base">
            Calculate TDS
          </button>

          {/* Results */}
          {submitted && result && (
            <div className="rounded-xl p-4 space-y-1" style={{ background: "rgba(0,198,255,0.06)", border: "1px solid rgba(0,198,255,0.2)" }}>
              <InfoRow label="Total Interest Earned" value={fmt(result.totalInterest)} />
              <InfoRow label="TDS Threshold" value={fmt(result.threshold)} />
              <InfoRow label="TDS Applicable" value={result.tdsApplicable ? "Yes" : "No"} />
              {result.tdsApplicable && (
                <InfoRow label={`TDS Deducted (${result.tdsRate}%)`} value={fmt(result.tdsAmount)} />
              )}
              <InfoRow label="Net Interest (after TDS)" value={fmt(result.netInterest)} />
              <InfoRow label="Gross Maturity" value={fmt(result.maturity)} />
              <InfoRow label="Net Maturity (after TDS)" value={fmt(result.netMaturity)} highlight />

              {/* Visual bar */}
              <div className="pt-3">
                <div className="flex text-xs text-[#718096] justify-between mb-1.5">
                  <span>Principal</span>
                  <span>Net Interest</span>
                  {result.tdsApplicable && <span className="text-red-400">TDS</span>}
                </div>
                <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full" style={{ width: `${(result.principal / result.maturity) * 100}%`, background: "linear-gradient(90deg,#0072FF,#00C6FF)" }} />
                  <div className="h-full" style={{ width: `${(result.netInterest / result.maturity) * 100}%`, background: "rgba(52,211,153,0.7)" }} />
                  {result.tdsApplicable && (
                    <div className="h-full flex-1" style={{ background: "rgba(248,113,113,0.6)" }} />
                  )}
                </div>
              </div>

              {/* Tip */}
              <div className="mt-3 pt-3 text-xs text-[#718096] leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {result.tdsApplicable
                  ? `💡 Submit Form 15G/15H to avoid TDS if your total income is below the taxable limit.`
                  : `✅ Your interest (${fmt(result.totalInterest)}) is below the ₹${result.threshold.toLocaleString("en-IN")} threshold — no TDS will be deducted.`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
