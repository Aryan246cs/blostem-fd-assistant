/**
 * Vernacular FD Copilot — Backend Server
 */

require("dotenv").config({ path: "../.env" });
const express  = require("express");
const cors     = require("cors");
const fs       = require("fs");
const path     = require("path");
const axios    = require("axios");
const Groq     = require("groq-sdk");

const { calculateFD, evaluateFD }                                  = require("../utils/calculator");
const { detectLanguage, translateToEnglish, translateFromEnglish } = require("../utils/translator");
const { loadKnowledgeBase, retrieveContext }                       = require("../utils/ragRetriever");
const { generateEngineResponse, loadData: loadEngineData, detectLanguage: engineDetectLang } = require("../utils/responseEngine");

const app = express();
app.use(cors());
app.use(express.json());

loadKnowledgeBase();
loadEngineData();

const JARGON_LIST = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../rag-data/fd-jargon-buster.json"), "utf-8")
);

// ─── SESSION STORE ────────────────────────────────────────────────────────────
const chatStore = new Map();

function getSession(id)      { return chatStore.get(id) || null; }
function saveSession(s)      { s.updatedAt = new Date().toISOString(); chatStore.set(s.id, s); return s; }
function createSession(msg)  {
  const s = {
    id: "chat_" + Date.now(),
    title: msg.slice(0, 50),
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  chatStore.set(s.id, s);
  return s;
}

// ─── LLM CLIENTS ─────────────────────────────────────────────────────────────
const groqClient   = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() }) : null;
const HF_API_KEY   = process.env.HF_API_KEY?.trim() || null;
const HF_MODEL_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const GENERAL_SYSTEM_PROMPT = `You are an FD (Fixed Deposit) assistant for Indian users — a helpful, patient friend who knows banking well.

LANGUAGE: Match the user exactly. Hinglish input → Hinglish output. English → English. Hindi script → spoken Hindi. Default to Hinglish.
Never use formal Hindi. Say "Tension mat lo" not "Chinta mat kijiye".
Explain financial terms inline: "TDS matlab bank pehle hi tax kaat leta hai".

RESPONSE STYLE — read the conversation and respond to what is actually needed right now:
- Concept question (kya hai, what is, explain) → Direct answer + analogy + real rupee example + reassurance. Max 4 sentences.
- Calculation → Give the number directly. Use VERIFIED CALCULATION from context if present — do not recalculate.
- Frustrated or venting → Acknowledge first in 1 sentence, then help. No FD lecture.
- Short confirmation (yes, done, ok, ho gaya) → Brief acknowledgement + what comes next. Max 2 sentences.
- Stuck on something specific → Fix that specific problem. Ask "Koi aur problem?" at the end. Max 3 sentences.
- General question → Answer directly. Do not over-explain.

RULES:
- No "Recommendation:", "Suggestion:", "Advice:", "Note:" labels ever
- No bullet points unless user explicitly asks for a list
- Mention DICGC insurance only when safety is actually asked
- Sound like a friend, not a bank brochure`;

const BOOKING_SYSTEM_PROMPT = `You are guiding a user step-by-step through opening an FD on their bank app or website. You are a patient, friendly guide.

THE 6 STEPS (in order):
1. Login — Open the bank app or website. Login with Customer ID and Password, or MPIN.
2. Find FD section — Look for "Fixed Deposit", "Open FD", or "Term Deposit" in the menu or home screen.
3. Enter details — Fill in the amount to invest, the tenure (time period), and payout type (monthly interest or at maturity).
4. Select account and review — Choose which account to debit. Check the interest rate and maturity amount shown on screen.
5. Verify — Enter the OTP sent to your registered mobile, or complete Aadhaar verification.
6. Confirm — Tap the final Confirm or Submit button. FD is created instantly. Check SMS or email for the receipt.

HOW TO BEHAVE:
- Give ONE step per message. Never two at once.
- End each step with "Ho gaya?" or "Done?" to check in.
- If user says yes, done, ho gaya, ok, or anything confirming → move to the NEXT step immediately.
- If user is stuck or confused → help them with their specific problem on the CURRENT step. Do not move forward until they confirm.
- If user asks something unrelated → answer briefly, then bring them back to the current step.
- When all 6 steps are done → congratulate them warmly and tell them to check SMS or email for the FD receipt.

LANGUAGE: Match the user. Hinglish by default. Keep replies short — 2 to 3 sentences max.`;

