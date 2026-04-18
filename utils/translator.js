/**
 * Translation utility using MyMemory API (free, no key required for basic use)
 * Falls back to returning original text if translation fails
 */

// Resolve axios from backend's node_modules (utils is shared, not a standalone package)
let axios;
try {
  axios = require("axios");
} catch {
  // Try resolving from parent backend folder
  axios = require(require("path").join(__dirname, "../backend/node_modules/axios"));
}

// Language code mapping
const LANGUAGE_CODES = {
  english: "en",
  hindi: "hi",
  tamil: "ta",
  marathi: "mr",
  en: "en",
  hi: "hi",
  ta: "ta",
  bengali: "bn",
  bn: "bn",
};

/**
 * Detect language from text using simple heuristics + Unicode ranges
 * Returns: 'hindi', 'tamil', or 'english'
 */
function detectLanguage(text) {
  if (!text) return "english";

  // Hindi: Devanagari Unicode range U+0900–U+097F
  const hindiPattern = /[\u0900-\u097F]/;
  // Tamil: Unicode range U+0B80–U+0BFF
  const tamilPattern = /[\u0B80-\u0BFF]/;
  // Bengali: Unicode range U+0980–U+09FF
  const bengaliPattern = /[\u0980-\u09FF]/;
  if (bengaliPattern.test(text)) return "bengali";

  if (hindiPattern.test(text)) return "hindi";
  if (tamilPattern.test(text)) return "tamil";

  // Check for common Hindi romanized words
  const hindiRomanized = /\b(kya|hai|mera|meri|paisa|rupaye|bank|fd|kitna|kaise|chahiye|nahi|haan)\b/i;
  if (hindiRomanized.test(text)) return "hindi";

  return "english";
}

/**
 * Translate a single chunk (max 450 chars) using MyMemory free API
 */
async function translateChunk(text, srcCode, tgtCode) {
  const response = await axios.get("https://api.mymemory.translated.net/get", {
    params: { q: text, langpair: `${srcCode}|${tgtCode}` },
    timeout: 6000,
  });
  const translated = response.data?.responseData?.translatedText;
  if (translated && !translated.includes("QUERY LENGTH LIMIT") && translated !== "PLEASE SELECT TWO DISTINCT LANGUAGES") {
    return translated;
  }
  return null; // signal failure to caller
}

/**
 * Translate text using MyMemory free API
 * Splits long text into chunks to stay within 450-char API limit
 */
async function translateText(text, sourceLang, targetLang) {
  if (sourceLang === targetLang || (sourceLang === "english" && targetLang === "en")) {
    return text;
  }

  const srcCode = LANGUAGE_CODES[sourceLang] || sourceLang;
  const tgtCode = LANGUAGE_CODES[targetLang] || targetLang;
  if (srcCode === tgtCode) return text;

  try {
    // Split into sentences to stay under 450-char limit
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    const chunks = [];
    let current = "";

    for (const sentence of sentences) {
      if ((current + sentence).length > 400) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    // Translate each chunk
    const translated = await Promise.all(chunks.map((c) => translateChunk(c, srcCode, tgtCode)));
    // If any chunk failed (null), fall back to English with a note
    if (translated.some((t) => t === null)) {
      return text + "\n\n(Translation unavailable — showing English response)";
    }
    return translated.join(" ");
  } catch (err) {
    console.warn("Translation failed, using original text:", err.message);
    return text;
  }
}

/**
 * Translate user input to English for LLM processing
 */
async function translateToEnglish(text, detectedLang) {
  if (detectedLang === "english") return text;
  return translateText(text, detectedLang, "english");
}

/**
 * Translate LLM response back to user's language
 */
async function translateFromEnglish(text, targetLang) {
  if (targetLang === "english" || targetLang === "en") return text;
  return translateText(text, "english", targetLang);
}

module.exports = { detectLanguage, translateToEnglish, translateFromEnglish, LANGUAGE_CODES };
