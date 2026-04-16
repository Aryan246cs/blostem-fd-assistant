"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import FDPlanCard from "@/components/FDPlanCard";
import type { FDPlan } from "@/lib/types";
import plansData from "@/data/fdPlans.json";

const plans: FDPlan[] = plansData as FDPlan[];

type FilterOption = "all" | "highest" | "short" | "long";

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All Plans" },
  { value: "highest", label: "Highest Interest" },
  { value: "short", label: "Short Term" },
  { value: "long", label: "Long Term" },
];

function parseRate(rate: string) {
  return parseFloat(rate.replace("%", ""));
}

function isShortTerm(tenure: string) {
  return tenure.toLowerCase().includes("day") || tenure.toLowerCase().includes("7") || tenure.match(/\b[1-9]\s*month/i) !== null;
}

function isLongTerm(tenure: string) {
  return tenure.match(/\b[5-9]\s*year/i) !== null || tenure.match(/\b10\s*year/i) !== null;
}

export default function FDPlansPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterOption>("all");

  const filtered = useMemo(() => {
    let result = [...plans];
    if (filter === "highest") result.sort((a, b) => parseRate(b.rate) - parseRate(a.rate));
    else if (filter === "short") result = result.filter((p) => isShortTerm(p.tenure));
    else if (filter === "long") result = result.filter((p) => isLongTerm(p.tenure));
    return result;
  }, [filter]);

  return (
    <div className="app-bg min-h-screen">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Header */}
      <header
        className="relative z-20 flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <button onClick={() => router.push("/")} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="FD Copilot" className="w-full h-full object-cover scale-[2]" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-white font-bold text-base leading-tight">FD Copilot</span>
            <span className="text-[#718096] text-xs leading-tight">AI FD Advisor</span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all"
          >
            <img src="/icons/chat.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
            <span className="hidden sm:inline">Ask Copilot</span>
          </button>
          <span
            className="tool-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ color: "#00C6FF", borderColor: "rgba(0,198,255,0.4)" }}
          >
            <img src="/icons/explore.svg" alt="" className="w-4 h-4 icon-tint opacity-80" />
            <span className="hidden sm:inline">FD Plans</span>
          </span>
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-white text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-3">
            Explore{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#0072FF,#00C6FF)" }}
            >
              FD Plans
            </span>
          </h1>
          <p className="text-[#718096] text-base sm:text-lg">
            Compare fixed deposit options from top Indian banks
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={
                filter === f.value
                  ? {
                      background: "linear-gradient(90deg,#0072FF,#00C6FF)",
                      color: "#fff",
                      boxShadow: "0 4px 15px rgba(0,114,255,0.35)",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#A0AEC0",
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <p className="text-center text-[#718096] mt-16 text-base">No plans match this filter.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((plan) => (
              <FDPlanCard key={plan.bank} plan={plan} />
            ))}
          </div>
        )}

        <p className="text-center text-[#718096] text-xs mt-10">
          FD Copilot · Rates are indicative and subject to change · Always verify with your bank
        </p>
      </main>
    </div>
  );
}
