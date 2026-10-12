# AttendAI: System Architecture, System Design & Workflow Specification

---

## 1. Executive Summary & Core Purpose

**AttendAI** is an offline-first, anti-proxy, web-based College ERP and Intelligent Attendance Management System tailored for engineering colleges (specifically aligned with the **Dr. A.P.J. Abdul Kalam Technical University (AKTU)** framework). 

It solves the dual challenges of conventional ERPs:
1. **Attendance Fraud & Proxy**: Eliminated through **10-second rotating encrypted QR codes**, persistent device fingerprinting, and dynamic token validation.
2. **Network Fragility in Campuses**: Solved via an **Offline-First Progressive Web App (PWA)** architecture backed by **IndexedDB (Dexie.js)** and background mutation replay queues.
3. **Fragmented Campus Operations**: Unified modules for **Attendance, Internal Marks, Automated Defaulter Emailing, Campus Dispensary OPD, No-Dues Clearances, Placement Drives, and Grievance Redressal**.

---

## 2. High-Level System Architecture

AttendAI operates on a modern, decoupled **3-Tier Distributed Architecture** with resilient offline caching:

```mermaid
graph TD
    subgraph ClientLayer ["Client Presentation Tier (Offline-First PWA)"]
        UI["React 18 + TypeScript + Vite"]
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
        • Academic Structure & Allocations
        • Communication & Defaulter Mailer
        • Campus Health Clinic / Dispensary
        • Clearance & No-Dues Desk
        • Examination & Internal Marks"]
        
        GW --> RateMW --> AuthMW --> Modules
    end

    subgraph DataLayer ["Data & State Persistence Tier"]
        Redis[("Redis Memory Store:
        • 10s QR Ephemeral Tokens
        • Active Session Blacklist
        • Rate Limiting Counters")]
        
        Prisma["Prisma ORM (Data Access Layer)"]
        Postgres[("PostgreSQL Database:
        • Users, Roles, Faculty, Students
        • Attendance Logs & Rosters
        • Dispensary Visits & Inventory
        • Marks, Clearances, Grievances")]
        
        Modules <--> Redis
        Modules <--> Prisma
        Prisma <--> Postgres
    end

    Zustand <== "HTTPS / REST + JWT" ==> GW
    IDB -. "Background Sync Mutation Sync Engine" .-> GW
```

---

## 3. Layered Architectural Decomposition

### 3.1. Client Presentation Tier
* **Technology Stack**: React 18/19, TypeScript, Vite, Vanilla CSS design tokens (custom glassmorphic theme with warm institutional accents), Lucide-styled iconography.
* **State Management**: Zustand stores (`useAuthStore`, `useSyncStore`).
* **Local Storage & Persistence**:
  * **Dexie.js (IndexedDB)**: Stores offline rosters, section bootstrap caches, student attendance records, pending mutation replay queue.
  * **LocalStorage**: Scratchpad memo text, user preference flags, persistent device fingerprint ID.
* **PWA Service Worker**: Workbox-powered offline caching of static assets (JS, CSS, SVGs, 3D Hero image).

### 3.2. Application & API Tier
* **Technology Stack**: Node.js, Express, TypeScript, Zod/Joi schema validation.
* **Security & Auth**:
  * Dual-token JWT (Access Token + Refresh Token).
  * Role-Based Access Control (RBAC): `ADMIN`, `TEACHER`, `HOD`, `STUDENT`, `PARENT`.
  * Rate-limiting and CORS isolation.
* **Core Engine Controllers**:
  1. `auth.routes.ts`: Password auth, 1-Click demo accounts, Google OAuth token exchange.
  2. `attendance.routes.ts`: Session lifecycle, manual rosters, QR attendance confirmation.
  3. `qr.routes.ts`: Rotating QR token generator with Redis validation.
  4. `communication/routes.ts`: Defaulter batch warning email dispatcher with delivery auditing.
  5. `dispensary/routes.ts`: Campus clinic OPD visits, pharmacy stock threshold ledger, emergency hospital referrals.
  6. `clearance.routes.ts`: 4-pillar no-dues workflow and admit card unlocking.
  7. `marks.routes.ts`: AKTU Sessional marks entry, grade calculation, and transcript formatting.

