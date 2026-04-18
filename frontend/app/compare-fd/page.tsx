"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FDPlan } from "@/lib/types";
import plansData from "@/data/fdPlans.json";
import FDGrowthChart from "@/components/FDGrowthChart";

const plans: FDPlan[] = plansData as FDPlan[];

function parseMaxRate(rate: string): number {
  const parts = rate.replace(/%/g, "").split("-").map((s) => parseFloat(s.trim()));
  return Math.max(...parts);
}

function generateInsight(a: FDPlan, b: FDPlan): string {
  const rateA = parseMaxRate(a.rate);
  const rateB = parseMaxRate(b.rate);
  const diff = Math.abs(rateA - rateB).toFixed(2);
  const higher = rateA > rateB ? a : b;
  const lower = rateA > rateB ? b : a;

  if (rateA === rateB) {
    return `Both ${a.bank} and ${b.bank} offer the same maximum interest rate of ${rateA}%. Consider tenure flexibility and bank reputation to decide.`;
  }
  return `${higher.bank} offers a higher maximum rate of ${parseMaxRate(higher.rate)}% vs ${parseMaxRate(lower.rate)}% from ${lower.bank} — a difference of ${diff}%. ${lower.bank} may offer more stability as a ${lower.type.toLowerCase().includes("senior") ? "senior-friendly" : "trusted"} option.`;
}

const ROWS: { label: string; key: keyof FDPlan }[] = [
  { label: "Interest Rate", key: "rate" },
  { label: "Tenure", key: "tenure" },
  { label: "FD Type", key: "type" },
  { label: "Description", key: "description" },
];

