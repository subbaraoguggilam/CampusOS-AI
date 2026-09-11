/**
 * Offline RAG — local TF-IDF vector embeddings (no external API).
 * Pre-computed at seed time; queried at runtime via cosine similarity.
 */

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not",
  "only", "own", "same", "so", "than", "too", "very", "just", "and",
  "but", "if", "or", "because", "until", "while", "although", "i",
  "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
  "them", "their", "this", "that", "these", "those", "am", "what",
  "which", "who", "whom", "want", "please", "get", "give",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export function buildVocabulary(documents: string[]): Map<string, number> {
  const vocab = new Map<string, number>();
  let idx = 0;
  for (const doc of documents) {
    for (const token of new Set(tokenize(doc))) {
      if (!vocab.has(token)) {
        vocab.set(token, idx++);
      }
    }
  }
  return vocab;
}

export function computeTfIdfVector(
  text: string,
  vocab: Map<string, number>,
  idf: number[]
): number[] {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  const maxTf = Math.max(...tf.values(), 1);
  const vector = new Array(vocab.size).fill(0);

  for (const [term, count] of tf) {
    const idx = vocab.get(term);
    if (idx !== undefined) {
      const normalizedTf = 0.5 + 0.5 * (count / maxTf);
      vector[idx] = normalizedTf * idf[idx];
    }
  }

  const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] /= magnitude;
  }
  return vector;
}

export function computeIdf(documents: string[], vocab: Map<string, number>): number[] {
  const N = documents.length;
  const idf = new Array(vocab.size).fill(0);

  for (const doc of documents) {
    const seen = new Set(tokenize(doc));
    for (const term of seen) {
      const idx = vocab.get(term);
      if (idx !== undefined) idf[idx]++;
    }
  }

  return idf.map((df) => Math.log((N + 1) / (df + 1)) + 1);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

export function serializeVector(v: number[]): string {
  return JSON.stringify(v);
}

export function deserializeVector(s: string): number[] {
  return JSON.parse(s) as number[];
}
