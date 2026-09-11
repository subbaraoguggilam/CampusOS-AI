// Explicit workflow state machine for request status transitions.
//
// The requests table already tracks a rich status enum (draft,
// collecting_fields, pending_routing, routed, in_review, approved,
// rejected, escalated, resolved, closed). Previously any authenticated
// staff member could move a request to any status via the PATCH action
// switch. This module makes the allowed transitions explicit and enforces
// who is allowed to trigger each one, so e.g. a student can never reach
// "approved" and a faculty member can't jump straight to "closed" without
// resolving first.

export type RequestStatus =
  | "draft"
  | "collecting_fields"
  | "pending_routing"
  | "routed"
  | "in_review"
  | "approved"
  | "rejected"
  | "escalated"
  | "resolved"
  | "closed";

export type RequestAction =
  | "start_review"
  | "approve"
  | "reject"
  | "escalate"
  | "request_more_info"
  | "resolve"
  | "close"
  | "reassign";

export type Role = "student" | "faculty" | "hod" | "admin";

interface TransitionRule {
  roles: Role[];
  from: RequestStatus[];
  to: RequestStatus;
}

export const TRANSITIONS: Record<RequestAction, TransitionRule> = {
  start_review: {
    roles: ["faculty", "hod", "admin"],
    from: ["routed", "pending_routing", "escalated"],
    to: "in_review",
  },
  approve: {
    roles: ["faculty", "hod", "admin"],
    from: ["in_review", "routed"],
    to: "approved",
  },
  reject: {
    roles: ["faculty", "hod", "admin"],
    from: ["in_review", "routed"],
    to: "rejected",
  },
  escalate: {
    roles: ["faculty", "hod", "admin"],
    from: ["in_review", "routed"],
    to: "escalated",
  },
  request_more_info: {
    roles: ["faculty", "hod", "admin"],
    from: ["in_review", "routed"],
    to: "collecting_fields",
  },
  resolve: {
    roles: ["faculty", "hod", "admin"],
    from: ["approved"],
    to: "resolved",
  },
  close: {
    roles: ["faculty", "hod", "admin"],
    from: ["resolved", "rejected"],
    to: "closed",
  },
  reassign: {
    roles: ["admin"],
    from: ["pending_routing", "routed", "escalated", "in_review"],
    to: "routed",
  },
};

export interface TransitionCheck {
  ok: boolean;
  reason?: string;
  toStatus?: RequestStatus;
}

/**
 * Validates whether `role` may apply `action` to a request currently in
 * `currentStatus`. Students are never included in any rule's `roles`, so
 * this alone prevents self-approval; it also stops staff from skipping
 * required stages (e.g. approve -> close without resolve).
 */
export function canTransition(
  action: string,
  role: Role,
  currentStatus: string
): TransitionCheck {
  const rule = TRANSITIONS[action as RequestAction];
  if (!rule) {
    return { ok: false, reason: `Unknown action "${action}".` };
  }
  if (!rule.roles.includes(role)) {
    return { ok: false, reason: `Role "${role}" is not permitted to perform "${action}".` };
  }
  if (!rule.from.includes(currentStatus as RequestStatus)) {
    return {
      ok: false,
      reason: `Cannot "${action}" a request in status "${currentStatus}" (allowed from: ${rule.from.join(", ")}).`,
    };
  }
  return { ok: true, toStatus: rule.to };
}
