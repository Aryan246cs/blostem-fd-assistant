# FD Saathi — Vernacular FD Advisor 🇮🇳

An AI-powered Fixed Deposit advisor for Indian users — especially Tier 2/3 cities. Chat in your language, understand FD jargon in plain terms, compare plans, calculate returns, and simulate a booking — all in one place.

**Languages supported:** English · हिंदी · தமிழ் · मराठी · বাংলা

---

## Quick Start

You need **2 terminals** running simultaneously.

### Terminal 1 — Backend
```bash
cd vernacular-fd-copilot/backend
npm install
node server.js
# Runs on http://localhost:3001
```

### Terminal 2 — Frontend
```bash
cd vernacular-fd-copilot/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## Environment Setup

Copy `.env.example` to `.env` in the root `vernacular-fd-copilot/` folder:

```bash
cp vernacular-fd-copilot/.env.example vernacular-fd-copilot/.env
```

Then fill in your keys:

```env
# Groq — used for English queries (LLaMA 3.1 8B)
# https://console.groq.com
GROQ_API_KEY=gsk_your_key_here

# HuggingFace — used for Hindi/Hinglish queries (Mistral 7B Instruct)
# https://huggingface.co/settings/tokens
HF_API_KEY=hf_your_key_here

PORT=3001
```

Both keys are optional — the app falls back to a mock response engine if neither is set. For a proper demo, add at least `GROQ_API_KEY`.

---

## Features

| Feature | Details |
|---|---|
| Multilingual chat | English, Hindi, Tamil, Marathi, Bengali |
| Dual LLM routing | LLaMA 3.1 8B via Groq (English) · Mistral 7B via HuggingFace (Hindi/Hinglish) |
| RAG knowledge base | Local JSON — no vector DB, works offline |
| Emotion-aware responses | Detects fear/confusion, responds with "Tension mat lo" tone |
| Jargon buster | Instant plain-language definitions for FD terms |
| FD Calculator | Compound interest (quarterly), maturity amount, interest earned |
| TDS & Tax Estimator | TDS calculation based on interest slab |
| Compare FD Plans | Side-by-side comparison with growth chart |
| Invest in FD flow | 5-step guided flow: amount → tenure → goal → ranked plans → simulated booking |
| Booking simulation | Calls `/book-fd`, returns a real booking reference number |
| Voice input | Web Speech API, language-matched (hi-IN, ta-IN, mr-IN, bn-IN, en-IN) |
| Text-to-speech | Reads responses aloud in selected language |
| Explain this FD | Paste any FD offer, get a plain-language breakdown |
| Chat history | Session memory (in-memory on backend, localStorage on frontend) |
| Model info panel | Shows active models (LLaMA/Groq + Mistral/HuggingFace) — not a fake selector |

---

## LLM Architecture

```
User message
    │
    ├── detectLanguage()
    │       ├── English  → Groq / LLaMA 3.1 8B
    │       └── Hindi / Hinglish → HuggingFace / Mistral 7B Instruct
    │                   └── fallback to Groq if HF unavailable
    │
    ├── extractAndCalculate()   ← server-side math injected into prompt
    │                             prevents LLM hallucination on numbers
    ├── RAG retrieval           ← keyword-scored local JSON
    ├── responseEngine          ← intent + emotion detection
    │
    └── sanitiseResponse()      ← strips "Recommendation:", bullet points, etc.
```

For Tamil, Marathi, Bengali: LLM generates in English → translated via MyMemory API. Falls back to English with a note if translation fails.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat` | Main chat — session memory, RAG, dual LLM |
| POST | `/calculate-fd` | FD maturity calculator |
| POST | `/recommend` | FD evaluation with verdict |
| POST | `/book-fd` | Simulated booking — returns booking reference |
| GET | `/chats` | List all chat sessions |
| GET | `/chat/:id` | Fetch full conversation |
| DELETE | `/chat/:id` | Delete a session |
| GET | `/health` | Server status + active model info |

---

## Project Structure

```
vernacular-fd-copilot/
├── backend/
│   └── server.js              # Express API, dual LLM routing, RAG, session store
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Landing / welcome page
│   │   ├── app/page.tsx       # Main chat app
│   │   ├── compare-fd/        # FD comparison page
│   │   ├── fd-plans/          # FD plans browser
│   │   └── chat/              # Standalone chat route
│   ├── components/
│   │   ├── ChatInterface.tsx  # Chat UI
│   │   ├── ChatPage.tsx       # Chat page wrapper
│   │   ├── CalculatorModal.tsx
│   │   ├── TDSCalculatorModal.tsx
│   │   ├── BookingModal.tsx   # Step-by-step booking guide
│   │   ├── InvestFlowModal.tsx # Interactive invest flow (amount→booking ref)
│   │   ├── ExplainFDModal.tsx
│   │   ├── FDPlanCard.tsx
│   │   ├── FDGrowthChart.tsx
│   │   └── Sidebar.tsx
│   └── data/
│       └── fdPlans.json       # FD plans data (SBI, HDFC, ICICI, Axis, Kotak…)
├── rag-data/
│   ├── fd-basics.json         # Core FD concepts
│   ├── fd-examples.json       # Example scenarios
│   ├── fd-jargon-buster.json  # Term definitions with analogies
│   └── fd-real-queries.json   # Real user queries with intent/emotion tags
├── utils/
│   ├── calculator.js          # Compound interest math
│   ├── translator.js          # MyMemory translation + fallback
│   ├── ragRetriever.js        # Keyword-based RAG retrieval
│   └── responseEngine.js      # Intent detection, emotion prefix, response builder
└── .env                       # API keys (gitignored)
```

---

## How the Response Engine Works

Every query goes through this pipeline before hitting the LLM:

1. **Language detection** — Devanagari/Tamil/Bengali script detection + Hinglish signal words
2. **RAG match** — keyword overlap + intent boost scoring against `fd-real-queries.json`
3. **Jargon detection** — term lookup in `fd-jargon-buster.json`
4. **Response structure** — Direct answer → Analogy → ₹ Example → Reassurance
5. **Emotion prefix** — fear → "Tension mat lo", confusion → "Simple baat karta hoon"
6. **LLM call** — enriched context + verified calculation numbers passed in prompt
7. **Sanitise** — strips "Recommendation:", bullet points, formal labels

---

## Notes

- Sessions are in-memory on the backend — a server restart clears chat history
- Translation (Tamil/Marathi/Bengali) uses MyMemory free API — may hit rate limits under heavy load; falls back to English with a notice
- Booking is a simulation — the flow is real, the money is not
- Voice input requires Chrome (Web Speech API)
