# AssetFlow — Technical Spec 07: Environment Setup Guide

**Purpose:** Step-by-step instructions for getting the development environment running from a clean machine. Intended for all team members.

---

## 1. Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | 20 LTS or newer | https://nodejs.org/ |
| npm | 10+ (comes with Node.js) | — |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop/ |
| Git | Latest | https://git-scm.com/ |
| VS Code (recommended) | Latest | https://code.visualstudio.com/ |

### Verify Installation
```bash
node --version    # Should show v20.x or v22.x
npm --version     # Should show 10.x+
docker --version  # Should show Docker version 2x.x+
git --version     # Should show git version 2.x+
```

---

## 2. First-Time Setup (5 minutes)

### 2.1 Clone the Repository
```bash
git clone <repo-url>
cd AssetFlow
```

### 2.2 Create Environment File
```bash
cp .env.example .env
```
The defaults work out-of-the-box for local development. No changes needed unless you have port conflicts.

### 2.3 Start Database & Redis (Docker)
```bash
docker-compose up -d
```
This pulls and starts:
- **PostgreSQL 16** on `localhost:5432` — with `pgcrypto`, `btree_gist`, and `citext` extensions pre-configured
- **Redis 7** on `localhost:6379` — for rate limiting and session management

Verify they're running:
```bash
docker-compose ps
# Both should show "Up" status

docker-compose logs postgres
# Should end with "database system is ready to accept connections"
```

### 2.4 Install & Start Backend
```bash
cd backend
npm install
npm run migration:run    # Creates all database tables
npm run seed             # Loads demo data (Admin user, sample departments, etc.)
npm run start:dev        # Starts on http://localhost:3000
```

### 2.5 Install & Start Frontend
```bash
cd frontend
npm install
npm run dev              # Starts on http://localhost:5173
```

### 2.6 Verify Everything Works
1. Open http://localhost:5173 — you should see the AssetFlow login page
2. Login with the seeded Admin account:
   - Email: `admin@assetflow.local`
   - Password: `Admin@123`
3. You should see the Dashboard with KPI cards

---

## 3. Daily Development Workflow

### Starting the Dev Environment
```bash
# Terminal 1: Start database (if not already running)
docker-compose up -d

# Terminal 2: Start backend (with hot-reload)
cd backend && npm run start:dev

# Terminal 3: Start frontend (with HMR)
cd frontend && npm run dev
```

### Stopping
```bash
# Stop backend/frontend: Ctrl+C in their terminals

# Stop database (keeps data):
docker-compose down

# Stop database AND delete all data (fresh start):
docker-compose down -v
```

---

## 4. Database Management

### Connecting Directly (for debugging)
```bash
# Via Docker
docker exec -it assetflow-postgres psql -U assetflow -d assetflow_dev

# Or use any PostgreSQL GUI (DBeaver, pgAdmin, TablePlus) with:
# Host: localhost, Port: 5432, User: assetflow, Password: assetflow_dev, DB: assetflow_dev
```

### Running Migrations
```bash
cd backend
npm run migration:run          # Apply all pending migrations
npm run migration:revert       # Revert the last migration
npm run migration:generate -- -n MigrationName  # Generate new migration from entity changes
```

### Resetting the Database
```bash
docker-compose down -v          # Delete all data
docker-compose up -d            # Recreate fresh containers
cd backend
npm run migration:run           # Re-apply all migrations
npm run seed                    # Re-seed demo data
```

---

## 5. Common Issues & Solutions

| Problem | Solution |
|---|---|
| Port 5432 already in use | You have a local PostgreSQL running. Stop it, or change `DATABASE_PORT` in `.env` and `docker-compose.yml` |
| Port 6379 already in use | You have a local Redis running. Stop it, or change `REDIS_PORT` in `.env` and `docker-compose.yml` |
| `docker-compose up` fails | Ensure Docker Desktop is running. On Windows, check WSL2 is enabled. |
| Backend can't connect to DB | Wait 5-10s after `docker-compose up` for PostgreSQL to finish initializing. Check `docker-compose logs postgres` for errors. |
| `npm install` fails | Delete `node_modules` and `package-lock.json`, then retry `npm install` |
| Frontend shows blank page | Check browser console for errors. Ensure backend is running on port 3000. |

---

## 6. VS Code Recommended Extensions

Create `.vscode/extensions.json` (already included in repo):
- `dbaeumer.vscode-eslint` — ESLint integration
- `esbenp.prettier-vscode` — Code formatting
- `bradlc.vscode-tailwindcss` — TailwindCSS IntelliSense
- `prisma.prisma` — Database schema highlighting
- `ms-azuretools.vscode-docker` — Docker integration

---

## 7. Environment Variables Reference

See `.env.example` for the full list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://assetflow:assetflow_dev@localhost:5432/assetflow_dev` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | (must be set) | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | (must be set) | Secret for signing refresh tokens |
| `ACCESS_TOKEN_TTL` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL` | `7d` | Refresh token lifetime |
| `PORT` | `3000` | Backend API port |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL (for CORS) |
