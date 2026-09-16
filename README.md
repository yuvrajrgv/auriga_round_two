# Helpdesk Ticket System

A full-stack helpdesk queue for creating, filtering, and prioritizing support tickets. Overdue tickets are automatically escalated.

## Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, JavaScript/JSX, Oxlint
- **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy, Pydantic
- **Database:** PostgreSQL 16 via Docker Compose

The frontend uses Vite's `/api` proxy to reach the backend at `localhost:8000`, including in forwarded Codespaces environments.

## Structure

```text
helpdesk-ticket-system/
├── docker-compose.yml              # PostgreSQL service
├── backend/app/
│   ├── database.py                 # Database engine and sessions
│   ├── escalation.py               # Overdue priority escalation
│   ├── main.py                     # FastAPI app and scheduler
│   ├── models.py                   # Ticket database model
│   ├── routes.py                   # API endpoints
│   └── schemas.py                  # Request and response validation
└── frontend/
	├── src/App.jsx                 # Dashboard and ticket form
	├── src/index.css               # Global styles
	├── package.json                # Frontend scripts and dependencies
	└── vite.config.js              # Vite plugins and API proxy
```

## Run Locally

Start PostgreSQL:

```bash
cd helpdesk-ticket-system
docker compose up -d postgres
```

Start the backend in a second terminal:

```bash
cd helpdesk-ticket-system/backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend in a third terminal:

```bash
cd helpdesk-ticket-system/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open the Vite URL shown in the terminal. API documentation is available at `/docs`.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `POST` | `/tickets/` | Create a ticket |
| `GET` | `/tickets/` | List, filter, sort, and paginate tickets |
| `POST` | `/tickets/escalate-overdue` | Run one escalation pass |

## Automatic Escalation

The backend checks for overdue tickets at startup and every 60 seconds. A ticket whose response deadline has passed is raised by one level:

```text
normal -> high -> urgent
```

Each run changes a ticket by at most one level. Urgent tickets are unchanged. See [reasoning.md](reasoning.md) for implementation decisions and troubleshooting notes.

## Checks

```bash
cd helpdesk-ticket-system/frontend && npm run build && npm run lint
cd ../backend && ./venv/bin/python -m compileall -q app
```