/**
 * Vernacular FD Copilot — Backend Server
 * Express + Groq LLM + RAG + Calculator + Translation
 */

require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const { calculateFD, evaluateFD } = require("../utils/calculator");
const { detectLanguage, translateToEnglish, translateFromEnglish } = require("../utils/translator");
const { loadKnowledgeBase, retrieveContext } = require("../utils/ragRetriever");

const app = express();
app.use(cors());
app.use(express.json());

// Load RAG knowledge base on startup
loadKnowledgeBase();

// Initialize Groq client (will use mock if no API key)
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a friendly and knowledgeable Fixed Deposit (FD) advisor for Indian users.

Your job:
- Help users understand Fixed Deposits in simple, clear language (8th grade level)
- Always include actual numbers and examples (e.g., "₹1,00,000 at 7% for 1 year = ₹1,07,186")
- Give a clear recommendation at the end of every response
- Use real-life comparisons (e.g., "This is better than keeping money in a savings account")
- Explain financial terms simply (e.g., "TDS means the bank deducts tax before giving you interest")
- Be warm, encouraging, and non-judgmental
- Keep responses concise — 3 to 5 sentences max unless a detailed explanation is needed
- Always mention safety (DICGC insurance up to ₹5 lakh)
- Never give advice that could cause financial harm
- If asked about risky investments, always recommend consulting a financial advisor

Format your response as plain text. Use ₹ symbol for rupees. Use % for percentages.`;

// ─── MOCK LLM (when no Groq key) ─────────────────────────────────────────────
function getMockResponse(query) {
  const q = query.toLowerCase();

  if (q.includes("what is") || q.includes("kya hai") || q.includes("explain")) {
    return "A Fixed Deposit (FD) is like a savings locker at the bank. You put in money (say ₹1,00,000), the bank keeps it for a fixed time (say 1 year), and gives it back with extra money (interest). At 7%, your ₹1,00,000 becomes ₹1,07,186 after 1 year. It is safe, guaranteed, and better than a savings account. Recommendation: FDs are great for safe, predictable returns.";
  }
  if (q.includes("rate") || q.includes("interest") || q.includes("byaj")) {
    return "Current FD rates in India (2024): SBI offers 6.5-7.1%, HDFC Bank 7-7.4%, small finance banks up to 9%. Senior citizens get 0.25-0.5% extra. For ₹1,00,000 at 7.5% for 2 years, you earn ₹15,563 as interest. Recommendation: Compare rates across 2-3 banks before booking.";
  }
  if (q.includes("safe") || q.includes("risk") || q.includes("surakshit")) {
    return "Bank FDs are very safe. The government insures your money up to ₹5 lakh per bank through DICGC. Even if the bank closes, you get your money back (up to ₹5 lakh). For amounts above ₹5 lakh, split across multiple banks. Recommendation: FDs in scheduled commercial banks are among the safest investments in India.";
  }
  if (q.includes("tax") || q.includes("tds")) {
    return "FD interest is taxable. If you earn more than ₹40,000 interest in a year (₹50,000 for seniors), the bank deducts 10% TDS. For example, on ₹7,000 interest, TDS = ₹700. If your income is below the taxable limit, submit Form 15G to avoid TDS. Recommendation: Always submit Form 15G/15H at the start of the financial year to save tax.";
  }
  return "Fixed Deposits are a great way to grow your savings safely. You deposit money for a fixed period and earn guaranteed interest. For example, ₹50,000 at 7% for 1 year gives you ₹53,500 — that is ₹3,500 extra with zero risk. Recommendation: Start with a 1-year FD to get comfortable, then explore longer tenures for better rates.";
}

// ─── CALL GROQ LLM ────────────────────────────────────────────────────────────
async function callLLM(userMessage, context) {
  if (!groqClient) {
    console.log("⚠️  No Groq API key — using mock response");
    return getMockResponse(userMessage);
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Context from knowledge base:\n${context}\n\nUser question: ${userMessage}`,
    },
  ];

  const completion = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant", // Fast Groq model (llama3-8b-8192 was decommissioned)
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "I could not generate a response. Please try again.";
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