### 3.3. Data & Cache Tier
* **PostgreSQL Relational DB**: ACID-compliant persistent store for all institutional records.
* **Prisma ORM**: Type-safe query engine and automated migration management.
* **Redis**: Microsecond in-memory key-value store for:
  * Ephemeral rotating QR session tokens (TTL = 10 seconds).
  * Device fingerprint claim locks (1 student device per session).

---

## 4. Database Schema & Data Modeling

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

    User {
        int id PK
        string email UK
        string name
        string role "ADMIN|TEACHER|STUDENT|HOD|PARENT"
        string passwordHash
        datetime createdAt
    }

    Student {
        int id PK
        int userId FK
        string rollNo UK
        int sectionId FK
        string phone
        string parentPhone
    }

    Teacher {
        int id PK
        int userId FK
        string employeeCode UK
        int departmentId FK
    }

    AttendanceSession {
        string id PK
        int teacherId FK
        int subjectId FK
        int sectionId FK
        date date
        int period
        string qrSecret
        boolean isCompleted
    }

    AttendanceRecord {
        int id PK
        string sessionId FK
        int studentId FK
        string status "P|A|L|OD|LV"
        string method "DYNAMIC_QR|MANUAL_ROSTER"
        string deviceId
        datetime markedAt
    }

    DispensaryVisit {
        int id PK
        string studentRollNo
        string studentName
        string doctorName
        string diagnosis
        string medicinesPrescribed
        datetime visitDate
    }

    MedicineInventory {
        int id PK
        string name UK
        int quantity
        string unit
        string usageDirections
        int reorderThreshold
    }

    DefaulterEmailLog {
        int id PK
        string recipientEmail
        string rollNo
        string subjectCode
        float attendancePercent
        string senderName
        string status "DELIVERED|FAILED"
        datetime createdAt
    }
```

---

## 5. Core Operational Workflows

### 5.1. Anti-Proxy 10-Second Rotating QR Attendance Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as 👨‍🏫 Teacher
    participant Browser_T as Teacher Browser
    participant API as AttendAI Backend
    participant Redis as Redis Cache
    participant Browser_S as Student Browser
    actor Student as 🎓 Student

    Teacher->>Browser_T: Select Subject, Section & Period
    Teacher->>Browser_T: Click "Start QR Session"
    Browser_T->>API: POST /api/v1/attendance/qr/start
    API->>API: Generate Session ID & Secret Seed
    API-->>Browser_T: Session Active

    loop Every 10 Seconds
        Browser_T->>API: GET /api/v1/attendance/qr/token/:sessionId
        API->>API: Compute TOTP Token = HMAC(Seed, Floor(Timestamp / 10s))
        API->>Redis: SETEX qr_token:{token} 15s sessionId
        API-->>Browser_T: { token: "K7X9-P2Q", secondsLeft: 10 }
        Browser_T->>Browser_T: Render Live QR Code on Classroom Projector
    end

    Student->>Browser_S: Point Camera at Screen / Input Token
    Browser_S->>Browser_S: Read Persistent Device Fingerprint
    Browser_S->>API: POST /api/v1/attendance/qr/mark { sessionId, token, deviceId }
    API->>Redis: Check if qr_token:{token} exists & matches sessionId
    alt Token Valid & Within 10s Window
        API->>Redis: Check if deviceId already marked for sessionId
        alt Device Not Re-used
            API->>Redis: SADD session_devices:{sessionId} deviceId
            API->>API: Save AttendanceRecord (Status = 'P', Method = 'DYNAMIC_QR')
            API-->>Browser_S: 200 OK: "Attendance Recorded Successfully!"
        else Device Conflict (Proxy Attempt)
            API-->>Browser_S: 409 Conflict: "Device already used by another student!"
        end
    else Token Expired / Invalid
        API-->>Browser_S: 400 Bad Request: "QR Token Expired. Please scan current code."
    end
```

