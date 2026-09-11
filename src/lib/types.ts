export interface RequestItem {
  id: string;
  studentId: string;
  templateId: string | null;
  rawQuery: string;
  status: string;
  confidence: number | null;
  lowConfidence: boolean | null;
  assignedFacultyId: string | null;
  departmentId: string | null;
  fieldData: Record<string, string>;
  facultyRemarks: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  templateName?: string;
  studentName?: string;
  departmentName?: string;
  assignedFacultyName?: string;
  assignedFacultyRole?: string;
  agentSteps?: AgentStep[];
  aiRecommendation?: "approve" | "reject" | "review" | null;
  aiRecommendationReason?: string | null;
  policyEligible?: boolean | null;
  documentCheck?: { required: boolean; satisfied: boolean; detail: string };
  policyChecks?: { rule: string; passed: boolean; detail: string }[];
}

export interface AgentStep {
  id: string;
  agent: string;
  label: string;
  status: "done" | "waiting" | "blocked" | "skipped";
  detail?: string;
}

export interface ApprovalItem {
  id: string;
  requestId: string;
  approverId: string;
  approverRole: "faculty" | "hod" | "admin";
  approverName?: string;
  decision: "approved" | "rejected" | "returned" | "escalated";
  remarks: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  requestId: string;
  uploadedById: string;
  uploadedByRole: "student" | "faculty" | "hod" | "admin";
  uploadedByName?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  requestId: string | null;
  title: string;
  message: string;
  read: boolean | null;
  createdAt: string;
}

export interface MetricsData {
  totalRequests: number;
  pendingRequests: number;
  resolvedRequests: number;
  lowConfidenceCount: number;
  avgTurnaroundHours: number;
  byStatus: Record<string, number>;
  templateStats: Array<{ name: string; count: number }>;
  userCounts: {
    students: number;
    faculty: number;
    admins: number;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "student" | "faculty" | "hod" | "admin";
  department?: string | null;
  studentId?: string | null;
  joiningYear?: number | null;
  yearOfStudy?: number | null;
}
