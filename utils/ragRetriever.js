/**
 * RAG (Retrieval-Augmented Generation) System
 * Simple keyword-based retrieval from local JSON knowledge base
 * No external vector DB needed — works offline
 */

const path = require("path");
const fs = require("fs");

let knowledgeBase = [];

/**
 * Load all documents from rag-data folder at server start
 */
function loadKnowledgeBase() {
  const ragDir = path.join(__dirname, "../rag-data");
  const files = fs.readdirSync(ragDir).filter((f) => f.endsWith(".json"));

  knowledgeBase = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(ragDir, file), "utf-8"));
    knowledgeBase.push(...data);
  }

  console.log(`✅ RAG: Loaded ${knowledgeBase.length} documents from ${files.length} files`);
}

/**
 * Score a document against a query using keyword overlap
 * Simple TF-style scoring — no embeddings needed for demo
 */
function scoreDocument(doc, queryWords) {
  let score = 0;
  const docText = (doc.content + " " + (doc.keywords || []).join(" ") + " " + doc.topic).toLowerCase();

  for (const word of queryWords) {
    if (word.length < 3) continue; // skip short words
    if (docText.includes(word)) score += 1;
    // Bonus for keyword exact match
    if ((doc.keywords || []).some((k) => k.includes(word))) score += 2;
  }

  return score;
}

/**
 * Retrieve top-k relevant documents for a query
 */
function retrieveContext(query, topK = 3) {
  if (knowledgeBase.length === 0) loadKnowledgeBase();

  const queryWords = query.toLowerCase().split(/\s+/);

  const scored = knowledgeBase
    .map((doc) => ({ doc, score: scoreDocument(doc, queryWords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (scored.length === 0) {
    // Return general FD basics if nothing matches
    return knowledgeBase.slice(0, 2).map((d) => d.content).join("\n\n");
  }

  return scored.map((item) => `[${item.doc.topic}]\n${item.doc.content}`).join("\n\n");
}

module.exports = { loadKnowledgeBase, retrieveContext };
