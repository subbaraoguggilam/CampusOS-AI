"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { RequestItem, ApprovalItem } from "@/lib/types";

type StepState = "done" | "current" | "blocked" | "pending";

interface TimelineStep {
  key: string;
  label: string;
  state: StepState;
  timestamp?: string | null;
  actor?: string | null;
  action?: string | null;
  remarks?: string | null;
}

const PAST_REVIEW_STATUSES = ["approved", "rejected", "resolved", "closed"];

/**
 * Builds the ordered, human-readable request lifecycle from a request's
 * current status plus its approval history — the visual timeline the
 * hackathon write-up asks for: submitted -> AI analyzed -> department
 * identified -> assigned -> reviewed -> decision -> resolution -> closed,
 * each annotated with timestamp / actor / action / remarks where known.
 */
function buildSteps(request: RequestItem, approvals: ApprovalItem[]): TimelineStep[] {
  const decisionApproval = approvals.find((a) => ["approved", "rejected", "escalated"].includes(a.decision));
  const isRejected = request.status === "rejected" || decisionApproval?.decision === "rejected";
  const isEscalated = request.status === "escalated";
  const manualRouting = request.status === "pending_routing";
  const isAssigned = !!request.assignedFacultyId;
  const reachedReview = request.status === "in_review" || PAST_REVIEW_STATUSES.includes(request.status) || isEscalated;
  const pastReview = PAST_REVIEW_STATUSES.includes(request.status);

  const steps: TimelineStep[] = [
    {
      key: "submitted",
      label: "Submitted",
      state: "done",
      timestamp: request.createdAt,
      actor: request.studentName || "Student",
      action: "Submitted the request",
    },
    {
      key: "ai_analyzed",
      label: "AI analyzed",
      state: request.confidence != null ? "done" : "pending",
      timestamp: request.createdAt,
      actor: "CampusOS AI",
      action:
        request.templateName != null
          ? `Matched to "${request.templateName}"${request.confidence != null ? ` (${Math.round(request.confidence * 100)}% confidence)` : ""}`
          : "Analyzing request intent",
    },
    {
      key: "department_identified",
      label: "Department identified",
      state: request.departmentName ? "done" : manualRouting ? "blocked" : "pending",
      timestamp: request.createdAt,
      actor: "CampusOS AI",
      action: request.departmentName
        ? `Routed to ${request.departmentName}`
        : manualRouting
        ? "Low confidence / policy flag — sent to Admin for manual routing"
        : undefined,
    },
    {
      key: "assigned",
      label: request.assignedFacultyRole === "hod" ? "Assigned to HOD" : "Assigned to Faculty",
      state: isAssigned ? "done" : manualRouting ? "blocked" : "pending",
      timestamp: request.createdAt,
      actor: "CampusOS AI",
      action: isAssigned
        ? `Assigned to ${request.assignedFacultyName || "a reviewer"}`
        : manualRouting
        ? "Awaiting admin to assign a reviewer"
        : undefined,
    },
    {
      key: "reviewed",
      label: request.assignedFacultyRole === "hod" ? "HOD reviewed" : "Faculty reviewed",
      state: reachedReview ? (pastReview || isEscalated ? "done" : "current") : "pending",
      timestamp: reachedReview ? request.updatedAt : undefined,
      actor: request.assignedFacultyName,
      action: reachedReview ? "Started review" : undefined,
    },
    {
      key: "decision",
      label: isEscalated ? "Escalated" : isRejected ? "Rejected" : "Waiting for approval",
      state: decisionApproval ? (isRejected ? "blocked" : "done") : isEscalated ? "blocked" : reachedReview ? "current" : "pending",
      timestamp: decisionApproval?.createdAt,
      actor: decisionApproval?.approverName || request.assignedFacultyName,
      action: decisionApproval
        ? `${decisionApproval.decision.charAt(0).toUpperCase()}${decisionApproval.decision.slice(1)} the request`
        : undefined,
      remarks: decisionApproval?.remarks,
    },
    {
      key: "resolution",
      label: "Resolution",
      state:
        request.status === "resolved" || request.status === "closed"
          ? "done"
          : request.status === "approved"
          ? "current"
          : isRejected || isEscalated
          ? "pending"
          : "pending",
      timestamp: request.status === "resolved" || request.status === "closed" ? request.resolvedAt || request.updatedAt : undefined,
      actor: request.assignedFacultyName,
      action:
        request.status === "resolved" || request.status === "closed" ? "Marked resolved" : undefined,
      remarks: request.facultyRemarks,
    },
    {
      key: "closed",
      label: "Closed",
      state: request.status === "closed" ? "done" : "pending",
      timestamp: request.status === "closed" ? request.updatedAt : undefined,
    },
  ];

  return steps;
}

const ICON: Record<StepState, React.ReactNode> = {
  done: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  current: <Circle className="h-4 w-4 text-amber-500 animate-pulse" />,
  blocked: <XCircle className="h-4 w-4 text-red-600" />,
  pending: <Circle className="h-4 w-4 text-gray-300" />,
};

const LABEL_CLASS: Record<StepState, string> = {
  done: "text-gray-900 font-medium",
  current: "text-amber-800 font-medium",
  blocked: "text-red-700 font-medium",
  pending: "text-gray-400",
};

export function RequestTimeline({ request, approvals }: { request: RequestItem; approvals: ApprovalItem[] }) {
  const steps = buildSteps(request, approvals);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Request Timeline <span className="text-gray-400 font-normal">#{request.id.slice(0, 8).toUpperCase()}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                {ICON[step.state]}
                {i < steps.length - 1 && (
                  <div className={cn("w-px flex-1 my-0.5 min-h-[20px]", step.state === "done" ? "bg-green-300" : "bg-gray-200")} />
                )}
              </div>
              <div className={cn("pb-4 min-w-0", i === steps.length - 1 && "pb-0")}>
                <p className={cn("text-sm leading-tight", LABEL_CLASS[step.state])}>{step.label}</p>
                {(step.action || step.timestamp) && (
                  <div className="mt-0.5 text-xs text-gray-500 space-y-0.5">
                    {step.action && <p>{step.action}</p>}
                    <p className="text-[11px] text-gray-400">
                      {step.actor ? `${step.actor}` : null}
                      {step.actor && step.timestamp ? " · " : null}
                      {step.timestamp ? formatDate(step.timestamp) : null}
                    </p>
                    {step.remarks && <p className="italic text-gray-500">&ldquo;{step.remarks}&rdquo;</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
