# MaintainIQ - AI-Powered QR Maintenance & Asset History Platform

Full-stack maintenance tracking platform with AI-powered issue triage, QR code generation, and complete asset lifecycle management.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** Python FastAPI
- **Database:** NeonDB (serverless Postgres) via SQLAlchemy + Alembic
- **Auth:** Clerk (JWT verification, roles: admin/technician)
- **AI:** Anthropic/OpenAI (backend-only calls)
- **Media:** Cloudinary
- **QR:** qrcode (Python)

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your credentials
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
CLERK_ISSUER=https://xxx.clerk.accounts.dev
CLERK_JWKS_URL=https://xxx.clerk.accounts.dev/.well-known/jwks.json
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-xxx
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
SMTP_HOST=            # optional, leave blank to disable email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
ADMIN_EMAIL=
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Demo Credentials

Sign up two Clerk accounts and set the `public_metadata.role` on each:

| Role | public_metadata.role | Capabilities |
|------|----------------------|--------------|
| Admin | `admin` | Register/edit/retire assets, assign issues, view everything |
| Technician | `technician` | View assigned work, update status, add maintenance records |

Set role in Clerk Dashboard → User → Metadata → `{"role":"admin"}` (or `technician`).

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/assets | admin | Create asset (unique code enforced) |
| GET | /api/assets | admin/tech | List assets (filterable) |
| GET | /api/assets/{code} | public | Public asset page (safe fields only) |
| PATCH | /api/assets/{id} | admin | Update asset |
| GET | /api/assets/qr/{code} | public | Generate QR code PNG |
| POST | /api/issues/report | public | Report issue (triggers AI triage) |
| GET | /api/issues | admin/tech | List issues (filterable) |
| GET | /api/issues/{id} | admin/tech | Get issue details |
| GET | /api/issues/track/{issue_number} | public | Public issue status lookup |
| PATCH | /api/issues/{id}/assign | admin | Assign technician |
| PATCH | /api/issues/{id}/status | tech (own) | Update status (state machine enforced) |
| POST | /api/issues/{id}/maintenance | tech (own) | Add maintenance record |
| GET | /api/issues/{id}/maintenance | admin/tech | List maintenance records |
| GET | /api/assets/{id}/history | admin/tech | View asset history |
| POST | /api/assets/{id}/retire | admin | Retire an asset |
| GET | /api/assets/code/{code} | admin/tech | Internal asset detail |
| GET | /api/assets/qr/{code} | public | Generate QR code PNG |
| GET | /api/assets/{code}/label | public | Print-ready QR label |
| POST | /api/ai/triage | admin/tech | AI triage endpoint |
| POST | /api/ai/maintenance-summary | admin/tech | AI maintenance report summary |
| POST | /api/ai/health-analysis | admin/tech | AI asset health / recurring-failure analysis |
| POST | /api/ai/preventive | admin/tech | AI preventive maintenance recommendation |
| POST | /api/ai/translate | public | Multilingual (Roman Urdu/Urdu → English) |
| POST | /api/upload | admin/tech | Cloudinary evidence upload |
| WS | /ws | public | Realtime issue/maintenance updates |
| GET | /api/dashboard/summary | admin/tech | Aggregate KPIs: status/priority breakdowns, due-for-service, recurring assets, technician workload, recent activity |

## AI Power-Ups (GenAI)

- **AI Issue Triage** – natural-language complaint → title, category, priority, possible causes, safe initial checks, recurring-pattern warning.
- **AI Maintenance Summary** – rough technician notes → professional service report.
- **AI Asset Health Analysis** – detects recurring failures, returns health score + risk level.
- **AI Preventive Recommendation** – suggests next service action and date.
- **AI Multilingual Assistant** – converts Roman Urdu / Urdu complaints into structured English.
- All AI output is advisory; users review, edit, and confirm before saving. API keys never reach the frontend.

## Bonus Capabilities

- **Rate limiting** on public/AI/upload endpoints (in-memory, per-IP sliding window).
- **Email notifications** on issue assignment and resolution (SMTP, optional).
- **Realtime updates** via WebSocket — dashboard toasts on status/maintenance changes.
- **Docker** + `docker-compose.yml` for reproducible deployment.
- **GitHub Actions** CI (backend compile + frontend lint/build).

## State Machine

```
reported → assigned → inspection_started → maintenance_in_progress ⇄ waiting_for_parts → resolved → closed
resolved/closed → reopened (always allowed)
```

## Business Rules (Server-Enforced)

1. Asset codes must be unique (409 on duplicate)
2. Strict status transition state machine
3. Cannot resolve without maintenance record
4. Technicians can only update own assigned issues
5. Cost cannot be negative
6. Every state change writes to asset_history
7. Public pages expose safe fields only
8. Retired assets show "Retired" badge

## Seed Data

```bash
cd backend
python seed.py
```

Creates 8 sample assets, 3 issues, and 1 maintenance record.

## Deployment

- **Frontend:** Vercel
- **Backend:** Render/Railway/Fly.io
- Set environment variables in both platforms
- Update CORS origins and NEXT_PUBLIC_API_URL for production
