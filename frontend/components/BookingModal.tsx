"use client";

import { useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Language = "english" | "hindi" | "tamil";
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

export default function BookingModal({
  language,
  onClose,
}: {
  language: Language;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);

  // Form state
  const [form, setForm] = useState({
    holderName: "",
    bankName: "SBI (State Bank of India)",
    principal: "",
    rate: "",
    tenure: "",
  });

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-light rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white/90 backdrop-blur-sm rounded-t-2xl">
          <h2 className="font-bold text-gray-900 text-lg">
            {step === "success" ? "✅ Booking Confirmed" : "📋 Book Fixed Deposit"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Step: Form */}
        {step === "form" && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={form.holderName}
                onChange={(e) => updateForm("holderName", e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Bank</label>
              <select
                value={form.bankName}
                onChange={(e) => updateForm("bankName", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {BANKS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={form.principal}
                onChange={(e) => updateForm("principal", e.target.value)}
                placeholder="e.g. 100000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
                <input
                  type="number"
                  value={form.rate}
                  onChange={(e) => updateForm("rate", e.target.value)}
                  placeholder="e.g. 7.5"
                  step="0.1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenure (Years)</label>
                <input
                  type="number"
                  value={form.tenure}
                  onChange={(e) => updateForm("tenure", e.target.value)}
                  placeholder="e.g. 1"
                  step="0.5"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
              ⚠️ This is a simulated booking for demo purposes. No real money is involved.
            </div>

            <button
              onClick={() => {
                if (!form.holderName || !form.principal || !form.rate || !form.tenure) {
                  alert("Please fill all fields");
                  return;
                }
                setStep("confirm");
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg"
            >
              Review & Confirm →
            </button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Please review your FD details before confirming:</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              {[
                ["Name", form.holderName],
                ["Bank", form.bankName],
                ["Amount", `₹${parseFloat(form.principal).toLocaleString("en-IN")}`],
                ["Interest Rate", `${form.rate}%`],
                ["Tenure", `${form.tenure} year(s)`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("form")}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ← Edit
              </button>
              <button
                onClick={confirmBooking}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
              >
                {loading ? "Booking..." : "Confirm Booking ✓"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && booking && (
          <div className="p-5 space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✅
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {language === "hindi"
                  ? "आपका FD सफलतापूर्वक बुक हो गया!"
                  : language === "tamil"
                  ? "உங்கள் FD வெற்றிகரமாக பதிவு செய்யப்பட்டது!"
                  : "Your FD has been successfully booked!"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Ref: {booking.bookingReference}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2 text-sm">
              {[
                ["Account Holder", booking.details.holderName],
                ["Bank", booking.details.bankName],
                ["Principal", fmt(booking.details.principal)],
                ["Rate", booking.details.rate],
                ["Tenure", booking.details.tenure],
                ["Maturity Amount", fmt(booking.details.maturityAmount)],
                ["Maturity Date", booking.details.maturityDate],
                ["Booking Date", booking.details.bookingDate],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
