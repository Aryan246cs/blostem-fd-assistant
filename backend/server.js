/**
 * Vernacular FD Copilot — Backend Server
 * Express + Groq LLM + RAG + Calculator + Translation + Chat Memory
 */

require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

const { calculateFD, evaluateFD } = require("../utils/calculator");
const { detectLanguage, translateToEnglish, translateFromEnglish } = require("../utils/translator");
const { loadKnowledgeBase, retrieveContext } = require("../utils/ragRetriever");

const app = express();
app.use(cors());
app.use(express.json());

// Load RAG knowledge base on startup
loadKnowledgeBase();

// Load jargon buster once at startup
const JARGON_PATH = path.join(__dirname, "../rag-data/fd-jargon-buster.json");
const JARGON_LIST = JSON.parse(fs.readFileSync(JARGON_PATH, "utf-8"));

// ─── IN-MEMORY CHAT STORE (no DB needed for hackathon) ───────────────────────
// Structure: { [sessionId]: { id, title, messages: [], createdAt, updatedAt } }
const chatStore = new Map();

function getSession(id) {
  return chatStore.get(id) || null;
}

function saveSession(session) {
  session.updatedAt = new Date().toISOString();
  chatStore.set(session.id, session);
  return session;
}

function createSession(firstMessage) {
  const id = "chat_" + Date.now();
  const session = {
    id,
    title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : ""),
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  chatStore.set(id, session);
  return session;
}

// ─── JARGON BUSTER ────────────────────────────────────────────────────────────
function checkJargon(text) {
  const lower = text.toLowerCase().trim();
  // Match "what is X", "what does X mean", "define X", or just the term alone
  const patterns = [
    /^what (?:is|does|are) (.+?)(?:\?|$)/i,
    /^define (.+?)(?:\?|$)/i,
    /^meaning of (.+?)(?:\?|$)/i,
    /^(.+?) (?:kya hai|matlab|meaning)(?:\?|$)/i,
  ];
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      const term = match[1].trim().replace(/[?]/g, "");
      const found = JARGON_LIST.find(
        (j) => j.term === term || term.includes(j.term) || j.term.includes(term)
      );
      if (found) return found.definition;
    }
  }
  // Direct term lookup
  const found = JARGON_LIST.find((j) => lower === j.term || lower === `what is ${j.term}`);
  return found ? found.definition : null;
}

// ─── GROQ CLIENT ─────────────────────────────────────────────────────────────
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

