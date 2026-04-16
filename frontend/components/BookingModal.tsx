"use client";

import { useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Language = "english" | "hindi" | "tamil" | "marathi" | "bengali";
type Step = "form" | "confirm" | "success";

type BookingDetails = {
  bookingReference: string;
  details: {
    holderName: string;
    bankName: string;
    principal: number;
    rate: string;
    tenure: string;
    maturityAmount: number;
    maturityDate: string;
    bookingDate: string;
  };
};

const BANKS = [
  "SBI (State Bank of India)",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "AU Small Finance Bank",
  "Jana Small Finance Bank",
  "Demo Bank",
];

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#718096] focus:outline-none focus:ring-2 focus:ring-[#00C6FF]/50 transition-all";
const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" };

export default function BookingModal({ language, onClose }: { language: Language; onClose: () => void }) {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [form, setForm] = useState({ holderName: "", bankName: "SBI (State Bank of India)", principal: "", rate: "", tenure: "" });

  function updateForm(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function confirmBooking() {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/book-fd`, {
        principal: parseFloat(form.principal),
        rate: parseFloat(form.rate),
        tenure: parseFloat(form.tenure),
        bankName: form.bankName,
        holderName: form.holderName,
      });
      setBooking(data);
      setStep("success");
    } catch {
      alert("Booking failed. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

  const modalStyle = { background: "linear-gradient(135deg, #0F1C4D 0%, #1A2A6C 100%)", border: "1px solid rgba(0,198,255,0.15)" };
  const headerBorder = { borderBottom: "1px solid rgba(255,255,255,0.08)" };
  const rowStyle = { borderBottom: "1px solid rgba(255,255,255,0.05)" };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0" style={{ ...headerStyle, ...headerBorder }}>
          <h2 className="font-bold text-white text-lg">
            {step === "success" ? "✅ Booking Confirmed" : "📋 Book Fixed Deposit"}
          </h2>
          <button onClick={onClose} className="text-[#718096] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08]">✕</button>
        </div>

        {/* Form */}
        {step === "form" && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Your Name</label>
              <input type="text" value={form.holderName} onChange={(e) => updateForm("holderName", e.target.value)}
                placeholder="e.g. Ramesh Kumar" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Select Bank</label>
              <select value={form.bankName} onChange={(e) => updateForm("bankName", e.target.value)}
                className={inputCls} style={inputStyle}>
                {BANKS.map((b) => <option key={b} className="bg-[#0F1C4D]">{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Amount (₹)</label>
              <input type="number" value={form.principal} onChange={(e) => updateForm("principal", e.target.value)}
                placeholder="e.g. 100000" className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Rate (%)</label>
                <input type="number" value={form.rate} onChange={(e) => updateForm("rate", e.target.value)}
                  placeholder="e.g. 7.5" step="0.1" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#A0AEC0] mb-1.5">Tenure (Years)</label>
                <input type="number" value={form.tenure} onChange={(e) => updateForm("tenure", e.target.value)}
                  placeholder="e.g. 1" step="0.5" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="rounded-xl p-3 text-xs text-[#A0AEC0]" style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)" }}>
              ⚠️ This is a simulated booking for demo purposes. No real money is involved.
            </div>
            <button
              onClick={() => {
                if (!form.holderName || !form.principal || !form.rate || !form.tenure) { alert("Please fill all fields"); return; }
                setStep("confirm");
              }}
              className="btn-accent w-full py-2.5 font-semibold text-base"
            >
              Review & Confirm →
            </button>
          </div>
        )}

        {/* Confirm */}
        {step === "confirm" && (
          <div className="p-5 space-y-4">
            <p className="text-[#A0AEC0] text-sm">Review your FD details before confirming:</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {[
                ["Name", form.holderName],
                ["Bank", form.bankName],
                ["Amount", `₹${parseFloat(form.principal).toLocaleString("en-IN")}`],
                ["Interest Rate", `${form.rate}%`],
                ["Tenure", `${form.tenure} year(s)`],
              ].map(([label, value], i, arr) => (
                <div key={label} className="flex justify-between px-4 py-3" style={i < arr.length - 1 ? rowStyle : { background: "rgba(0,198,255,0.05)" }}>
                  <span className="text-[#718096] text-sm">{label}</span>
                  <span className="font-medium text-white text-sm">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("form")}
                className="flex-1 py-2.5 rounded-xl font-medium text-[#A0AEC0] hover:text-white transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                ← Edit
              </button>
              <button onClick={confirmBooking} disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(90deg, #059669, #10b981)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>
                {loading ? "Booking..." : "Confirm ✓"}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && booking && (
          <div className="p-5 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              ✅
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                {language === "hindi" ? "आपका FD सफलतापूर्वक बुक हो गया!" : language === "tamil" ? "உங்கள் FD வெற்றிகரமாக பதிவு செய்யப்பட்டது!" : "Your FD has been successfully booked!"}
              </h3>
              <p className="text-[#718096] text-sm mt-1">Ref: {booking.bookingReference}</p>
            </div>
            <div className="rounded-xl overflow-hidden text-left" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
              {[
                ["Account Holder", booking.details.holderName],
                ["Bank", booking.details.bankName],
                ["Principal", fmt(booking.details.principal)],
                ["Rate", booking.details.rate],
                ["Tenure", booking.details.tenure],
                ["Maturity Amount", fmt(booking.details.maturityAmount)],
                ["Maturity Date", booking.details.maturityDate],
                ["Booking Date", booking.details.bookingDate],
              ].map(([label, value], i, arr) => (
                <div key={label} className="flex justify-between px-4 py-2.5" style={i < arr.length - 1 ? rowStyle : {}}>
                  <span className="text-[#718096] text-sm">{label}</span>
                  <span className="font-medium text-white text-sm">{value}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl font-semibold text-white transition-all"
              style={{ background: "linear-gradient(90deg, #059669, #10b981)", boxShadow: "0 4px 15px rgba(16,185,129,0.3)" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// sticky header needs its own bg to match modal
const headerStyle: React.CSSProperties = { background: "linear-gradient(135deg, #0F1C4D 0%, #1A2A6C 100%)" };
