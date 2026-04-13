/**
 * FD Copilot — Core Response Engine v2
 *
 * Pipeline:
 *   detectLanguage → findBestRAGMatch → detectJargon
 *   → buildResponse → applyLanguage → generateFDResponse
 *
 * Target: Tier 2/3 Indian users
 * Default tone: Hinglish — trusted local friend, never a bank employee
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ─── Data (loaded once) ───────────────────────────────────────────────────────
let RAG_QUERIES = [];
let BASICS      = [];
let JARGON      = [];

function loadData() {
  if (RAG_QUERIES.length) return;
  const base = path.join(__dirname, "../rag-data");
  RAG_QUERIES = JSON.parse(fs.readFileSync(path.join(base, "fd-real-queries.json"),  "utf-8"));
  BASICS      = JSON.parse(fs.readFileSync(path.join(base, "fd-basics.json"),        "utf-8"));
  JARGON      = JSON.parse(fs.readFileSync(path.join(base, "fd-jargon-buster.json"), "utf-8"));
  console.log(`✅ ResponseEngine v2: ${RAG_QUERIES.length} queries | ${BASICS.length} basics | ${JARGON.length} jargon`);
}

// ─── STEP 1: Language Detection ───────────────────────────────────────────────
// Rules:
//   Latin letters + Hindi signal words  → hinglish
//   Only Hindi signal words (no Latin)  → hindi
//   Otherwise                           → english
const HINDI_SIGNALS = /\b(hai|kya|nahi|nhi|kar|karo|paisa|mera|meri|aap|kaise|kitna|kab|kahan|kaha|tod|safe|best|lagega|milega|hota|hoti|sakte|sakta|chahiye|wala|wali|pe|se|me|ko|ka|ki|ke)\b/i;

function detectLanguage(text) {
  const t = text.toLowerCase();
  const hasLatin  = /[a-z]/.test(t);
  const hasHindi  = HINDI_SIGNALS.test(t);
  const hasScript = /[\u0900-\u097F]/.test(text); // Devanagari

  if (hasScript)            return "hindi";
  if (hasLatin && hasHindi) return "hinglish";
  if (hasHindi)             return "hinglish";
  return "english";
}

// ─── STEP 2: RAG Matching ─────────────────────────────────────────────────────
// Normalise: lowercase, strip punctuation, remove stop/filler words
const STOP_WORDS = /\b(sk|skte|sakte|sakta|sakti|kya|hai|nahi|nhi|karu|karo|kar|kaise|kitna|hota|hoti|hain|ho|bhi|aur|ya|se|me|ko|ka|ki|ke|pe|ek|yeh|woh|toh|to|na|hi|bhi|tha|the|thi)\b/g;

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")   // strip punctuation
    .replace(STOP_WORDS, " ")  // remove filler words
    .replace(/\s+/g, " ")
    .trim();
}

function findBestRAGMatch(query) {
  loadData();
  const q = normalize(query);
  const qWords = q.split(" ").filter(Boolean);

  let best      = null;
  let bestScore = 0;

  for (const entry of RAG_QUERIES) {
    const rq     = normalize(entry.query);
    const rWords = rq.split(" ").filter(Boolean);

    // Substring match — strong signal
    if (q.includes(rq) || rq.includes(q)) return entry;

    // Word overlap score
    let score = 0;
    for (const w of qWords) {
      if (rWords.includes(w))                                    score += 3;
      else if (rWords.some((r) => r.includes(w) || w.includes(r))) score += 1;
    }

    // Intent keyword boost
    const INTENT_KEYS = {
      tax:        ["tax", "tds", "deduct"],
      withdrawal: ["tod", "todna", "nikalna", "withdraw", "beech", "break"],
      fear:       ["safe", "dub", "band", "risk", "secure"],
      comparison: ["best", "better", "kaha", "vs", "compare", "sbi", "hdfc"],
      beginner:   ["minimum", "start", "open", "kaise", "kya", "difference"],
    };
    for (const keys of Object.values(INTENT_KEYS)) {
      const qHit = keys.some((k) => q.includes(k));
      const rHit = keys.some((k) => rq.includes(k));
      if (qHit && rHit) score += 3;
    }

    const norm = score / Math.max(rWords.length, qWords.length, 1);
    if (norm > bestScore) { bestScore = norm; best = entry; }
  }

  return bestScore >= 0.45 ? best : null;
}

// ─── STEP 3: Jargon Detection ─────────────────────────────────────────────────
// Returns max 1 specific jargon entry (skip generic "fd" unless nothing else matches)
function detectJargon(query) {
  loadData();
  const q = query.toLowerCase();
  const hits = [];

  for (const entry of JARGON) {
    if (entry.term === "fd") continue; // too generic — skip first pass
    const keys = [entry.term, ...(entry.keywords || [])];
    if (keys.some((k) => q.includes(k.toLowerCase()))) {
      hits.push(entry);
      if (hits.length === 1) break; // max 1 specific jargon
    }
  }

  // If nothing specific found, allow generic "fd" entry
  if (hits.length === 0) {
    const fdEntry = JARGON.find((j) => j.term === "fd");
    if (fdEntry && q.includes("fd")) hits.push(fdEntry);
  }

  return hits;
}

// ─── STEP 4: Basics Fallback ──────────────────────────────────────────────────
function fetchBasicKnowledge(query) {
  loadData();
  const q = query.toLowerCase();
  const scored = BASICS.map((b) => {
    const text = [b.topic, ...(b.keywords || []), b.simple_en].join(" ").toLowerCase();
    let score = 0;
    for (const w of q.split(/\s+/)) {
      if (w.length > 2 && text.includes(w)) score++;
    }
    return { b, score };
  }).sort((a, z) => z.score - a.score);

  return scored[0]?.score > 0 ? scored[0].b : BASICS[0];
}

// ─── STEP 5: Response Builder ─────────────────────────────────────────────────
// Strict structure: Direct Answer → Analogy → Example → Reassurance
function buildResponse({ rag, jargonList, basic }) {
  let direct = "";
  let analogy = "";
  let example = "";
  let reassurance = "";

  // ─── 1. DIRECT ANSWER ───
  if (rag && rag.response_points.length > 0) {
    direct = rag.response_points[0];
  } else if (basic) {
    direct = basic.simple_en;
  } else if (jargonList.length > 0) {
    direct = jargonList[0].simple_en;
  }

  // ─── 2. ANALOGY ───
  if (jargonList.length > 0 && jargonList[0].analogy) {
    analogy = `Aise samjho: ${jargonList[0].analogy}`;
  } else if (basic?.analogy) {
    analogy = `Aise samjho: ${basic.analogy}`;
  } else {
    analogy = "Aise samjho: jaise safety net ho — problem aaye tab bhi protection milta hai";
  }

  // ─── 3. EXAMPLE (FORCED) ───
  if (jargonList.length > 0 && jargonList[0].example) {
    example = `Example: ${jargonList[0].example}`;
  } else if (basic?.example) {
    example = `Example: ${basic.example}`;
  } else {
    example = "Example: agar aap ₹3 lakh FD me rakhte ho, to wo safe rehta hai";
  }

  // ─── 4. REASSURANCE ───
  if (jargonList.length > 0 && jargonList[0].reassurance) {
    reassurance = jargonList[0].reassurance;
  } else if (basic?.reassurance) {
    reassurance = basic.reassurance;
  } else if (rag?.emotion === "fear") {
    reassurance = "Tension mat lo — FD generally safe option mana jata hai";
  } else {
    reassurance = "FD ek stable aur predictable option hota hai";
  }

  // ─── FINAL ORDER (STRICT) ───
  return [direct, analogy, example, reassurance].filter(Boolean);
}

// ─── STEP 6: Language Style Engine ───────────────────────────────────────────

// Hinglish word replacements — conversational, never formal
const HINGLISH_REPLACEMENTS = [
  [/\bdo not worry\b/gi,    "tension mat lo"],
  [/\bdon't worry\b/gi,     "tension mat lo"],
  [/\byour money\b/gi,      "aapka paisa"],
  [/\byour\b/gi,            "aapka"],
  [/\byou\b/gi,             "aap"],
  [/\bbefore\b/gi,          "pehle"],
  [/\bafter\b/gi,           "baad mein"],
  [/\bguaranteed\b/gi,      "pakka"],
  [/\bgenerally\b/gi,       "zyaadatar"],
  [/\busually\b/gi,         "aksar"],
  [/\bautomatically\b/gi,   "apne aap"],
  [/\bin emergency\b/gi,    "emergency mein"],
  [/\binterest\b/gi,        "interest (byaaj)"],
  [/\bpenalty\b/gi,         "penalty (thoda paisa katega)"],
  [/\binsurance\b/gi,       "insurance (suraksha)"],
  [/\bmaturity\b/gi,        "FD poori hone par"],
  [/\bprincipal\b/gi,       "original paisa"],
  [/\btenure\b/gi,          "time period"],
  [/\bdeducted\b/gi,        "kaat liya jaata hai"],
  [/\brefund\b/gi,          "wapas mil sakta hai"],
  [/\binvest\b/gi,          "lagao"],
  [/\bdeposit\b/gi,         "jama karo"],
  [/\bwithdraw\b/gi,        "nikalo"],
  [/\bchoose\b/gi,          "choose karo"],
  [/\bcompare\b/gi,         "compare karo"],
  [/\bamount\b/gi,          "rakam"],
  [/\btaxable\b/gi,         "tax lagega"],
  [/\bsimple\b/gi,          "simple"],
  [/\bsafe\b/gi,            "safe"],
];

function applyHinglish(text) {
  let out = text;
  for (const [pattern, replacement] of HINGLISH_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// Simple Hindi rewrite — spoken style, not textbook
const HINDI_REPLACEMENTS = [
  [/\bdo not worry\b/gi,  "chinta mat karo"],
  [/\bdon't worry\b/gi,   "chinta mat karo"],
  [/\byour money\b/gi,    "aapka paisa"],
  [/\byour\b/gi,          "aapka"],
  [/\byou\b/gi,           "aap"],
  [/\bbefore\b/gi,        "pehle"],
  [/\bafter\b/gi,         "baad mein"],
  [/\bguaranteed\b/gi,    "pakka"],
  [/\bgenerally\b/gi,     "zyaadatar"],
  [/\busually\b/gi,       "aksar"],
  [/\binterest\b/gi,      "byaaj"],
  [/\bpenalty\b/gi,       "jurmaana"],
  [/\binsurance\b/gi,     "bima"],
  [/\bmaturity\b/gi,      "meyaad poori hone par"],
  [/\bprincipal\b/gi,     "mool rakam"],
  [/\btenure\b/gi,        "samay avadhi"],
  [/\bdeducted\b/gi,      "kaat liya jaata hai"],
  [/\binvest\b/gi,        "lagao"],
  [/\bdeposit\b/gi,       "jama karo"],
  [/\bwithdraw\b/gi,      "nikalo"],
  [/\bchoose\b/gi,        "chunein"],
  [/\bamount\b/gi,        "rakam"],
  [/\bsafe\b/gi,          "surakshit"],
];

function applyHindi(text) {
  let out = text;
  for (const [pattern, replacement] of HINDI_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function applyLanguage(text, lang) {
  if (lang === "hinglish") return applyHinglish(text);
  if (lang === "hindi")    return applyHindi(text);
  return text; // english — no transformation
}

// ─── STEP 7: Emotion Prefix ───────────────────────────────────────────────────
const EMOTION_PREFIX = {
  fear:      { hinglish: "Tension mat lo — ",        hindi: "Chinta mat karo — ",       english: "Don't worry — "          },
  confusion: { hinglish: "Simple baat karta hoon — ", hindi: "Seedha samjhata hoon — ",  english: "Let me explain simply — " },
  concern:   { hinglish: "Sahi sawaal hai — ",        hindi: "Achha sawaal hai — ",       english: "Good question — "         },
  curiosity: { hinglish: "Interesting sawaal — ",     hindi: "Rochak sawaal — ",          english: "Great question — "        },
  neutral:   { hinglish: "",                          hindi: "",                          english: ""                         },
};

function getEmotionPrefix(emotion, lang) {
  const map = EMOTION_PREFIX[emotion] || EMOTION_PREFIX.neutral;
  return map[lang] || map.hinglish || "";
}

// ─── STEP 8: Master Function ──────────────────────────────────────────────────
/**
 * generateFDResponse(query, overrideLang?)
 *
 * @param {string} query        - raw user message
 * @param {string|null} overrideLang - "hinglish" | "hindi" | "english" | null
 * @returns {{ response, lang, intent, emotion, source }}
 */
