# Helpdesk Ticket System

A full-stack helpdesk queue for creating, filtering, prioritizing, and reviewing support tickets. The application also monitors response deadlines and automatically escalates overdue tickets.

## Technology Stack

### Frontend

- **React 19**: Component-based UI and state management through hooks.
- **Vite 8**: Development server, hot module replacement, and production bundling.
- **Tailwind CSS 4**: Utility-first styling for the dashboard, queue, modal, status badges, and responsive layout.
- **JavaScript with JSX**: Application code is kept lightweight and uses the browser Fetch API for HTTP requests.
- **Oxlint**: Frontend linting through the `npm run lint` script.

The frontend is a single dashboard. It loads tickets, sends filters and pagination parameters, opens a create-ticket modal, submits JSON to the API, and refreshes the queue after creation. In development, Vite proxies `/api` to the backend so the browser uses the same origin in both localhost and forwarded Codespaces environments.

### Backend

- **Python 3.14 virtual environment**: Project-isolated runtime at `backend/venv`.
- **FastAPI**: HTTP API, request routing, automatic OpenAPI documentation, and dependency injection for database sessions.
- **Uvicorn**: ASGI server used to run the FastAPI application.
- **SQLAlchemy**: ORM and database connection layer.
- **Pydantic**: Validates ticket input and serializes database records into API responses.
- **PostgreSQL 16**: Persistent relational storage.

The API exposes ticket creation and listing endpoints. The list endpoint supports overdue filtering, assignee filtering, customer search, pagination, and queue ordering. Ticket priority follows `normal`, `high`, and `urgent`.

### Infrastructure

`docker-compose.yml` runs PostgreSQL only. The frontend and backend run as local development processes, while PostgreSQL runs in the `helpdesk-postgres` container. A named Docker volume keeps database data across container restarts.

## Project Structure

```text
auriga_round_two/
├── README.md
├── reasoning.md
├── .gitignore
└── helpdesk-ticket-system/
	├── docker-compose.yml
	├── backend/
	│   ├── venv/                 # Local runtime; ignored by Git
	│   └── app/
	│       ├── database.py       # PostgreSQL engine and sessions
	│       ├── escalation.py     # One-level overdue escalation logic
	│       ├── main.py           # FastAPI app and periodic scheduler
	│       ├── models.py         # SQLAlchemy Ticket table
	│       ├── routes.py         # Ticket HTTP endpoints
	│       └── schemas.py        # Pydantic request/response models
	└── frontend/
		├── package.json          # Scripts and JavaScript dependencies
		├── vite.config.js        # React/Tailwind plugins and API proxy
		├── index.html
		├── public/               # Static assets
		└── src/
			├── App.jsx           # Dashboard, filters, queue, and form
			├── App.css            # Component-level styles
			├── index.css         # Global styles and Tailwind entrypoint
			└── main.jsx           # React entrypoint
```

## How To Run

Start PostgreSQL from the application directory:

```bash
cd helpdesk-ticket-system
docker compose up -d postgres
```

Start the backend with the project interpreter:

```bash
cd helpdesk-ticket-system/backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend in a second terminal:

```bash
cd helpdesk-ticket-system/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open the Vite URL shown in the terminal. The API is available at `http://localhost:8000/`, and interactive API documentation is available at `/docs`.

## API Overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Health response |
| `POST` | `/tickets/` | Create a ticket |
| `GET` | `/tickets/` | List, filter, sort, and paginate tickets |
| `POST` | `/tickets/escalate-overdue` | Run one escalation pass manually |

## Automatic Escalation

When FastAPI starts, a background task checks for overdue tickets immediately and then every 60 seconds. An overdue ticket is one whose `response_deadline` is earlier than the current time. Each pass promotes at most one level:

```text
normal -> high -> urgent
```

Urgent tickets are not changed. The escalation function only selects `normal` and `high` tickets, so a ticket cannot jump two levels during one run. The manual endpoint makes the same operation deterministic to exercise or operate.

## Validation

```bash
cd helpdesk-ticket-system/frontend
npm run build
npm run lint
```

The backend can be syntax-checked with:

```bash
cd helpdesk-ticket-system/backend
./venv/bin/python -m compileall -q app
```