---

### 5.2. Offline-First Attendance Marking & Sync Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as 👨‍🏫 Faculty in Basement / Offline Lab
    participant UI as Teacher Frontend
    participant Dexie as IndexedDB (Dexie.js)
    participant SyncEngine as Sync Engine (lib/syncEngine.ts)
    participant Server as AttendAI Cloud Server

    Note over Teacher,UI: Network Drops to OFFLINE (Campus Wi-Fi Outage)
    UI->>UI: useSyncStore: isOnline = false
    UI->>Dexie: Fetch Cached Student Roster for CSE-3A
    Dexie-->>UI: Return 60 Students
    Teacher->>UI: Toggle Attendance (P / A / OD)
    Teacher->>UI: Click "Save Attendance"
    UI->>Dexie: Write Attendance Records locally (synced = false)
    UI->>Dexie: Append Mutation payload to Pending Sync Queue
    UI-->>Teacher: Visual Indicator: "Saved to Offline Storage (Sync Pending: 1)"

    Note over UI,Server: Network Restores to ONLINE
    UI->>UI: Window Online Event Fired
    UI->>SyncEngine: runSync() triggered automatically
    SyncEngine->>Dexie: Read Pending Mutations from Queue
    Dexie-->>SyncEngine: Return [Mutation #104: Bulk Attendance CSE-3A]
    SyncEngine->>Server: POST /api/v1/attendance/sessions/bulk-sync
    Server->>Server: Execute Database Transaction (Prisma)
    Server-->>SyncEngine: 200 OK: { syncedCount: 60, status: "COMMITTED" }
    SyncEngine->>Dexie: Mark records as synced = true
    SyncEngine->>Dexie: Remove Mutation #104 from Queue
    SyncEngine->>UI: useSyncStore: pendingCount = 0, status = "UP_TO_DATE"
    UI-->>Teacher: Green Sync Badge: "All Changes Synced to Cloud"
```

---

### 5.3. Defaulter Shortage Calculation & Warning Email Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as 👨‍🏫 Faculty / HOD
    participant TeacherDash as Teacher Reports Tab
    participant CommAPI as /api/v1/communication
    participant Mailer as SMTP / Nodemailer Engine
    participant DB as Postgres (DefaulterEmailLog)
    actor Student as 🎓 Defaulter Student & Parent

    Faculty->>TeacherDash: Open "Class Reports & Defaulters"
    TeacherDash->>TeacherDash: Compute Attendance % for all Students
    TeacherDash->>TeacherDash: Identify Students < 75% Cutoff
    Faculty->>TeacherDash: Adjust Cutoff Slider (e.g. 75%)
    Faculty->>TeacherDash: Click "📧 Send Automated Warning Emails (3 Defaulters)"
    TeacherDash->>CommAPI: POST /communication/defaulters/send-warning-batch
    CommAPI->>CommAPI: Calculate Exact Shortage: Need ceil(0.75 * Total) - Present
    
    loop For each Defaulter
        CommAPI->>Mailer: Generate Official AKTU Debarment Warning Template
        Mailer-->>Student: Deliver Email (Student Inbox + Parent CC)
        CommAPI->>DB: Log Entry in DefaulterEmailLog (RollNo, Shortage, Timestamp, Status)
    end
    
    CommAPI-->>TeacherDash: 200 OK: { sentCount: 3, message: "Emails Dispatched" }
    TeacherDash->>TeacherDash: Append dispatched records to "Email Audit Trail Log"
```

---

### 5.4. Campus Dispensary OPD & Medical Leave Cross-Verification Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Student as 🎓 Sick Student
    actor CMO as 🩺 Campus Doctor (CMO)
    participant ClinicUI as Campus Clinic Desk (Admin)
    participant DispAPI as /api/v1/dispensary
    participant LeaveDesk as Leave Approval Desk (Admin)
    actor Proctor as 🏛️ Proctor / Dean

    Student->>CMO: Visits Health Center (Fever / Injury)
    CMO->>ClinicUI: Enter Roll No, Diagnosis, Prescribe Meds
    ClinicUI->>DispAPI: POST /dispensary/consultation/log
    DispAPI->>DispAPI: Save DispensaryVisit Record
    DispAPI->>DispAPI: Deduct Prescribed Medicines from MedicineInventory
    DispAPI-->>ClinicUI: Consultation Logged & Verified

    Note over Student,LeaveDesk: Student applies for Medical Leave via Student Dashboard
    Student->>LeaveDesk: Submit Medical Leave Application (Dates + Reason)
    Proctor->>LeaveDesk: Reviews Pending Student Leaves
    LeaveDesk->>DispAPI: GET /dispensary/verify-visit/:rollNo
    DispAPI-->>LeaveDesk: Return Matching Clinic Consultation Found!
    LeaveDesk->>LeaveDesk: Render "🏥 Clinic Verified" Badge
    Proctor->>LeaveDesk: Click "🏥 Clinic Verify" 1-Click Action
    LeaveDesk->>LeaveDesk: Prefill Remarks: "Verified with Campus Dispensary OPD log"
    Proctor->>LeaveDesk: Sanction Approved
    LeaveDesk-->>Student: Leave Status = APPROVED (No penalty on attendance)
```

---

### 5.5. 4-Pillar Digital No-Dues & Examination Hall Ticket Workflow

```mermaid
graph TD
    Start(["Student Eligible for End-Semester Exam"]) --> PillarCheck{"4-Pillar Clearance Desk"}
    
    PillarCheck --> P1["1. Finance & Accounts:<br/>Tuition & Exam Fees Fully Paid?"]
    PillarCheck --> P2["2. Central Library:<br/>All Books Returned & Zero Overdue Fines?"]
    PillarCheck --> P3["3. Hostel & Mess Office:<br/>Maintenance & Mess Bill Cleared?"]
    PillarCheck --> P4["4. Academic Department:<br/>Lab Equipment Returned & Attendance >= 75%?"]
    
    P1 -- Yes --> C1["Accounts Cleared ✓"]
    P2 -- Yes --> C2["Library Cleared ✓"]
    P3 -- Yes --> C3["Hostel Cleared ✓"]
    P4 -- Yes --> C4["Academic Cleared ✓"]

    P1 -- No --> Def1["Pay Dues / Download Fee Receipt Slip"]
    P4 -- No (<75%) --> Def2["Attend Makeup Lectures / Submit Medical Proof"]

    C1 & C2 & C3 & C4 --> AllClear{"All 4 Pillars Cleared?"}
    
    AllClear -- YES --> AdmitCard["🎓 Unlock AKTU Admit Card / Hall Ticket"]
    AdmitCard --> PrintTranscript["📄 Generate Official Semester Marksheet & Transcript Slip"]
    
    AllClear -- NO --> Debarred["⛔ System Lock: Debarred from Exam Hall Ticket"]
```

---

## 6. Role-Based Access Control (RBAC) Matrix

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

## 7. Security, Integrity & Performance Specifications

1. **Proxy Prevention (Zero-Trust Model)**:
   - Dynamic 10-second token rotation ensures photos or screenshots transmitted across WhatsApp/Telegram expire before a remote student can type or scan them.
   - Device fingerprint hash (`localStorage` + browser characteristics) prevents a single student from logging in for multiple peers on the same phone.
2. **Resilience to Network Failures**:
   - IndexedDB handles full offline attendance marking when teacher enters shielded lecture halls or basements with zero cellular signal.
   - PWA Service Worker precaches the application shell for instant 0ms reload.
3. **Auditability & Traceability**:
   - Every single status change, leave sanction, marks submission, and defaulter email is immutably timestamped in the PostgreSQL database with the author's user ID and role.
4. **Data Privacy**:
   - Medical consultation records and grievance disclosures adhere to institutional privacy guidelines, accessible exclusively to authorized Chief Medical Officers and administrative proctors.