function BankSelect({
  label, value, onChange, exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude: string;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-[#718096] text-xs font-bold uppercase tracking-widest">{label}</p>
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-white text-sm font-semibold px-4 py-3.5 focus:outline-none cursor-pointer appearance-none pr-10"
        >
          <option value="" className="bg-[#0F1C4D] text-[#718096]">— Select a bank —</option>
          {plans.map((p) => (
            <option
              key={p.bank}
              value={p.bank}
              disabled={p.bank === exclude}
              className="bg-[#0F1C4D] text-white disabled:text-[#718096]"
            >
              {p.bank}
            </option>
          ))}
        </select>
        {/* chevron */}
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#718096]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function CompareCard({
  plan, isBetter,
}: {
  plan: FDPlan;
  isBetter: boolean;
}) {
  return (
    <div
      className={`compare-card flex flex-col gap-4 p-6 rounded-2xl flex-1 transition-all duration-300 ${isBetter ? "compare-card-better" : ""}`}
    >
      {/* Logo + name */}
      <div className="flex flex-col items-center gap-3 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {isBetter && (
          <span className="better-badge text-xs font-bold px-3 py-1 rounded-full mb-1">
            Better Return
          </span>
        )}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <BankLogo plan={plan} />
        </div>
        <p className="text-white font-bold text-base text-center leading-tight">{plan.bank}</p>
      </div>

      {/* Rate hero */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(0,114,255,0.1)", border: "1px solid rgba(0,198,255,0.2)" }}
      >
        <span className="text-[#A0AEC0] text-sm">Interest Rate</span>
        <span
          className="text-2xl font-extrabold"
          style={{ background: "linear-gradient(90deg,#0072FF,#00C6FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          {plan.rate}
        </span>
      </div>

      {/* Other rows */}
      {ROWS.slice(1).map((row) => (
        <div key={row.key} className="flex flex-col gap-1">
          <span className="text-[#718096] text-xs font-semibold uppercase tracking-wider">{row.label}</span>
          <span className="text-[#E2E8F0] text-sm leading-relaxed">{plan[row.key] as string}</span>
        </div>
      ))}

      {/* CTA */}
      <a
        href={plan.link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-accent mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
      >
        View Details
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

function BankLogo({ plan }: { plan: FDPlan }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: 22, fontWeight: 700, color: "#00C6FF" }}>{plan.bank.charAt(0)}</span>;
  return <img src={plan.logo} alt={plan.bank} className="w-10 h-10 object-contain" onError={() => setFailed(true)} />;
}

export default function CompareFDPage() {
  const router = useRouter();
  const [bankA, setBankA] = useState("");
  const [bankB, setBankB] = useState("");

  const planA = plans.find((p) => p.bank === bankA) ?? null;
  const planB = plans.find((p) => p.bank === bankB) ?? null;
  const bothSelected = planA && planB;

  const rateA = planA ? parseMaxRate(planA.rate) : 0;
  const rateB = planB ? parseMaxRate(planB.rate) : 0;
  const insight = bothSelected ? generateInsight(planA, planB) : "";

  function swap() {
    const tmp = bankA;
    setBankA(bankB);
    setBankB(tmp);
  }

  return (
    <div className="app-bg min-h-screen">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Header */}
      <header
        className="relative z-20 flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <button onClick={() => router.push("/app")} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="FD Copilot" className="w-full h-full object-cover scale-[2]" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-white font-semibold text-base leading-tight">FD Saathi</span>
            <span className="text-[#718096] text-xs leading-tight">AI FD Advisor</span>
          </div>
        </button>

        <div className="flex items-center gap-2 mr-2">
          <button onClick={() => router.push("/app")}
            className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all">
            <img src="/icons/chat.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
            <span className="hidden sm:inline">Ask Copilot</span>
          </button>
          <button onClick={() => router.push("/fd-plans")}
            className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all">
            <img src="/icons/explore.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
            <span className="hidden sm:inline">FD Plans</span>
          </button>
          <span
            className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ color: "#00C6FF", borderColor: "rgba(0,198,255,0.4)" }}
          >
            <img src="/icons/compare.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
            <span className="hidden sm:inline">Compare FD</span>
          </span>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-white text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-3">
            Compare{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#0072FF,#00C6FF)" }}>
              FD Plans
            </span>
          </h1>
          <p className="text-[#718096] text-base sm:text-lg">Select any two bank FD plans and compare them side by side</p>
        </div>

        {/* Selectors */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <BankSelect label="First FD" value={bankA} onChange={setBankA} exclude={bankB} />

          {/* Swap button */}
          <button
            onClick={swap}
            disabled={!bankA && !bankB}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: "rgba(0,198,255,0.1)", border: "1px solid rgba(0,198,255,0.3)" }}
            title="Swap"
          >
            <svg className="w-4 h-4 icon-tint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          <BankSelect label="Second FD" value={bankB} onChange={setBankB} exclude={bankA} />
        </div>

        {/* Comparison */}
        {bothSelected && (
          <div className="compare-enter flex flex-col gap-6">
            {/* Cards */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              <CompareCard plan={planA} isBetter={rateA > rateB} />

              {/* Divider */}
              <div className="hidden sm:flex flex-col items-center justify-center gap-2 flex-shrink-0">
                <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.07)" }} />
                <span className="text-[#718096] text-xs font-bold px-2">VS</span>
                <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>
              <div className="sm:hidden flex items-center gap-3">
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                <span className="text-[#718096] text-xs font-bold">VS</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>

              <CompareCard plan={planB} isBetter={rateB > rateA} />
            </div>

            {/* Insight box */}
            <div
              className="rounded-2xl px-6 py-5 flex items-start gap-4"
              style={{ background: "linear-gradient(135deg,rgba(0,114,255,0.1),rgba(0,198,255,0.06))", border: "1px solid rgba(0,198,255,0.2)" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(0,198,255,0.15)" }}>
                <svg className="w-4 h-4 icon-tint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[#00C6FF] text-xs font-bold uppercase tracking-widest mb-1">Smart Insight</p>
                <p className="text-[#E2E8F0] text-sm leading-relaxed">{insight}</p>
              </div>
            </div>

            {/* Data visualizations */}
            <FDGrowthChart planA={planA} planB={planB} />
          </div>
        )}

        {!bothSelected && (
          <div className="text-center mt-16">
            <div className="blue-sphere mx-auto mb-6" style={{ width: 60, height: 60 }} />
            <p className="text-[#718096] text-base">Select two FD plans above to start comparing</p>
          </div>
        )}

        <p className="text-center text-[#718096] text-xs mt-10">
          FD Saathi · Rates are indicative · Always verify with your bank
        </p>
      </main>
    </div>
  );
}
