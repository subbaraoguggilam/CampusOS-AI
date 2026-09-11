import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["student", "faculty", "hod", "admin"] }).notNull(),
  department: text("department"),
  studentId: text("student_id"),
  joiningYear: integer("joining_year"),
  yearOfStudy: integer("year_of_study"),
  subscriptionStatus: text("subscription_status").default("free"),
  createdAt: text("created_at").notNull(),
});

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  departmentId: text("department_id").notNull(),
  facultyId: text("faculty_id").notNull(),
  semester: integer("semester").notNull(),
  year: integer("year").notNull(),
  createdAt: text("created_at").notNull(),
});

export const timetable = sqliteTable("timetable", {
  id: text("id").primaryKey(),
  departmentId: text("department_id").notNull(),
  subjectId: text("subject_id").notNull(),
  facultyId: text("faculty_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  periodNumber: integer("period_number").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  room: text("room"),
}, (table) => ({
  departmentDayPeriod: uniqueIndex("timetable_department_day_period").on(table.departmentId, table.dayOfWeek, table.periodNumber),
}));

export const attendanceRecords = sqliteTable("attendance_records", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  facultyId: text("faculty_id").notNull(),
  subjectId: text("subject_id"),
  subject: text("subject").notNull(),
  periodNumber: integer("period_number"),
  attendedClasses: integer("attended_classes").notNull(),
  totalClasses: integer("total_classes").notNull(),
  semester: integer("semester").notNull(),
  attendanceDate: text("attendance_date").notNull(),
  present: integer("present", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  studentSubjectDatePeriod: uniqueIndex("attendance_student_subject_date_period").on(table.studentId, table.subjectId, table.attendanceDate, table.periodNumber),
}));

export const marks = sqliteTable("marks", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  facultyId: text("faculty_id").notNull(),
  subject: text("subject").notNull(),
  assessment: text("assessment").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  semester: integer("semester").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  shortName: text("short_name").notNull().default(""),
  hodId: text("hod_id"),
});

export const workflowTemplates = sqliteTable("workflow_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  departmentId: text("department_id").notNull(),
  requiredFields: text("required_fields").notNull(),
  keywords: text("keywords").notNull(),
  embedding: text("embedding").notNull(),
  estimatedDays: integer("estimated_days").default(3),
  guideSteps: text("guide_steps").notNull(),
  // Policy Agent inputs: minimum year-of-study eligibility and whether a
  // supporting document must be attached before staff review can start.
  minYear: integer("min_year"),
  requiresDocument: integer("requires_document", { mode: "boolean" }).default(false),
});

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  templateId: text("template_id"),
  rawQuery: text("raw_query").notNull(),
  status: text("status", {
    enum: [
      "draft",
      "collecting_fields",
      "pending_routing",
      "routed",
      "in_review",
      "approved",
      "rejected",
      "escalated",
      "resolved",
      "closed",
    ],
  })
    .notNull()
    .default("draft"),
  confidence: real("confidence"),
  lowConfidence: integer("low_confidence", { mode: "boolean" }).default(false),
  assignedFacultyId: text("assigned_faculty_id"),
  departmentId: text("department_id"),
  fieldData: text("field_data").default("{}"),
  facultyRemarks: text("faculty_remarks"),
  // AI Orchestrator output: the step-by-step agent activity trace (JSON
  // array of AgentStep, see src/lib/agent/orchestrator.ts), the AI's
  // recommendation for the human approver, and the reasoning behind it.
  agentTrace: text("agent_trace"),
  aiRecommendation: text("ai_recommendation", {
    enum: ["approve", "reject", "review"],
  }),
  aiRecommendationReason: text("ai_recommendation_reason"),
  policyEligible: integer("policy_eligible", { mode: "boolean" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  requestId: text("request_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  uploadedById: text("uploaded_by_id").notNull(),
  uploadedByRole: text("uploaded_by_role", {
    enum: ["student", "faculty", "hod", "admin"],
  }).notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  // Base64-encoded file content. Stored in-row (Turso/libSQL) rather than on
  // disk so it survives serverless deploys with no additional storage
  // dependency — fine at hackathon-MVP scale, called out as a scaling
  // item (move to object storage) in the Phase 3 write-up.
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  plan: text("plan").notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  approverId: text("approver_id").notNull(),
  approverRole: text("approver_role", { enum: ["faculty", "hod", "admin"] }).notNull(),
  decision: text("decision", { enum: ["approved", "rejected", "returned", "escalated"] }).notNull(),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
});

export const automationEvents = sqliteTable("automation_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  payload: text("payload").notNull(),
  status: text("status", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  sentAt: text("sent_at"),
});

export type User = typeof users.$inferSelect;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type Request = typeof requests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type AutomationEvent = typeof automationEvents.$inferSelect;
