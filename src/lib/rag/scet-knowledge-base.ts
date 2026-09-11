export interface ScetKnowledgeChunk {
  id: string;
  page: number;
  section: string;
  text: string;
}

// Extracted from the supplied SCET Offline RAG Knowledge Base PDF.
// Keep live values such as fees, deadlines, vacancies, marks, and attendance in
// connected institutional systems instead of adding them to this static data.
export const SCET_KNOWLEDGE_BASE: ScetKnowledgeChunk[] = [
  {
    id: "scet-profile",
    page: 2,
    section: "Institutional Profile",
    text: "Swarnandhra College of Engineering and Technology (Autonomous), sponsored by Vasista Educational Society, is located at Seetharampuram, Narsapur, Andhra Pradesh 534280, India. It is permanently affiliated to JNTUK, Kakinada, approved by AICTE, has UGC 2(f) and 12(B) status, NAAC A Grade and NBA accredited programmes. College code: SWRN (AP EAMCET). General email info@swarnandhra.ac.in. Admissions email admissions@swarnandhra.ac.in. Phone +91 93466 10099 / 7989 106 066. Women Helpline 24x7: 9849940898. WhatsApp helpdesk: 9346446880. Website: https://www.swarnandhra.ac.in. The college offers B.Tech, Diploma, BCA, BBA, MCA, MBA and M.Tech programmes."
  },
  {
    id: "scet-portals",
    page: 2,
    section: "Official Portals",
    text: "SCET official systems include the Examination Portal for notifications, timetables and fee notifications; Results Portal at swarnandhraexambranch.com for semester and revaluation results; the college Grievance Redressal Portal; campusattendance and the First-Year Attendance Portal; Swarnandhra LMS at lms.swarnandhra.edu.in; student certificate verification at swarnandhra.directverify.in; antiragging.in plus the college Anti-Ragging Committee and Squad; and Google Workspace webmail for @swarnandhra.ac.in accounts."
  },
  {
    id: "scet-attendance",
    page: 4,
    section: "Attendance, Detention and Condonation",
    text: "For attendance shortage, detention, condonation or readmission, CampusOS checks the authenticated student's attendance, semester, academic status and the JNTUK/SCET regulation for the admission batch, such as R16, R19, R20 or R23. Final eligibility is decided by the class mentor, HOD or Academic Office, never by the AI. Required information includes student ID or hall ticket number, branch, semester, portal attendance percentage, reason and supporting medical documents where applicable. The workflow is attendance validation, document upload, routing to mentor/HOD/Academic Office, authorized review and notification. If no policy match exists, escalate to the Academic Office."
  },
  {
    id: "scet-fees",
    page: 4,
    section: "Fees and Payment Issues",
    text: "Semester fee details must come from the authorized SCET accounts database and official payment gateway. A fee breakup may include tuition, examination, hostel, transport, scholarship adjustment and outstanding balance. Exact fee amounts, due dates, late fees and payment status must not be inferred from this static knowledge base. For a debited-but-unpaid, failed or duplicate payment, collect student ID, transaction reference, date and time, amount, payment method and optional receipt or screenshot, then create a payment-reconciliation ticket for Accounts or Finance. Refunds follow the published Fee Refund Policy. The AI must never collect card or bank details in chat."
  },
  {
    id: "scet-certificates",
    page: 5,
    section: "Certificates and Academic Documents",
    text: "Bonafide, study, conduct, provisional and consolidated marks memo certificates are generally issued by the autonomous college. Transfer or migration certificates may need a JNTUK-linked no-objection step for earlier-regulation students. The student provides purpose and digital or physical delivery preference, uploads required documents, pays an applicable configured fee and obtains clearances from Library, Hostel, Transport, Accounts, the concerned Department and Examination Branch. The request is issued digitally or marked ready for collection from the Examination Branch or Academic Office."
  },
  {
    id: "scet-exams",
    page: 6,
    section: "Examinations, Timetables and Results",
    text: "Exam timetables, hall tickets, exam rooms, regular and supplementary schedules are retrieved from the official SCET Examination Portal for the exact programme, branch, semester, regulation and batch. If no timetable is found for the exact regulation, route the student to the Examination Branch instead of guessing. Results, subject marks, grades, credits, SGPA, CGPA and backlogs come from the authorized Results Portal after authentication and must only be shown to the authenticated student or authorized staff. Missing results, wrong marks and revaluation requests require student ID, semester, subject code, exam details and evidence where applicable, and are routed to the Examination Cell."
  },
  {
    id: "scet-leave-scholarship",
    page: 8,
    section: "Leave and Scholarship",
    text: "Medical or general leave requires leave start and end dates, reason and supporting evidence where applicable, such as a medical certificate. It routes from the student to faculty or class mentor and HOD. Scholarship support checks the authorized scholarship stage, missing documents and pending verification, then routes manual action to the Scholarship Cell or Accounts. Required information is student ID, scholarship scheme and application or reference number."
  },
  {
    id: "scet-library-hostel",
    page: 9,
    section: "Library and Hostel",
    text: "Library queries can check a student's account for due dates, fines, holds and availability when connected to the library system. SCET digital resources include IEEE Xplore, Springer Link, J-Gate Plus, DELNET, N-LIST and NDL. Hostel complaints cover electrical, plumbing, Wi-Fi, room maintenance, sanitation and mess issues and route to the Deputy Warden or maintenance team. Hostel block or room number, issue category and optional photo are useful. Exact library hours, hostel fees, mess charges and current vacancy must be confirmed by the relevant office and must not be guessed."
  },
  {
    id: "scet-safety",
    page: 10,
    section: "Safety, Anti-Ragging and Wellbeing",
    text: "SCET has zero tolerance for ragging. A ragging or safety report must immediately provide antiragging.in, the college Anti-Ragging Committee or Squad, and for women students the 24x7 helpline 9849940898. Create an urgent ticket to the Discipline Office or Principal's Office. Anonymous reporting must remain possible and the AI must not mediate, minimize the issue, promise confidentiality or promise an outcome. For stress, counselling or mental-health concerns, refer immediately to the Meet Your Therapist service or Residential Medical Officer. Do not diagnose, require sensitive details or delay referral; crisis or self-harm indications require immediate professional and campus emergency help."
  },
  {
    id: "scet-placement-admission",
    page: 11,
    section: "Placements and Admissions",
    text: "Placement and training questions can use configured student CGPA and backlog data against a specific drive. Internship NOC and completion-certificate requests require student ID, branch, CGPA, offer or completion proof, company and duration and route to the Training and Placement Cell. Admissions questions identify the programme and route: B.Tech commonly uses AP EAMCET and SCET college code SWRN; MBA, MCA and M.Tech use their relevant admission procedures. Current-year cutoffs, seat matrix and fee structure must be confirmed by Admissions and are not to be guessed."
  },
  {
    id: "scet-faculty-it",
    page: 12,
    section: "Faculty and IT Support",
    text: "Faculty substitute-class requests require faculty ID, department, class or section, date and period; the system checks timetable availability, obtains HOD or coordinator approval, updates the timetable and notifies students. Faculty leave requires leave type, dates, reason, department and configured leave balance, then routes to HOD and Principal's Office when required. For forgotten e-Campus, LMS, Attendance Portal or webmail passwords, first provide configured self-service reset steps; if unsuccessful, create an IT Support ticket. Wi-Fi device registration may require device type and MAC address. Credentials must be shared securely, never posted in chat."
  },
  {
    id: "scet-grievance-transport",
    page: 13,
    section: "Grievance and Transport",
    text: "General non-ragging, non-safety grievances about facilities, faculty feedback or administration may be logged or directed to the official Grievance Redressal Portal. Safety, harassment and ragging use the urgent safety path instead. Transport questions use the published bus route list where available. Bus pass problems, renewals, new passes and route-change requests require student ID, route or stage and the requested change or issue, and route to the Transport Section. The AI must not promise that a new route or stop will be approved."
  },
  {
    id: "scet-academic-services",
    page: 14,
    section: "Academic Services",
    text: "Enrollment-number or JNTUK registration discrepancies require student ID, hall ticket and details of the discrepancy; name and date-of-birth corrections must be verified against original SSC certificates by staff. Internal marks and continuous-assessment discrepancies are owned by course faculty, not the Examination Branch, and require student ID, subject code, semester and discrepancy details. Mentor or class-advisor lookup uses department allocation data. Project-guide changes route to the HOD or Project Coordinator. Migration certificates require no-dues clearance and possible JNTUK coordination; credit-transfer acceptance belongs solely to the receiving university."
  },
  {
    id: "scet-other-services",
    page: 17,
    section: "Student Services",
    text: "Sports bookings and tournament registration route to the Physical Director or Sports Committee. Club and event registration and participation certificates route to the club or event coordinator. Canteen and mess complaints are categorized as quality, hygiene, timing or menu change and route to the Mess Committee or Hostel Office. Health-center appointment requests use the Residential Medical Officer; medical emergencies require immediate in-person help from the warden, security or nearest hospital. Convocation and degree collection require student ID, hall ticket, passing year and no-dues status and route to the Examination Branch. Alumni registration routes to the Alumni Cell."
  },
  {
    id: "scet-rag-rules",
    page: 24,
    section: "Offline RAG Answering Rules",
    text: "The offline agent identifies intent, retrieves matching SCET knowledge, gives a short answer, states documents and conditions, and creates or guides to a request only when staff action is needed. Answers should cite the source document and page or section. Attendance, results and fee ledger values must come from authenticated live APIs or databases and be labeled live data. If no matching content is retrieved, respond exactly: This information is not available in the uploaded college documents. Please contact the appropriate SCET office. Never guess fees, dates, eligibility, committee membership, vacancies, marks or attendance."
  },
];
