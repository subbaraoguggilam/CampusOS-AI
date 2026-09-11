# CampusOS AI

**AI-Powered University & Campus Workflow Automation Platform**

Swarnandhra College Hackathon 2026 — Problem Statement 4

## Overview

CampusOS AI is a full-stack campus workflow platform that combines **Phase 1 (MVP)**, **Phase 2 (Productization)**, and an agentic **Phase 3 (AI Orchestrator)**:

- **AI Orchestrator (multi-agent pipeline)** — A Request Agent, Policy Agent, Document Agent, Workflow Agent, and Approval Agent reason over each request in sequence, maintaining state and producing a visible step-by-step trace plus a human-in-the-loop recommendation. See [AI Orchestrator](#ai-orchestrator) below.
- **Offline RAG Engine** — Local TF-IDF vector search matches student queries to workflow templates; used by the Request Agent as one tool in the pipeline (no external AI API required to run)
- **Smart Workflow Routing** — Auto-routes to departments/faculty; low-confidence matches or policy failures are flagged for admin review
- **Explicit Workflow State Machine** — Status transitions are role-gated and sequence-enforced (`src/lib/workflow/state-machine.ts`) — e.g. a faculty member can't close a request that hasn't been resolved, and only admins can reassign
- **Human-in-the-Loop Approval** — Every request carries an AI recommendation (Approve / Reject / Needs Review) with a reason; a human approver always makes the final call, with an explicit "Request More Information" action
- **Role-Based Portals** — Student, Faculty, and Management dashboards
- **Notifications** — In-app status updates at every workflow stage
- **Document Handling** — Students, faculty, and admin can attach and review supporting documents (ID proof, receipts, letters) on any request — PDF/JPG/PNG/WEBP, 5 MB limit, access scoped to the request's owner/assignee/admin
- **8+ Workflows** — Bonafide, TC, Leave, Revaluation, Library, Internship NOC, Fee Concession, Hostel
- **Razorpay Subscriptions** — Test mode payment flow for monetization demo
- **Turso Database** — Serverless SQLite for production deployment

## Architecture (Agentic Flow)

```
Student request (natural language)
        ↓
  AI Orchestrator
        ↓
  Request Agent — intent analysis (TF-IDF RAG) + field extraction
        ↓
  Missing information? ── yes ──→ Ask student for missing fields
        │ no
        ↓
  Policy Agent — eligibility check (year-of-study, workflow-specific rules)
        ↓
  Document Agent — is a required supporting document attached?
        ↓
  Workflow Agent — select department + assign staff
        ↓
  Approval Agent — prepare AI recommendation (Approve / Reject / Needs Review)
        ↓
  ─────────────── HUMAN APPROVAL (faculty/HOD/admin) ───────────────
        ↓
  Explicit state machine transition → notify student → resolved & closed
```

Every step above is recorded as an `AgentStep` (`src/lib/agent/orchestrator.ts`) and rendered live in the **CampusOS AI Agent Activity** panel in both the student's chat and the reviewer's queue, so the reasoning is visible rather than a black box.

**Stack:** Next.js 15 · Turso (libSQL) · Drizzle ORM · JWT Auth · Razorpay · Tailwind CSS

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

**Turso Setup** ([app.turso.tech](https://app.turso.tech/)):
```bash
# Install Turso CLI, then:
turso db create campus-os-ai
turso db show campus-os-ai --url
turso db tokens create campus-os-ai
```

Add to `.env.local`:
```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
JWT_SECRET=your-random-secret
```

For **local development** without Turso, omit Turso vars — it falls back to `file:local.db`.

### 3. Initialize database

```bash
npm run db:setup
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Student | student@campus.edu  | password123  |
| Faculty | faculty.cse@campus.edu | password123 |
| HOD     | hod.cse@campus.edu     | password123 |
| Admin   | admin@campus.edu       | password123 |

## User Flows

### Student
1. Login → New Request
2. Type request in plain English (e.g. "I need a bonafide certificate for bank account")
3. Offline RAG matches workflow and guides through required fields
4. Submit → Track status in My Requests

### Faculty
1. Login → Request Queue
2. Review RAG pre-filled details
3. Approve / Reject / Escalate with remarks
4. Student notified automatically

### Admin (Management)
1. Login → Dashboard with metrics
2. Review low-confidence RAG matches
3. Manually reassign to faculty
4. View resolution metrics and bottlenecks

## Razorpay (Test Mode)

1. Create account at [dashboard.razorpay.com](https://dashboard.razorpay.com/)
2. Get Test Mode `Key ID` and `Key Secret`
3. Add to `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=your_secret
   ```
4. Without keys, subscription page runs in **demo mode**

## Deploy to Vercel

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`
4. Deploy — then run `npm run db:setup` locally pointing to Turso to seed production DB

## AI Orchestrator

`src/lib/agent/orchestrator.ts` runs a small multi-agent pipeline for every request:

| Agent | Responsibility | Implementation |
|---|---|---|
| Request Agent | Intent classification + field extraction | Offline TF-IDF RAG (`src/lib/rag/engine.ts`) used as a tool |
| Policy Agent | Eligibility checks (e.g. minimum year of study per workflow) | `checkPolicy()` — rule table, easy to extend per workflow |
| Document Agent | Verifies required supporting documents are attached | Queries the `documents` table for workflows flagged `requiresDocument` |
| Workflow Agent | Department routing + staff assignment | Looks up department staff, same logic previously inline in the requests API |
| Approval Agent | Prepares a recommendation for the human approver | Combines all of the above into Approve / Reject / Needs Review + reason |

The pipeline is fully offline by default. If `GROQ_API_KEY` is set in the environment, the Approval Agent additionally asks Groq to restate its reasoning in a sentence for the reviewer — this is best-effort only and always falls back to the rule-based reason on any error, so the app never depends on external network access to function.

Every request stores its `agentTrace` (the step list), `aiRecommendation`, `aiRecommendationReason`, and `policyEligible` flag, so past decisions remain fully auditable.

### Human-in-the-loop

The AI never auto-approves or auto-rejects a request — it only recommends. A faculty/HOD/admin reviewer sees the recommendation banner and reason alongside the full agent trace, then chooses **Approve**, **Reject**, **Request More Information**, or **Escalate**. All of these are enforced by the explicit state machine in `src/lib/workflow/state-machine.ts`.

## Offline RAG Details

The RAG engine runs entirely locally:
- **Embedding:** TF-IDF vectors computed at seed time
- **Search:** Cosine similarity against workflow template corpus
- **Threshold:** Matches below 35% confidence flagged for admin review
- **Field Extraction:** Regex patterns pull roll number, dates, reason, etc. from natural language
- **Guidance:** Step-by-step workflow instructions returned to student

## Document Handling

- Files are attached from any request's detail view (Student → My Requests, Faculty → Request Queue, Admin → All Requests).
- Allowed types: PDF, JPG, PNG, WEBP. Hard limit: 5 MB, enforced server-side.
- Files are stored base64-encoded in the `documents` table (via Turso/libSQL) rather than on disk, so uploads survive serverless deploys with no extra storage dependency — the natural next step at scale is to move to object storage (S3/R2) and store a pointer instead.
- Access is scoped per request: only the owning student, the currently assigned faculty member, or an admin can list, view, or download a request's documents (`canAccessRequestDocuments` in `src/lib/documents.ts`). Only the uploader or an admin can delete a document.
- Downloads are served with `Cache-Control: private, no-store` since documents may contain personal/academic data.

## Project Structure

```
src/
├── app/
│   ├── api/          # Backend API routes
│   ├── student/      # Student portal
│   ├── faculty/      # Faculty portal
│   ├── admin/        # Management portal
│   └── login/        # Authentication
├── components/       # UI components
└── lib/
    ├── db/           # Drizzle schema & seed
    ├── rag/          # Offline RAG engine
    └── auth.ts       # JWT authentication
```

## License

Built for Swarnandhra College Hackathon 2026.

## Groq AI setup

1. Create a Groq API key at https://console.groq.com/keys.
2. Copy `.env.local.example` to `.env.local`.
3. Set `GROQ_API_KEY` to your key.
4. Keep `GROQ_MODEL=openai/gpt-oss-20b` for the structured request-understanding agent.
5. Start with `npm run dev`.

The Groq integration uses Groq's OpenAI-compatible chat-completions endpoint and strict JSON Schema output. If the key is missing or the API fails, CampusOS automatically falls back to the local TF-IDF RAG pipeline.

## AI Agent mode

CampusOS now has a hybrid agent architecture:

1. **RAG retrieval** finds candidate workflows and SCET knowledge.
2. **Request Agent (LLM)** interprets natural-language intent and extracts only workflow-defined fields.
3. **Field Collector** asks for missing required information.
4. **Policy Agent** deterministically checks eligibility and university rules.
5. **Document Agent** verifies required supporting documents.
6. **Workflow Agent** selects the department and staff/HOD.
7. **Approval Agent** creates a recommendation while keeping a human approval gate.
8. **Execution remains deterministic**: the LLM cannot directly approve, route, modify records, or bypass permissions.

Set `GROQ_API_KEY` to enable the Groq-powered LLM understanding agent. Set `GROQ_MODEL=openai/gpt-oss-20b` for strict structured JSON output. Without it, the existing offline TF-IDF RAG pipeline remains the safe fallback.

Example training/evaluation examples are in `data/agent-training/intents.jsonl`.
