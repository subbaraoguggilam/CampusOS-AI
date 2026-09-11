import { db } from "@/lib/db";
import { workflowTemplates } from "@/lib/db/schema";
import {
  tokenize,
  buildVocabulary,
  computeIdf,
  computeTfIdfVector,
  cosineSimilarity,
  deserializeVector,
} from "./embeddings";
import { SCET_KNOWLEDGE_BASE, ScetKnowledgeChunk } from "./scet-knowledge-base";

export const CONFIDENCE_THRESHOLD = 0.35;

/**
 * Explainability helper — which words in the student's query actually
 * overlapped with a template's name/description/keywords. This is what the
 * "AI Confidence" panel shows as the checklist of matched terms (see
 * AiRecommendationBanner), so a reviewer can see *why* the RAG engine
 * picked this workflow instead of trusting a bare percentage.
 */
function matchedKeywordsFor(query: string, templateCorpusText: string): string[] {
  const queryTokens = new Set(tokenize(query));
  const templateTokens = new Set(tokenize(templateCorpusText));
  const overlap: string[] = [];
  for (const token of templateTokens) {
    if (queryTokens.has(token)) overlap.push(token);
  }
  return overlap.slice(0, 6);
}

export interface RagMatch {
  templateId: string;
  templateName: string;
  description: string;
  departmentId: string;
  requiredFields: string[];
  guideSteps: string[];
  confidence: number;
  lowConfidence: boolean;
  estimatedDays: number;
  matchedKeywords: string[];
}

export interface RagGuideResponse {
  matches: RagMatch[];
  bestMatch: RagMatch | null;
  knowledgeMatches: KnowledgeMatch[];
  extractedFields: Record<string, string>;
  missingFields: string[];
  guidance: string;
}

export interface KnowledgeMatch {
  chunkId: string;
  section: string;
  page: number;
  text: string;
  confidence: number;
}

