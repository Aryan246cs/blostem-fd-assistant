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

type Language = "english" | "hindi" | "tamil";

const LABELS: Record<Language, Record<string, string>> = {
  english: {
    title: "FD Calculator",
    principal: "Principal Amount (₹)",
    rate: "Interest Rate (%)",
    tenure: "Tenure (Years)",
    calculate: "Calculate",
    maturity: "Maturity Amount",
    interest: "Interest Earned",
    yield: "Effective Yield",
    compounding: "Compounding",
    close: "Close",
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
    close: "बंद करें",
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
    close: "மூடு",
    placeholder_p: "எ.கா. 100000",
    placeholder_r: "எ.கா. 7.5",
    placeholder_t: "எ.கா. 2",
  },
};

export default function CalculatorModal({
  language,
  onClose,
}: {
  language: Language;
  onClose: () => void;
}) {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const L = LABELS[language];

  async function calculate() {
    setError("");
    if (!principal || !rate || !tenure) {
      setError("Please fill all fields");
      return;
    }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-light rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 text-lg">🧮 {L.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">{L.principal}</label>
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder={L.placeholder_p}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">{L.rate}</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={L.placeholder_r}
                step="0.1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">{L.tenure}</label>
              <input
                type="number"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder={L.placeholder_t}
                step="0.5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={calculate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
          >
            {loading ? "Calculating..." : L.calculate}
          </button>

          {result && (
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base text-gray-600">{L.maturity}</span>
                <span className="text-xl font-bold text-emerald-700">{fmt(result.maturityAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base text-gray-600">{L.interest}</span>
                <span className="text-base font-semibold text-emerald-600">{fmt(result.interestEarned)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base text-gray-600">{L.yield}</span>
                <span className="text-base font-medium text-gray-700">{result.effectiveYield}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base text-gray-600">{L.compounding}</span>
                <span className="text-base text-gray-700">{result.compoundingFrequency}</span>
              </div>
              <div className="mt-2">
                <div className="flex text-xs text-gray-500 justify-between mb-1">
                  <span>Principal</span>
                  <span>Interest</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-400 h-full transition-all duration-700"
                    style={{ width: `${(result.principal / result.maturityAmount) * 100}%` }}
                  />
                  <div className="bg-emerald-500 h-full flex-1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
