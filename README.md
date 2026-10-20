<div align="center">

# 🏠 Flatmate Expense Tracker
### Modern, Mobile-First Financial Ledger & Intelligent Bill Splitter

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express-5.3-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-ISC-059669?style=for-the-badge)](LICENSE)

<br />

**A high-precision, offline-first expense management platform tailored for flatmates, roommates, and shared living spaces.**  
Track communal utilities, log personal grocery runs, settle pairwise debts with instant UPI QR codes, and transcribe expenses effortlessly using Google Gemini AI.

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [API Specification](#-api-specification) • [Financial Model](#-financial-ledger-model) • [Testing](#-testing--validation) • [Deployment](#-production-deployment) • [Contributors](#-contributors)

</div>

---

## 🌟 Overview

Splitting rent, groceries, cook salaries, and daily essentials across flatmates often degenerates into forgotten payments, conflicting chat records, and chaotic spreadsheets. 

**Flatmate Expense Tracker** replaces that friction with a unified, dependable ledger designed like a modern neo-banking application:
- **Zero Floating-Point Drift:** Every transaction and split is computed strictly in 64-bit integer paise ($\text{₹}1.00 = 100\text{ paise}$).
- **Bilateral Pairwise Debt Netting:** Eliminates multi-transaction roundabouts so two flatmates settle only the single net difference between them.
- **Offline-First Resilience:** Instant 0ms frame-0 rendering via IndexedDB and local synchronous caching with automated background replay.
- **Voice-Assisted Expense Logging:** Natural language parsing powered by Google Gemini automatically classifies items, beneficiaries, and split weights.
- **Instant Indian UPI Workflows:** Dynamic UPI QR generation with recipient snapshots and two-phase settlement confirmations.

---

## ✨ Key Features

### 1. 📱 Mobile-First Neo-Banking UX
- **Ergonomic Bottom Dock:** Fixed 62px bottom navigation dock with soft active capsule pills, tactile touch feedback, and full iOS/Android gesture bar safe-area padding (`env(safe-area-inset-bottom)`).
- **Consolidated Ledger Views:** Multi-column desktop grids collapse into streamlined, scannable cards on mobile viewports to minimize scrolling fatigue.
- **Zero-Lag Interactions:** Accelerated with `touch-manipulation` to strip mobile tap latency and strict `white-space: nowrap` typography on monetary amounts.

### 2. 🎨 Dynamic 5-Palette Theme Engine
Seamlessly switch between 5 curated, high-contrast themes in light or dark mode without page reload:
- 🌊 **Caribbean Teal** *(Default)*: Contemporary neo-bank teal with fresh mint highlights.
- 🌲 **Emerald Luxe**: Refined British forest and pine financial ledger palette.
- 🌌 **Royal Indigo**: Deep space navy with electric violet accents.
- 🌅 **Sunset Amber**: Warm terracotta and golden amber tones.
- 🌸 **Rose Quartz**: Minimalist slate with muted berry rose accents.

### 3. ⚖️ Bilateral Debt Netting & UPI Settlements
- **Canonical Pairwise Netting:** Aggregates personal advances, common bill splits, and repayments to calculate the exact net balance between each pair of flatmates:
  $$\text{Net Balance} = (\text{Gross Owed} + \text{Settlements Paid}) - (\text{Gross Owe} + \text{Settlements Received})$$
- **On-Screen UPI QR Codes:** Auto-generates standard UPI deep links (`upi://pay?pa=...`) and crisp QR codes pre-filled with the exact settlement amount.
- **Two-Phase Settlement Safety:** Payers submit a claim (`verification_pending`), but balance deductions occur only when the recipient confirms receipt (`confirmed`).

### 4. 🎙️ Google Gemini Voice & NLP Parser
- **Hands-Free Speech Transcription:** Speak natural mixed English/Hindi phrases:
  > *"Paid 1250 rupees for groceries at Blinkit, split equally with all flatmates."*  
  > *"Bought 450 medicine for Saurav and 180 cold drinks for Prathmesh."*
- **Structured Schema Extraction:** Powered by `@google/genai` to automatically extract expense type, amount in paise, category, date, and individual beneficiary allocations.
- **Odd-Paise Remainder Conservation:** Automatically distributes modulo remainder paise evenly across participants so the sum of shares always strictly equals the total amount.

### 5. 🛡️ Enterprise Security & Role-Based Access
- **Stateless Dual-Layer Auth:** Secure JWT authorization headers combined with HTTP-only, SameSite cookies for serverless edge deployment.
- **Protected Biometrics:** Device-bound cryptographic tokens for fast fingerprint / Face Unlock on enrolled smartphones.
- **Role Permissions:** Designated Household Admins manage shared communal expenses and member rosters, while personal spending remains strictly private to each member.

### 6. ⚡ Offline-First PWA Architecture
- **Instant Frame-0 Startup:** Client queries load instantaneously from IndexedDB before revalidating over the network.
- **Durable Mutation Queue:** Expense creation and status changes made while offline are enqueued locally in IndexedDB and automatically replayed with backoff upon reconnection.
- **Installable Web App:** Complete Web App Manifest with maskable icons, standalone display mode, and safe-area geometry for home-screen mobile installation.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend Client (React 19 + Vite)"]
        UI["UI Primitives & Theme Engine"]
        Dock["Mobile Bottom Dock"]
        VoiceModal["Voice Assistant (Web Audio)"]
        TanStack["TanStack React Query Cache"]
        IDB[("IndexedDB + Local Cache")]
        SyncQueue["Offline Mutation Queue"]
    end

    subgraph Server ["Backend API (Express 5 + TypeScript)"]
        AuthMid["JWT & Biometric Guard Middleware"]
        ExpRoute["/api/expenses (Personal, Common, On-Behalf)"]
        BalRoute["/api/balances (Bilateral Netting)"]
        SettRoute["/api/settlements (Two-Phase Confirmations)"]
        AIRoute["/api/ai (Gemini Structured Parser)"]
        ProfRoute["/api/profile & /api/upi (QR Generator)"]
    end

    subgraph Data ["Database & External Services"]
        NeonDB[("Neon PostgreSQL<br/>(Drizzle ORM Schema)")]
        GeminiAPI["Google Gemini 2.5 Flash"]
    end

    UI --> TanStack
    VoiceModal --> TanStack
    TanStack <--> IDB
    TanStack --> SyncQueue
    SyncQueue -->|Auto-Replay on Reconnect| AuthMid

    TanStack -->|REST / Bearer JWT| AuthMid
    AuthMid --> ExpRoute
    AuthMid --> BalRoute
    AuthMid --> SettRoute
    AuthMid --> AIRoute
    AuthMid --> ProfRoute

    ExpRoute --> NeonDB
    BalRoute --> NeonDB
    SettRoute --> NeonDB
    ProfRoute --> NeonDB
    AIRoute --> GeminiAPI
```

---

## 📂 Project Structure

```text
Flatmate_expense_tracker/
├── backend/
│   ├── api/                 # Bundled serverless handler for Vercel
│   ├── db/
│   │   ├── drizzle.ts       # Drizzle client configuration
│   │   ├── init.ts          # Schema migrations & initial seed data
│   │   ├── index.ts         # Neon serverless connection with resilient DNS cache
│   │   └── schema.ts        # Drizzle PostgreSQL schema definitions
│   ├── middleware/
│   │   ├── auth.ts          # requireAuth, requireAdmin & session guards
│   │   └── rateLimiter.ts   # Throttling limits for auth, claims, and AI
│   ├── routes/
│   │   ├── activity.ts      # Timestamped household activity stream
│   │   ├── ai.ts            # Gemini AI voice expense extraction
│   │   ├── auth.ts          # Password & biometric enrollment endpoints
│   │   ├── balances.ts      # Bilateral netting & summary calculations
│   │   ├── categories.ts    # Household category management
│   │   ├── expenses.ts      # Expense creation, update, and soft delete
│   │   ├── members.ts       # Roommate roster and permissions
│   │   ├── profile.ts       # Profile settings & UPI VPA configuration
│   │   ├── purchases.ts     # On-behalf purchases & multi-item allocation
│   │   └── settlements.ts   # Repayment tracking & state transitions
│   ├── utils/
│   │   ├── audit.ts         # Non-blocking event logging helper
│   │   ├── jwt.ts           # Session and biometric device token crypto
│   │   ├── password.ts      # Salted bcrypt password hashing
│   │   └── upi.ts           # UPI deep link builder and validation
│   ├── app.ts               # Express 5 app configuration with strict CORS
│   ├── server.ts            # Local development HTTP listener
│   ├── serverless.ts        # Vercel serverless lambda entry
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── analytics/   # KPI metrics cards, trend charts, spend breakdown
│   │   │   ├── layout/      # Application Shell, MobileDock, ThemeModal
│   │   │   ├── ui/          # Radix dialogs, buttons, cards, date filters
│   │   │   └── voice/       # VoiceAssistantModal recording interface
│   │   ├── context/         # AuthContext & ThemeContext
│   │   ├── lib/
│   │   │   ├── api.ts       # Typed API client with custom ApiError
│   │   │   ├── biometrics.ts# WebAuthn credential enrollment & verification
│   │   │   ├── idb.ts       # IndexedDB query cache & offline mutation storage
│   │   │   ├── offlineQueue.ts # Replay engine with non-recoverable 4xx purge
│   │   │   └── utils.ts     # Currency formatters, date helpers, cn utility
│   │   ├── pages/           # Dashboard, Expenses, Balances, Repayments, Profile
│   │   ├── index.css        # Tailwind CSS & HSL theme color definitions
│   │   └── App.tsx          # Code-split lazy routing & query warmup
│   ├── vite.config.ts       # Vite bundler with Rollup vendor chunking
│   └── package.json
│
├── test/
│   └── comprehensive_suite.ts # 880+ lines automated integration test suite
├── vercel.json              # Vercel deployment rewrites
├── package.json             # Root monorepo workspace scripts
└── README.md                # Project documentation
```

---

## 💰 Financial Ledger Model

The application operates on strict financial accounting principles:

### 1. Integer Arithmetic Standard
All monetary units are stored and computed in integer **paise**:
$$\text{Amount (Paise)} = \text{Round}(\text{Rupees} \times 100)$$

### 2. Remainder Conservation (No Phantom Loss)
When splitting an odd number of paise among $N$ roommates:
$$\text{Base Share} = \lfloor \text{Total Paise} / N \rfloor$$
$$\text{Remainder} = \text{Total Paise} \pmod N$$
The remainder is distributed sequentially ($+1\text{ paise}$) across the first beneficiaries so:
$$\sum_{i=1}^N \text{Share}_i \equiv \text{Total Amount}$$

### 3. Settlement State Machine
Repayments proceed through an atomic, multi-step verification state machine:

```
 [Created] ──► verification_pending ──► [Recipient Confirms] ──► confirmed
                     │
                     ├──► [Recipient Rejects]  ──► rejected
                     │
                     └──► [Payer Cancels]      ──► cancelled
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`
- A **PostgreSQL** database (Local instance or free cloud database on [Neon.tech](https://neon.tech))

---

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Virendra-Phirke/Flatmate_expense_tracker.git
   cd Flatmate_expense_tracker
   ```

2. **Install monorepo dependencies:**
   ```bash
   npm install
   ```

---

### Environment Setup

Create your environment configuration files:
```bash
# In backend directory
cp backend/.env.example backend/.env

# In root directory
cp .env.example .env
```

#### Configure `backend/.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
SESSION_SECRET=your_super_secret_session_key_min_32_characters
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Configure `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
```

---

### Database Provisioning

Run Drizzle schema migration and seed initial flatmate accounts:
```bash
# Push table schemas to PostgreSQL
npm run db:push

# (Optional) Open Drizzle Studio visual table inspector
npm run db:studio
```

---

### Running the Application

Launch both frontend and backend concurrently with live reload:
```bash
npm run dev
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API:** `http://localhost:3000/api`
- **Health Check:** `http://localhost:3000/api/health`

To start services independently:
```bash
npm run dev:backend   # Backend only on port 3000
npm run dev:frontend  # Frontend only on port 5173
```

---

## 🔌 API Specification

All routes are mounted under `/api` and require session cookies or `Authorization: Bearer <token>` unless marked public.

| Module | Method | Endpoint | Description | Auth Required |
|---|---|---|---|:---:|
| **Auth** | `POST` | `/api/auth/login` | Authenticate with username and password | ❌ |
| **Auth** | `POST` | `/api/auth/biometric-enroll` | Register a device token for fingerprint unlock | ✅ |
| **Auth** | `POST` | `/api/auth/biometric-login` | Verify fingerprint with enrolled device token | ❌ |
| **Auth** | `GET` | `/api/auth/me` | Retrieve authenticated user profile | ✅ |
| **Auth** | `POST` | `/api/auth/change-password` | Update current account password | ✅ |
| **Auth** | `POST` | `/api/auth/logout` | Invalidate token and clear auth cookies | ✅ |
| **Expenses** | `GET` | `/api/expenses?type=personal\|common` | Retrieve filtered household expenses | ✅ |
| **Expenses** | `POST` | `/api/expenses/personal` | Log an expense paid purely for oneself | ✅ |
| **Expenses** | `POST` | `/api/expenses/common` | Create communal expense with split shares *(Admin)* | ✅ |
| **Expenses** | `POST` | `/api/expenses/on-behalf` | Record purchases made on behalf of roommates | ✅ |
| **Expenses** | `PUT` | `/api/expenses/:id` | Update description, amount, date, or category | ✅ |
| **Expenses** | `DELETE`| `/api/expenses/:id` | Soft-delete an expense *(Settlement guarded)* | ✅ |
| **Balances** | `GET` | `/api/balances/summary` | Consolidated bilateral netted balances & debts | ✅ |
| **Settlements**| `GET` | `/api/settlements` | History of repayment claims and verifications | ✅ |
| **Settlements**| `POST`| `/api/settlements` | Submit a payment claim to a roommate | ✅ |
| **Settlements**| `POST`| `/api/settlements/:id/confirm`| Confirm receipt of payment *(Recipient only)* | ✅ |
| **Settlements**| `POST`| `/api/settlements/:id/reject` | Reject unverified payment claim *(Recipient only)* | ✅ |
| **Settlements**| `POST`| `/api/settlements/:id/cancel` | Cancel an unverified claim *(Payer only)* | ✅ |
| **Profile** | `GET` | `/api/profile/upi` | Get current user's registered UPI ID | ✅ |
| **Profile** | `PUT` | `/api/profile/upi` | Update UPI VPA and display name | ✅ |
| **Profile** | `GET` | `/api/upi/qr?userId=&amount=` | Generate pre-filled UPI QR code image | ✅ |
| **AI Parser**| `POST`| `/api/ai/parse-expense` | Parse natural language voice transcript | ✅ |
| **Analytics**| `GET` | `/api/analytics` | Category breakdown, daily trend & KPI metrics | ✅ |
| **Members** | `GET` | `/api/members` | Get flatmate directory and household roles | ✅ |
| **Activity** | `GET` | `/api/activity` | Retrieve timestamped household activity stream | ✅ |

---

## 📜 Monorepo Scripts

| Command | Action |
|---|---|
| `npm run dev` | Runs backend (port 3000) and frontend (port 5173) concurrently |
| `npm run build` | Compiles both backend esbuild bundle and frontend Vite assets |
| `npm run build:frontend` | Generates minified client production bundle in `frontend/dist` |
| `npm run build:backend` | Bundles Node.js serverless backend to `backend/api/index.js` |
| `npm run typecheck` | Executes strict TypeScript compilation checks across all workspaces |
| `npm test` | Runs the full automated end-to-end integration test suite |
| `npm run db:push` | Pushes Drizzle ORM schema changes directly to PostgreSQL |
| `npm run db:studio` | Launches visual Drizzle Studio database explorer |

---

## 🧪 Testing & Validation

The project includes an end-to-end integration and mathematical verification suite checking ledger precision, token security, and settlement invariants:

```bash
# Execute integration test suite against live backend
npm test

# Run strict TypeScript compiler checks across all workspaces
npm run typecheck
```

---

## 🌐 Production Deployment

### Frontend (Vercel / Netlify / Cloudflare Pages)
- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** `VITE_API_URL=https://your-backend-api.vercel.app`

### Backend (Vercel Serverless / Node.js)
- Serverless entrypoint in `backend/serverless.ts` bundled into an edge-ready Node.js handler (`backend/api/index.js`) using `esbuild`.
- Configured via root [vercel.json](file:///c:/Users/viren/Music/Flatmate%20Expense%20Manager/vercel.json) for automatic `/api` route forwarding.
- Connects to [Neon PostgreSQL](https://neon.tech) over SSL with connection pooling and DNS-resilient caching.

---

## 👥 Contributors

Built with precision for seamless shared apartment living:

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Virendra-Phirke">
        <img src="https://github.com/Virendra-Phirke.png" width="85px;" alt="Virendra Phirke"/><br />
        <sub><b>Virendra Phirke</b></sub>
      </a><br />
      <sub>Architecture, Backend & Ledger Engine</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Saurav-Shelke">
        <img src="https://github.com/Saurav-Shelke.png" width="85px;" alt="Saurav H Shelke"/><br />
        <sub><b>Saurav H Shelke</b></sub>
      </a><br />
      <sub>Mobile UI/UX, Theme Engine & Client State</sub>
    </td>
  </tr>
</table>

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
