"use client";

import { useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CalcResult = {
  principal: number;
  ratePercent: number;
  tenureYears: number;
  maturityAmount: number;
  interestEarned: number;
  effectiveYield: string;
  compoundingFrequency: string;
  summary: string;
};

type Language = "english" | "hindi" | "tamil" | "marathi" | "bengali";

const LABELS: Record<Language, Record<string, string>> = {
  english: {
    title: "FD Calculator",
    principal: "Principal Amount (₹)",
    rate: "Interest Rate (%)",
    tenure: "Tenure (Years)",
    calculate: "Calculate Returns",
    maturity: "Maturity Amount",
    interest: "Interest Earned",
    yield: "Effective Yield",
    compounding: "Compounding",
    placeholder_p: "e.g. 100000",
    placeholder_r: "e.g. 7.5",
    placeholder_t: "e.g. 2",
  },
  hindi: {
    title: "FD कैलकुलेटर",
    principal: "मूल राशि (₹)",
    rate: "ब्याज दर (%)",
    tenure: "अवधि (वर्ष)",
    calculate: "गणना करें",
    maturity: "परिपक्वता राशि",
    interest: "अर्जित ब्याज",
    yield: "प्रभावी उपज",
    compounding: "चक्रवृद्धि",
    placeholder_p: "जैसे 100000",
    placeholder_r: "जैसे 7.5",
    placeholder_t: "जैसे 2",
  },
  tamil: {
    title: "FD கணிப்பான்",
    principal: "அசல் தொகை (₹)",
    rate: "வட்டி விகிதம் (%)",
    tenure: "காலம் (ஆண்டுகள்)",
    calculate: "கணக்கிடு",
    maturity: "முதிர்வு தொகை",
    interest: "வட்டி வருமானம்",
    yield: "பயனுள்ள வருவாய்",
    compounding: "கூட்டு வட்டி",
    placeholder_p: "எ.கா. 100000",
    placeholder_r: "எ.கா. 7.5",
    placeholder_t: "எ.கா. 2",
  },
  marathi: {
    title: "FD कॅल्क्युलेटर",
    principal: "मूळ रक्कम (₹)",
    rate: "व्याज दर (%)",
    tenure: "कालावधी (वर्षे)",
    calculate: "गणना करा",
    maturity: "परिपक्वता रक्कम",
    interest: "मिळालेले व्याज",
    yield: "प्रभावी उत्पन्न",
    compounding: "चक्रवाढ",
    placeholder_p: "उदा. 100000",
    placeholder_r: "उदा. 7.5",
    placeholder_t: "उदा. 2",
  },
  bengali: {
    title: "FD ক্যালকুলেটর",
    principal: "মূল পরিমাণ (₹)",
    rate: "সুদের হার (%)",
    tenure: "মেয়াদ (বছর)",
    calculate: "হিসাব করুন",
    maturity: "পরিপক্কতার পরিমাণ",
    interest: "অর্জিত সুদ",
    yield: "কার্যকর ফলন",
    compounding: "চক্রবৃদ্ধি",
    placeholder_p: "যেমন 100000",
    placeholder_r: "যেমন 7.5",
    placeholder_t: "যেমন 2",
  },
};

const inputCls = "w-full rounded-xl px-3 py-2.5 text-base text-white placeholder-[#718096] focus:outline-none focus:ring-2 focus:ring-[#00C6FF]/50 transition-all";
const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" };

export default function CalculatorModal({ language, onClose }: { language: Language; onClose: () => void }) {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const L = LABELS[language];

  async function calculate() {
    setError("");
    if (!principal || !rate || !tenure) { setError("Please fill all fields"); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/calculate-fd`, {
        principal: parseFloat(principal),
        rate: parseFloat(rate),
        tenure: parseFloat(tenure),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Calculation failed. Check backend.");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg, #0F1C4D 0%, #1A2A6C 100%)", border: "1px solid rgba(0,198,255,0.15)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="font-bold text-white text-lg flex items-center gap-2">
            <img src="/icons/calculator.svg" alt="" className="w-5 h-5 icon-tint" />
            {L.title}
          </h2>
          <button onClick={onClose} className="text-[#718096] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08]">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* Formula info box */}
          <div className="rounded-xl p-3.5" style={{ background: "rgba(0,198,255,0.05)", border: "1px solid rgba(0,198,255,0.15)" }}>
            <p className="text-[#00C6FF] text-xs font-bold mb-1.5 uppercase tracking-wide">How FD returns are calculated</p>
            <p className="text-[#A0AEC0] text-xs leading-relaxed mb-2">
              A Fixed Deposit earns <span className="text-white font-medium">compound interest</span>, meaning interest is added back to your principal each quarter — so you earn interest on interest.
            </p>
            <div className="rounded-lg px-3 py-2 text-center" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white text-xs font-mono tracking-wide">A = P × (1 + r/n) <sup>n×t</sup></p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
              {[["P", "Principal amount"], ["r", "Annual interest rate"], ["n", "Compounding periods/year (4)"], ["t", "Tenure in years"]].map(([sym, def]) => (
                <p key={sym} className="text-[#718096] text-[11px]">
                  <span className="text-[#00C6FF] font-mono font-bold">{sym}</span> = {def}
                </p>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">{L.principal}</label>
            <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)}
              placeholder={L.placeholder_p} className={inputCls} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">{L.rate}</label>
              <input type="number" value={rate} onChange={(e) => setRate(e.target.value)}
                placeholder={L.placeholder_r} step="0.1" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">{L.tenure}</label>
              <input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)}
                placeholder={L.placeholder_t} step="0.5" className={inputCls} style={inputStyle} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button onClick={calculate} disabled={loading} className="btn-accent w-full py-2.5 font-semibold text-base">
            {loading ? "Calculating..." : L.calculate}
          </button>

          {result && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(0,198,255,0.06)", border: "1px solid rgba(0,198,255,0.2)" }}>
              <div className="flex justify-between items-center">
                <span className="text-[#A0AEC0] text-sm">{L.maturity}</span>
                <span className="text-xl font-bold text-[#00C6FF]">{fmt(result.maturityAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0AEC0] text-sm">{L.interest}</span>
                <span className="text-base font-semibold text-emerald-400">{fmt(result.interestEarned)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0AEC0] text-sm">{L.yield}</span>
                <span className="text-base font-medium text-white">{result.effectiveYield}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0AEC0] text-sm">{L.compounding}</span>
                <span className="text-base text-white">{result.compoundingFrequency}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-1">
                <div className="flex text-xs text-[#718096] justify-between mb-1">
                  <span>Principal</span><span>Interest</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full transition-all duration-700" style={{ width: `${(result.principal / result.maturityAmount) * 100}%`, background: "linear-gradient(90deg,#0072FF,#00C6FF)" }} />
                  <div className="h-full flex-1 bg-emerald-500/70" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
