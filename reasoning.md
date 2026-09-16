# Implementation Reasoning

## Stage 1: Define The Product

The goal was a small helpdesk queue where a user can create tickets, see the response deadline, search by customer, filter by assignee or overdue status, and move through pages of results.

I used React for the dashboard, FastAPI for the API, SQLAlchemy for database access, and PostgreSQL for persistent storage. Docker Compose runs the database, while the frontend and backend run as development processes.

## Stage 2: Build The Core Flow

The ticket form collects the customer, title, description, priority, assignee, and response deadline. React sends this data as JSON to `POST /tickets/`. Pydantic validates it, SQLAlchemy stores it, and the dashboard reloads the queue after a successful response.

The list endpoint handles search, filters, pagination, and ordering. Overdue tickets appear first, followed by urgent tickets and the earliest deadlines.

## Stage 3: Add The Twist

The new requirement was automatic escalation when a ticket misses its agreed response time.

`backend/app/escalation.py` owns this rule:

```text
normal -> high -> urgent
```

The function selects only overdue `normal` and `high` tickets. It moves each one up exactly one level and leaves urgent tickets unchanged. FastAPI starts the check at launch and repeats it every 60 seconds. A manual `POST /tickets/escalate-overdue` endpoint makes the same check easy to verify.

## Stage 4: Make The Interface Usable

The dashboard includes filters, pagination, a modal form, priority badges, overdue highlighting, a live queue indicator, an escalation action, keyboard closing with Escape, and responsive styling. Vite proxies `/api` to the backend so the browser works locally and through a forwarded Codespaces URL.

## Hard Parts I Faced

### 1. Wrong Python environment

The default Python interpreter did not have FastAPI or Uvicorn, even though the project virtual environment did. This caused import warnings in VS Code and `uvicorn: command not found` in the shell.

### 2. Docker started from the wrong folder

Docker Compose could not find its configuration from the repository root. The compose file is inside `helpdesk-ticket-system`, so the command had to run from that directory.

### 3. Ports were already in use

An existing Vite process occupied port 5173, and an existing Uvicorn process occupied port 8000. Starting duplicates caused address errors, so I reused healthy services or selected another port.

### 4. The browser could not reach the API

The first frontend version called `localhost:8000` directly. That works locally but fails through a Codespaces forwarded URL because the browser's localhost is not the container's localhost.

### 5. Testing a time-based rule

I tested with an overdue normal ticket: the first run changed it to high, and the next run changed it to urgent. This confirmed the one-level-per-run rule.

## How I Solved Them

- Selected `backend/venv/bin/python` and ran Uvicorn through that interpreter.
- Started PostgreSQL with `docker compose up -d postgres` from `helpdesk-ticket-system`.
- Reused healthy services and checked ports before launching duplicates.
- Changed frontend requests to same-origin `/api` calls and added a Vite proxy to `127.0.0.1:8000`.
- Kept escalation in one reusable function and verified it with two consecutive runs.

## Final Result

The project has a persistent ticket queue, a responsive dashboard, a working create-ticket flow, filtering and pagination, and automatic deadline escalation. The frontend build and backend compilation passed, the API was tested against PostgreSQL, and the changes were pushed to `origin/main`.
