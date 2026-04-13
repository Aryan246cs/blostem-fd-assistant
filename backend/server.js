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
const { generateEngineResponse, loadData: loadEngineData, detectLanguage: engineDetectLang } = require("../utils/responseEngine");

const app = express();
app.use(cors());
app.use(express.json());

// Load RAG knowledge base on startup
loadKnowledgeBase();
loadEngineData();

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

// ─── LLM CLIENTS ─────────────────────────────────────────────────────────────

// Groq — English queries (LLaMA 3.1 8B, fast)
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() })
  : null;

// HuggingFace — Hinglish/Hindi queries (Mistral 7B, better vernacular)
const axios = require("../backend/node_modules/axios");
const HF_API_KEY   = process.env.HF_API_KEY?.trim() || null;
const HF_MODEL_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an FD (Fixed Deposit) advisor for Indian users — especially people from Tier 2 and Tier 3 cities who are new to investing.

Your job: explain financial concepts like a trusted local friend, not a bank employee or textbook.

---

LANGUAGE RULES:
- Match the user's language exactly:
  - Hinglish input → Hinglish output (casual Hindi-English mix)
  - English input → simple conversational English
  - Hindi script input → simple spoken Hindi (never formal)
- If language is unclear, default to Hinglish.
- Never use formal Hindi: avoid words like "pratham", "aavashyak", "kripya dhyan dein".
- Always sound conversational:
  - Say: "Aap kar sakte ho" — NOT: "Aapko karna chahiye"
  - Say: "Tension mat lo" — NOT: "Chinta karne ki koi baat nahi hai"
- When using a financial term, explain it immediately in the same sentence:
  - "TDS matlab bank pehle hi tax kaat leta hai — jaise salary se tax cut hota hai"

---

RESPONSE STRUCTURE (MANDATORY — follow this order every time):
1. Direct answer — short and clear, no fluff
2. Analogy — one relatable real-life comparison (keep it Indian and everyday)
3. Example — must include actual ₹ numbers
4. Reassurance — reduce fear, build trust

If any part is missing, rewrite before responding.

---

CORE RULES:
- Keep responses to 4–6 sentences max unless the user asks for detail.
- Always include ₹ numbers in examples.
- Simplify every financial term the moment you use it.
- NEVER use "Recommendation:", "Suggestion:", "Advice:", "Note:", or any labeled section — in any language. This includes Hindi equivalents like "Sudharav:", "Sujhav:", "Salah:", "Tippani:".
- Blend any advice naturally into the last sentence. Example — BAD: "Recommendation: FD safe hai." GOOD: "Isliye log FD ko safe option mante hain."

---

SAFETY RULES:
- When safety is asked, always say: "₹5 lakh tak DICGC insurance hota hai — matlab government aapka paisa protect karti hai."
- Use real bank names when helpful: SBI, HDFC, ICICI, Post Office, Small Finance Banks.
- Never say: "baaki paisa guaranteed mil jayega"
- Instead say: "₹5 lakh tak hi insurance guaranteed hota hai"

---

RAG CONTEXT RULES:
- You will receive pre-matched knowledge from a RAG system at the top of the user message.
- Use it as your primary source — do not contradict it.
- Do NOT copy it directly — rewrite it in your own simple, conversational tone.
- If the RAG answer sounds like a textbook, rewrite it to sound human.

---

SELF-CHECK BEFORE EVERY RESPONSE:
- Did I follow all 4 structure steps? (Direct answer → Analogy → Example → Reassurance)
- Did I include an analogy?
- Did I include a ₹ example?
- Did I reduce fear if the user seemed worried?
- Does this sound like a human talking to a friend?

If any answer is no — fix it before sending.

---

FINAL GOAL:
The user should feel: "Yeh simple hai, mujhe samajh aa gaya."
NOT: "Yeh ek generic AI answer hai."

