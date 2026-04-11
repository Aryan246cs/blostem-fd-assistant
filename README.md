# Vernacular Financial Copilot for Fixed Deposits 🇮🇳

A multilingual AI assistant that helps Indian users understand, evaluate, and book Fixed Deposits in English, Hindi, and Tamil.

## Quick Start (2 terminals)

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

Open http://localhost:3000 in your browser.

---

## Add Groq API Key (optional but recommended)

1. Go to https://console.groq.com and create a free account
2. Copy your API key
3. Edit `vernacular-fd-copilot/.env`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
4. Restart the backend

Without a key, the app runs in **mock mode** — still fully functional for demo.

---

## Features

| Feature | Status |
|---|---|
| Chat interface (ChatGPT-style) | ✅ |
| Language selector (EN / HI / TA) | ✅ |
| Voice input (Chrome) | ✅ |
| FD Calculator (pure math) | ✅ |
| LLM chat via Groq | ✅ (mock fallback) |
| RAG knowledge base | ✅ |
| Multilingual translation | ✅ (MyMemory API) |
| FD Recommendation engine | ✅ |
| Booking simulation | ✅ |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /chat | Multilingual chat |
| POST | /calculate-fd | FD maturity calculator |
| POST | /recommend | FD evaluation |
| POST | /book-fd | Simulated booking |
| GET | /health | Server status |

## Project Structure

```
vernacular-fd-copilot/
├── backend/
│   └── server.js          # Express API + Groq + RAG
├── frontend/
│   ├── app/               # Next.js App Router
│   └── components/        # ChatInterface, Calculator, Booking
├── rag-data/
│   ├── fd-basics.json     # FD knowledge base
│   └── fd-examples.json   # Example scenarios
├── utils/
│   ├── calculator.js      # Pure math FD engine
│   ├── translator.js      # MyMemory translation
│   └── ragRetriever.js    # Keyword-based RAG
└── .env                   # API keys
```