// ─── INTENT DETECTION ─────────────────────────────────────────────────────────

const BOOKING_TRIGGERS = [
  /\b(open|book|booking|start|create|apply|kholna|kholun|shuru)\b.*\bfd\b/i,
  /\bfd\b.*(open|book|start|create|kholna|shuru)/i,
  /book\s+(an?\s+)?fd/i,
  /fd\s+kholna\s+hai/i,
  /fd.*kaise.*khole/i,
  /help.*open.*fd/i,
  /step.*by.*step.*fd/i,
  /guide.*fd|fd.*guide/i,
  /how.*to.*open.*fd/i,
  /\bbook\b.*(it|this|step)/i,
  /\bguide\b.*(me|through|step)/i,
  /opened.*\b(app|bank|website)\b/i,
  /i.*have.*opened.*app/i,
];

function isBookingRequest(message) {
  return BOOKING_TRIGGERS.some((r) => r.test(message));
}

function isInBookingFlow(history) {
  const recent = history.filter((m) => m.role === "assistant").slice(-3);
  const keywords = ["ho gaya", "done?", "login", "otp", "deposits", "fd section", "tenure", "confirm", "step"];
  return recent.some((m) => keywords.some((k) => m.content.toLowerCase().includes(k)));
}

// ─── CALCULATION HELPER ───────────────────────────────────────────────────────

function extractAndCalculate(query) {
  const q = query.toLowerCase();
  const rateMatch = q.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!rateMatch) return null;

  const rate        = parseFloat(rateMatch[1]);
  const tenorMonths = q.match(/(\d+)\s*(?:m\b|months?)/i);
  const tenorYears  = q.match(/(\d+(?:\.\d+)?)\s*(?:years?|yr)/i);
  const tenureYears = tenorMonths ? parseFloat(tenorMonths[1]) / 12 : tenorYears ? parseFloat(tenorYears[1]) : 1;

  const principalMatch =
    q.match(/₹\s*([\d,]+)/) ||
    q.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i) ||
    q.match(/(\d+(?:\.\d+)?)\s*k\b/i) ||
    q.match(/\b([\d,]{5,})\b/);

  let principal = 100000;
  if (principalMatch) {
    const raw = principalMatch[1].replace(/,/g, "");
    if (q.includes("lakh") || q.includes("lac")) principal = parseFloat(raw) * 100000;
    else if (q.match(/\d+k\b/)) principal = parseFloat(raw) * 1000;
    else principal = parseFloat(raw);
  }

  try {
    const result = calculateFD({ principal, ratePercent: rate, tenureYears });
    return `[VERIFIED CALCULATION — use these exact numbers]\n₹${result.principal.toLocaleString("en-IN")} at ${rate}% for ${Math.round(tenureYears * 12)} months → maturity ₹${result.maturityAmount.toLocaleString("en-IN")}, interest earned ₹${result.interestEarned.toLocaleString("en-IN")} (quarterly compounding)`;
  } catch { return null; }
}

// ─── SANITISER ────────────────────────────────────────────────────────────────

function sanitise(text) {
  return text
    .replace(/\*\*(Recommendation|Suggestion|Advice|Note|Safety\s*note|Summary)\s*:\*\*.*/gi, "")
    .replace(/(Recommendation|Suggestion|Advice|Note|Safety\s*note)\s*:.*/gi, "")
    .replace(/^[\-\*•]\s+.*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── LLM CALLERS ─────────────────────────────────────────────────────────────

async function callGroq(systemPrompt, userPrompt, history) {
  if (!groqClient) return null;
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userPrompt },
  ];
  const res = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    max_tokens: 300,
    temperature: 0.5,
  });
  return res.choices[0]?.message?.content || null;
}

