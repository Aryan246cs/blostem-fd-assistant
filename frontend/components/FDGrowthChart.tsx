"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { FDPlan } from "@/lib/types";

const DEFAULT_PRINCIPAL = 100000;
const PRINCIPAL_PRESETS = [50000, 100000, 200000, 500000, 1000000];
const YEAR_TOGGLES = [1, 3, 5, 10] as const;

function compound(principal: number, ratePercent: number, years: number, n = 4) {
  return principal * Math.pow(1 + ratePercent / 100 / n, n * years);
}

function fmt(val: number) {
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{
        background: "linear-gradient(135deg,#1A1F3A,#151929)",
        border: "1px solid rgba(0,198,255,0.25)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <p className="text-[#718096] text-xs mb-2 font-semibold">Year {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

function RateBar({ plan, isBetter, color }: { plan: FDPlan; isBetter: boolean; color: string }) {
  const maxPossible = 10;
  const pct = (plan.maxRate / maxPossible) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[#A0AEC0] text-sm font-semibold">{plan.bank}</span>
        <div className="flex items-center gap-2">
          {isBetter && (
            <span className="better-badge text-xs font-bold px-2 py-0.5 rounded-full">Higher</span>
          )}
          <span className="font-extrabold text-sm" style={{ color }}>{plan.maxRate}%</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
    </div>
  );
}

export default function FDGrowthChart({ planA, planB }: { planA: FDPlan; planB: FDPlan }) {
  const [years, setYears] = useState<number>(5);
  const [principal, setPrincipal] = useState<number>(DEFAULT_PRINCIPAL);
  const [customInput, setCustomInput] = useState("");

  const chartData = useMemo(() => {
    return Array.from({ length: years }, (_, i) => {
      const yr = i + 1;
      return {
        year: yr,
        [planA.bank]: compound(principal, planA.maxRate, yr),
        [planB.bank]: compound(principal, planB.maxRate, yr),
      };
    });
  }, [planA, planB, years, principal]);

  const finalA = compound(principal, planA.maxRate, years);
  const finalB = compound(principal, planB.maxRate, years);
  const diff = Math.abs(finalA - finalB);
  const winner = finalA > finalB ? planA : planB;
  const rateA = planA.maxRate;
  const rateB = planB.maxRate;

  // Tight Y-axis: start just below the min value so small differences are visible
  const allValues = chartData.flatMap((d) => [d[planA.bank] as number, d[planB.bank] as number]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) === 0 ? 500 : (maxVal - minVal) * 0.5;
  const yMin = Math.floor((minVal - padding) / 1000) * 1000;
  const yMax = Math.ceil((maxVal + padding) / 1000) * 1000;

  const chartInsight = `Over ${years} year${years > 1 ? "s" : ""}, ${winner.bank} generates ${fmt(diff)} more than ${finalA > finalB ? planB.bank : planA.bank} on a ₹1,00,000 investment.`;

  return (
    <div className="compare-enter flex flex-col gap-5">

      {/* Rate bar comparison */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-[#718096] text-xs font-bold uppercase tracking-widest mb-4">Interest Rate Comparison</p>
        <div className="flex flex-col gap-4">
          <RateBar plan={planA} isBetter={rateA > rateB} color="#0072FF" />
          <RateBar plan={planB} isBetter={rateB > rateA} color="#00C6FF" />
        </div>
      </div>

      {/* Growth chart */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-[#718096] text-xs font-bold uppercase tracking-widest">Returns Growth</p>
            <p className="text-white text-sm mt-0.5">Principal: {fmt(principal)} · Compounding: Quarterly · <span className="text-[#718096]">Y-axis zoomed to show difference</span></p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Principal selector */}
            <div className="relative">
              <select
                value={PRINCIPAL_PRESETS.includes(principal) ? principal : "custom"}
                onChange={(e) => {
                  if (e.target.value === "custom") return;
                  setPrincipal(Number(e.target.value));
                  setCustomInput("");
                }}
                className="appearance-none bg-transparent text-white text-xs font-bold pl-3 pr-7 py-1.5 rounded-xl focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {PRINCIPAL_PRESETS.map((p) => (
                  <option key={p} value={p} className="bg-[#0F1C4D]">
                    ₹{p.toLocaleString("en-IN")}
                  </option>
                ))}
                {!PRINCIPAL_PRESETS.includes(principal) && (
                  <option value="custom" className="bg-[#0F1C4D]">₹{principal.toLocaleString("en-IN")}</option>
                )}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#718096]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Custom amount input */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[#718096] text-xs font-bold">₹</span>
              <input
                type="number"
                placeholder="Custom"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onBlur={() => {
                  const val = parseInt(customInput);
                  if (val > 0) { setPrincipal(val); }
                  else setCustomInput("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt(customInput);
                    if (val > 0) setPrincipal(val);
                  }
                }}
                className="bg-transparent text-white text-xs font-bold pl-7 pr-3 py-1.5 rounded-xl focus:outline-none w-28"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            {/* Year toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {YEAR_TOGGLES.map((y) => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                  style={
                    years === y
                      ? { background: "linear-gradient(90deg,#0072FF,#00C6FF)", color: "#fff" }
                      : { color: "#718096" }
                  }
                >
                  {y}Y
                </button>
              ))}
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="year"
              tick={{ fill: "#718096", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickFormatter={(v) => `Yr ${v}`}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "#718096", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 16, fontSize: 12, color: "#A0AEC0" }}
              formatter={(value) => <span style={{ color: "#A0AEC0" }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey={planA.bank}
              stroke="#0072FF"
              strokeWidth={2.5}
              dot={{ fill: "#0072FF", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#0072FF", stroke: "rgba(0,114,255,0.3)", strokeWidth: 6 }}
            />
            <Line
              type="monotone"
              dataKey={planB.bank}
              stroke="#00C6FF"
              strokeWidth={2.5}
              dot={{ fill: "#00C6FF", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#00C6FF", stroke: "rgba(0,198,255,0.3)", strokeWidth: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart insight */}
      <div
        className="rounded-2xl px-6 py-5 flex items-start gap-4"
        style={{ background: "linear-gradient(135deg,rgba(0,114,255,0.1),rgba(0,198,255,0.06))", border: "1px solid rgba(0,198,255,0.2)" }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "rgba(0,198,255,0.15)" }}>
          <svg className="w-4 h-4 icon-tint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <p className="text-[#00C6FF] text-xs font-bold uppercase tracking-widest mb-1">Chart Insight</p>
          <p className="text-[#E2E8F0] text-sm leading-relaxed">{chartInsight}</p>
        </div>
      </div>

    </div>
  );
}
