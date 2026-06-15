# RM2 Gate — Visitor Management System

Full-stack application for RM2 Residency, Bangalore.
**FastAPI** backend + **React Native** mobile app + **React** web landing page.

---

## Project Structure

```
rm2-fullstack/
├── backend/          ← FastAPI (Python)
├── frontend/         ← React App (Legacy Web App)
├── mobile/           ← React Native (Expo) Mobile App
├── landing-page/     ← Minimal React Web Landing Page
└── README.md
```

---

## Quick Start

### Step 1 — Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# (SQLite is default — no DB setup needed for dev)

# Run database migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# Seed the database (flats, gates, admin account)
python seeds.py

# Start server
python run.py
# → http://localhost:5000
# → http://localhost:5000/health
```

### Step 2 — Mobile App (Expo / React Native)

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
# → Scan the QR code with the Expo Go app on your phone, or press 'a' for Android emulator / 'i' for iOS simulator.
```

### Step 3 — Web Kiosk / Landing Page (Vite)

```bash
cd landing-page

# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## Default Credentials (after python seeds.py)

| Role  | Phone      | Password       |
|-------|------------|----------------|
| Admin | 9999999999 | Admin@RM2#2026 |

> ⚠️ Change admin password immediately after first login.

**Guards** are created by admin via the Guards page.
**Residents** self-register and are activated by admin.

---

## Actor Flows

### Resident
1. Go to `/register` → fill details → select flat from dropdown
2. Admin assigns flat and activates account
3. Login at `/login?role=resident`
4. Approve/deny visitor requests from dashboard

### Guard
1. Admin creates guard account (Guards page)
2. Login at `/login?role=guard`
3. Click "Start Shift" → select gate
4. Register visitors OR watch self check-ins appear live
5. Confirm entries, mark exits

### Admin
1. Login at `/login?role=admin`
2. Assign flats to registered residents (Residents page)
3. Manage guards, generate bills, post announcements, view reports

### Visitor (no account needed)
1. Visit `/checkin` or scan QR code at gate
2. Fill name, phone, flat, purpose
3. Resident gets notified → approves or denies
4. Guard sees approval live on dashboard → opens gate

---

## All Pages

| Role     | Page               | Path                        |
|----------|--------------------|-----------------------------|
| All      | Landing            | /                           |
| All      | Login              | /login?role=guard/resident/admin |
| Resident | Register           | /register                   |
| Visitor  | Self Check-In      | /checkin                    |
| Guard    | Dashboard          | /guard                      |
| Guard    | Register Visitor   | /guard/register             |
| Guard    | Inside Now         | /guard/inside               |
| Guard    | Shift History      | /guard/shift                |
| Resident | Dashboard          | /resident                   |
| Resident | Visit History      | /resident/history           |
| Resident | Passes             | /resident/passes            |
| Resident | Bills              | /resident/bills             |
| Resident | Announcements      | /resident/announcements     |
| Admin    | Overview           | /admin                      |
| Admin    | Residents          | /admin/residents            |
| Admin    | Guards             | /admin/guards               |
| Admin    | Flats              | /admin/flats                |
| Admin    | Maintenance        | /admin/maintenance          |
| Admin    | Announcements      | /admin/announcements        |
| Admin    | Reports            | /admin/reports              |

---

## Environment Variables (backend/.env)

```
ENVIRONMENT=development
DATABASE_URL=sqlite:///rm2_vms.db
JWT_SECRET_KEY=change-this-in-production
SOCIETY_NAME=RM2 Residency
SOCIETY_CITY=Bangalore
```

---

## Production

```bash
# Backend
gunicorn "run:app" --workers 4 --bind 0.0.0.0:5000

# Frontend
npm run build
# Serve build/ via nginx or any static host
```

Switch `DATABASE_URL` to PostgreSQL for production.
