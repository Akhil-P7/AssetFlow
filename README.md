# AssetFlow — Enterprise Asset & Resource Management System

> Track physical assets, manage shared resource bookings, enforce allocation integrity, and maintain full audit discipline — all in one system.

## 📋 Overview

AssetFlow is a **generic, industry-agnostic ERP module** for tracking physical assets (equipment, furniture, vehicles) and shared resources (rooms, vehicles, equipment slots) across any organization. It covers **lifecycle visibility, allocation integrity, booking integrity, maintenance governance, and audit discipline**.

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, TailwindCSS |
| Backend | NestJS (Node.js), TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh tokens), argon2 |
| Background Jobs | node-cron |

```
assetflow/
├── backend/          # NestJS API server
├── frontend/         # React SPA
├── docker/           # Docker init scripts
├── docs/             # Technical specifications (8 documents)
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ ([download](https://nodejs.org/))
- **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop/))
- **Git**

### 1. Clone & Configure
```bash
git clone <repo-url>
cd AssetFlow
cp .env.example .env
```

### 2. Start Database & Redis
```bash
docker-compose up -d
```
This starts PostgreSQL 16 and Redis 7 in containers. No local install needed.

### 3. Backend
```bash
cd backend
npm install
npm run migration:run    # Apply database migrations
npm run seed             # Load demo data (optional)
npm run start:dev        # Start on http://localhost:3000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev              # Start on http://localhost:5173
```

## 👥 User Roles

| Role | Description |
|---|---|
| **Admin** | Full system access — org setup, role promotion, all operations |
| **Asset Manager** | Asset registration, allocation, maintenance approval, audits |
| **Department Head** | Dept-scoped approvals, allocations within own department |
| **Employee** | Book resources, raise maintenance requests, view own assets |

## 📖 Documentation

| Doc | Purpose |
|---|---|
| [Development Plan](./AssetFlow_Development_Plan.md) | Product vision, screens, roles, phases |
| [01 — Data Model](./docs/01_Data_Model_and_Database_Schema.md) | Full PostgreSQL schema & constraints |
| [02 — API Spec](./docs/02_API_Specification.md) | REST endpoints & error codes |
| [03 — Business Logic](./docs/03_Business_Logic_and_State_Machines.md) | State machines, concurrency handling |
| [04 — Auth & Security](./docs/04_RBAC_Auth_and_Security.md) | RBAC guards, JWT strategy, hardening |
| [05 — Architecture](./docs/05_Module_Architecture_and_Engineering_Practices.md) | Folder structure, module patterns |
| [06 — Frontend Guide](./docs/06_Frontend_Implementation_Guide.md) | Screen breakdown, component architecture |
| [07 — Environment Setup](./docs/07_Environment_Setup_Guide.md) | Dev environment step-by-step |
| [08 — Scheduled Jobs](./docs/08_Scheduled_Jobs_and_Background_Tasks.md) | Background task specifications |

## 🧪 Testing

```bash
# Backend
cd backend
npm run test              # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests

# Frontend
cd frontend
npm run test              # Component tests
```

## 📜 License

Private — Internal use only.
