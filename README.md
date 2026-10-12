# AttendAI — Offline-First College Attendance System

AttendAI is an enterprise-grade, offline-first PWA attendance management platform engineered specifically for colleges. It provides high-speed classroom attendance marking (< 1 minute for 60 students), rotating QR code proxy elimination, seamless offline synchronization via IndexedDB, and automated defaulter tracking.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Key Capabilities |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | PWA, Workbox offline caching, responsive dark-mode UI |
| **Local Storage** | Dexie (IndexedDB) | 8 stores: users, sections, subjects, timetable, students, outbox, syncMeta, offline_errors |
| **State Management** | Zustand | Real-time connection status & pending sync counter |
| **Backend API** | Node.js + Express 5 + TypeScript | REST API with Zod validation, Helmet security headers, CORS |
| **Database** | PostgreSQL 16 + Prisma ORM | 24 tables with strict referential integrity and audit logs |
| **Cache & Queue** | Redis 7 | Rate limiting, token sessions |
| **Authentication** | JWT (15 min in memory) + Refresh Token (7 days HttpOnly cookie) | PBKDF2 offline PIN fallback |
| **Test Suite** | Vitest | Core logic and mathematical verification |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20+
- [Docker Desktop](https://www.docker.com/) (for PostgreSQL and Redis)

### 2. Start PostgreSQL & Redis
From the project root:
```bash
docker compose up -d
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies (already completed)
npm install

# Generate Prisma Client & Run Migrations
npx prisma generate
npx prisma migrate dev --name init

# Seed Database (Creates Admin, 3 Teachers, 50 Students, Timetable)
npm run db:seed

# Start Development Server (Port 4000)
npm run dev
```

### 4. Frontend Setup
```bash
cd ../frontend

# Install dependencies (already completed)
npm install

# Start Vite Development Server (Port 5173)
npm run dev
```

---

## 👥 Default Seed Credentials

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@attendai.com` | `Admin@123` |
| **Teacher 1** | `teacher1@attendai.com` | `Teacher@123` |
| **Teacher 2** | `teacher2@attendai.com` | `Teacher@123` |
| **Student 1** | `student1@attendai.com` | `Student@123` |

---

## 📱 Role-wise Features

### 👨‍🏫 Teacher Dashboard (`/teacher`)
- **✏️ Mark Attendance**: 3-tap attendance marking (Present, Absent, Late, On Duty, Leave), "Mark All Present" fast action, and offline-first save directly into the Dexie outbox queue.
- **📱 Live Rotating QR Code**: Anti-proxy rotating HMAC tokens (refreshes every 10 seconds) with countdown visualizer.
- **📑 Approvals**: One-click approval/rejection for student Leave applications and Attendance Correction requests.
- **📊 Reports & Defaulters**: Real-time class attendance percentages, defaulter alert box (< 75%), and CSV export.

### 🎓 Student Dashboard (`/student`)
- **📊 Overview**: Circular attendance meter, < 75% red warning banner, subject-wise attendance breakdown and percentage bars.
- **📱 QR Scanner / Code Entry**: Enter rotating 8-character live token with automated device fingerprint binding.
- **📅 Class History**: Complete timeline of classes attended/missed with one-click "Request Fix" for absent records.
- **🏖️ Apply Leave**: Submit leave requests (Medical, Personal, Event, OD) with instant status tracking.

### ⚙️ Admin Dashboard (`/admin`)
- **📈 Stats & Health**: Live counters for total students, faculty, courses, sessions conducted.
- **🏫 Academic Setup**: Manage Departments, Courses, Sections, and Subjects.
- **👥 Bulk Import**: High-speed CSV/JSON student batch import with preview and automated account provisioning.
- **⚖️ Policy Configuration**: Adjust minimum attendance threshold (default 75%), late grace periods, and edit window hours.
- **📜 Audit Logs**: Real-time immutable audit trail of every attendance mark, edit, lock, unlock, and policy update.

---

## 🧪 Testing

Run backend test suite:
```bash
cd backend
npm test
```
Run type-check:
```bash
cd backend
npm run lint
cd ../frontend
npm run build
```