When in doubt — simplify more, not less.`;

function getMockResponse(query) {
  const q = query.toLowerCase();
  if (q.includes("what is") || q.includes("explain")) {
    return "A Fixed Deposit is like a savings locker at the bank. You put in money (say ₹1,00,000), the bank keeps it for a fixed time (say 1 year), and gives it back with extra money. At 7%, your ₹1,00,000 becomes ₹1,07,186 after 1 year — safe, guaranteed, and better than a savings account.";
  }
  if (q.includes("rate") || q.includes("interest")) {
    return "Current FD rates in India: SBI offers 6.5–7.1%, HDFC Bank 7–7.4%, small finance banks up to 9%. For ₹1,00,000 at 7.5% for 2 years, you earn ₹15,563 as interest. Compare rates across 2–3 banks before booking.";
  }
  if (q.includes("safe") || q.includes("risk")) {
    return "Bank FDs are very safe — the government insures your money up to ₹5 lakh per bank through DICGC. Even if the bank closes, you get your money back up to ₹5 lakh. FDs in scheduled commercial banks are among the safest investments in India.";
  }
  if (q.includes("tax") || q.includes("tds")) {
    return "FD interest is taxable. If you earn more than ₹40,000 interest in a year, the bank deducts 10% TDS — just like salary tax. Submit Form 15G at the start of the year to avoid TDS if your income is below the taxable limit.";
  }
  return "Fixed Deposits are a great way to grow your savings safely. For example, ₹50,000 at 7% for 1 year gives you ₹53,500 — that is ₹3,500 extra with zero risk. Start with a 1-year FD to get comfortable, then explore longer tenures for better rates.";
}

// ─── SANITISER ───────────────────────────────────────────────────────────────
// Strip robotic advisory labels from any LLM output
// Strip robotic advisory labels from any LLM output — English and Hindi variants
function sanitiseResponse(text) {
  return text
    // Bold labeled sections — remove label + rest of that line
    .replace(/\*\*(Recommendation|Suggestion|Advice|Note|Summary|Sikayat|Sudharav|Sujhav|Salah|Sujhaav|Tippani)\s*:\*\*[^\n]*/gi, "")
    // Plain labeled sections — remove label + rest of that line
    .replace(/(Recommendation|Suggestion|Advice|Note|Sikayat|Sudharav|Sujhav|Salah|Sujhaav|Tippani)\s*:[^\n]*/gi, "")
    // Clean up leftover blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── LLM CALLERS ─────────────────────────────────────────────────────────────

/**
 * Build the prompt sent to any LLM.
 * Keeps it tight — only relevant RAG context, clear language instruction.
 */
function buildLLMPrompt(userMessage, context, lang) {
  const langInstruction =
    lang === "english"
      ? "Reply in simple conversational English."
      : lang === "hindi"
      ? "Reply in simple spoken Hindi (not formal). Use Devanagari script."
      : "Reply in Hinglish — casual Hindi-English mix like 'Tension mat lo, aapka paisa safe hai.' Never use formal Hindi.";

  return `${langInstruction}

Use this knowledge to answer:
${context}

User asked: ${userMessage}

Reply in exactly this order — no labels, no extra sections:
1. Direct answer (1 sentence)
2. Analogy — one everyday comparison (start with "Aise samjho:")
3. Example — must include a ₹ number
4. Reassurance — end naturally, blend any advice into this sentence