async function callMistral(systemPrompt, userPrompt, history) {
  if (!HF_API_KEY) return null;
  const historyPart = history.slice(-4).map((m) =>
    m.role === "user" ? `[INST] ${m.content} [/INST]` : m.content
  ).join("\n");
  const prompt = `<s>${historyPart ? historyPart + "\n" : ""}[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`;
  const res = await axios.post(HF_MODEL_URL, {
    inputs: prompt,
    parameters: { max_new_tokens: 300, temperature: 0.5, return_full_text: false, stop: ["</s>", "[INST]"] },
  }, {
    headers: { Authorization: `Bearer ${HF_API_KEY}`, "Content-Type": "application/json" },
    timeout: 30000,
  });
  return res.data?.[0]?.generated_text || null;
}

async function callLLM(systemPrompt, userPrompt, history, lang) {
  let raw = null;
  try {
    if (lang === "english") {
      raw = await callGroq(systemPrompt, userPrompt, history);
      if (!raw) raw = await callMistral(systemPrompt, userPrompt, history);
    } else {
      raw = await callMistral(systemPrompt, userPrompt, history);
      if (!raw) raw = await callGroq(systemPrompt, userPrompt, history);
    }
  } catch (err) {
    console.warn("LLM error:", err.message);
  }
  return raw ? sanitise(raw) : null;
}

// ─── LANGUAGE HELPERS ─────────────────────────────────────────────────────────

function resolveLang(message, preferredLanguage) {
  const tLang = detectLanguage(message);
  if (["tamil", "bengali", "marathi"].includes(tLang)) return tLang;
  if (["tamil", "bengali", "marathi"].includes(preferredLanguage)) return preferredLanguage;
  const eLang = engineDetectLang(message);
  if (eLang !== "english") return eLang;
  if (preferredLanguage === "hindi") return "hindi";
  return "english";
}

function langInstruction(lang) {
  if (lang === "english") return "Reply ONLY in simple conversational English.";
  if (lang === "hindi")   return "Reply ONLY in simple spoken Hindi using Devanagari script.";
  if (lang === "tamil")   return "Reply ONLY in simple Tamil using Tamil script.";
  if (lang === "marathi") return "Reply ONLY in simple Marathi.";
  if (lang === "bengali") return "Reply ONLY in simple Bengali.";
  return "Reply ONLY in Hinglish — casual Hindi-English mix. Never formal Hindi.";
}

// ─── MOCK FALLBACK ────────────────────────────────────────────────────────────

