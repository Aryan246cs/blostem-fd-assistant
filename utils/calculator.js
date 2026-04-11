/**
 * FD Calculator Engine
 * Pure math — no LLM involved. Fast and accurate.
 */

/**
 * Calculate FD maturity using compound interest (quarterly compounding)
 * Formula: M = P × (1 + r/(n×100))^(n×t)
 * where n = compounding frequency per year (4 for quarterly)
 */
function calculateFD({ principal, ratePercent, tenureYears, compoundingFrequency = 4 }) {
  const P = parseFloat(principal);
  const r = parseFloat(ratePercent);
  const t = parseFloat(tenureYears);
  const n = compoundingFrequency;

  if (isNaN(P) || isNaN(r) || isNaN(t) || P <= 0 || r <= 0 || t <= 0) {
    throw new Error("Invalid inputs: principal, rate, and tenure must be positive numbers");
  }

  // Compound interest formula
  const maturityAmount = P * Math.pow(1 + r / (n * 100), n * t);
  const interestEarned = maturityAmount - P;

  return {
    principal: Math.round(P),
    ratePercent: r,
    tenureYears: t,
    maturityAmount: Math.round(maturityAmount),
    interestEarned: Math.round(interestEarned),
    effectiveYield: ((interestEarned / P) * 100).toFixed(2),
    compoundingFrequency: n === 4 ? "Quarterly" : n === 12 ? "Monthly" : "Annually",
  };
}

/**
 * Simple interest FD (some banks use this for short tenures < 6 months)
 * Formula: M = P + (P × r × t / 100)
 */
function calculateSimpleFD({ principal, ratePercent, tenureYears }) {
  const P = parseFloat(principal);
  const r = parseFloat(ratePercent);
  const t = parseFloat(tenureYears);

  const interest = (P * r * t) / 100;
  const maturityAmount = P + interest;

  return {
    principal: Math.round(P),
    ratePercent: r,
    tenureYears: t,
    maturityAmount: Math.round(maturityAmount),
    interestEarned: Math.round(interest),
  };
}

/**
 * Recommend whether an FD is good based on simple heuristics
 */
function evaluateFD({ ratePercent, tenureYears, bankType = "bank", isSeniorCitizen = false }) {
  const rate = parseFloat(ratePercent);
  const tenure = parseFloat(tenureYears);
  const reasons = [];
  let score = 0;

  // Rate evaluation
  if (rate >= 8.0) { score += 3; reasons.push("Excellent interest rate (8%+)"); }
  else if (rate >= 7.0) { score += 2; reasons.push("Good interest rate (7%+)"); }
  else if (rate >= 6.0) { score += 1; reasons.push("Average interest rate (6-7%)"); }
  else { reasons.push("Low interest rate (below 6%) — consider other options"); }

  // Tenure evaluation
  if (tenure >= 1 && tenure <= 3) { score += 2; reasons.push("Optimal tenure (1-3 years)"); }
  else if (tenure < 1) { score += 1; reasons.push("Short tenure — lower rates typically apply"); }
  else { score += 1; reasons.push("Long tenure — good for long-term goals"); }

  // Bank type
  if (bankType === "public") { score += 2; reasons.push("Public sector bank — very safe (government backed)"); }
  else if (bankType === "private") { score += 2; reasons.push("Private bank — safe with DICGC insurance up to ₹5 lakh"); }
  else if (bankType === "small_finance") { score += 1; reasons.push("Small finance bank — higher rates but verify DICGC coverage"); }
  else if (bankType === "nbfc") { reasons.push("NBFC — higher risk, not covered by DICGC insurance"); }

  // Senior citizen bonus
  if (isSeniorCitizen) { score += 1; reasons.push("Senior citizen benefit: extra 0.25-0.5% rate applicable"); }

  const verdict = score >= 6 ? "Excellent" : score >= 4 ? "Good" : score >= 2 ? "Average" : "Poor";
  const recommendation = score >= 4
    ? "This looks like a solid FD. Go ahead if it fits your goals."
    : score >= 2
    ? "Decent option, but you might find better rates elsewhere."
    : "Consider exploring other banks or investment options.";

  return { score, verdict, recommendation, reasons };
}

module.exports = { calculateFD, calculateSimpleFD, evaluateFD };