/**
 * POST /chat
 * Main chat endpoint — handles multilingual input/output
 */
app.post("/chat", async (req, res) => {
  try {
    const { message, preferredLanguage } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    // Step 1: Detect language
    const detectedLang = preferredLanguage || detectLanguage(message);

    // Step 2: Translate input to English for LLM
    const englishMessage = await translateToEnglish(message, detectedLang);

    // Step 3: Retrieve relevant context from RAG
    const ragContext = retrieveContext(englishMessage);

    // Step 4: Call LLM
    const englishResponse = await callLLM(englishMessage, ragContext);

    // Step 5: Translate response back to user's language
    const finalResponse = await translateFromEnglish(englishResponse, detectedLang);

    res.json({
      response: finalResponse,
      detectedLanguage: detectedLang,
      originalMessage: message,
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again.", details: err.message });
  }
});

/**
 * POST /calculate-fd
 * Pure math FD calculator — no LLM
 */
app.post("/calculate-fd", (req, res) => {
  try {
    const { principal, rate, tenure } = req.body;

    const result = calculateFD({
      principal,
      ratePercent: rate,
      tenureYears: tenure,
    });

    res.json({
      success: true,
      ...result,
      summary: `₹${result.principal.toLocaleString("en-IN")} at ${result.ratePercent}% for ${result.tenureYears} year(s) → ₹${result.maturityAmount.toLocaleString("en-IN")} (Interest earned: ₹${result.interestEarned.toLocaleString("en-IN")})`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /recommend
 * Evaluate if an FD is good or bad
 */
app.post("/recommend", async (req, res) => {
  try {
    const { principal, rate, tenure, bankType, isSeniorCitizen, preferredLanguage } = req.body;

    // Calculate returns
    const calcResult = calculateFD({ principal, ratePercent: rate, tenureYears: tenure });

    // Evaluate quality
    const evaluation = evaluateFD({ ratePercent: rate, tenureYears: tenure, bankType, isSeniorCitizen });

    // Build a structured recommendation message
    const englishSummary = `
FD Details: ₹${calcResult.principal.toLocaleString("en-IN")} at ${rate}% for ${tenure} year(s).
Maturity Amount: ₹${calcResult.maturityAmount.toLocaleString("en-IN")}
Interest Earned: ₹${calcResult.interestEarned.toLocaleString("en-IN")}
Verdict: ${evaluation.verdict}
${evaluation.recommendation}
Key points: ${evaluation.reasons.join(". ")}
    `.trim();

    // Translate if needed
    const lang = preferredLanguage || "english";
    const translatedSummary = await translateFromEnglish(englishSummary, lang);

    res.json({
      success: true,
      calculation: calcResult,
      evaluation,
      summary: translatedSummary,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /book-fd (Simulated booking)
 */
app.post("/book-fd", (req, res) => {
  const { principal, rate, tenure, bankName, holderName } = req.body;

  // Simulate booking — in production this would call bank API
  const bookingRef = "FD" + Date.now().toString().slice(-8);
  const calcResult = calculateFD({ principal, ratePercent: rate, tenureYears: tenure });

  const maturityDate = new Date();
  maturityDate.setFullYear(maturityDate.getFullYear() + parseFloat(tenure));

  res.json({
    success: true,
    bookingReference: bookingRef,
    message: "Your FD has been successfully booked! (Simulated)",
    details: {
      holderName: holderName || "Account Holder",
      bankName: bankName || "Demo Bank",
      principal: calcResult.principal,
      rate: `${rate}%`,
      tenure: `${tenure} year(s)`,
      maturityAmount: calcResult.maturityAmount,
      maturityDate: maturityDate.toDateString(),
      bookingDate: new Date().toDateString(),
    },
  });
});

/**
 * GET /health
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    llm: groqClient ? "Groq connected" : "Mock mode (add GROQ_API_KEY to enable)",
    rag: "loaded",
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 FD Copilot Backend running on http://localhost:${PORT}`);
  console.log(`   LLM: ${groqClient ? "Groq API" : "Mock mode (no API key)"}`);
  console.log(`   RAG: Knowledge base loaded\n`);
});