function mockResponse(query) {
  const q = query.toLowerCase();
  if (q.includes("safe") || q.includes("risk"))
    return "Bank FDs are very safe — government insures up to ₹5 lakh per bank through DICGC. Even if a bank closes, your money up to ₹5 lakh is protected.";
  if (q.includes("tax") || q.includes("tds"))
    return "FD interest is taxable. Bank deducts 10% TDS if interest exceeds ₹40,000/year. Submit Form 15G to avoid TDS if your income is below the taxable limit.";
  if (q.includes("rate") || q.includes("interest"))
    return "Current FD rates: SBI 6.5–7.1%, HDFC 7–7.4%, small finance banks up to 9%. Compare 2-3 banks before booking.";
  return "Fixed Deposits are a safe way to grow savings. ₹1,00,000 at 7% for 1 year gives ₹1,07,186 — guaranteed returns with zero market risk.";
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.post("/chat", async (req, res) => {
  try {
    const { message, preferredLanguage, sessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message cannot be empty" });

    const lang           = resolveLang(message, preferredLanguage);
    const englishMessage = await translateToEnglish(message, detectLanguage(message));

    let session       = sessionId ? getSession(sessionId) : null;
    const history     = session ? session.messages : [];
    const inBooking   = isBookingRequest(englishMessage) || isInBookingFlow(history);

    let finalResponse;
    let source;

    if (inBooking) {
      // ── BOOKING MODE ──
      // LLM gets the booking system prompt + full conversation history.
      // It knows the 6 steps, tracks progress from history, handles stuck users naturally.
      const userPrompt = `${langInstruction(lang)}\n\nUser: ${message}`;
      const raw = await callLLM(BOOKING_SYSTEM_PROMPT, userPrompt, history, lang);
      finalResponse = raw || "Chalo shuru karte hain. Pehle apna bank app ya website kholo aur login karo. Ho gaya?";
      source = "booking";

    } else {
      // ── GENERAL MODE ──
      const ragContext   = retrieveContext(englishMessage);
      const engineResult = generateEngineResponse(englishMessage, lang);
      const calcContext  = extractAndCalculate(message) || extractAndCalculate(englishMessage) || "";

      const context = [
        calcContext,
        ragContext   ? `[Knowledge base]\n${ragContext}` : "",
        `[Pre-matched answer]\n${engineResult.response}`,
      ].filter(Boolean).join("\n\n");

      const needsTranslation = ["hindi", "tamil", "marathi", "bengali"].includes(lang);
      const llmLang          = needsTranslation ? "english" : lang;
      const userPrompt       = `${langInstruction(llmLang)}\n\n${context}\n\nUser: ${englishMessage}`;

      let raw = await callLLM(GENERAL_SYSTEM_PROMPT, userPrompt, history, llmLang);
      if (!raw) raw = mockResponse(englishMessage);
      if (needsTranslation) raw = await translateFromEnglish(raw, lang);

      finalResponse = sanitise(raw);
      source = engineResult.source;
    }

    if (!session) session = createSession(message);
    session.messages.push(
      { role: "user",      content: message,      timestamp: new Date().toISOString() },
      { role: "assistant", content: finalResponse, timestamp: new Date().toISOString() }
    );
    saveSession(session);

    res.json({ response: finalResponse, detectedLanguage: lang, sessionId: session.id, source });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again.", details: err.message });
  }
});

app.get("/chats", (_req, res) => {
  const sessions = Array.from(chatStore.values())
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(({ id, title, createdAt, updatedAt, messages }) => ({
      id, title, createdAt, updatedAt,
      messageCount: messages.length,
      preview: messages[messages.length - 1]?.content?.slice(0, 80) || "",
    }));
  res.json({ sessions });
});

app.get("/chat/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

app.delete("/chat/:id", (req, res) => {
  chatStore.delete(req.params.id);
  res.json({ success: true });
});

app.post("/calculate-fd", (req, res) => {
  try {
    const { principal, rate, tenure } = req.body;
    const result = calculateFD({ principal, ratePercent: rate, tenureYears: tenure });
    res.json({
      success: true, ...result,
      summary: `₹${result.principal.toLocaleString("en-IN")} at ${result.ratePercent}% for ${result.tenureYears} year(s) → ₹${result.maturityAmount.toLocaleString("en-IN")} (Interest: ₹${result.interestEarned.toLocaleString("en-IN")})`,
    });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post("/recommend", async (req, res) => {
  try {
    const { principal, rate, tenure, bankType, isSeniorCitizen, preferredLanguage } = req.body;
    const calcResult = calculateFD({ principal, ratePercent: rate, tenureYears: tenure });
    const evaluation = evaluateFD({ ratePercent: rate, tenureYears: tenure, bankType, isSeniorCitizen });
    const summary    = `FD: ₹${calcResult.principal.toLocaleString("en-IN")} at ${rate}% for ${tenure}yr. Maturity: ₹${calcResult.maturityAmount.toLocaleString("en-IN")}. ${evaluation.verdict}. ${evaluation.recommendation}`;
    const translated = await translateFromEnglish(summary, preferredLanguage || "english");
    res.json({ success: true, calculation: calcResult, evaluation, summary: translated });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post("/book-fd", (req, res) => {
  const { principal, rate, tenure, bankName, holderName } = req.body;
  const ref    = "FD" + Date.now().toString().slice(-8);
  const result = calculateFD({ principal, ratePercent: rate, tenureYears: tenure });
  const maturityDate = new Date();
  maturityDate.setFullYear(maturityDate.getFullYear() + parseFloat(tenure));
  res.json({
    success: true, bookingReference: ref,
    message: "Your FD has been successfully booked! (Simulated)",
    details: {
      holderName: holderName || "Account Holder", bankName: bankName || "Demo Bank",
      principal: result.principal, rate: `${rate}%`, tenure: `${tenure} year(s)`,
      maturityAmount: result.maturityAmount,
      maturityDate: maturityDate.toDateString(),
      bookingDate: new Date().toDateString(),
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    models: {
      english:  groqClient ? "Groq / LLaMA 3.1 8B (active)"     : "unavailable (add GROQ_API_KEY)",
      hinglish: HF_API_KEY ? "HuggingFace / Mistral 7B (active)" : "unavailable (add HF_API_KEY)",
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
  console.log(`   RAG: loaded\n`);
});