Format your response as plain text. Use ₹ symbol for rupees. Use % for percentages.`;

function getMockResponse(query) {
  const q = query.toLowerCase();
  if (q.includes("what is") || q.includes("explain")) {
    return "A Fixed Deposit (FD) is like a savings locker at the bank. You put in money (say ₹1,00,000), the bank keeps it for a fixed time (say 1 year), and gives it back with extra money (interest). At 7%, your ₹1,00,000 becomes ₹1,07,186 after 1 year. It is safe, guaranteed, and better than a savings account. Recommendation: FDs are great for safe, predictable returns.";
  }
  if (q.includes("rate") || q.includes("interest")) {
    return "Current FD rates in India (2024): SBI offers 6.5-7.1%, HDFC Bank 7-7.4%, small finance banks up to 9%. Senior citizens get 0.25-0.5% extra. For ₹1,00,000 at 7.5% for 2 years, you earn ₹15,563 as interest. Recommendation: Compare rates across 2-3 banks before booking.";
  }
  if (q.includes("safe") || q.includes("risk")) {
    return "Bank FDs are very safe. The government insures your money up to ₹5 lakh per bank through DICGC. Even if the bank closes, you get your money back (up to ₹5 lakh). Recommendation: FDs in scheduled commercial banks are among the safest investments in India.";
  }
  if (q.includes("tax") || q.includes("tds")) {
    return "FD interest is taxable. If you earn more than ₹40,000 interest in a year, the bank deducts 10% TDS. Submit Form 15G to avoid TDS if your income is below the taxable limit. Recommendation: Always submit Form 15G/15H at the start of the financial year to save tax.";
  }
  return "Fixed Deposits are a great way to grow your savings safely. For example, ₹50,000 at 7% for 1 year gives you ₹53,500 — that is ₹3,500 extra with zero risk. Recommendation: Start with a 1-year FD to get comfortable, then explore longer tenures for better rates.";
}

async function callLLM(userMessage, context, history = []) {
  if (!groqClient) return getMockResponse(userMessage);

  // Include last 6 messages as conversation history for context
  const historyMessages = history.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historyMessages,
    {
      role: "user",
      content: `Context from knowledge base:\n${context}\n\nUser question: ${userMessage}`,
    },
  ];

  const completion = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || "I could not generate a response. Please try again.";
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

/**
 * POST /chat
 * Main chat — with session memory + jargon shortcut
 */
app.post("/chat", async (req, res) => {
  try {
    const { message, preferredLanguage, sessionId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const detectedLang = preferredLanguage || detectLanguage(message);
    const englishMessage = await translateToEnglish(message, detectedLang);

    // ── Jargon shortcut (no LLM needed) ──
    const jargonHit = checkJargon(englishMessage);
    let englishResponse;
    let source = "llm";

    if (jargonHit) {
      englishResponse = jargonHit;
      source = "jargon";
    } else {
      const ragContext = retrieveContext(englishMessage);
      // Get session history for context
      const session = sessionId ? getSession(sessionId) : null;
      const history = session ? session.messages : [];
      englishResponse = await callLLM(englishMessage, ragContext, history);
    }

    const finalResponse = await translateFromEnglish(englishResponse, detectedLang);

    // ── Persist to session ──
    let session = sessionId ? getSession(sessionId) : null;
    if (!session) {
      session = createSession(message);
    }
    session.messages.push(
      { role: "user", content: message, timestamp: new Date().toISOString() },
      { role: "assistant", content: finalResponse, timestamp: new Date().toISOString() }
    );
    saveSession(session);

    res.json({
      response: finalResponse,
      detectedLanguage: detectedLang,
      sessionId: session.id,
      source, // "llm" | "jargon"
    });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again.", details: err.message });
  }
});

/**
 * GET /chats
 * List all chat sessions (most recent first)
 */
app.get("/chats", (_req, res) => {
  const sessions = Array.from(chatStore.values())
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(({ id, title, createdAt, updatedAt, messages }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      messageCount: messages.length,
      preview: messages[messages.length - 1]?.content?.slice(0, 80) || "",
    }));
  res.json({ sessions });
});

/**
 * GET /chat/:id
 * Fetch full conversation
 */
app.get("/chat/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

/**
 * DELETE /chat/:id
 */
app.delete("/chat/:id", (req, res) => {
  chatStore.delete(req.params.id);
  res.json({ success: true });
});

/**
 * POST /calculate-fd
 */
app.post("/calculate-fd", (req, res) => {
  try {
    const { principal, rate, tenure } = req.body;
    const result = calculateFD({ principal, ratePercent: rate, tenureYears: tenure });
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
 */
app.post("/recommend", async (req, res) => {
  try {
    const { principal, rate, tenure, bankType, isSeniorCitizen, preferredLanguage } = req.body;
    const calcResult = calculateFD({ principal, ratePercent: rate, tenureYears: tenure });
    const evaluation = evaluateFD({ ratePercent: rate, tenureYears: tenure, bankType, isSeniorCitizen });
    const englishSummary = `FD Details: ₹${calcResult.principal.toLocaleString("en-IN")} at ${rate}% for ${tenure} year(s). Maturity Amount: ₹${calcResult.maturityAmount.toLocaleString("en-IN")}. Interest Earned: ₹${calcResult.interestEarned.toLocaleString("en-IN")}. Verdict: ${evaluation.verdict}. ${evaluation.recommendation}. Key points: ${evaluation.reasons.join(". ")}`;
    const lang = preferredLanguage || "english";
    const translatedSummary = await translateFromEnglish(englishSummary, lang);
    res.json({ success: true, calculation: calcResult, evaluation, summary: translatedSummary });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /book-fd
 */
app.post("/book-fd", (req, res) => {
  const { principal, rate, tenure, bankName, holderName } = req.body;
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
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    llm: groqClient ? "Groq connected" : "Mock mode (add GROQ_API_KEY to enable)",
    rag: "loaded",
    sessions: chatStore.size,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 FD Copilot Backend running on http://localhost:${PORT}`);
  console.log(`   LLM: ${groqClient ? "Groq API" : "Mock mode (no API key)"}`);
  console.log(`   RAG: Knowledge base loaded\n`);
});
