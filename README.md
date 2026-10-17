# Flatmate Expense Tracker 🏠💳

<div align="center">

![GitHub last commit](https://img.shields.io/github/last-commit/Virendra-Phirke/Flatmate_expense_tracker?style=for-the-badge&logo=github&color=0d9488)
![GitHub repo size](https://img.shields.io/github/repo-size/Virendra-Phirke/Flatmate_expense_tracker?style=for-the-badge&color=0284c7)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Virendra-Phirke/Flatmate_expense_tracker?style=for-the-badge&color=8b5cf6)
![License](https://img.shields.io/badge/license-ISC-emerald?style=for-the-badge)

<br />

**A modern, mobile-first full-stack ledger for shared living spaces, flatmates, and roommates.**  
Track communal expenses, split personal purchases, simplify pairwise debts, settle via instant UPI QR codes, and log expenses effortlessly using AI-powered voice commands.

[Explore Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API Reference](#-api-endpoints) • [Contributors](#-contributors)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Mobile-First Neo-Banking UX](#1-mobile-first-neo-banking-ux)
  - [Dynamic Multi-Palette Theming](#2-dynamic-multi-palette-theming)
  - [Pairwise Debt Simplification & UPI Settlements](#3-pairwise-debt-simplification--upi-settlements)
  - [Google Gemini Voice & Natural Language Parser](#4-google-gemini-voice--natural-language-parser)
  - [Stateless JWT & Session Authentication](#5-stateless-jwt--session-authentication)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [API Endpoints](#-api-endpoints)
- [Scripts](#-scripts)
- [Security & Best Practices](#-security--best-practices)
- [Contributors](#-contributors)
- [License](#-license)

---

## 🌟 Overview

Managing shared apartment expenses across roommates often leads to fragmented chat logs, messy spreadsheets, and awkward payment reminders. **Flatmate Expense Tracker** solves this by providing a unified, high-performance financial dashboard built specifically for shared households.

Whether splitting monthly rent, utility bills, communal groceries, or a coffee run picked up for a single flatmate, the application accurately calculates net pairwise balances so no one pays more transactions than necessary.

---

## ✨ Key Features

### 1. Mobile-First Neo-Banking UX
- **Comfortable Bottom Dock Navigation**: 62px bottom navigation dock featuring soft active capsule pills, crisp labels, and safe-area inset support (`env(safe-area-inset-bottom)`) tailored for Android and iOS screens.
- **Compact Mobile Overview Cards**: Spending overview cards automatically transition from multi-column desktop grids into consolidated, compact rows on handheld devices to eliminate vertical scroll fatigue.
- **Zero-Delay Touch Interactions**: Configured with `touch-manipulation` to remove mobile browser tap delays and `white-space: nowrap` on financial amounts to prevent number wrapping.

### 2. Dynamic Multi-Palette Theming
- **Live Theme Palette Switcher**: Switch between 5 curated color palettes without page reloads:
  - 🌊 **Caribbean Teal** *(Default)*: Neo-bank deep teal with fresh mint highlights.
  - 🌲 **Emerald Luxe**: High-contrast pine and forest green financial theme.
  - 🌌 **Royal Indigo**: Deep space navy with vibrant electric violet accents.
  - 🌅 **Sunset Amber**: Warm terracotta and golden amber tones.
  - 🌸 **Rose Quartz**: Premium modern slate with muted berry rose accents.
- **Dark Mode & Light Mode**: Smooth transition between light and dark modes with dedicated semantic HSL tokens.

### 3. Pairwise Debt Simplification & UPI Settlements
- **Graph-Based Debt Minimization**: Eliminates circular debt cycles (e.g., if Person A owes B ₹100, and B owes C ₹100, Person A simply pays Person C ₹100).
- **Instant UPI QR Generation**: Generates standard payment links and on-screen QR codes pre-filled with the exact settlement amount and recipient VPA.
- **Settlement Audit Trail**: Logs confirmed repayments with timestamped receipts in the household activity feed.

### 4. Google Gemini Voice & Natural Language Parser
- **Voice Expense Entry**: Speak naturally into your microphone (e.g., *"Bought ₹650 groceries from Blinkit, split equally between Rohan and me"*).
- **Structured JSON Extraction**: Powered by `@google/genai` to automatically extract expense title, amount, payer, splits, and categories.

### 5. Stateless JWT & Session Authentication
- **Dual Layer Auth**: Stateless JWT bearer tokens and HTTP-only signed cookies for seamless local development and serverless edge deployment.
- **Role-Based Permissions**: Admin privileges for household member management and household settings.

---

## 🛠️ Tech Stack

<div align="center">

| Area | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Radix UI Primitives, Lucide React, Flaticon UIcons |
| **State & Data** | TanStack React Query v5, Context API |
| **Backend** | Node.js (ESM), Express 5, TypeScript |
| **Database & ORM** | PostgreSQL, Neon Serverless Postgres, Drizzle ORM, Drizzle Kit |
| **AI / Voice** | Google Gemini API (`@google/genai`) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), bcryptjs, cookie-parser |
| **Payments** | Dynamic UPI QR Code Generation (`qrcode`) |

</div>

---

## 🏛️ Architecture

```mermaid
graph TD
    subgraph Client ["Client (Frontend - React 19 + Vite)"]
        UI["Modern UI / Theme Engine"]
        Dock["Mobile Dock Navigation"]
        VoiceModal["Voice Assistant (Web Audio)"]
        QueryCache["TanStack Query Cache"]
    end

    subgraph API ["API Server (Express 5 + Node.js)"]
        AuthMid["JWT & Session Auth Middleware"]
        ExpRouter["/api/expenses"]
        BalRouter["/api/balances (Debt Simplification)"]
        AIRouter["/api/ai (Natural Language Parser)"]
        SettRouter["/api/settlements (QR Generation)"]
    end

    subgraph External ["External Services & Database"]
        Postgres[("PostgreSQL / Neon DB<br/>(Drizzle ORM)")]
        Gemini["Google Gemini AI"]
    end

    UI --> QueryCache
    VoiceModal --> QueryCache
    QueryCache -->|REST HTTP / Cookie Auth| AuthMid
    AuthMid --> ExpRouter
    AuthMid --> BalRouter
    AuthMid --> AIRouter
    AuthMid --> SettRouter

    ExpRouter --> Postgres
    BalRouter --> Postgres
    SettRouter --> Postgres
    AIRouter --> Gemini
```

---

## 📂 Project Structure

```text
Flatmate_expense_tracker/
├── backend/
│   ├── api/                 # Serverless Vercel endpoints
│   ├── db/
│   │   ├── drizzle.ts       # Drizzle database client instance
│   │   ├── init.ts          # Table initializers and seed script
│   │   └── schema.ts        # PostgreSQL schema definitions
│   ├── middleware/          # JWT, session, rate-limiting & error handlers
│   │   └── auth.ts
│   ├── routes/              # Express REST route controllers
│   │   ├── activity.ts      # Household activity feed
│   │   ├── ai.ts            # Gemini natural language expense logging
│   │   ├── auth.ts          # Register, login, session, logout
│   │   ├── balances.ts      # Debt simplification & net balance calculations
│   │   ├── categories.ts    # Expense category management
│   │   ├── expenses.ts      # Shared household expense ledger
│   │   ├── members.ts       # Flatmate directory & roles
│   │   ├── profile.ts       # User profile & UPI VPA settings
│   │   ├── purchases.ts     # Personal & targeted expense splits
│   │   └── settlements.ts   # Debt resolution & UPI QR generation
│   ├── app.ts               # Express application configuration
│   ├── server.ts            # Local HTTP server entry point
│   ├── drizzle.config.ts    # Drizzle ORM configuration
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # Shell, Mobile Dock, ThemePaletteModal, Header
│   │   │   └── ui/          # Radix dialogs, buttons, cards, badges, inputs
│   │   ├── context/         # AuthContext, ThemeContext (5 palettes + dark mode)
│   │   ├── pages/           # Dashboard, Expenses, Balances, Repayments, Profile
│   │   ├── lib/             # API clients, formatters, utilities
│   │   ├── index.css        # Tailwind CSS & HSL semantic theme variables
│   │   └── App.tsx          # Root routing and query provider
│   ├── vite.config.ts       # Vite bundler configuration
│   └── package.json
│
├── .env.example             # Template for environment variables (no secrets)
├── package.json             # Root monorepo workspace configuration
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed locally:
- [Node.js](https://nodejs.org/) `>= 18.0.0`
- [npm](https://www.npmjs.com/) `>= 9.0.0` (or `pnpm` / `yarn`)
- A [PostgreSQL](https://www.postgresql.org/) database or a free [Neon](https://neon.tech/) cloud instance

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Virendra-Phirke/Flatmate_expense_tracker.git
   cd Flatmate_expense_tracker
   ```

2. **Install all dependencies** (for both frontend and backend):
   ```bash
   npm install
   ```

---

### Environment Variables

Create environment configuration files using the provided templates:

```bash
# In backend
cp backend/.env.example backend/.env

# In root (optional, for unified runner)
cp .env.example .env
```

#### Required Backend Variables (`backend/.env`):

> ⚠️ **Security Notice**: Never commit real database passwords, secret keys, or API tokens to version control. Use secure environment managers in production.

```env
# Server Port
PORT=5000

# PostgreSQL Connection String (Local PostgreSQL or Neon Cloud)
DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:5432/flatmate_db?sslmode=prefer

# Authentication Secrets (Generate secure random 32+ character strings)
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_SECRET=your_super_secret_session_key_here

# Frontend Client URL (for CORS allowance)
FRONTEND_URL=http://localhost:5173

# Google Gemini API Key (for Voice & Natural Language expense parser)
GEMINI_API_KEY=your_gemini_api_key_here

# Environment
NODE_ENV=development
```

---

### Database Setup

1. **Push database schema migrations** using Drizzle Kit:
   ```bash
   npm run db:push
   ```

2. *(Optional)* **Launch Drizzle Studio** to visually inspect tables and test records:
   ```bash
   npm run db:studio
   ```

---

### Running the App

Start both the backend server and frontend client concurrently:

```bash
npm run dev
```

The application will be accessible at:
- **Frontend Web App**: `http://localhost:5173` *(or `http://localhost:5174`)*
- **Backend API**: `http://localhost:5000/api`

To run services individually:
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

---

## 🔌 API Endpoints

All API endpoints are prefixed with `/api`. Protected routes require authentication via session cookie or `Authorization: Bearer <token>`.

| Module | Method | Endpoint | Description | Auth Required |
|---|---|---|---|:---:|
| **Auth** | `POST` | `/api/auth/register` | Register a new user and household | ❌ |
| **Auth** | `POST` | `/api/auth/login` | Authenticate with username and password | ❌ |
| **Auth** | `GET` | `/api/auth/me` | Retrieve authenticated user profile | ✅ |
| **Auth** | `POST` | `/api/auth/logout` | Terminate session and clear cookies | ✅ |
| **Expenses** | `GET` | `/api/expenses` | List all shared expenses for household | ✅ |
| **Expenses** | `POST` | `/api/expenses` | Log a new shared expense with split weights | ✅ |
| **Expenses** | `DELETE` | `/api/expenses/:id` | Remove an expense entry | ✅ |
| **Balances** | `GET` | `/api/balances/summary` | Get net balances, debts, and credits | ✅ |
| **Balances** | `GET` | `/api/balances/pairwise`| Get simplified pairwise debt matrix | ✅ |
| **Settlements** | `POST` | `/api/settlements` | Record a repayment between roommates | ✅ |
| **Settlements** | `GET` | `/api/settlements/qr` | Generate UPI QR code for outstanding debt | ✅ |
| **Purchases** | `GET` | `/api/purchases` | List personal purchases & specific splits | ✅ |
| **AI** | `POST` | `/api/ai/parse-expense` | Parse natural language text or voice transcript | ✅ |
| **Members** | `GET` | `/api/members` | Get flatmate roster and household members | ✅ |
| **Activity** | `GET` | `/api/activity` | Retrieve recent household audit logs | ✅ |

---

## 📜 Scripts

| Command | Action |
|---|---|
| `npm run dev` | Runs backend and frontend concurrently |
| `npm run build` | Builds both backend and frontend workspaces for production |
| `npm run build:frontend` | Compiles Vite production bundle into `frontend/dist` |
| `npm run build:backend` | Compiles TypeScript backend |
| `npm run typecheck` | Executes TypeScript type-checking across all workspaces |
| `npm run db:push` | Applies Drizzle schema changes directly to PostgreSQL |
| `npm run db:studio` | Launches Drizzle Studio GUI on `https://local.drizzle.studio` |

---

## 🔒 Security & Best Practices

- **Zero Credentials in Code**: All sensitive strings (tokens, API keys, database strings) are loaded via environment variables and excluded through `.gitignore`.
- **Stateless Tokens**: Protected against unauthorized session hijacking with HTTP-only cookie flags and signed JWT validation.
- **SQL Injection Prevention**: Completely parameterized SQL queries via Drizzle ORM.
- **Input Sanitization**: Request bodies validated before database insertion.
- **Safe Area Inset Handling**: Full adherence to iOS notch and Android gesture pill safe boundaries.

---

## 👥 Contributors

Thanks to the contributors who have helped build the Flatmate Expense Tracker:

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Virendra-Phirke">
        <img src="https://github.com/Virendra-Phirke.png" width="80px;" alt="Virendra Phirke"/><br />
        <sub><b>Virendra Phirke</b></sub>
      </a><br />
      <sub>Architecture & Backend</sub>
    </td>
    <td align="center">
      <a href="https://github.com/Saurav-Shelke">
        <img src="https://github.com/Saurav-Shelke.png" width="80px;" alt="Saurav H Shelke"/><br />
        <sub><b>Saurav H Shelke</b></sub>
      </a><br />
      <sub>Mobile UI/UX, Theme System & Frontend</sub>
    </td>
  </tr>
</table>

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
