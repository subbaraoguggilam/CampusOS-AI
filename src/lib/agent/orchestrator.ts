// CampusOS AI Orchestrator
// ------------------------
// Replaces the "student query -> TF-IDF -> template" one-shot lookup with a
// small multi-agent pipeline that reasons over context, checks policy,
// checks documents, plans a workflow, and produces a recommendation for a
// human approver. Each agent is a plain function (a "tool" the orchestrator
// calls); the orchestrator's job is only to sequence them, carry state
// between steps, and record a step-by-step trace that the UI can render as
// a live "AI Agent Activity" panel.
//
// The pipeline runs fully offline by default (no external AI API needed),
// which keeps the hackathon demo self-contained. If a GROQ_API_KEY is
// configured, the Intent Agent and Approval Agent additionally consult
// Groq for a natural-language rationale — this is best-effort and always
// falls back silently to the offline heuristics on any error/timeout, so
// the agent never breaks the flow for missing credentials or network
// issues.

import { db } from "@/lib/db";
import { documents, users, workflowTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { matchWorkflow, RagGuideResponse, RagMatch } from "@/lib/rag/engine";
import { understandWithLLM } from "@/lib/agent/llm-agent";

export type AgentStepStatus = "done" | "waiting" | "blocked" | "skipped";

export interface AgentStep {
  id: string;
  agent: string;
  label: string;
  status: AgentStepStatus;
  detail?: string;
}

export interface PolicyCheckItem {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface PolicyCheckResult {
  eligible: boolean;
  reasons: string[];
  checks: PolicyCheckItem[];
  /** Set when a named policy (e.g. long leave, Internship NOC) requires the
   * request to be routed to the department HOD rather than any faculty. */
  requiresHod: boolean;
}

export interface DocumentCheckResult {
  required: boolean;
  satisfied: boolean;
  detail: string;
}

export interface RoutingResult {
  departmentId: string | null;
  departmentName: string | null;
  assignedFacultyId: string | null;
  assignedFacultyName: string | null;
}

export interface AgentRecommendation {
  decision: "approve" | "review" | "reject";
  reason: string;
  confidence: number;
}

export interface StudentContext {
  id: string;
  name: string;
  role: string;
  department?: string | null;
  yearOfStudy?: number | null;
  studentId?: string | null;
}

export interface OrchestratorResult {
  steps: AgentStep[];
  rag: RagGuideResponse;
  bestMatch: RagMatch | null;
  extractedFields: Record<string, string>;
  missingFields: string[];
  policy: PolicyCheckResult;
  documentCheck: DocumentCheckResult;
  routing: RoutingResult;
  recommendation: AgentRecommendation;
  guidance: string;
}

/** Days-of-leave policy threshold: beyond this, HOD sign-off is required. */
const LEAVE_HOD_THRESHOLD_DAYS = 3;
/** Revaluation requests must be filed within this many days of the result. */
const REVALUATION_WINDOW_DAYS = 15;

function parseLooseDate(value?: string): Date | null {
  if (!value) return null;
  const normalized = value.trim().replace(/-/g, "/");
  const parts = normalized.split("/").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [d, m, y] = parts;
  const year = y < 100 ? 2000 + y : y;
  const date = new Date(year, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Policy Agent — the university's eligibility rules engine. Each named
 * policy below is checked independently and recorded as a pass/fail line
 * (`checks`) so the reviewer sees exactly *why* a request was flagged, not
 * just a final yes/no:
 *
 *   Bonafide Certificate → student must be an active/enrolled student
 *   Leave Request        → more than 3 days requires HOD approval
 *   Fee Concession       → requires a supporting income certificate
 *   Internship NOC       → requires department (HOD) approval
 *   Revaluation          → must be submitted within 15 days of the result
 */
function checkPolicy(match: RagMatch | null, student: StudentContext, minYear: number | null, fieldData: Record<string, string>): PolicyCheckResult {
  if (!match) return { eligible: true, reasons: [], checks: [], requiresHod: false };

  const reasons: string[] = [];
  const checks: PolicyCheckItem[] = [];
  let requiresHod = false;

  if (minYear && (student.yearOfStudy ?? 0) < minYear) {
    const detail = `${match.templateName} requires year ${minYear}+ standing; student is in year ${student.yearOfStudy ?? "unknown"}.`;
    reasons.push(detail);
    checks.push({ rule: `Minimum year ${minYear}+`, passed: false, detail });
  }

  if (match.templateId === "wf-bonafide") {
    // "Student must be active" — proxied by having a recognized enrollment
    // record (year of study on file). There is no separate "inactive/
    // suspended" flag in this MVP's data model, so an on-file student is
    // treated as active.
    const active = !!student.yearOfStudy;
    checks.push({
      rule: "Student must be active",
      passed: active,
      detail: active ? "Enrollment record found — student is active." : "No active enrollment record on file.",
    });
    if (!active) reasons.push("Student does not have an active enrollment record.");
  }

  if (match.templateId === "wf-leave") {
    const from = parseLooseDate(fieldData.from_date);
    const to = parseLooseDate(fieldData.to_date);
    if (from && to) {
      const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
      const longLeave = days > LEAVE_HOD_THRESHOLD_DAYS;
      requiresHod = requiresHod || longLeave;
      checks.push({
        rule: `Leave > ${LEAVE_HOD_THRESHOLD_DAYS} days needs HOD approval`,
        passed: true,
        detail: longLeave
          ? `${days}-day leave exceeds ${LEAVE_HOD_THRESHOLD_DAYS} days — routed to HOD for approval instead of faculty.`
          : `${days}-day leave is within faculty approval limit.`,
      });
    } else {
      checks.push({
        rule: `Leave > ${LEAVE_HOD_THRESHOLD_DAYS} days needs HOD approval`,
        passed: true,
        detail: "Leave dates not yet parsed — faculty reviewer should confirm duration on review.",
      });
    }
  }

  if (match.templateId === "wf-fee") {
    // Enforced concretely by the Document Agent's requiresDocument check;
    // recorded here too so the policy checklist names the actual document.
    checks.push({
      rule: "Requires income certificate",
      passed: true,
      detail: "Income certificate must be attached — verified by the Document Agent below.",
    });
  }

  if (match.templateId === "wf-internship") {
    requiresHod = true;
    checks.push({
      rule: "Requires department (HOD) approval",
      passed: true,
      detail: "Internship NOC is always routed to the department HOD, not general faculty.",
    });
  }

  if (match.templateId === "wf-revaluation") {
    const resultDate = parseLooseDate(fieldData.result_date);
    if (resultDate) {
      const daysSince = Math.round((Date.now() - resultDate.getTime()) / 86400000);
      const withinWindow = daysSince <= REVALUATION_WINDOW_DAYS;
      checks.push({
        rule: `Must be submitted within ${REVALUATION_WINDOW_DAYS} days of result`,
        passed: withinWindow,
        detail: withinWindow
          ? `Filed ${daysSince} day(s) after result — within the ${REVALUATION_WINDOW_DAYS}-day window.`
          : `Filed ${daysSince} day(s) after result — past the ${REVALUATION_WINDOW_DAYS}-day window.`,
      });
      if (!withinWindow) reasons.push(`Revaluation window of ${REVALUATION_WINDOW_DAYS} days has passed.`);
    } else {
      checks.push({
        rule: `Must be submitted within ${REVALUATION_WINDOW_DAYS} days of result`,
        passed: true,
        detail: "Result publication date not provided — Examination Cell to verify the deadline on review.",
      });
    }
  }

  return { eligible: reasons.length === 0, reasons, checks, requiresHod };
}

/** Document Agent — checks whether a required supporting document is attached. */
async function checkDocuments(
  requestId: string | null,
  requiresDocument: boolean
): Promise<DocumentCheckResult> {
  if (!requiresDocument) {
    return { required: false, satisfied: true, detail: "No supporting document required for this workflow." };
  }
  if (!requestId) {
    return {
      required: true,
      satisfied: false,
      detail: "A supporting document will be required — attach it from the request detail page after submitting.",
    };
  }
  const rows = await db.select().from(documents).where(eq(documents.requestId, requestId));
  return rows.length > 0
    ? { required: true, satisfied: true, detail: `${rows.length} document(s) attached.` }
    : { required: true, satisfied: false, detail: "Required document not yet uploaded." };
}

/** Workflow Agent — decides department + staff routing. */
async function planRouting(match: RagMatch | null, requiresHod: boolean): Promise<RoutingResult> {
  if (!match) {
    return { departmentId: null, departmentName: null, assignedFacultyId: null, assignedFacultyName: null };
  }
  const departmentStaff = await db.select().from(users).where(eq(users.department, match.departmentId));
  // Named policies (long leave, Internship NOC) require HOD-level sign-off,
  // so prefer the HOD over general faculty when that flag is set.
  const assigned = requiresHod
    ? departmentStaff.find((f) => f.role === "hod") || departmentStaff.find((f) => f.role === "faculty")
    : departmentStaff.find((f) => f.role === "faculty") || departmentStaff.find((f) => f.role === "hod");

  return {
    departmentId: match.departmentId,
    departmentName: match.departmentId,
    assignedFacultyId: assigned?.id ?? null,
    assignedFacultyName: assigned?.name ?? null,
  };
}

/** Approval Agent — prepares a recommendation for the human approver (human-in-the-loop). */
function buildRecommendation(
  match: RagMatch | null,
  policy: PolicyCheckResult,
  documentCheck: DocumentCheckResult,
  missingFields: string[]
): AgentRecommendation {
  if (!match) {
    return { decision: "review", reason: "No confident workflow match — needs human triage.", confidence: 0 };
  }
  if (!policy.eligible) {
    return {
      decision: "reject",
      reason: `Policy check failed: ${policy.reasons.join(" ")}`,
      confidence: match.confidence,
    };
  }
  if (missingFields.length > 0) {
    return {
      decision: "review",
      reason: `Waiting on ${missingFields.length} missing field(s) from the student before a recommendation can be finalized.`,
      confidence: match.confidence,
    };
  }
  if (documentCheck.required && !documentCheck.satisfied) {
    return {
      decision: "review",
      reason: "Policy is satisfied, but the required supporting document has not been uploaded yet.",
      confidence: match.confidence,
    };
  }
  if (match.lowConfidence) {
    return {
      decision: "review",
      reason: `RAG match confidence (${(match.confidence * 100).toFixed(0)}%) is below the ${(0.35 * 100).toFixed(0)}% auto-route threshold — needs admin triage.`,
      confidence: match.confidence,
    };
  }
  return {
    decision: "approve",
    reason: "Student meets eligibility requirements, all required fields and documents are present.",
    confidence: match.confidence,
  };
}

/**
 * Best-effort natural-language rationale from Claude, used only to enrich
 * the "detail" text shown in the reasoning panel. Never throws — falls back
 * to the rule-based reason on any failure (missing key, network error,
 * timeout), so the offline pipeline above remains the source of truth for
 * every decision the app actually acts on.
 */
async function refineReasonWithLLM(
  query: string,
  match: RagMatch | null,
  recommendation: AgentRecommendation
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !match) return recommendation.reason;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        temperature: 0,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content: "You are a university workflow reviewer. Restate the supplied recommendation in one short sentence. Never change the decision or invent facts.",
          },
          {
            role: "user",
            content: `Workflow: "${match.templateName}". Decision: "${recommendation.decision}". Reason: "${recommendation.reason}". Student request: "${query}".`,
          },
        ],
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return recommendation.reason;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : recommendation.reason;
  } catch {
    return recommendation.reason;
  }
}

