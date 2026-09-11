"use client";

import { Bot, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DECISION_STYLES: Record<string, string> = {
  approve: "bg-green-50 border-green-200 text-green-900",
  reject: "bg-red-50 border-red-200 text-red-900",
  review: "bg-amber-50 border-amber-200 text-amber-900",
};

const DECISION_LABEL: Record<string, string> = {
  approve: "APPROVE",
  reject: "REJECT",
  review: "NEEDS REVIEW",
};

export interface PolicyCheckItem {
  rule: string;
  passed: boolean;
  detail: string;
}

export function AiRecommendationBanner({
  decision,
  reason,
  confidence,
  matchedKeywords,
  policyChecks,
  alternatives,
}: {
  decision: "approve" | "reject" | "review";
  reason?: string | null;
  /** 0-1 RAG match confidence. When provided, renders "AI Confidence: NN%". */
  confidence?: number | null;
  /** Terms from the student's query that matched this workflow's keywords. */
  matchedKeywords?: string[];
  /** Policy Agent's rule-by-rule eligibility checklist. */
  policyChecks?: PolicyCheckItem[];
  /** Other candidate workflows to show when confidence is low. */
  alternatives?: { templateName: string }[];
}) {
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  const isLowConfidence = pct != null && pct < 35;

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm flex gap-2", DECISION_STYLES[decision])}>
      <Bot className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold">AI Recommendation: {DECISION_LABEL[decision]}</p>
          {pct != null && (
            <span
              className={cn(
                "text-xs font-semibold rounded-full px-2 py-0.5",
                isLowConfidence ? "bg-orange-200/70 text-orange-900" : "bg-white/60"
              )}
            >
              AI Confidence: {pct}%
            </span>
          )}
        </div>
        {reason && <p className="mt-0.5 text-xs opacity-90">{reason}</p>}

        {matchedKeywords && matchedKeywords.length > 0 && !isLowConfidence && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {matchedKeywords.map((kw) => (
              <span key={kw} className="inline-flex items-center gap-1 text-xs">
                <Check className="h-3 w-3 text-green-600" /> &ldquo;{kw}&rdquo;
              </span>
            ))}
          </div>
        )}

        {policyChecks && policyChecks.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {policyChecks.map((c) => (
              <div key={c.rule} className="flex items-start gap-1.5 text-xs">
                {c.passed ? (
                  <Check className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <X className="h-3 w-3 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>
                  <span className="font-medium">{c.rule}</span> — {c.detail}
                </span>
              </div>
            ))}
          </div>
        )}

        {isLowConfidence && (
          <div className="mt-2">
            <p className="text-xs font-medium">⚠️ AI is uncertain about the workflow match.</p>
            {alternatives && alternatives.length > 0 && (
              <div className="mt-1 text-xs">
                <p className="opacity-80">Possible workflows:</p>
                <ol className="list-decimal list-inside">
                  {alternatives.slice(0, 3).map((a) => (
                    <li key={a.templateName}>{a.templateName}</li>
                  ))}
                </ol>
              </div>
            )}
            <p className="mt-1 text-xs opacity-80">This request will be sent to Admin for manual review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