function generateFDResponse(query, overrideLang = null) {
  loadData();

  // 1. Language
  const detectedLang = detectLanguage(query);
  const lang         = overrideLang || detectedLang;

  // 2. RAG + Jargon + Basics
  const rag      = findBestRAGMatch(query);
  const jargon   = detectJargon(query).slice(0, 1);
  const basic    = fetchBasicKnowledge(query);

  // 3. Build response parts
  const parts    = buildResponse({ rag, jargonList: jargon, basic });

  // Join as natural flowing text — no labels, no extra sections
  const rawText  = parts
    .filter(Boolean)
    .map((p) => p.trim())
    // Strip any "Recommendation:", "Suggestion:", "Advice:" that sneak in from RAG data
    .map((p) => p.replace(/^(Recommendation|Suggestion|Advice)\s*:\s*/i, ""))
    .join(". ")
    .replace(/\.\s*\./g, ".")
    .trim();

  // 5. Apply language style
  let styled     = applyLanguage(rawText, lang);

  // 6. Emotion prefix — prepend, preserve acronym casing
  const emotion  = rag?.emotion || "neutral";
  const prefix   = getEmotionPrefix(emotion, lang);

  // Only lowercase first char if it's not part of an acronym (all-caps word)
  function smartLower(text) {
    const firstWord = text.split(/\s+/)[0];
    if (firstWord === firstWord.toUpperCase() && firstWord.length > 1) return text; // acronym — keep
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  const final = prefix ? prefix + smartLower(styled) : styled.charAt(0).toUpperCase() + styled.slice(1);

  // 7. Ensure ends with period
  const response = final.endsWith(".") ? final : final + ".";

  return {
    response: response,
    lang,
    intent:  rag?.intent  || (jargon.length ? "jargon" : "general"),
    emotion,
    source:  rag ? "rag" : jargon.length ? "jargon" : "basics",
  };
}

// Keep old export name as alias so server.js doesn't break
const generateEngineResponse = (query, lang) => generateFDResponse(query, lang);

module.exports = {
  generateFDResponse,
  generateEngineResponse,   // backward compat
  detectLanguage,
  findBestRAGMatch,
  detectJargon,
  fetchBasicKnowledge,
  buildResponse,
  applyLanguage,
  loadData,
};
