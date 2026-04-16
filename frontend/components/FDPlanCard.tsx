import { useState } from "react";
import type { FDPlan } from "@/lib/types";

export default function FDPlanCard({ plan }: { plan: FDPlan }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="fd-plan-card group flex flex-col gap-4 p-5 rounded-2xl transition-all duration-300">
      {/* Bank logo + name */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {imgFailed ? (
            <span style={{ fontSize: 18, fontWeight: 700, color: "#00C6FF" }}>
              {plan.bank.charAt(0)}
            </span>
          ) : (
            <img
              src={plan.logo}
              alt={plan.bank}
              className="w-8 h-8 object-contain"
              onError={() => setImgFailed(true)}
            />
          )}
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">{plan.bank}</p>
          <p className="text-[#718096] text-xs mt-0.5">{plan.type}</p>
        </div>
      </div>

      {/* Rate — hero number */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(0,114,255,0.1)", border: "1px solid rgba(0,198,255,0.2)" }}
      >
        <span className="text-[#A0AEC0] text-sm">Interest Rate</span>
        <span
          className="text-3xl font-extrabold tracking-tight"
          style={{ background: "linear-gradient(90deg,#0072FF,#00C6FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          {plan.rate}
        </span>
      </div>

      {/* Tenure */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#00C6FF" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-[#A0AEC0] text-sm">{plan.tenure}</span>
      </div>

      {/* Description */}
      <p className="text-[#718096] text-sm leading-relaxed flex-1">{plan.description}</p>

      {/* CTA */}
      <a
        href={plan.link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-accent w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
      >
        View Details
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}
