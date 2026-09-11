import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import * as schema from "./schema";
import {
  buildVocabulary,
  computeIdf,
  computeTfIdfVector,
  serializeVector,
} from "../rag/embeddings";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken: authToken || undefined });
const db = drizzle(client, { schema });

const DEPARTMENTS = [
  { id: "dept-cse", name: "Computer Science and Engineering", shortName: "CSE", code: "05", hodId: "user-hod-cse" },
  { id: "dept-it", name: "Information Technology", shortName: "IT", code: "12", hodId: "user-hod-it" },
  { id: "dept-ai", name: "Artificial Intelligence", shortName: "AI", code: "43", hodId: "user-hod-ai" },
  { id: "dept-ds", name: "Data Science", shortName: "DS", code: "44", hodId: "user-hod-ds" },
];

const YEAR_CONFIG = [
  { yearOfStudy: 1, joiningYear: 2026 },
  { yearOfStudy: 2, joiningYear: 2025 },
  { yearOfStudy: 3, joiningYear: 2024 },
  { yearOfStudy: 4, joiningYear: 2023 },
];

const WORKFLOW_TEMPLATES = [
  {
    id: "wf-bonafide",
    name: "Bonafide Certificate",
    description: "Official certificate confirming student enrollment status for bank, scholarship, or visa purposes",
    departmentId: "dept-cse",
    keywords: "bonafide certificate enrollment proof student status bank scholarship visa official letter",
    requiredFields: ["full_name", "roll_number", "department", "year", "reason"],
    estimatedDays: 2,
    minYear: null,
    requiresDocument: false,
    guideSteps: [
      "Verify your enrollment details are correct in the student portal",
      "Specify the purpose (bank account, scholarship, visa, etc.)",
      "Submit the request with your roll number and department",
      "Collect the signed certificate from Academic Affairs after approval",
    ],
  },
  {
    id: "wf-tc",
    name: "Transfer Certificate",
    description: "Official transfer certificate for students leaving the institution",
    departmentId: "dept-cse",
    keywords: "transfer certificate tc leaving college migration university exit",
    requiredFields: ["full_name", "roll_number", "department", "reason", "address"],
    estimatedDays: 7,
    minYear: null,
    requiresDocument: true,
    guideSteps: [
      "Clear all pending dues with the Finance Office",
      "Return library books and hostel keys if applicable",
      "Submit TC request with reason for leaving",
      "Wait for no-dues clearance from all departments",
      "Collect TC from Academic Affairs within 7 working days",
    ],
  },
  {
    id: "wf-leave",
    name: "Leave Application",
    description: "Apply for short-term or medical leave from classes",
    departmentId: "dept-cse",
    keywords: "leave application absent sick medical emergency holiday permission",
    requiredFields: ["full_name", "roll_number", "from_date", "to_date", "reason"],
    estimatedDays: 1,
    minYear: null,
    requiresDocument: false,
    guideSteps: [
      "State the leave period (from and to dates)",
      "Provide reason (medical, personal, emergency)",
      "Attach medical certificate if applicable",
      "Submit before or on the first day of leave",
      "Check approval status in your dashboard",
    ],
  },
  {
    id: "wf-revaluation",
    name: "Exam Revaluation",
    description: "Request re-evaluation or rechecking of examination answer scripts",
    departmentId: "dept-it",
    keywords: "revaluation recheck exam paper marks score result grievance",
    requiredFields: ["full_name", "roll_number", "department", "reason"],
    estimatedDays: 15,
    minYear: null,
    requiresDocument: false,
    guideSteps: [
      "Check result publication date and revaluation deadline",
      "Pay the revaluation fee at Finance Office",
      "Submit subject codes and semester details",
      "Track status on the Examination Cell portal",
      "Results updated within 15 working days",
    ],
  },
  {
    id: "wf-library",
    name: "Library Card",
    description: "Apply for a new library membership card or replacement",
    departmentId: "dept-it",
    keywords: "library card membership book issue borrow reading",
    requiredFields: ["full_name", "roll_number", "department", "phone"],
    estimatedDays: 3,
    minYear: null,
    requiresDocument: false,
    guideSteps: [
      "Visit the Library counter with your ID card",
      "Fill the membership form with contact details",
      "Pay the annual membership fee if applicable",
      "Collect your library card within 3 working days",
    ],
  },
  {
    id: "wf-internship",
    name: "Internship NOC",
    description: "No Objection Certificate for industrial internship or training",
    departmentId: "dept-ai",
    keywords: "internship noc no objection training industry company placement",
    requiredFields: ["full_name", "roll_number", "department", "year", "reason"],
    estimatedDays: 5,
    minYear: 2,
    requiresDocument: true,
    guideSteps: [
      "Get internship offer letter from the company",
      "Submit company name, duration, and location",
      "HOD approval required before NOC issuance",
      "Collect signed NOC from Academic Affairs",
    ],
  },
  {
    id: "wf-fee",
    name: "Fee Concession",
    description: "Apply for fee waiver or concession based on merit or financial need",
    departmentId: "dept-ds",
    keywords: "fee concession waiver scholarship discount financial aid tuition reduction",
    requiredFields: ["full_name", "roll_number", "department", "reason"],
    estimatedDays: 10,
    minYear: null,
    requiresDocument: true,
    guideSteps: [
      "Gather income certificate and supporting documents",
      "Fill the fee concession application form",
      "Submit to Finance Office with required proofs",
      "Management committee reviews within 10 days",
      "Approved concession reflects in next fee installment",
    ],
  },
  {
    id: "wf-hostel",
    name: "Hostel Allotment",
    description: "Apply for hostel room allotment or room change request",
    departmentId: "dept-ds",
    keywords: "hostel room allotment accommodation boarding lodging stay",
    requiredFields: ["full_name", "roll_number", "department", "year", "address", "phone"],
    estimatedDays: 7,
    minYear: null,
    requiresDocument: false,
    guideSteps: [
      "Check hostel availability on the portal",
      "Submit allotment request with permanent address",
      "Pay hostel deposit at Finance Office",
      "Room assignment based on availability and year",
      "Collect hostel ID and keys from warden office",
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding CampusOS AI database...");

  // Rebuild the small demo catalog so branch master data is deterministic.
  await db.delete(schema.departments);
  await db.delete(schema.timetable);
  await db.delete(schema.subjects);
  await db.delete(schema.users).where(or(eq(schema.users.role, "student"), eq(schema.users.role, "faculty"), eq(schema.users.role, "hod")));

  for (const dept of DEPARTMENTS) {
    await db.insert(schema.departments).values(dept).onConflictDoNothing();
  }

  const catalogNow = new Date().toISOString();
  for (const department of DEPARTMENTS) {
    const facultyId = `user-faculty-${department.shortName.toLowerCase()}`;
    for (const subjectNumber of [1, 2]) {
      const subjectId = `subject-${department.id}-${subjectNumber}`;
      await db.insert(schema.subjects).values({
        id: subjectId,
        name: `Sub ${subjectNumber}`,
        code: `${department.shortName}-SUB${subjectNumber}`,
        departmentId: department.id,
        facultyId,
        semester: 7,
        year: 4,
        createdAt: catalogNow,
      }).onConflictDoNothing();

      for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
        await db.insert(schema.timetable).values({
          id: `timetable-${department.id}-${subjectNumber}-${dayOfWeek}`,
          departmentId: department.id,
          subjectId,
          facultyId,
          dayOfWeek,
          periodNumber: subjectNumber,
          startTime: subjectNumber === 1 ? "09:00" : "10:00",
          endTime: subjectNumber === 1 ? "09:50" : "10:50",
          room: `${department.shortName}-201`,
        }).onConflictDoNothing();
      }
    }
  }

  const corpus = WORKFLOW_TEMPLATES.map(
    (t) => `${t.name} ${t.description} ${t.keywords}`
  );
  const vocab = buildVocabulary(corpus);
  const idf = computeIdf(corpus, vocab);

  for (const tmpl of WORKFLOW_TEMPLATES) {
    const text = `${tmpl.name} ${tmpl.description} ${tmpl.keywords}`;
    const embedding = serializeVector(computeTfIdfVector(text, vocab, idf));

    await db
      .insert(schema.workflowTemplates)
      .values({
        ...tmpl,
        requiredFields: JSON.stringify(tmpl.requiredFields),
        guideSteps: JSON.stringify(tmpl.guideSteps),
        embedding,
      })
      .onConflictDoUpdate({
        target: schema.workflowTemplates.id,
        set: {
          name: tmpl.name,
          description: tmpl.description,
          departmentId: tmpl.departmentId,
          requiredFields: JSON.stringify(tmpl.requiredFields),
          keywords: tmpl.keywords,
          embedding,
          estimatedDays: tmpl.estimatedDays,
          guideSteps: JSON.stringify(tmpl.guideSteps),
          minYear: tmpl.minYear,
          requiresDocument: tmpl.requiresDocument,
        },
      });
  }

  const password = await bcrypt.hash("password123", 10);
  const now = new Date().toISOString();

  type SeedUser = {
    id: string;
    email: string;
    password?: string;
    name: string;
    role: "student" | "faculty" | "hod" | "admin";
    department: string | null;
    studentId: string | null;
    joiningYear: number | null;
    yearOfStudy: number | null;
    createdAt: string;
  };

  const demoUsers: SeedUser[] = [
    { id: "user-hod-cse", email: "hod.cse@campus.edu", name: "Dr. Anil Kumar", role: "hod", department: "dept-cse", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-hod-it", email: "hod.it@campus.edu", name: "Dr. Meera Singh", role: "hod", department: "dept-it", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-hod-ai", email: "hod.ai@campus.edu", name: "Dr. Ravi Prasad", role: "hod", department: "dept-ai", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-hod-ds", email: "hod.ds@campus.edu", name: "Dr. Kavya Reddy", role: "hod", department: "dept-ds", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-faculty-cse", email: "faculty.cse@campus.edu", name: "Prof. Kiran Rao", role: "faculty", department: "dept-cse", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-faculty-it", email: "faculty.it@campus.edu", name: "Prof. Lakshmi Devi", role: "faculty", department: "dept-it", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-faculty-ai", email: "faculty.ai@campus.edu", name: "Prof. Suresh Babu", role: "faculty", department: "dept-ai", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-faculty-ds", email: "faculty.ds@campus.edu", name: "Prof. Nisha Varma", role: "faculty", department: "dept-ds", studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
    { id: "user-admin-1", email: "admin@campus.edu", name: "Admin Officer", role: "admin", department: null, studentId: null, joiningYear: null, yearOfStudy: null, createdAt: now },
  ];

  for (const department of DEPARTMENTS) {
    for (const year of YEAR_CONFIG) {
      for (let index = 1; index <= 10; index++) {
        const rollNumber = `${String(year.joiningYear).slice(-2)}A21A${department.code}${String(index).padStart(2, "0")}`;
        demoUsers.push({
          id: `student-${department.id}-${year.yearOfStudy}-${index}`,
          email: `${department.shortName.toLowerCase()}${year.joiningYear}${index}@campus.edu`,
          name: `${department.shortName} ${year.yearOfStudy} Student ${String(index).padStart(2, "0")}`,
          role: "student",
          department: department.id,
          studentId: rollNumber,
          joiningYear: year.joiningYear,
          yearOfStudy: year.yearOfStudy,
          createdAt: now,
        });
      }
    }
  }

  for (const user of demoUsers) {
    await db.insert(schema.users).values({ ...user, password }).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        joiningYear: user.joiningYear,
        yearOfStudy: user.yearOfStudy,
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  CSE student: cse20231@campus.edu");
  console.log("  HOD: hod.ai@campus.edu");
  console.log("  Faculty: faculty.ai@campus.edu");
  console.log("  Admin:    admin@campus.edu");
}

seed().catch(console.error);
