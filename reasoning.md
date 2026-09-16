# Implementation Reasoning

## What Was Built

The project is a helpdesk ticket queue with three cooperating parts:

1. A React dashboard for support staff.
2. A FastAPI service that validates requests and exposes ticket operations.
3. A PostgreSQL database managed by Docker Compose.

The main workflow is: a user opens the dashboard, creates a ticket with customer details, a title, a description, a priority, an optional assignee, and a response deadline. The backend persists the ticket, and the frontend reloads the queue. The queue can be filtered by overdue status, assignee, and customer name, and it is paginated for larger data sets.

The added twist is deadline enforcement. The service periodically finds tickets whose agreed response time has passed and raises their priority by one level. This makes overdue work more visible without allowing a single check to jump a ticket directly from normal to urgent.

## Why These Choices Were Made

### React and Vite

React fits the dashboard because the page has several independent pieces of state: tickets, loading and error state, filters, pagination, modal visibility, form values, and submission state. Vite provides a quick development loop and a small production build without adding a larger framework than the application needs.

### Tailwind CSS

The interface contains repeated visual patterns such as panels, badges, inputs, buttons, and responsive queue rows. Tailwind keeps those styles close to the markup and makes the desktop-to-mobile layout explicit through responsive utility classes.

### FastAPI

FastAPI provides typed request handling, clear route definitions, dependency injection, and generated API documentation. This is useful for a ticket API because invalid dates or missing fields should be rejected before database work begins.

### SQLAlchemy and PostgreSQL

SQLAlchemy separates Python ticket objects from SQL statements while keeping the model readable. PostgreSQL provides durable relational storage and is a better fit than browser-only state because tickets must survive page refreshes and be shared by API clients.

### A Small Escalation Service

The escalation rule lives in `backend/app/escalation.py`, rather than inside the route or scheduler. That gives the rule one owner and allows both the periodic task and the manual endpoint to use exactly the same behavior. The function accepts an optional `now` value, which makes its time-based behavior straightforward to test with a fixed timestamp.

### Lifespan Background Task

FastAPI's lifespan hook starts the escalation loop with the application and cancels it when the application shuts down. The loop runs once immediately, then sleeps for 60 seconds. Each pass opens and closes its own database session so a long-running process does not retain a session indefinitely.

## How The Main Flows Work

### Creating A Ticket

The modal in `frontend/src/App.jsx` stores each input in the `form` state. On submit, it trims text fields and sends JSON to `POST /api/tickets/`. FastAPI maps that payload to `TicketCreate`, Pydantic converts the deadline to a `datetime`, and SQLAlchemy inserts a `Ticket` row. After the response succeeds, the modal closes and the queue is fetched again.

### Loading The Queue

The dashboard converts its current filter and page state into query parameters. The backend builds a SQLAlchemy query for database-supported filters, loads the matching tickets, sorts them so overdue tickets appear first, then applies pagination. The response model exposes the database fields needed by the UI while keeping serialization consistent.

### Escalating Overdue Tickets

`escalate_overdue_tickets()` uses the current time, selects tickets with a past deadline and a priority below urgent, then advances each selected ticket by one index in `("normal", "high", "urgent")`. It commits only when at least one ticket changed and returns the number escalated.

The selection is the important safety property:

```python
Ticket.priority.in_("normal", "high")
```

Because urgent tickets are excluded, and because the function writes only the next level, one run cannot promote a ticket more than once. A later run can promote a high ticket to urgent if it remains overdue.

## Problems Encountered And Resolutions

### Wrong Python Interpreter

VS Code and the default shell were using `/home/codespace/.python/current/bin/python`, which did not contain FastAPI or Uvicorn. The project already had the required packages in `backend/venv`. Running `./venv/bin/python -m uvicorn ...` and selecting `backend/venv/bin/python` in VS Code resolved the import warnings and command-not-found errors.

### Running Docker Compose From The Wrong Directory

Running `docker compose up` from the repository root produced `no configuration file provided` because the compose file is inside `helpdesk-ticket-system`. Running the command from that directory, or passing the compose file explicitly, started PostgreSQL correctly.

### Port Collisions

A previous Vite process already occupied port 5173, so a second process moved to 5174. Likewise, starting another backend on port 8000 returned `Address already in use`. The existing healthy process should be reused, or the new process should be assigned another port.

### Codespaces Fetch Failure

The first frontend version built its API URL from the browser hostname. In a forwarded Codespaces page, the browser cannot use its own `localhost:8000` to reach the container backend, so requests failed with `TypeError: Failed to fetch`. The frontend now calls same-origin `/api` paths, and Vite proxies those paths to `http://127.0.0.1:8000`. This works for both local browser access and forwarded URLs.

### Manual POST Redirect

FastAPI redirects `/tickets/escalate-overdue/` to `/tickets/escalate-overdue` with HTTP 307 because the route is declared without the trailing slash. A command-line POST that does not follow redirects can appear to fail even though the route is healthy. The canonical path, or a client configured to follow redirects, avoids that confusion.

## Verification Performed

- The API health endpoint returned `200 OK`.
- A ticket was created directly through the API and persisted in PostgreSQL.
- An overdue normal ticket became high after one escalation run.
- The same ticket became urgent after the next run, proving one level per run.
- The frontend production build completed successfully.
- The backend compiled successfully with Python's `compileall`.
- The complete application and subsequent escalation changes were pushed to `origin/main`.

## Current Scope And Future Improvements

The current implementation is intentionally focused on the requested workflow. Useful next steps would be adding automated test files, authentication and role-aware assignment, ticket status transitions, server-side validation for allowed priority values, and a production deployment configuration where the frontend and backend are containerized separately. The existing Docker Compose file is a development database setup, not a complete production orchestration stack.