const FIELD_PATTERNS: Record<string, RegExp[]> = {
  full_name: [/name[:\s]+([a-z\s]+)/i, /i am ([a-z\s]+)/i],
  roll_number: [/roll\s*(?:no|number|#)?[:\s]*([a-z0-9]+)/i, /reg(?:istration)?[:\s]*([a-z0-9]+)/i],
  department: [/department[:\s]+([a-z\s]+)/i, /from ([a-z\s]+) department/i],
  year: [/(?:year|semester)[:\s]*(\d+(?:st|nd|rd|th)?)/i, /(\d+(?:st|nd|rd|th)?)\s*year/i],
  reason: [/reason[:\s]+(.+)/i, /because (.+)/i, /for (.+)/i],
  from_date: [/from[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
  to_date: [/to[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
  result_date: [/result[:\s]+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i, /published[:\s]+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i],
  address: [/address[:\s]+(.+)/i],
  phone: [/phone[:\s]*(\d{10})/i, /(\d{10})/],
  email: [/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i],
};

function extractFieldsFromQuery(
  query: string,
  requiredFields: string[]
): Record<string, string> {
  const extracted: Record<string, string> = {};

  for (const field of requiredFields) {
    const patterns = FIELD_PATTERNS[field];
    if (patterns) {
      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match?.[1]) {
          extracted[field] = match[1].trim();
          break;
        }
      }
    }
  }

  return extracted;
}

function buildGuidance(
  match: RagMatch | null,
  missingFields: string[],
  extractedFields: Record<string, string>
): string {
  if (!match) {
    return "I couldn't find a matching workflow for your request. Please try rephrasing or contact the admin office. Example: \"I need a bonafide certificate for bank account opening.\"";
  }

  const parts: string[] = [];
  parts.push(`**Matched Workflow:** ${match.templateName}`);
  parts.push(`**Confidence:** ${(match.confidence * 100).toFixed(0)}%${match.lowConfidence ? " (flagged for admin review)" : ""}`);
  parts.push(`**Description:** ${match.description}`);
  parts.push(`**Estimated Processing:** ${match.estimatedDays} business days`);
  parts.push("");
  parts.push("**Steps to complete your request:**");
  match.guideSteps.forEach((step, i) => parts.push(`${i + 1}. ${step}`));

  if (Object.keys(extractedFields).length > 0) {
    parts.push("");
    parts.push("**Information I found in your message:**");
    for (const [k, v] of Object.entries(extractedFields)) {
      parts.push(`• ${k.replace(/_/g, " ")}: ${v}`);
    }
  }

  if (missingFields.length > 0) {
    parts.push("");
    parts.push("**Please provide the following missing details:**");
    missingFields.forEach((f) => parts.push(`• ${f.replace(/_/g, " ")}`));
  } else {
    parts.push("");
    parts.push("All required information detected! You can submit this request now.");
  }

  return parts.join("\n");
}

function matchKnowledge(query: string): KnowledgeMatch[] {
  const corpus = SCET_KNOWLEDGE_BASE.map((chunk) =>
    `${chunk.section} ${chunk.text}`
  );
  const vocab = buildVocabulary(corpus);
  const idf = computeIdf(corpus, vocab);
  const queryVector = computeTfIdfVector(query, vocab, idf);

  return SCET_KNOWLEDGE_BASE
    .map((chunk: ScetKnowledgeChunk, index) => ({
      chunkId: chunk.id,
      section: chunk.section,
      page: chunk.page,
      text: chunk.text,
      confidence: cosineSimilarity(
        queryVector,
        computeTfIdfVector(corpus[index], vocab, idf)
      ),
    }))
    .filter((match) => match.confidence >= 0.12)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2);
}

function buildKnowledgeGuidance(matches: KnowledgeMatch[]): string {
  if (matches.length === 0) return "";

  const parts = ["**SCET Knowledge Base Answer:**", matches[0].text];
  parts.push(
    `**Source:** Uploaded SCET Offline RAG Knowledge Base, page ${matches[0].page}, ${matches[0].section}`
  );

  if (matches.length > 1) {
    parts.push(
      `**Related source:** page ${matches[1].page}, ${matches[1].section}`
    );
  }

  return parts.join("\n");
}

export async function matchWorkflow(query: string): Promise<RagGuideResponse> {
  const templates = await db.select().from(workflowTemplates);
  const knowledgeMatches = matchKnowledge(query);

  if (templates.length === 0) {
    return {
      matches: [],
      bestMatch: null,
      knowledgeMatches,
      extractedFields: {},
      missingFields: [],
      guidance:
        buildKnowledgeGuidance(knowledgeMatches) ||
        "This information is not available in the uploaded college documents. Please contact the appropriate SCET office.",
    };
  }

  const corpus = templates.map(
    (t) => `${t.name} ${t.description} ${t.keywords}`
  );
  const vocab = buildVocabulary(corpus);
  const idf = computeIdf(corpus, vocab);
  const queryVec = computeTfIdfVector(query, vocab, idf);

  const matches: RagMatch[] = templates
    .map((t) => {
      const storedVec = deserializeVector(t.embedding);
      const confidence = cosineSimilarity(queryVec, storedVec);
      const requiredFields = JSON.parse(t.requiredFields) as string[];
      const guideSteps = JSON.parse(t.guideSteps) as string[];

      return {
        templateId: t.id,
        templateName: t.name,
        description: t.description,
        departmentId: t.departmentId,
        requiredFields,
        guideSteps,
        confidence,
        lowConfidence: confidence < CONFIDENCE_THRESHOLD,
        estimatedDays: t.estimatedDays ?? 3,
        matchedKeywords: matchedKeywordsFor(query, `${t.name} ${t.description} ${t.keywords}`),
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  const candidateMatch = matches[0]?.confidence > 0.1 ? matches[0] : null;
  // General SCET questions should be answered from the knowledge base without
  // opening a workflow based on a weak lexical overlap.
  const bestMatch =
    candidateMatch &&
    (knowledgeMatches.length === 0 ||
      candidateMatch.confidence >= 0.35 ||
      knowledgeMatches[0].confidence < 0.12)
      ? candidateMatch
      : null;
  const requiredFields = bestMatch?.requiredFields ?? [];
  const extractedFields = extractFieldsFromQuery(query, requiredFields);
  const missingFields = requiredFields.filter((f) => !extractedFields[f]);

  const knowledgeGuidance = buildKnowledgeGuidance(knowledgeMatches);
  const workflowGuidance = bestMatch
    ? buildGuidance(bestMatch, missingFields, extractedFields)
    : "";
  const guidance = [knowledgeGuidance, workflowGuidance]
    .filter(Boolean)
    .join("\n\n") ||
    "This information is not available in the uploaded college documents. Please contact the appropriate SCET office.";

  return {
    matches,
    bestMatch,
    knowledgeMatches,
    extractedFields,
    missingFields,
    guidance,
  };
}

export async function answerStudentQuery(query: string): Promise<string> {
  const result = await matchWorkflow(query);
  return result.guidance;
}