Keep it under 5 sentences total. Sound like a friend, not a bank.`;
}

/**
 * Groq — LLaMA 3.1 8B — used for English
 */
async function callGroq(userMessage, context, history, lang) {
  if (!groqClient) return null;

  const historyMessages = history.slice(-6).map((m) => ({ role: m.role, content: m.content }));
  const completion = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...historyMessages,
      { role: "user",   content: buildLLMPrompt(userMessage, context, lang) },
    ],
    max_tokens: 350,
    temperature: 0.55,
  });
  return completion.choices[0]?.message?.content || null;
}

/**
 * HuggingFace Mistral 7B — used for Hinglish / Hindi
 * Uses the instruct chat template format
 */
async function callMistral(userMessage, context, history, lang) {
  if (!HF_API_KEY) return null;

  // Build conversation in Mistral instruct format: <s>[INST] ... [/INST]
  const historyPart = history.slice(-4).map((m) =>
    m.role === "user"
      ? `[INST] ${m.content} [/INST]`
      : m.content
  ).join("\n");

  const prompt = `<s>${historyPart ? historyPart + "\n" : ""}[INST] ${SYSTEM_PROMPT}\n\n${buildLLMPrompt(userMessage, context, lang)} [/INST]`;

  const response = await axios.post(
    HF_MODEL_URL,
    {
      inputs: prompt,
      parameters: {
        max_new_tokens: 350,
        temperature: 0.55,
        return_full_text: false,
        stop: ["</s>", "[INST]"],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const output = response.data?.[0]?.generated_text || null;
  return output;
}

/**
 * Router — picks model based on language
 * Hinglish/Hindi → Mistral (HF) → fallback Groq → fallback engine
 * English        → Groq (LLaMA) → fallback Mistral → fallback engine
 */
async function callLLM(userMessage, context, history = [], lang = "hinglish") {
  let raw = null;

  try {
    if (lang === "english") {
      raw = await callGroq(userMessage, context, history, lang);
      if (!raw) raw = await callMistral(userMessage, context, history, lang); // fallback
    } else {
      // hinglish or hindi → Mistral first
      raw = await callMistral(userMessage, context, history, lang);
      if (!raw) raw = await callGroq(userMessage, context, history, lang);   // fallback
    }
  } catch (err) {
    console.warn(`LLM call failed (${lang}):`, err.message);
  }

  if (!raw) {
    // Both APIs unavailable — use engine's pre-built response from context
    const engineLines = context.split("\n").filter((l) => l && !l.startsWith("["));
    return engineLines.slice(0, 5).join(" ") || getMockResponse(userMessage);
  }

  return sanitiseResponse(raw);
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

    // Always detect language from the actual message text first.
    // preferredLanguage (UI dropdown) is only a fallback for truly ambiguous input.
    const msgLang = engineDetectLang(message); // "hinglish" | "hindi" | "english"
    const engineLang = msgLang !== "english"
      ? msgLang  // message has clear Hindi/Hinglish signals — trust it
      : (preferredLanguage === "hindi" ? "hindi" : "english"); // pure English or ambiguous — use preference

    // ── Run local response engine (RAG + jargon + structured) ──
    const engineResult = generateEngineResponse(englishMessage, engineLang);
    // ── Jargon shortcut — if engine found a strong local match, skip LLM ──
    const jargonHit = checkJargon(englishMessage);
    let finalResponse;
    let source = engineResult.source;

    if (jargonHit && !groqClient) {
      // No LLM available — use engine response directly (already in correct lang)
      finalResponse = engineResult.response;
      source = "jargon";
    } else {
      // ── Build enriched context for LLM ──
      const ragContext = retrieveContext(englishMessage);
      const engineContext = `
[Pre-matched RAG answer for this query]
Intent: ${engineResult.intent} | Emotion: ${engineResult.emotion}
${engineResult.response}

[Additional knowledge base context]
${ragContext}`.trim();

      const session = sessionId ? getSession(sessionId) : null;
      const history = session ? session.messages : [];

      // LLM responds in the target language directly — skip MyMemory for Hinglish/English
      const llmResponse = await callLLM(englishMessage, engineContext, history, engineLang);

      // Only run translation for Hindi script (Devanagari) — MyMemory handles that reasonably
      finalResponse = (engineLang === "hindi")
        ? await translateFromEnglish(llmResponse, "hindi")
        : llmResponse;
    }

    // ── Persist to session ──
    let session = sessionId ? getSession(sessionId) : null;
    if (!session) session = createSession(message);
    session.messages.push(
      { role: "user",      content: message,       timestamp: new Date().toISOString() },
      { role: "assistant", content: finalResponse,  timestamp: new Date().toISOString() }
    );
    saveSession(session);

    res.json({
      response: finalResponse,
      detectedLanguage: detectedLang,
      sessionId: session.id,
      source,
      intent: engineResult.intent,
      emotion: engineResult.emotion,
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
    models: {
      english:  groqClient  ? "Groq / LLaMA 3.1 8B (active)"   : "unavailable (add GROQ_API_KEY)",
      hinglish: HF_API_KEY  ? "HuggingFace / Mistral 7B (active)" : "unavailable (add HF_API_KEY)",
      hindi:    HF_API_KEY  ? "HuggingFace / Mistral 7B (active)" : "unavailable (add HF_API_KEY)",
    },
    rag: "loaded",
    sessions: chatStore.size,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 FD Copilot Backend running on http://localhost:${PORT}`);
  console.log(`   English  → ${groqClient ? "Groq / LLaMA 3.1 8B" : "Mock mode (add GROQ_API_KEY)"}`);
  console.log(`   Hinglish → ${HF_API_KEY  ? "HuggingFace / Mistral 7B" : "Mock mode (add HF_API_KEY)"}`);
  console.log(`   Hindi    → ${HF_API_KEY  ? "HuggingFace / Mistral 7B" : "Mock mode (add HF_API_KEY)"}`);
  console.log(`   RAG: Knowledge base loaded\n`);
});