export async function runOrchestrator(
  query: string,
  student: StudentContext,
  opts: { requestId?: string | null; fieldData?: Record<string, string>; templateMeta?: { minYear: number | null; requiresDocument: boolean } } = {}
): Promise<OrchestratorResult> {
  const steps: AgentStep[] = [];

  // Step 1 — Retrieve candidate workflows and campus knowledge.
  // TF-IDF is retained as a fast, offline retrieval tool and safe fallback.
  const rag = await matchWorkflow(query);
  const preliminaryMatch = rag.bestMatch;

  // Step 2 — LLM Request Agent. The model may improve intent/field extraction,
  // but it cannot execute actions, change policy, or bypass permissions.
  const templates = await db.select().from(workflowTemplates);
  const llmUnderstanding = await understandWithLLM(
    query,
    templates,
    preliminaryMatch,
    rag.extractedFields
  );
  let match = preliminaryMatch;
  if (llmUnderstanding?.templateId) {
    const llmCandidate = rag.matches.find((candidate) => candidate.templateId === llmUnderstanding.templateId);
    const selectedTemplate = templates.find((template) => template.id === llmUnderstanding.templateId);
    if (llmCandidate) {
      match = { ...llmCandidate, confidence: llmUnderstanding.confidence, lowConfidence: llmUnderstanding.confidence < 0.35 };
    } else if (selectedTemplate) {
      match = {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        description: selectedTemplate.description,
        departmentId: selectedTemplate.departmentId,
        requiredFields: JSON.parse(selectedTemplate.requiredFields) as string[],
        guideSteps: JSON.parse(selectedTemplate.guideSteps) as string[],
        confidence: llmUnderstanding.confidence,
        lowConfidence: llmUnderstanding.confidence < 0.35,
        estimatedDays: selectedTemplate.estimatedDays ?? 3,
        matchedKeywords: [],
      };
    }
  }

  steps.push({
    id: "understand",
    agent: "Request Agent",
    label: "Understanding request",
    status: "done",
    detail: match
      ? `${llmUnderstanding ? "LLM intent" : "RAG intent"}: ${match.templateName}${llmUnderstanding ? ` (${Math.round(llmUnderstanding.confidence * 100)}% confidence)` : ""}`
      : "No confident workflow intent detected",
  });

  // Step 3 — Structured field collection. LLM extraction is merged with the
  // deterministic extractor and explicit UI field data always wins.
  const extractedFields = { ...(llmUnderstanding?.extractedFields ?? rag.extractedFields), ...(opts.fieldData || {}) };
  const missingFields = (match?.requiredFields ?? []).filter((f) => !extractedFields[f]);
  steps.push({
    id: "fields",
    agent: "Request Agent",
    label: "Checking required information",
    status: missingFields.length > 0 ? "waiting" : "done",
    detail:
      missingFields.length > 0
        ? `Missing: ${missingFields.map((f) => f.replace(/_/g, " ")).join(", ")}`
        : Object.keys(extractedFields).length > 0
        ? `Collected: ${Object.keys(extractedFields).join(", ")}`
        : "No fields required",
  });

  // Step 4 — Policy Agent: eligibility check against the named university
  // policy rules. If the caller did not provide template metadata, resolve it
  // here from the selected workflow so the LLM cannot accidentally bypass
  // document/year requirements.
  const selectedTemplate = match ? templates.find((template) => template.id === match.templateId) : null;
  const effectiveMinYear = opts.templateMeta?.minYear ?? selectedTemplate?.minYear ?? null;
  const effectiveRequiresDocument = opts.templateMeta?.requiresDocument ?? !!selectedTemplate?.requiresDocument;
  const policy = checkPolicy(match, student, effectiveMinYear, extractedFields);
  const checksSummary = policy.checks
    .map((c) => `${c.passed ? "\u2713" : "\u2717"} ${c.rule}`)
    .join("  ");
  steps.push({
    id: "policy",
    agent: "Policy Agent",
    label: "Checking university policy",
    status: match ? "done" : "skipped",
    detail: !match
      ? "Skipped — no workflow matched yet"
      : policy.eligible
      ? checksSummary
        ? `Eligible: Yes — ${checksSummary}`
        : "Eligible: Yes"
      : `Eligible: No — ${policy.reasons.join(" ")}`,
  });

  // Step 5 — Document Agent: supporting-document check.
  const documentCheck = await checkDocuments(opts.requestId ?? null, effectiveRequiresDocument);
  steps.push({
    id: "documents",
    agent: "Document Agent",
    label: "Checking required documents",
    status: !documentCheck.required ? "skipped" : documentCheck.satisfied ? "done" : "waiting",
    detail: documentCheck.detail,
  });

  // Step 7 — Workflow Agent: routing plan.
  const routing = await planRouting(match, policy.requiresHod);
  steps.push({
    id: "routing",
    agent: "Workflow Agent",
    label: "Selecting workflow & routing",
    status: match ? "done" : "skipped",
    detail: match
      ? `${match.templateName} workflow \u2192 ${routing.departmentId ?? "unassigned"} department`
      : "Skipped — no workflow matched yet",
  });

  // Step 7 — Workflow Agent: staff assignment.
  steps.push({
    id: "assign",
    agent: "Workflow Agent",
    label: "Assigning staff",
    status: routing.assignedFacultyId ? "done" : "skipped",
    detail: routing.assignedFacultyName
      ? `\u2192 ${routing.assignedFacultyName}${policy.requiresHod ? " (HOD approval required)" : ""}`
      : "No staff member available in this department yet",
  });

  // Step 8 — Approval Agent: prepare recommendation, gate on human approval.
  const recommendation = buildRecommendation(match, policy, documentCheck, missingFields);
  recommendation.reason = await refineReasonWithLLM(query, match, recommendation);
  steps.push({
    id: "approval",
    agent: "Approval Agent",
    label: "Waiting for human approval",
    status: "waiting",
    detail: `AI recommendation: ${recommendation.decision.toUpperCase()} — ${recommendation.reason}`,
  });

  return {
    steps,
    rag,
    bestMatch: match,
    extractedFields,
    missingFields,
    policy,
    documentCheck,
    routing,
    recommendation,
    guidance: rag.guidance,
  };
}
