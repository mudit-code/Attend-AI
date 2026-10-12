# 📋 AttendAI — Offline-First Smart Attendance & College ERP System

> **Enterprise-grade, offline-first Progressive Web App (PWA) attendance platform and integrated College ERP engineered specifically for institutions and engineering colleges (AKTU aligned).**
> Fast classroom attendance marking (< 1 minute for 60 students), 10-second rotating QR code proxy elimination, IndexedDB offline queuing, background synchronization, automated defaulter email warnings, campus dispensary OPD desk, 4-pillar no-dues clearance, and certified AKTU marksheet generator.

---

## 📑 Table of Contents
1. [Project Overview & Key Innovations](#-project-overview--key-innovations)
2. [Problems Solved & High-Impact Features](#-problems-solved--high-impact-features)
3. [System Architecture (3-Tier Distributed)](#-system-architecture-3-tier-distributed)
4. [Technology Stack](#-technology-stack)
5. [User Roles & Permissions Matrix](#-user-roles--permissions-matrix)
6. [Core Operational Subsystems](#-core-operational-subsystems)
   - [Anti-Proxy 10-Second Rotating QR Code](#1-anti-proxy-10-second-rotating-qr-code)
   - [Offline-First Sync Engine (IndexedDB & Service Worker)](#2-offline-first-sync-engine-indexeddb--service-worker)
   - [Automated Defaulter Warning Email Engine](#3-automated-defaulter-warning-email-engine)
   - [Campus Medical Dispensary & Health Clinic](#4-campus-medical-dispensary--health-clinic)
   - [Official AKTU Semester Marksheet & Transcript Generator](#5-official-aktu-semester-marksheet--transcript-generator)
   - [Digital Fee Payment Receipt & No-Dues Desk](#6-digital-fee-payment-receipt--no-dues-desk)
   - [Quick Academic Utility Dock (Calc & Scratchpad)](#7-quick-academic-utility-dock-calc--scratchpad)
7. [Database Architecture & Data Modeling](#-database-architecture--data-modeling)
8. [Complete REST API Specification](#-complete-rest-api-specification)
9. [Folder Structure](#-folder-structure)
10. [Architecture Documentation Files (Root Folder)](#-architecture-documentation-files-root-folder)
11. [Getting Started & Local Setup](#-getting-started--local-setup)
12. [1-Click Instant Demo Credentials](#-1-click-instant-demo-credentials)
13. [Testing & Quality Verification](#-testing--quality-verification)
14. [Security & Compliance](#-security--compliance)
15. [Deployment Guide](#-deployment-guide)

---

## 🎯 Project Overview & Key Innovations

In traditional colleges and universities, classroom attendance consumes 10–15 minutes of every lecture using paper registers or brittle web apps that crash whenever campus Wi-Fi fluctuates. Furthermore, proxy attendance (scanning QR codes or signing for absent friends), manual tracking of the mandatory 75% AKTU attendance threshold, paper-heavy medical leave validations, and fragmented fee clearances severely degrade institutional efficiency.

**AttendAI** provides a unified, resilient, state-of-the-art solution:
- **Offline-First by Design:** Operates seamlessly even in Wi-Fi dead zones, lecture basements, or during internet disruptions. All reads and writes hit local IndexedDB first with automatic background reconciliation.
- **Fast 3-Tap Flow:** Teachers mark 60 students in under 60 seconds with bulk actions and 1-tap toggles.
- **Anti-Proxy Rotating Dynamic QR:** Encrypted HMAC-SHA256 tokens update every 10 seconds on the projector screen, combined with hardware device fingerprint binding to eliminate proxy scanning.
- **Automated Defaulter Warning Mailer:** Real-time percentage calculations with dynamic threshold sliders (50%–90%), shortage computations, and 1-click batch dispatch of official warning notices to students and parents.
- **Campus Health Clinic & Dispensary:** Integrated OPD consultation logging, pharmacy inventory with reorder threshold alerts, and instant 1-click validation of student medical leaves.
- **Academic Credentials & Finance:** Certified AKTU semester transcript generator and itemized fee payment receipt slips with cryptographic clearance verification.

---

## 💡 Problems Solved & High-Impact Features

| Problem in Traditional Systems | AttendAI Enterprise Solution |
|---|---|
| **Slow Paper Registers** | High-speed 3-tap roster UI; 60 students marked in < 60 seconds. |
| **Proxy & Shared Photos of QR** | 10-second rotating encrypted QR codes + single-device hardware fingerprint binding. |
| **Unreliable College Wi-Fi** | True offline-first architecture; IndexedDB outbox queue + automatic background sync. |
| **End-Semester Defaulter Delays** | Instant < 75% defaulter detection with exact shortage calculation & 1-click batch warning emails. |
| **Fake Medical Certificates** | Campus Dispensary OPD integration cross-checks student health records for instant leave approval. |
| **Manual Exam Clearance Hurdles** | 4-Pillar digital clearance (Accounts, Library, Hostel, Department) unlocking examination hall tickets. |
| **Paper Marksheets & Receipts** | Instant digital AKTU Semester Marksheets (SGPA 8.42) and verified Paid Fee Payment Receipts. |
| **Tampered Attendance Records** | Append-only immutable audit trail + session auto-lock + Proctor/HOD unlock workflow. |

---

## 🏗️ System Architecture (3-Tier Distributed)

```mermaid
graph TD
    subgraph ClientLayer ["Client Presentation Tier (Offline-First PWA)"]
        UI["React 18/19 + TypeScript + Vite"]
        Zustand["Zustand Global State (Auth, Sync, UI)"]
        SW["Service Worker (Workbox PWA Cache)"]
        IDB[("Client Local IndexedDB (Dexie.js)")]
        UI --> Zustand
        UI <--> IDB
        UI --> SW
    end

    subgraph APILayer ["Application & API Gateway Tier (Node.js + Express)"]
        GW["REST API Gateway (Express /api/v1)"]
        AuthMW["JWT Auth & Role Guard Middleware"]
        RateMW["Redis Rate Limiter & Geofence Validator"]
        
        Modules["Modular Subsystems:
        • Auth & Session Module
        • Attendance & 10s QR Engine
        • Communication & Defaulter Mailer
        • Campus Health Clinic / Dispensary
        • Clearance & No-Dues Desk
        • Examination & Internal Marks
        • Academic Structure & Allocations"]
        
        GW --> RateMW --> AuthMW --> Modules
    end

    subgraph DataLayer ["Data & State Persistence Tier"]
        Redis[("Redis Memory Store:
        • 10s QR Ephemeral Tokens (TTL 15s)
        • Active Session Blacklist
        • Rate Limiting Counters")]
        
        Prisma["Prisma ORM (Data Access Layer)"]
        Postgres[("PostgreSQL Database:
        • Users, Faculty, Students
        • Attendance Logs & Rosters
        • Dispensary Visits & Inventory
        • Defaulter Email Logs & Clearances")]
        
        Modules <--> Redis
        Modules <--> Prisma
        Prisma <--> Postgres
    end

    Zustand <== "HTTPS / REST + JWT" ==> GW
    IDB -. "Background Sync Mutation Engine" .-> GW
```

---

## 💻 Technology Stack

### Frontend (PWA)
- **Framework:** React 18/19 + TypeScript (bundled with Vite)
- **Styling:** Vanilla CSS design tokens (custom warm institutional theme, glassmorphic card overlays, responsive micro-animations, touch targets $\ge$ 48px)
- **Offline Storage:** Dexie.js (IndexedDB wrapper) with client-side tables for offline rosters and pending mutations
- **PWA & Caching:** `vite-plugin-pwa` + Workbox with `stale-while-revalidate` and `network-first` strategies
- **State Management:** Zustand (`useAuthStore`, `useSyncStore`)
- **Security:** In-memory JWT access token, PBKDF2 local PIN screen-lock for idle sessions

### Backend (REST API)
- **Runtime & Language:** Node.js (v20+) with TypeScript and ts-node
- **Framework:** Express 5
- **Database ORM:** Prisma Client 6.4 (PostgreSQL 16)
- **In-Memory Cache & Ephemeral Tokens:** Redis 7 (via `ioredis`)
- **Validation:** Zod schemas (request coercion, unknown property stripping)
- **Security Middleware:** `helmet` (strict CSP, HSTS), `cors` (with credentials), `express-rate-limit`
- **Logging:** Structured Winston logger (JSON in production, pretty-printed in development)

---

## 👥 User Roles & Permissions Matrix

| Feature / Module | Student | Teacher | HOD | Admin / Dean | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Mark Attendance (10s Live QR)** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Scan QR / Confirm Attendance** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manual Roster Grading & Overrides**| ❌ | ✅ | ✅ | ✅ | ❌ |
| **Bunk / Attendance Shortage Forecast**| ✅ | ✅ (Class) | ✅ (Dept) | ✅ (College) | ✅ |
| **Download AKTU Semester Marksheet** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Download Official Paid Fee Receipt**| ✅ | ❌ | ❌ | ✅ | ✅ |
| **Defaulter Email Batch Dispatch** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Campus Clinic / Dispensary Desk** | ❌ (View) | ❌ | ❌ | ✅ | ❌ |
| **Medical / Duty Leave Sanctions** | Apply | Endorse | Sanction | Sanction | ❌ |
| **4-Pillar No-Dues Clearance Desk**| View Slip | ❌ | Department | Super Admin | ❌ |
| **Placement Drives Registration** | ✅ | ❌ | ❌ | Manage | ❌ |
| **Anonymous Grievance Filing** | ✅ | ✅ | View Dept | Resolve All | ❌ |
| **Floating Academic Utility Dock** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## ⚙️ Core Operational Subsystems

### 1. Anti-Proxy 10-Second Rotating QR Code
- **HMAC-SHA256 Ephemeral Token:**
  $$\text{Token} = \text{Truncate}\Big(\text{HMAC-SHA256}\big(K_{\text{secret}}, \text{SessionID} \parallel \lfloor t / 10 \rfloor\big), 8\Big)$$
- Token regenerates every 10 seconds on the classroom projector screen. Any photograph or screenshot shared over WhatsApp or Telegram becomes invalid before a proxy can submit it.
- **Hardware Fingerprint Binding:** Binds student attendance submissions to a single persistent device identifier in the session to prevent one student from logging attendance for peers.

### 2. Offline-First Sync Engine (IndexedDB & Service Worker)
- **IndexedDB Roster Cache:** Full student rosters and academic sections are available offline via Dexie.js.
- **Reconciliation Engine (`syncEngine.ts`):** Mutations performed during cellular dropouts are enqueued with client-generated UUIDs and idempotently replayed when connectivity returns.

### 3. Automated Defaulter Warning Email Engine
- Integrated in the Teacher and Admin dashboards.
- Dynamic cutoff slider (50% to 90%) allows instant filtering of students below attendance thresholds.
- Automatically calculates exact shortage: $\text{Shortage} = \lceil 0.75 \times \text{Total Classes} \rceil - \text{Present}$.
- Dispatches institutional AKTU warning emails in batch with an audit trail recorded in `DefaulterEmailLog`.

### 4. Campus Medical Dispensary & Health Clinic
- **Clinical Consultation Ledger:** OPD logs recording roll number, patient name, attending doctor, diagnosis, and prescribed medications.
- **Pharmacy Inventory:** Stock tracking with automated reorder threshold warnings.
- **Emergency Directory:** Quick contact directory for affiliated referral hospitals and ambulance services.
- **1-Click Medical Leave Verification:** Matches student leave requests with OPD logs and attaches a **🏥 Clinic Verified** stamp for immediate administrative approval.

### 5. Official AKTU Semester Marksheet & Transcript Generator
- Displays official semester mark sheets aligned with Dr. A.P.J. Abdul Kalam Technical University guidelines.
- Itemizes course codes, subject titles, credit weightings, sessional internal marks (50), end-semester marks (100), total marks, and grades.
- Calculates Semester SGPA (8.42) with 1-click browser print / PDF export.

### 6. Digital Fee Payment Receipt & No-Dues Desk
- Generates official institutional fee payment slips with breakdown (Tuition, AKTU Exam, High-Performance Lab, IEEE Digital Library, Hostel & Mess).
- Cryptographically verified receipt reference and clear status tag for end-semester admit card release.

### 7. Quick Academic Utility Dock (Calc & Scratchpad)
- Floating bottom-right widget accessible across every screen in AttendAI.
- **Quick Bunk / Target Calculator:** Instant attendance target simulation without leaving current tasks.
- **Scratchpad Memo:** Auto-saving local storage notepad for faculty reminders and student lecture notes.

---

## 🗄️ Database Architecture & Data Modeling

Defined in [`backend/prisma/schema.prisma`](file:///c:/Users/DELL%20PC/Desktop/AttendAI/backend/prisma/schema.prisma) with full relational modeling:

```mermaid
erDiagram
    User ||--o| Student : "has profile"
    User ||--o| Teacher : "has profile"
    User ||--o{ AuditLog : "triggers"
    
    Department ||--o{ Course : "offers"
    Course ||--o{ Section : "divides into"
    Section ||--o{ Student : "enrolled in"
    
    Subject ||--o{ AttendanceSession : "subject of"
    Teacher ||--o{ AttendanceSession : "conducts"
    Section ||--o{ AttendanceSession : "attends"
    
    AttendanceSession ||--o{ AttendanceRecord : "contains"
    Student ||--o{ AttendanceRecord : "marked in"
    
    Student ||--o{ LeaveRequest : "submits"
    Student ||--o{ ClearanceRecord : "cleared by"
    Student ||--o{ DispensaryVisit : "treated in"
    
    MedicineInventory ||--o{ DispensaryVisit : "prescribed in"
    Teacher ||--o{ DefaulterEmailLog : "dispatches"
    Student ||--o{ DefaulterEmailLog : "receives"
```

### Key Entities
1. `users`: Credentials, RBAC roles (`ADMIN`, `TEACHER`, `STUDENT`, `HOD`, `PARENT`), status.
2. `students` & `teachers`: Roll numbers, employee codes, department assignments.
3. `attendance_sessions` & `attendance_records`: Lecture logs, status (`P`, `A`, `L`, `OD`, `LV`), verification method (`DYNAMIC_QR` vs `MANUAL_ROSTER`), device fingerprints.
4. `DispensaryVisit`: Clinic consultations, diagnosis, attending physician, prescribed medications.
5. `MedicineInventory`: Pharmacy stock ledger, units, usage directions, reorder thresholds.
6. `DefaulterEmailLog`: Recipient email, roll number, percentage, delivery status, timestamp.
7. `audit_logs`: Immutable security ledger for create, update, lock, and unlock operations.

---

## 🔌 Complete REST API Specification

All endpoints are mounted under `/api/v1`.

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Credentials authentication; issues JWT access token & HttpOnly refresh cookie |
| `POST` | `/auth/oauth` | Public | Google Workspace OAuth token exchange & user provision |
| `POST` | `/auth/refresh` | Public | Rotates refresh token from HttpOnly cookie |
| `POST` | `/auth/logout` | Public | Revokes refresh token and clears session |

### 2. Offline Synchronization (`/api/v1/sync`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/sync/bootstrap` | Authenticated | Initial dataset load (timetable, sections, subjects, students) |
| `POST` | `/sync/push` | Authenticated | Receives outbox batch (up to 50 items) with item-level status responses |
| `GET` | `/sync/pull?cursor=` | Authenticated | Incremental change stream from server `change_log` |

### 3. Attendance Management (`/api/v1/attendance`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/attendance/sessions` | Teacher, Admin, HOD | Creates or fetches session for section, subject, date, and period |
| `GET` | `/attendance/sessions/:id` | Authenticated | Retrieves session details and student roster |
| `POST` | `/attendance/sessions/:id/records` | Teacher, Admin, HOD | Batch records attendance status |
| `POST` | `/attendance/sessions/:id/unlock` | Admin, HOD | Unlocks locked session with audit justification |

### 4. Anti-Proxy Dynamic QR (`/api/v1/qr`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/qr/token/:sessionId` | Teacher, Admin | Returns current 8-char HMAC token and countdown in 10s window |
| `POST` | `/qr/mark` | Student | Validates token, section membership, and device ID; marks Present |

### 5. Automated Communication & Defaulters (`/api/v1/communication`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/communication/defaulters/send-warning-batch` | Teacher, Admin | Dispatches batch warning emails to students below attendance cutoff |
| `GET` | `/communication/defaulters/logs` | Teacher, Admin | Retrieves historical email dispatch audit records |

### 6. Campus Health Clinic & Dispensary (`/api/v1/dispensary`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/dispensary/consultations` | Admin, Staff | Lists all logged clinic patient visits |
| `POST` | `/dispensary/consultation/log` | Admin, Staff | Logs new patient diagnosis and prescribes medication |
| `GET` | `/dispensary/verify-visit/:rollNo` | Admin, Staff | Checks if a student visited the clinic for medical leave verification |
| `GET` | `/dispensary/stock` | Admin, Staff | Lists medicine inventory and low-stock reorder warnings |
| `GET` | `/dispensary/emergency-directory` | Authenticated | Returns hospital contacts and emergency helpline numbers |

### 7. Leaves, Clearances & Reports
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET/POST` | `/leaves` | Authenticated | Submit or list leave applications (`MEDICAL`, `DUTY`, `CASUAL`) |
| `PATCH` | `/leaves/:id/decision` | Teacher, Admin | Sanction or reject leave with remarks |
| `GET` | `/reports/my-report` | Student | Personal overall & subject-wise percentage and bunk forecast |
| `GET` | `/reports/class?sectionId=` | Teacher, Admin | Aggregate class average, defaulter cards, and student tallies |
| `GET` | `/admin/stats` | Admin, HOD | High-level counts (students, faculty, courses, sessions, defaulters) |

---

## 🗂️ Folder Structure

```
AttendAI/
├── AttendAI_System_Architecture_and_Design_Document.md    # Markdown architecture spec
├── AttendAI_System_Architecture_and_Design_Document.docx  # Microsoft Word document
├── AttendAI_System_Architecture_and_Design_Document.pdf   # Formatted printable PDF
├── docker-compose.yml                                     # PostgreSQL 16 & Redis 7 services
├── start.bat                                              # 1-Click Windows startup launcher
├── README.md                                              # Complete project documentation
│
├── backend/                                               # Node.js + Express 5 + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma                                  # Relational Prisma schema
│   │   └── seed.ts                                        # Idempotent seed script
│   └── src/
│       ├── app.ts                                         # Express application setup
│       ├── index.ts                                       # Server startup & graceful shutdown
│       ├── middlewares/                                   # Auth, RBAC, Validation, Error Handler
│       └── modules/
│           ├── attendance/                                # Sessions & roster handling
│           ├── auth/                                      # Passwords, OAuth, Demo accounts
│           ├── communication/                             # Defaulter batch warning email engine
│           ├── dispensary/                                # Clinic consultations & pharmacy inventory
│           ├── qr/                                        # 10s rotating HMAC token generator
│           └── sync/                                      # Offline bootstrap, push, and pull
│
└── frontend/                                              # React 18/19 + TypeScript + Vite PWA
    ├── index.html                                         # HTML5 entry with PWA manifest
    ├── vite.config.ts                                     # Vite configuration & Workbox PWA
    └── src/
        ├── App.tsx                                        # Router, role guards, floating dock
        ├── index.css                                      # Design tokens & institutional theme
        ├── components/
        │   ├── admin/
        │   │   ├── CampusDispensaryDesk.tsx               # Clinic ledger, pharmacy, emergency
        │   │   ├── ClearanceManager.tsx                   # 4-Pillar digital No-Dues desk
        │   │   └── LeaveApprovalDesk.tsx                  # Leave sanctions + Clinic verification
        │   ├── common/
        │   │   ├── QuickAcademicUtilityDock.tsx           # Floating Calculator & Scratchpad
        │   │   └── UserProfileDrawer.tsx                  # Institutional identity drawer
        │   ├── student/
        │   │   ├── BunkCalculator.tsx                     # Real-time AKTU 75% bunk forecast
        │   │   ├── FeeReceiptModal.tsx                    # Itemized paid fee payment receipt slip
        │   │   ├── StudentMarksheetModal.tsx              # Certified AKTU marksheet card (SGPA 8.42)
        │   │   └── AttendanceLedgerWidget.tsx             # Date-wise class history table
        │   └── teacher/
        │       ├── DefaulterEmailManager.tsx              # Cutoff slider & batch email dispatch
        │       ├── SingleDateAttendanceSnapshot.tsx       # Historical date/period roster inspector
        │       └── TeacherLeaveTab.tsx                    # Faculty leave request suite
        └── pages/
            ├── LoginPage.tsx                              # 1-Click demo accounts & role tabs
            ├── teacher/TeacherDashboard.tsx               # Mark attendance, QR, Marks, Reports
            ├── student/StudentDashboard.tsx               # Overview, QR scan, Marksheet, Receipts
            └── admin/AdminDashboard.tsx                   # Stats, Clinic, Academic setup, Clearances
```

---

## 📑 Architecture Documentation Files (Root Folder)

The complete architectural specifications, system diagrams, and operational workflows have been compiled and exported into three formats in the project root folder:

1. **📄 PDF Document (Ready to print & share):**
   [`AttendAI_System_Architecture_and_Design_Document.pdf`](file:///c:/Users/DELL%20PC/Desktop/AttendAI/AttendAI_System_Architecture_and_Design_Document.pdf)
2. **📝 Word Document (.docx - Formatted):**
   [`AttendAI_System_Architecture_and_Design_Document.docx`](file:///c:/Users/DELL%20PC/Desktop/AttendAI/AttendAI_System_Architecture_and_Design_Document.docx)
3. **📑 Markdown Document (.md - Full Spec):**
   [`AttendAI_System_Architecture_and_Design_Document.md`](file:///c:/Users/DELL%20PC/Desktop/AttendAI/AttendAI_System_Architecture_and_Design_Document.md)

---

## 🚀 Getting Started & Local Setup

### ⚡ 1-Click Windows Launch (Easiest)
Simply double-click the **`start.bat`** script located in the root directory:
```cmd
start.bat
```
This automatically boots PostgreSQL and Redis containers, verifies Prisma bindings, launches the backend and frontend dev servers, and opens `http://localhost:5173` in your browser.

---

### 🛠️ Manual CLI Setup

#### 1. Prerequisites
- **Node.js** (v20+): `node -v`
- **npm** (v10+): `npm -v`
- **Docker Desktop** (for PostgreSQL and Redis): `docker compose version`

#### 2. Start PostgreSQL & Redis Containers
```bash
docker compose up -d
```

#### 3. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
Backend API will be listening on **`http://localhost:4000`** (or port 5000 if configured).

#### 4. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend PWA will be available at **`http://localhost:5173`**.

---

## 👥 1-Click Instant Demo Credentials

AttendAI includes **1-Click Instant Demo Chips** at the top of the login screen (`/login`). You can access all three portals instantly without typing passwords:

| Role | Demo Account | Default Email | Default Password | Access Path |
|---|---|---|---|---|
| **🎓 Student** | Aman Kumar | `student1@attendai.com` | `Student@123` | `/student` |
| **👨‍🏫 Faculty** | Dr. Rajesh Sharma | `teacher1@attendai.com` | `Teacher@123` | `/teacher` |
| **🏛️ Admin / Dean** | Dean Academics | `admin@attendai.com` | `Admin@123` | `/admin` |

---

## 🧪 Testing & Quality Verification

### Run Type Checks and Production Builds
Both packages compile cleanly with zero TypeScript errors:
```bash
# Verify Backend Compilation
cd backend
npm run build

# Verify Frontend Compilation & PWA Assets
cd ../frontend
npm run build
```

### End-to-End Visual Verification
- **Student Dashboard:** View attendance meter, run Bunk Calculator, view AKTU Semester Marksheet, and download Paid Fee Receipt.
- **Teacher Dashboard:** Conduct 10s rotating QR session, view historical single-date rosters, inspect defaulters, and fire batch warning emails.
- **Admin Dashboard:** Access Campus Health Clinic (OPD log & pharmacy inventory), sanction medical leaves with 1-click clinic verification, and manage institutional No-Dues clearances.
- **Universal Floating Dock:** Access quick attendance calculations and auto-saving scratchpad memo anywhere in the application.

---

## 🔒 Security & Compliance

- **Short-Lived JWTs:** In-memory access tokens (15-min lifespan) prevent XSS token harvesting.
- **Single-Use Refresh Tokens:** Rotated inside `HttpOnly`, `SameSite=Strict` cookies.
- **Zero-Trust QR Window:** 10-second TTL prevents screenshot re-use.
- **Append-Only Auditing:** Record modifications and session unlocks generate immutable entries in `audit_logs`.
- **Zod Input Sanitization:** Strict input schemas prevent SQL injection, prototype pollution, and unexpected payload tampering.

---

## 📄 License
This project is licensed under the MIT License.
Designed and engineered for educational excellence by **@aman**.
