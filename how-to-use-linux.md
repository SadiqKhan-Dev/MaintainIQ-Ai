# How to Use MaintainIQ on Linux

This guide is the **Linux-specific, fully detailed** companion to `how-to-use.md` and `README.md`. It covers everything from checking your Linux box, installing the exact toolchains, running MaintainIQ locally, using Docker, seeding data, configuring every integration, and deploying — all written with Linux commands, package managers, and gotchas in mind.

MaintainIQ is an AI-powered QR maintenance platform. Physical assets get unique QR codes; anyone can scan them with a phone (no login) to report problems; technicians and admins manage work orders, SLA, preventive maintenance, and analytics.

---

## Table of Contents

1. [System Requirements (Linux)](#1-system-requirements-linux)
2. [Supported Linux Distributions](#2-supported-linux-distributions)
3. [Step 0: Prepare Your Linux Environment](#3-step-0-prepare-your-linux-environment)
4. [Installing the Backend Toolchain (Python 3.12)](#4-installing-the-backend-toolchain-python-312)
5. [Installing the Frontend Toolchain (Node.js 20)](#5-installing-the-frontend-toolchain-nodejs-20)
6. [Clone the Repository](#6-clone-the-repository)
7. [Configure the Backend](#7-configure-the-backend)
8. [Configure the Frontend](#8-configure-the-frontend)
9. [Run MaintainIQ Locally (Dev Mode)](#9-run-maintainiq-locally-dev-mode)
10. [Seed Demo Data](#10-seed-demo-data)
11. [Run with Docker / Docker Compose](#11-run-with-docker--docker-compose)
12. [Database Migrations (Alembic)](#12-database-migrations-alembic)
13. [Using the Product (Reporters / Technicians / Admins)](#13-using-the-product)
14. [Environment Variables Reference](#14-environment-variables-reference)
15. [Configuring Integrations on Linux](#15-configuring-integrations-on-linux)
16. [Backgrounding & Process Management on Linux](#16-backgrounding--process-management-on-linux)
17. [Reverse Proxy (Nginx) for Local/Prod](#17-reverse-proxy-nginx-for-localprod)
18. [Troubleshooting on Linux](#18-troubleshooting-on-linux)
19. [Updating MaintainIQ](#19-updating-maintainiq)
20. [Production Deployment Notes](#20-production-deployment-notes)

---

## 1. System Requirements (Linux)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Any 64-bit Linux (kernel 4.x+) | Ubuntu 22.04 / 24.04 LTS, Debian 12 |
| RAM | 2 GB | 4 GB+ |
| Disk | 2 GB free | 10 GB free |
| CPU | 2 cores | 4 cores |
| Python | 3.12 | 3.12 |
| Node.js | 20.x | 20.x (LTS) |
| Internet | Required for AI, Clerk, Cloudinary | Required |
| PostgreSQL | Optional locally (use NeonDB) | NeonDB serverless recommended |

The backend is built for **Python 3.12** (the Docker image uses `python:3.12-slim`). The frontend is built for **Node.js 20** (the Docker image uses `node:20-alpine`).

---

## 2. Supported Linux Distributions

The commands below are given for the two major families. Pick the section that matches your distro:

- **Debian / Ubuntu / Mint / Pop!_OS / Kali** → use `apt`
- **Fedora / RHEL / CentOS Stream / Rocky / AlmaLinux** → use `dnf`
- **Arch / Manjaro / EndeavourOS** → use `pacman`
- **openSUSE** → use `zypper`

Docker and Node version managers work the same across all of them.

---

## 3. Step 0: Prepare Your Linux Environment

Open a terminal (`Ctrl+Alt+T` on most desktops, or your WM launcher).

### 3.1 Update your system

**Debian/Ubuntu:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Fedora:**
```bash
sudo dnf upgrade -y
```

**Arch:**
```bash
sudo pacman -Syu
```

### 3.2 Install basic build tools

These are needed so Python wheels and native modules compile.

**Debian/Ubuntu:**
```bash
sudo apt install -y curl wget git build-essential libssl-dev \
  libffi-dev software-properties-common ca-certificates \
  python3-dev postgresql-client
```

**Fedora:**
```bash
sudo dnf install -y curl wget git gcc gcc-c++ make openssl-devel \
  libffi-devel python3-devel postgresql
```

**Arch:**
```bash
sudo pacman -S --needed curl wget git base-devel openssl libffi postgresql
```

> The backend's `requirements.txt` includes `psycopg2-binary` and `asyncpg`, plus `gcc`/`libpq-dev` (Debian) or `gcc`/`libpq` (others) are required for compilation if binary wheels are unavailable.

---

## 4. Installing the Backend Toolchain (Python 3.12)

MaintainIQ expects Python 3.12. Many distros ship 3.10/3.11, so we recommend `pyenv` (works on every distro) or your distro's package.

### 4.1 Option A — pyenv (recommended, distro-agnostic)

```bash
# Install pyenv
curl https://pyenv.run | bash

# Add to your shell (for bash; adjust for zsh/fish)
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bashrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc
source ~/.bashrc

# Install Python 3.12 and make it the default for this project
pyenv install 3.12.7
pyenv global 3.12.7

python --version   # should print Python 3.12.7
```

### 4.2 Option B — Distro packages

**Debian/Ubuntu (dead snakes PPA):**
```bash
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3.12-dev
```

**Fedora** (already ships recent Python; check):
```bash
python3 --version
# If < 3.12, use pyenv (Option A)
```

### 4.3 Create a virtual environment

From the project root (after cloning — see next section), do:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # activates (venv) in your prompt
python -m pip install --upgrade pip
pip install -r requirements.txt
```

> On Debian with `python3.12-venv`, use `python3.12 -m venv .venv` instead of `python -m venv .venv`.

To leave the venv later: `deactivate`. To re-enter: `source backend/.venv/bin/activate`.

---

## 5. Installing the Frontend Toolchain (Node.js 20)

MaintainIQ's frontend uses Next.js 16 and requires Node.js 20.

### 5.1 Option A — NodeSource (Debian/Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # v20.x
npm --version
```

### 5.2 Option B — nvm (recommended, all distros)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version
```

### 5.3 Option C — Distro packages

**Fedora:**
```bash
sudo dnf install -y nodejs npm
```

**Arch:**
```bash
sudo pacman -S nodejs npm
```

> If your distro only ships Node 18/22, prefer nvm (Option B) to pin Node 20 exactly, matching the Docker `node:20-alpine` image.

---

## 6. Clone the Repository

```bash
# Pick a working directory
cd ~
git clone <your-repo-url> maintainiq-ai
cd maintainiq-ai
```

If you already have the folder (this guide lives inside it), just `cd` into it:
```bash
cd "/media/sadiq-khan-dev/Local Disk (HDD:1)/New folder/maintainiq-ai"
```

---

## 7. Configure the Backend

```bash
cd backend
cp .env.example .env
nano .env        # or: code .env / vim .env
```

### 7.1 Required vs optional

| Variable | Required? | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | **Yes** | NeonDB (or any Postgres). Format: `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require` |
| `CLERK_ISSUER` | Yes (auth) | Your Clerk frontend API URL |
| `CLERK_JWKS_URL` | Yes (auth) | JWKS endpoint for JWT verification |
| `AI_PROVIDER` | Yes (AI) | `anthropic` or `gemini` |
| `AI_API_KEY` | Yes (AI) | Anthropic key when provider=anthropic |
| `GEMINI_API_KEY` | If gemini | Google AI key when provider=gemini |
| `CLOUDINARY_*` | Optional | Media uploads (photos/voice) |
| `SMTP_*` | Optional | Email notifications |
| `SLACK_WEBHOOK_URL` | Optional | Slack/Teams alerts |
| `FRONTEND_URL` | Yes | `http://localhost:3000` in dev |
| `BACKEND_URL` | Yes | `http://localhost:8000` in dev |

### 7.2 Getting a DATABASE_URL (NeonDB)

1. Sign up at https://neon.tech
2. Create a project → copy the connection string (it looks like `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`).
3. Paste it into `.env` as `DATABASE_URL`.

You can also run a local Postgres:
```bash
# Debian/Ubuntu
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER maintainiq WITH PASSWORD 'secret';"
sudo -u postgres psql -c "CREATE DATABASE maintainiq OWNER maintainiq;"
# DATABASE_URL=postgresql://maintainiq:secret@localhost:5432/maintainiq
```

### 7.3 Clerk setup

1. Sign up at https://clerk.com
2. Create an application.
3. In **API Keys**, copy the **Frontend API URL** → `CLERK_ISSUER` (e.g. `https://xxx.clerk.accounts.dev`).
4. Append `/.well-known/jwks.json` → `CLERK_JWKS_URL`.
5. The frontend needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (see next section).

---

## 8. Configure the Frontend

```bash
cd ../frontend
cp .env.local.example .env.local   # if an example exists; otherwise create it
nano .env.local
```

`.env.local` contents:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> If there is no `.env.local.example`, just create `.env.local` with the values above. The `NEXT_PUBLIC_API_URL` must point at wherever the backend listens (`:8000` locally, or your deployed backend URL).

---

## 9. Run MaintainIQ Locally (Dev Mode)

You need **two terminals** (or use the process-manager approach in section 16).

### Terminal 1 — Backend (FastAPI on :8000)

```bash
cd backend
source .venv/bin/activate
alembic upgrade head      # apply DB migrations first
python -m uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Visit the interactive API docs at **http://localhost:8000/docs**.

### Terminal 2 — Frontend (Next.js on :3000)

```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:3000**.

### 9.1 Smoke test

```bash
curl http://localhost:8000/api/health    # backend health
curl http://localhost:3000               # frontend HTML
```

---

## 10. Seed Demo Data

In a new terminal (with the venv activated):

```bash
cd backend
source .venv/bin/activate
python seed.py
```

This creates **8 sample assets, 3 issues, and 1 maintenance record** so you can explore the UI immediately.

---

## 11. Run with Docker / Docker Compose

If you prefer containers (recommended for a clean, reproducible environment), use Docker.

### 11.1 Install Docker (Debian/Ubuntu)

```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER      # log out/in after this
```

**Fedora:**
```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

**Arch:**
```bash
sudo pacman -S docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

Verify:
```bash
docker --version
docker compose version
```

### 11.2 Configure env for Docker

The `docker-compose.yml` reads `./backend/.env`. Make sure `backend/.env` exists (section 7) with `DATABASE_URL`, Clerk, and AI keys.

> Note: inside the compose network, the frontend reaches the backend at `http://backend:8000` (set automatically in the compose file). The backend's `FRONTEND_URL` should still be `http://localhost:3000` so links/emails work from your host browser.

### 11.3 Build & run

From the project root:
```bash
docker compose up --build -d
```

- Backend → http://localhost:8000
- Frontend → http://localhost:3000

The backend container auto-runs `alembic upgrade head` and `seed.py` on start (see `backend/Dockerfile` CMD).

### 11.4 Useful Docker commands

```bash
docker compose logs -f backend      # follow backend logs
docker compose logs -f frontend     # follow frontend logs
docker compose down                 # stop
docker compose down -v              # stop and remove volumes
docker compose restart backend
```

### 11.5 Running without Docker (manual) — already covered in section 9.

---

## 12. Database Migrations (Alembic)

Whenever you pull new code that changes models, apply migrations:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

Create a new migration after editing SQLAlchemy models:
```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

Check current revision:
```bash
alembic current
```

> In Docker, migrations run automatically on container start. For manual runs, always `alembic upgrade head` after a `git pull`.

---

## 13. Using the Product

The full product guide is in `how-to-use.md`. Quick Linux-relevant recap:

### 13.1 Reporters (no account)
- Open phone camera → scan the asset QR, or visit `http://localhost:3000/assets/<ASSET_CODE>`.
- Tap **Report an Issue**, describe in English or Roman Urdu/Urdu, attach photo/voice (if Cloudinary is configured), submit.
- Track at `http://localhost:3000/track/<ISSUE_NUMBER>`.

### 13.2 Technicians
- **Dashboard → Issues** (Dispatch Board). SLA shown per issue.
- Open issue → advance state machine: `assigned → inspection_started → maintenance_in_progress → resolved`.
- Add maintenance record (notes, parts, cost). Generate AI summary.

### 13.3 Admins
- **Assets**: add/edit/retire, model parent/child hierarchy, bulk QR print (`/dashboard/qr-print`).
- **Preventive**: generate due/overdue PM work orders (or schedule `POST /api/issues/generate-preventive` via cron).
- **Analytics**: spend, MTTR, top assets/locations.
- Set roles in Clerk: `public_metadata.role` = `admin` or `technician`.

### 13.4 Scheduling preventive work orders (Linux cron)

```bash
crontab -e
# Run daily at 02:00, calling the backend endpoint
0 2 * * * curl -X POST http://localhost:8000/api/issues/generate-preventive >> /var/log/maintainiq-pm.log 2>&1
```

For SLA breach alerts:
```bash
# Every 15 min
*/15 * * * * curl -s http://localhost:8000/api/issues/sla-breach >> /var/log/maintainiq-sla.log 2>&1
```

> If the endpoint requires auth, pass the appropriate Bearer token via `-H "Authorization: Bearer <token>"`.

---

## 14. Environment Variables Reference

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
CLERK_ISSUER=https://xxx.clerk.accounts.dev
CLERK_JWKS_URL=https://xxx.clerk.accounts.dev/.well-known/jwks.json
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
AI_PROVIDER=anthropic
AI_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
ADMIN_EMAIL=
SLACK_WEBHOOK_URL=
NOTIFY_WEBHOOK_URL=
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

All integrations are **optional and degrade gracefully** when blank.

---

## 15. Configuring Integrations on Linux

### 15.1 AI (Anthropic or Gemini)
- `AI_PROVIDER=anthropic` + `AI_API_KEY=sk-ant-...`
- Or `AI_PROVIDER=gemini` + `GEMINI_API_KEY=...`
- Keys never reach the frontend (backend-only calls).

### 15.2 Cloudinary (photo/voice intake)
Sign up at cloudinary.com → Dashboard shows cloud name, API key, secret.
```
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

### 15.3 SMTP email (optional)
Use a provider (e.g., Gmail app password, SendGrid, Mailgun):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=app-password
MAIL_FROM=MaintainIQ <no-reply@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com
```
Test sending:
```bash
curl -X POST http://localhost:8000/api/issues/report ...   # reporter gets email if configured
```

### 15.4 Slack / Teams webhook (optional)
Create an incoming webhook in Slack (or Teams connector) and set:
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```
Critical issues and SLA breaches post automatically.

---

## 16. Backgrounding & Process Management on Linux

### 16.1 Simple background with `&` + `nohup`
```bash
cd backend && source .venv/bin/activate
nohup uvicorn app.main:app --port 8000 > /tmp/miq-backend.log 2>&1 &
cd frontend && nohup npm run dev > /tmp/miq-frontend.log 2>&1 &
```

### 16.2 systemd (recommended for always-on servers)

Create `/etc/systemd/system/maintainiq-backend.service`:
```ini
[Unit]
Description=MaintainIQ Backend
After=network.target

[Service]
User=youruser
WorkingDirectory=/home/youruser/maintainiq-ai/backend
Environment=PATH=/home/youruser/maintainiq-ai/backend/.venv/bin
ExecStart=/home/youruser/maintainiq-ai/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now maintainiq-backend
sudo systemctl status maintainiq-backend
```

Do the same for the frontend (or use Docker). Logs: `journalctl -u maintainiq-backend -f`.

---

## 17. Reverse Proxy (Nginx) for Local/Prod

To serve both on standard ports with one domain (useful for Clerk redirect URLs and mobile testing):

```bash
sudo apt install -y nginx     # Debian/Ubuntu
```

`/etc/nginx/sites-available/maintainiq`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/maintainiq /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

For HTTPS, use Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 18. Troubleshooting on Linux

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ModuleNotFoundError` | venv not activated / deps missing | `source backend/.venv/bin/activate && pip install -r requirements.txt` |
| `psycopg2` build fails | missing `libpq-dev`/`gcc` | `sudo apt install -y libpq-dev gcc` (Debian) |
| `uvicorn: command not found` | inside venv? | activate venv, or `pip install uvicorn` |
| Port 8000/3000 in use | another process | `sudo lsof -i :8000` then `kill <pid>`; or change `--port` |
| `DATABASE_URL` connection refused | wrong host/SSL | ensure `?sslmode=require` for Neon; check firewall |
| Clerk 401 on frontend | keys mismatch | verify `CLERK_JWKS_URL` and publishable/secret keys |
| AI calls fail | `AI_API_KEY` blank/wrong | check backend `.env`; provider must match |
| CORS errors in browser | `FRONTEND_URL` wrong | set `FRONTEND_URL=http://localhost:3000` in backend env |
| Docker permission denied | not in `docker` group | `sudo usermod -aG docker $USER` then log out/in |
| `alembic` no changes / head mismatch | forgot migration | `alembic upgrade head` after pull |
| Node 18 errors (Next 16) | wrong Node | `nvm install 20 && nvm use 20` |
| Frontend can't reach API | `NEXT_PUBLIC_API_URL` wrong | set to `http://localhost:8000` (or backend URL) |

### 18.1 Reading logs
```bash
# Manual
tail -f /tmp/miq-backend.log
tail -f /tmp/miq-frontend.log

# Docker
docker compose logs -f

# systemd
journalctl -u maintainiq-backend -f
```

### 18.2 Firewall (if accessing from other devices)
```bash
sudo ufw allow 3000
sudo ufw allow 8000
```

---

## 19. Updating MaintainIQ

```bash
cd maintainiq-ai
git pull

# Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# Frontend
cd ../frontend
npm install

# Restart services (manual)
# Ctrl+C the running terminals, or:
sudo systemctl restart maintainiq-backend

# Docker
docker compose up --build -d
```

---

## 20. Production Deployment Notes

- **Frontend:** Vercel (set `NEXT_PUBLIC_API_URL` to your backend URL).
- **Backend:** Render / Railway / Fly.io (set all `backend/.env` vars; run `alembic upgrade head` as a release step).
- Update `FRONTEND_URL` and `BACKEND_URL` to production domains.
- Configure CORS origins for production in the backend.
- Use the Nginx/Certbot setup (section 17) if self-hosting.
- Schedule preventive + SLA cron jobs (section 13.4) against your production backend URL.
- The Docker images (`python:3.12-slim`, `node:20-alpine`) pin the exact runtimes used in dev, so behavior is consistent across Linux hosts.

---

## Quick Start Cheat-Sheet (Linux)

```bash
# 1. Toolchain (Debian/Ubuntu example)
sudo apt update && sudo apt install -y git curl build-essential python3.12-venv
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs

# 2. Clone + configure
git clone <repo> maintainiq-ai && cd maintainiq-ai
cd backend && cp .env.example .env && nano .env
cd ../frontend && nano .env.local

# 3. Backend
cd ../backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && alembic upgrade head && python seed.py
uvicorn app.main:app --reload --port 8000

# 4. Frontend (new terminal)
cd frontend && npm install && npm run dev

# 5. Open http://localhost:3000
```

For the full product walkthrough, see [`how-to-use.md`](./how-to-use.md). For architecture, API reference, and env vars, see [`README.md`](./README.md).
