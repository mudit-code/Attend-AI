# 📋 AttendAI — Offline-First College Attendance System

> **Enterprise-grade, offline-first Progressive Web App (PWA) attendance platform engineered specifically for colleges and universities.**
> Fast classroom attendance marking (< 1 minute for 60 students), rotating QR code proxy elimination, IndexedDB offline queuing, background synchronization, and automatic 75% defaulter detection.

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Problems Solved & Key Highlights](#-problems-solved--key-highlights)
3. [System Architecture](#-system-architecture)
4. [Technology Stack](#-technology-stack)
5. [User Roles & Permissions](#-user-roles--permissions)
6. [Offline-First Sync Engine Protocol](#-offline-first-sync-engine-protocol)
7. [Anti-Proxy Rotating QR Attendance](#-anti-proxy-rotating-qr-attendance)
8. [Database Architecture (24 Tables)](#-database-architecture-24-tables)
9. [Complete REST API Specification](#-complete-rest-api-specification)
10. [Folder Structure](#-folder-structure)
11. [Getting Started & Local Setup](#-getting-started--local-setup)
12. [Default Seed Credentials](#-default-seed-credentials)
13. [Testing & Quality Verification](#-testing--quality-verification)
14. [Security & Compliance](#-security--compliance)
15. [Deployment Guide](#-deployment-guide)

---

## 🎯 Project Overview

In most colleges and institutions, attendance taking consumes 10–15 minutes of every lecture using paper registers or unreliable web apps that stall when campus Wi-Fi or cellular networks fluctuate. Additionally, proxy attendance (signing or scanning on behalf of friends) compromises institutional credibility, while manual calculation of mandatory 75% attendance criteria takes weeks at the end of each semester.

**AttendAI** solves these challenges end-to-end:
- **Offline-First by Design:** Works smoothly even in dead zones or during complete internet outages. All operations read and write to local IndexedDB first.
- **Fast 3-Tap Flow:** Teachers can mark 60 students in less than 60 seconds with bulk actions and 1-tap toggles.
- **Zero-Proxy QR Attendance:** Displays rotating HMAC-SHA256 tokens that refresh every 10 seconds, coupled with device hardware fingerprint binding.
- **Instant Defaulter Alerts:** Real-time percentage calculation `(P + OD [+LV]) / Total * 100` with warning thresholds, exportable reports, and parent notifications.

---

## 💡 Problems Solved & Key Highlights

| Problem in Traditional Systems | AttendAI Solution |
|---|---|
| **Slow Paper Registers** | High-speed 3-tap roster UI; 60 students marked in < 60 seconds |
| **Proxy Attendance** | 10-second rotating QR codes + strict device binding + geofencing |
| **Unreliable College Wi-Fi** | True offline-first architecture; IndexedDB outbox queue + automatic background sync |
| **End-Semester Defaulter Delays** | Instant < 75% defaulter list with shortage calculations and 1-click CSV export |
| **Tampered Attendance Records** | Append-only immutable audit log + edit window auto-lock + HOD/Admin unlock workflow |
| **Manual Leave Reconciliation** | Online leave application + automatic status update (`LV`/`OD`) upon teacher approval |
| **Device Sharing / Proxy Scans** | First-device auto-binding; account locked to approved hardware fingerprint |

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client Layer [PWA Client — React 19 + TypeScript]
        UI[User Interface & Dashboards]
        DexieDB[(Local Dexie IndexedDB)]
        OutboxQueue[Outbox Mutation Queue]
        SyncEngine[Background Sync Engine]
        SW[Workbox Service Worker]
    end

    subgraph Transport Layer [Network & Security]
        HTTPS[TLS / HTTPS]
        Headers[Helmet CSP + HSTS]
        RateLimit[Express Rate Limiter]
    end

    subgraph Server Layer [Backend API — Node.js + Express 5]
        AuthMod[Auth & RBAC Module]
        AttendMod[Attendance Engine]
        SyncMod[Sync Module - Push/Pull]
        QRMod[HMAC QR Rotation Engine]
        LeaveMod[Leave & Correction Workflows]
        ReportMod[Reports & Defaulter Engine]
    end

    subgraph Data Layer [PostgreSQL 16 & Redis 7]
        PrismaORM[Prisma ORM Client]
        Postgres[(PostgreSQL 16 DB - 24 Tables)]
        AuditLog[(Append-Only Audit Log)]
        RedisCache[(Redis Cache & Rate Limit)]
    end

    UI -->|Reads & Writes| DexieDB
    UI -->|Enqueues offline actions| OutboxQueue
    OutboxQueue -->|Triggers on reconnect| SyncEngine
    SyncEngine -->|Batch Push / Cursor Pull| HTTPS
    HTTPS --> Headers --> RateLimit
    RateLimit --> AuthMod
    AuthMod --> AttendMod & SyncMod & QRMod & LeaveMod & ReportMod
    AttendMod & SyncMod & LeaveMod --> PrismaORM
    PrismaORM --> Postgres
    AttendMod & LeaveMod --> AuditLog
    QRMod & RateLimit --> RedisCache
```

---

## 💻 Technology Stack

### Frontend (PWA)
- **Framework:** React 19 + TypeScript (bundled with Vite)
- **Styling:** Vanilla CSS design tokens (custom dark mode, glassmorphism, responsive micro-animations, touch targets $\ge$ 48px)
- **Offline Storage:** Dexie.js (IndexedDB wrapper) with 8 localized tables
- **PWA / Service Worker:** `vite-plugin-pwa` + Workbox with `stale-while-revalidate` and `network-first` caching
- **State Management:** Zustand (in-memory auth session, connection state, pending outbox sync counter)
- **Security:** In-memory JWT access token, PBKDF2 local PIN screen-lock for idle sessions

### Backend (REST API)
- **Runtime:** Node.js (v20+) with TypeScript and ts-node
- **Framework:** Express 5
- **Database ORM:** Prisma Client 6.4 (PostgreSQL 16)
- **Caching & Sessions:** Redis 7 (via `ioredis`)
- **Validation:** Zod schemas (request coercion, unknown property stripping)
- **Security Middleware:** `helmet` (strict CSP, HSTS), `cors` (with credentials), `express-rate-limit`
- **Logging:** Structured Winston logger (JSON in production, pretty-printed in development)

---

## 👥 User Roles & Permissions

| Role | Access Level & Core Capabilities |
|---|---|
| **System Admin** | Full institutional configuration, academic structure creation (departments, courses, sections, subjects), bulk student imports, policy rule configuration, and audit logs. |
| **Teacher** | 3-tap attendance marking, live 10s rotating QR code generator, leave application approvals, attendance correction approvals, and section report generation. |
| **Student** | Personal dashboard with overall & subject-wise attendance %, 10s live QR code submission, class history timeline, attendance correction requests, and leave application. |
| **Parent** | Student attendance summary, absence history, and daily digest alerts (login via phone / OTP). |
| **HOD (Head of Dept)** | Department overview, defaulter monitoring, class conflict resolution, substitute teacher assignments, and emergency session unlock approvals. |

---

## 📡 Offline-First Sync Engine Protocol

### Architectural Principle
> **The UI always interacts with local IndexedDB first.** UI responsiveness never waits on the network. Synchronization runs as an asynchronous, isolated background process.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher (App)
    participant Dexie as Local Dexie (IndexedDB)
    participant Outbox as Outbox Queue
    participant Sync as Background Sync Engine
    participant Server as AttendAI Server
    participant DB as PostgreSQL 16

    Teacher->>Dexie: 1. Mark Attendance (Present / Absent / Late)
    Dexie-->>Teacher: Instant UI update (< 50ms)
    Teacher->>Outbox: 2. Enqueue mutation with client UUID v4
    Note over Outbox: Status: 'pending', attempts: 0

    alt Online / Network Reconnected
        Sync->>Outbox: 3. Fetch pending batch (max 50 items)
        Sync->>Server: 4. POST /api/v1/sync/push { batchId, items }
        Server->>DB: 5. Execute item-level upserts + duplicate check
        DB-->>Server: Applied
        Server-->>Sync: 6. Response: { results: [{ id, status: 'accepted' }] }
        Sync->>Outbox: 7. Delete accepted items; update badge counter
        Sync->>Server: 8. GET /api/v1/sync/pull?cursor=lastChangeSeq
        Server-->>Sync: 9. Returns incremental server changes
        Sync->>Dexie: 10. Update local tables & save new cursor
    else Offline (No Internet / Airplane Mode)
        Note over Teacher,Outbox: Data safe in IndexedDB; Sync badge displays '⏳ N pending'
    end
```

### 7 Critical Sync Test Scenarios
1. **Airplane Mode:** Mark 3 classes offline $\rightarrow$ reconnect $\rightarrow$ all 3 sync automatically $\rightarrow$ pending badge returns to 0.
2. **Server Failure (500) during Push:** Exponential backoff retry (2s, 4s, 8s... max 5min with jitter) without data loss.
3. **Duplicate Batch:** Idempotent design guarantees duplicate pushes produce `status: 'duplicate'` without altering existing data.
4. **Edit Window Expiry:** Pushing after session lock results in `status: 'rejected'` with a descriptive reason.
5. **Session Conflicts:** Overlapping periods from multiple teachers trigger an `attendance_conflicts` entry for HOD review.
6. **Token Expiration Offline:** Refresh token rotates automatically on reconnect; if credentials expire, outbox remains safely stored until re-login.
7. **Storage Persistence:** Requests `navigator.storage.persist()` on launch to prevent browser eviction.

---

## 📱 Anti-Proxy Rotating QR Attendance

Proxy attendance (students sharing screenshots of QR codes to friends outside class) is eliminated through a multi-factor cryptographic design:

1. **HMAC-SHA256 10-Second Time Window:**
   $$\text{Token} = \text{Truncate}\Big(\text{HMAC-SHA256}\big(K_{\text{secret}}, \text{SessionID} \parallel \lfloor t / 10 \rfloor\big), 8\Big)$$
   The code updates on the teacher's screen every 10 seconds. Screenshots sent via chat apps expire before recipients can submit.
2. **Device Hardware Fingerprinting:**
   On first scan, the student's device fingerprint is bound to their student ID in the `devices` table. Scans from any other device are rejected with `DEVICE_MISMATCH`.
3. **Section Membership Verification:**
   The server checks that the scanning student belongs to the section assigned to that session.
4. **Network Grace Tolerance:**
   Validates against current window and immediate previous window ($t - 1$) to allow for natural cellular latency without sacrificing security.

---

## 🗄️ Database Architecture (24 Tables)

The database schema is defined in [schema.prisma](file:///c:/Users/DELL%20PC/Desktop/AttendAI/backend/prisma/schema.prisma) with 24 relational tables:

```mermaid
erDiagram
    AcademicYear ||--o{ Department : has
    AcademicYear ||--o{ Course : has
    AcademicYear ||--o{ Section : has
    AcademicYear ||--o{ TimetableSlot : defines
    Department ||--o{ Course : contains
    Department ||--o{ Teacher : employs
    Course ||--o{ Section : partitions
    Section ||--o{ Student : enrolls
    Section ||--o{ TimetableSlot : schedules
    Section ||--o{ AttendanceSession : conducts
    User ||--o| Teacher : profiles
    User ||--o| Student : profiles
    User ||--o| Parent : profiles
    User ||--o{ Device : registers
    User ||--o{ AuditLog : audits
    User ||--o{ RefreshToken : authenticates
    Teacher ||--o{ TeacherSubject : allocated
    Teacher ||--o{ AttendanceSession : takes
    Subject ||--o{ TeacherSubject : taught
    Subject ||--o{ AttendanceSession : subject
    AttendanceSession ||--o{ AttendanceRecord : records
    AttendanceSession ||--o{ AttendanceConflict : conflicts
    AttendanceSession ||--o{ CorrectionRequest : fixes
    Student ||--o{ AttendanceRecord : has
    Student ||--o{ LeaveRequest : submits
    Student ||--o{ CorrectionRequest : requests
    Student ||--o{ AttendanceSummary : aggregates
```

### Table Summary
1. `academic_years`: Tracks academic rollover periods (e.g., "2026-27").
2. `users`: Core credentials, roles (`ADMIN`, `TEACHER`, `STUDENT`, `PARENT`, `HOD`), and status.
3. `refresh_tokens`: Cryptographic hash of refresh tokens with 7-day rotation.
4. `departments`: Institutional departments with assigned HODs.
5. `courses`: Degree programs (e.g., "BCA", "B.Tech").
6. `sections`: Cohorts (e.g., "3rd Year A").
7. `teachers`: Faculty employee codes, department links, class teacher flags.
8. `students`: Unique university roll numbers, section enrollments.
9. `parents`: Parent-student mappings for OTP communication.
10. `subjects`: Subject names and codes (e.g., "Data Structures - CS301").
11. `teacher_subjects`: Allocation matrix mapping faculty to subjects and sections.
12. `timetable_slots`: Weekly class schedules with clash protection.
13. `holidays`: College, national, and exam calendar dates.
14. `attendance_sessions`: Individual lecture sessions with lock flags.
15. `attendance_records`: Student attendance records (`P`, `A`, `L`, `LV`, `OD`).
16. `attendance_conflicts`: Overlap logs when multiple faculty claim the same period.
17. `attendance_summary`: Monthly pre-aggregated counters for sub-second dashboard performance.
18. `attendance_rules`: Policy rules (min %, late grace period, auto-lock hours).
19. `leave_requests`: Student leave submissions with status (`PENDING`, `APPROVED`, `REJECTED`).
20. `correction_requests`: Student attendance rectification workflows.
21. `change_log`: Monotonic `changeSeq` stream for incremental pull sync.
22. `devices`: Bound client hardware IDs and web push tokens.
23. `notifications`: SMS, email, and push dispatch logs.
24. `audit_logs`: Append-only immutable log of every create, update, lock, and unlock.

---

## 🔌 Complete REST API Specification

All endpoints are prefixed with `/api/v1`.

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticates credentials; returns user & access token; sets HttpOnly refresh cookie |
| `POST` | `/auth/refresh` | Public | Rotates refresh token from HttpOnly cookie; returns new access token |
| `POST` | `/auth/logout` | Public | Revokes refresh token and clears cookie |
| `POST` | `/auth/otp/send` | Public | Generates and sends OTP for parent login |
| `POST` | `/auth/otp/verify` | Public | Validates OTP and issues parent session |

### 2. Offline Synchronization (`/api/v1/sync`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/sync/bootstrap` | Authenticated | Fetches full initial dataset (academic year, timetable, sections, subjects, students, rules) |
| `POST` | `/sync/push` | Authenticated | Receives outbox batch (up to 50 items) with item-level status responses |
| `GET` | `/sync/pull?cursor=` | Authenticated | Returns incremental changes after `cursor` from `change_log` |

### 3. Attendance Management (`/api/v1/attendance`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/attendance/sessions` | Teacher, Admin, HOD | Creates or retrieves session for section, subject, date, and period |
| `GET` | `/attendance/sessions/:id` | Authenticated | Retrieves session details, student list, and marked records |
| `POST` | `/attendance/sessions/:id/records` | Teacher, Admin, HOD | Batch marks or updates attendance records in a session |
| `PATCH`| `/attendance/records/:id` | Teacher, Admin, HOD | Updates single student record with audit log tracking |
| `POST` | `/attendance/sessions/:id/unlock` | Admin, HOD | Unlocks locked session with required audit reason |
| `GET` | `/attendance/my-sessions` | Teacher | Retrieves recent sessions conducted by the logged-in teacher |

### 4. Anti-Proxy QR System (`/api/v1/qr`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/qr/token/:sessionId` | Teacher, Admin | Generates current 8-char HMAC token and seconds remaining in 10s window |
| `POST` | `/qr/mark` | Student | Validates token, student section, and bound device; marks student Present |

### 5. Leave & Correction Workflows
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/leaves` | Authenticated | Lists leave applications (filtered by status or user) |
| `POST` | `/leaves` | Student | Submits new leave application (`MEDICAL`, `PERSONAL`, `EVENT`, `OD`) |
| `PATCH`| `/leaves/:id/decision` | Teacher, HOD, Admin | Approves/rejects leave; updates attendance records to `LV`/`OD` |
| `GET` | `/correction-requests` | Authenticated | Lists attendance correction requests |
| `POST` | `/correction-requests` | Student | Requests correction for an absent record with justification |
| `PATCH`| `/correction-requests/:id/decision` | Teacher, HOD, Admin | Approves/rejects correction; adjusts record status |

### 6. Reports & Defaulters (`/api/v1/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/reports/student/:id` | Authorized | Full attendance analysis, subject breakdown, and calendar history |
| `GET` | `/reports/my-report` | Student | Retrieves personal report for the logged-in student |
| `GET` | `/reports/class?sectionId=` | Teacher, HOD, Admin | Class-wide attendance summary, average %, and individual tallies |
| `GET` | `/reports/defaulters?minPercent=`| Teacher, HOD, Admin | Lists students below threshold with shortage calculations |
| `GET` | `/reports/export?sectionId=` | Teacher, HOD, Admin | Generates and downloads downloadable CSV report |

### 7. Academic & User Administration
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET/POST` | `/academic/departments` | Admin, Teacher | Lists or adds departments |
| `GET/POST` | `/academic/courses` | Admin, Teacher | Lists or adds degree courses |
| `GET/POST` | `/academic/sections` | Admin, Teacher | Lists or adds class sections |
| `GET/POST` | `/academic/subjects` | Admin, Teacher | Lists or adds subjects |
| `GET/POST` | `/academic/timetable` | Admin, Teacher | Lists or creates timetable slots with clash checking |
| `GET/POST` | `/academic/holidays` | Admin, Teacher | Lists or creates college/exam holidays |
| `GET/POST` | `/users/students` | Admin, Teacher | Lists or provisions student profiles |
| `POST` | `/users/students/bulk` | Admin | High-speed CSV batch import of students |
| `GET/POST` | `/users/teachers` | Admin | Lists or provisions faculty profiles |
| `GET/PUT` | `/admin/rules` | Admin | Retrieves or updates policy rules |
| `GET` | `/admin/audit-logs` | Admin, HOD | Streams append-only system audit log |
| `GET` | `/admin/stats` | Admin, HOD | Real-time counts (students, faculty, courses, sessions) |
| `GET` | `/health` | Public | Server uptime and health check |

---

## 🗂️ Folder Structure

```
AttendAI/
├── docker-compose.yml              # Local PostgreSQL 16 + Redis 7 services
├── README.md                       # Comprehensive system documentation
├── .gitignore                      # Git exclusion rules
│
├── backend/                        # Node.js + Express 5 + TypeScript API
│   ├── .env.example                # Environment variables template
│   ├── package.json                # Dependencies and scripts
│   ├── tsconfig.json               # TypeScript compiler configuration
│   ├── prisma/
│   │   ├── schema.prisma           # 24-table Prisma schema
│   │   └── seed.ts                 # Idempotent database seed script
│   └── src/
│       ├── app.ts                  # Express application setup
│       ├── index.ts                # Server startup & graceful shutdown
│       ├── config/env.ts           # Zod-validated environment config
│       ├── lib/
│       │   ├── prisma.ts           # Prisma Client singleton
│       │   ├── redis.ts            # Redis connection manager
│       │   └── logger.ts           # Winston logger instance
│       ├── middlewares/
│       │   ├── auth.ts             # JWT authentication & user check
│       │   ├── role.ts             # Role-based access control (RBAC)
│       │   ├── validate.ts         # Zod schema request validation
│       │   └── errorHandler.ts     # Global safe error handler
│       ├── modules/
│       │   ├── academic/           # Departments, courses, sections, timetable
│       │   ├── admin/              # Rules, stats, audit logs
│       │   ├── attendance/         # Sessions, records, locks, unlocks
│       │   ├── auth/               # Login, refresh token, OTP
│       │   ├── correction/         # Attendance correction requests
│       │   ├── leave/              # Leave applications & approval
│       │   ├── qr/                 # Rotating HMAC token generation & validation
│       │   ├── reports/            # Attendance percentage, defaulters, CSV
│       │   ├── sync/               # Offline bootstrap, push, pull
│       │   └── users/              # Student/Teacher management, bulk import
│       └── __tests__/
│           └── app.test.ts         # Vitest test suite for core logic
│
└── frontend/                       # React 19 + TypeScript + Vite PWA
    ├── index.html                  # HTML5 entry with PWA meta tags
    ├── vite.config.ts              # Vite config with Workbox PWA plugin
    ├── package.json                # Dependencies and scripts
    └── src/
        ├── App.tsx                 # App router, role guards, update listener
        ├── index.css               # Design system, CSS tokens, dark mode
        ├── main.tsx                # Application mounting point
        ├── vite-env.d.ts           # PWA virtual module type definitions
        ├── components/
        │   ├── SyncBadge.tsx       # Real-time online/offline & pending counter
        │   └── UpdateBanner.tsx    # PWA service worker update prompt
        ├── hooks/
        │   └── useIdleTimeout.ts   # 30-min inactivity PIN screen lock
        ├── lib/
        │   ├── api.ts              # Axios instance with credentials
        │   ├── db.ts               # Dexie IndexedDB local database (8 tables)
        │   ├── syncEngine.ts       # Push/pull synchronization engine
        │   └── errorLogger.ts      # Offline error logger
        ├── stores/
        │   ├── useAuthStore.ts     # In-memory JWT & user state
        │   └── useSyncStore.ts     # Sync progress & connection state
        └── pages/
            ├── LoginPage.tsx       # Role-aware login with tabbed switcher
            ├── LockScreen.tsx      # Offline PIN unlock screen
            ├── teacher/
            │   └── TeacherDashboard.tsx # Mark attendance, QR, Approvals, Reports
            ├── student/
            │   └── StudentDashboard.tsx # Overview, QR scan, History, Leaves
            └── admin/
                └── AdminDashboard.tsx   # Stats, Academic, Bulk Import, Rules, Audit
```

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
- **Node.js** (v20 or newer): `node -v`
- **npm** (v10 or newer): `npm -v`
- **Docker Desktop** (for local PostgreSQL and Redis): `docker compose version`

### 2. Start PostgreSQL & Redis
In the root directory, launch the database and cache containers:
```bash
docker compose up -d
```
Verify they are running:
```bash
docker compose ps
```

### 3. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```
Copy the environment variables template:
```bash
cp .env.example .env
```
Generate the Prisma Client:
```bash
npx prisma generate
```
Deploy the database migrations:
```bash
npx prisma migrate dev --name init
```
Seed the database with sample data (Admin, Teachers, Students, Timetable):
```bash
npm run db:seed
```
Start the backend development server:
```bash
npm run dev
```
The backend API will be available at: **`http://localhost:4000`** (Health check: `http://localhost:4000/health`).

### 4. Frontend Setup
Open a new terminal and navigate to the `frontend` directory:
```bash
cd frontend
```
Start the Vite development server:
```bash
npm run dev
```
The frontend PWA will be available at: **`http://localhost:5173`**.

---

## 👥 Default Seed Credentials

All seed accounts are pre-configured by running `npm run db:seed`:

| Role | Email | Password | Access Path |
|---|---|---|---|
| **System Admin** | `admin@attendai.com` | `Admin@123` | `/admin` |
| **Faculty 1** | `teacher1@attendai.com` | `Teacher@123` | `/teacher` |
| **Faculty 2** | `teacher2@attendai.com` | `Teacher@123` | `/teacher` |
| **Faculty 3** | `teacher3@attendai.com` | `Teacher@123` | `/teacher` |
| **Student 1** | `student1@attendai.com` | `Student@123` | `/student` |
| **Student 2** | `student2@attendai.com` | `Student@123` | `/student` |
| **Student 50**| `student50@attendai.com`| `Student@123` | `/student` |

---

## 🧪 Testing & Quality Verification

### Run Backend Unit Tests
Execute the Vitest test suite covering percentage formulas, rotating HMAC tokens, and outbox idempotency:
```bash
cd backend
npm test
```
*Result: 8 passing tests.*

### Static Type Checks
Verify that TypeScript produces zero errors:
```bash
# Backend Type Check
cd backend
npm run lint

# Frontend Type Check & Build
cd ../frontend
npm run build
```

### End-to-End Offline Simulation Walkthrough
1. Log in as **Teacher** (`teacher1@attendai.com` / `Teacher@123`).
2. Open Chrome DevTools $\rightarrow$ **Network** tab $\rightarrow$ select **Offline** (or enable Airplane Mode).
3. Notice the header badge immediately turns **🔴 Offline**.
4. Go to **✏️ Mark Attendance**, change attendance statuses for several students, and click **💾 Save Attendance**.
5. Observe the message: *"⚡ Saved locally! Will auto-sync when internet reconnects."* and the header counter updates to **"⏳ N pending"**.
6. Switch Network back to **Online**.
7. The sync engine automatically fires, pushes the batch to `/api/v1/sync/push`, clears the outbox, and the badge turns **✓ Synced**.

---

## 🔒 Security & Compliance

- **Token Security:** Short-lived JWT access tokens (15 minutes) kept strictly in memory (Zustand store), preventing XSS token harvesting.
- **Refresh Token Rotation:** Refresh tokens stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies with automatic single-use rotation.
- **PIN Screen Lock:** Local PBKDF2 hash enables rapid re-entry without re-transmitting passwords across public Wi-Fi.
- **Immutable Audit Logging:** Changes to attendance records, session locks, and policies are saved to the append-only `audit_logs` table.
- **Input Sanitization:** All incoming requests are validated against strict Zod schemas, stripping unexpected fields.

---

## 🌐 Deployment Guide

### Recommended Starter Architecture
| Component | Provider (Free / Starter Tiers) | Configuration |
|---|---|---|
| **Frontend PWA** | Vercel / Netlify / Cloudflare Pages | Root directory: `frontend`, Build command: `npm run build`, Output: `dist` |
| **Backend API** | Render / Railway / Fly.io | Dockerized Node.js service running on port 4000 |
| **PostgreSQL** | Neon / Supabase | Serverless PostgreSQL 16 database |
| **Redis** | Upstash Redis | Managed serverless Redis for sessions and rate limiting |

### Production Environment Variables (`backend/.env`)
```env
NODE_ENV=production
PORT=4000
APP_VERSION=1.0.0
DATABASE_URL=postgresql://user:password@neon.tech/attendai?sslmode=require
JWT_SECRET=super-secure-production-secret-min-32-chars-long
JWT_REFRESH_SECRET=super-secure-production-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
REDIS_URL=rediss://default:password@upstash.io:6379
FRONTEND_URL=https://attendai.yourcollege.edu
```

---

## 📄 License
This project is licensed under the MIT License.
Designed and engineered for educational institutions by **@aman**.
