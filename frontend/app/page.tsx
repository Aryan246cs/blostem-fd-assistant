"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: "Ask in Your Language",
    desc: "Chat in English, हिंदी, தமிழ், मराठी, or বাংলা. FD Saathi understands and responds in the language you're most comfortable with.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "FD Calculator",
    desc: "Instantly compute maturity amounts, interest earned, and effective yields for any FD — with real numbers, not vague estimates.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    title: "Compare FD Plans",
    desc: "Side-by-side comparison of FDs across banks and NBFCs. See who offers the best rates for your tenure and amount.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
    title: "TDS & Tax Estimator",
    desc: "Know exactly how much TDS will be deducted and what your post-tax returns look like before you invest.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: "FD Jargon Buster",
    desc: "Confused by terms like cumulative, non-cumulative, or DICGC? Get plain-language explanations instantly.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    title: "Voice Input",
    desc: "Speak your question out loud. FD Saathi listens in your language and reads answers back to you.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "FD Booking Guide",
    desc: "Step-by-step walkthrough on how to open an FD — online or at a branch — with tips on what documents you need and what to watch out for.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 9.5l-3 3m0 0l3 3m-3-3h8.25M6.75 12a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M4.886 18.364a9 9 0 010-12.728" />
      </svg>
    ),
    title: "Talks Back to You",
    desc: "FD Saathi reads its answers aloud in English or your regional language — great for when you'd rather listen than read.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    title: "Explain this FD",
    desc: "Paste any FD offer or bank advertisement and FD Saathi breaks it down — interest rate, payout type, lock-in, penalties — all in plain language.",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="welcome-root">
      {/* Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="welcome-orb-3" />

      {/* Nav */}
      <nav
        className="welcome-nav"
        style={{
          background: scrolled ? "rgba(11,15,42,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
        }}
      >
        <div className="flex items-center gap-3 pl-6">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="FD Saathi" className="w-full h-full object-cover scale-[2]" />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">FD Saathi</span>
        </div>
        <button
          onClick={() => router.push("/app")}
          className="welcome-cta-sm pr-8"
        >
          Get Started →
        </button>
      </nav>

      {/* ── Hero + Preview (single viewport section) ── */}
      <section ref={heroRef} className="welcome-hero">
        <div className="welcome-grid-bg" />

        {/* Badge */}
        <div className="welcome-badge">
          <span className="welcome-badge-dot" />
          Powered by Blostem
        </div>

        {/* 2-line headline */}
        <h1 className="welcome-h1">
          Your Personal AI <span className="welcome-gradient-text">FD Advisor</span> —<br />
          Smarter Savings, Every Language
        </h1>

        <p className="welcome-subtext">
          Understand, compare, and invest in Fixed Deposits in the language you think in.
          No jargon, just clarity.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3 flex-wrap justify-center mb-2">
          <button onClick={() => router.push("/app")} className="welcome-cta-primary">
            Get Started →
          </button>
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            className="welcome-cta-ghost"
          >
            See Features
          </button>
        </div>

        {/* App screenshot — large, peeking from bottom */}
        <div className="welcome-peek-wrap">
          <div className="welcome-peek-frame">
            {/* browser dots bar */}
            <div className="welcome-preview-bar">
              <span className="welcome-dot bg-red-500/80" />
              <span className="welcome-dot bg-yellow-500/80" />
              <span className="welcome-dot bg-green-500/80" />
              <span className="text-[#718096] text-xs ml-3 font-mono">fd-saathi.app</span>
            </div>
            <div className="welcome-peek-img-wrap">
              <div className="welcome-peek-fade" />
              <img
                src="/app-screenshot.png"
                alt="FD Saathi interface"
                className="welcome-peek-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="welcome-features-section">
        <div className="text-center mb-8">
          <p className="text-[#00C6FF] text-sm font-semibold uppercase tracking-widest mb-2">What you can do</p>
          <h2 className="text-white text-5xl font-bold tracking-tight mb-20">Everything you need to<br />make smarter FD decisions</h2>
        </div>

        <div className="welcome-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="welcome-feature-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="welcome-feature-icon">
                {f.icon}
              </div>
              <h3 className="text-white font-semibold text-xl mb-2">{f.title}</h3>
              <p className="text-[#718096] text-base leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="welcome-cta-section">
        <div className="welcome-cta-glow" />
        <div className="welcome-cta-sphere" />
        <div className="welcome-cta-inner">
          <p className="welcome-cta-eyebrow">Ready to start?</p>
          <h2 className="welcome-cta-heading">
            Start growing your<br />
            <span className="welcome-gradient-text">savings with confidence</span>
          </h2>
          <p className="welcome-cta-sub">
            No sign-up needed. Ask your first question<br />in the language you think in.
          </p>
          <div className="flex items-center gap-4 justify-center flex-wrap">
            <button onClick={() => router.push("/app")} className="welcome-cta-primary welcome-cta-big">
              Open FD Saathi →
            </button>
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="welcome-cta-ghost welcome-cta-big"
            >
              See Features
            </button>
          </div>
        </div>
        <div className="welcome-cta-footer-line">
          <span className="welcome-cta-divider" />
          <p className="welcome-cta-footnote">Powered by Blostem · Built for Bharat</p>
          <span className="welcome-cta-divider" />
        </div>
      </section>
    </div>
  );
}
