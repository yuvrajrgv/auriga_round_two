Yes. Then let's lock the stack around Python, PostgreSQL, and Tailwind, while keeping the frontend as simple as possible.

Final Tech Stack
Layer	Technology	Why
Backend	FastAPI	Python-based, clean REST APIs
Frontend	Jinja2 + HTML	Avoids needing React
Styling	Tailwind CSS	Modern UI without Bootstrap
Database	PostgreSQL	Reliable relational database
ORM	SQLAlchemy	Database interaction from Python
Validation	Pydantic	Request/response validation
Testing	Pytest	Test backend logic
Version Control	Git + GitHub	Track project changes
Architecture
                Browser
                   │
                   ▼
          HTML + Jinja2 + Tailwind
                   │
                   ▼
                FastAPI
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   Ticket API   Filters    Search
        │
        ▼
    Queue Logic
        │
        ▼
    SQLAlchemy
        │
        ▼
    PostgreSQL
Why this stack fits this assignment

The backend is the important part, because the assignment specifically says the queue ordering is the heart of the system.

So we'll keep the application simple:

Ticket
   ↓
FastAPI
   ↓
Validate with Pydantic
   ↓
Store/query with SQLAlchemy
   ↓
PostgreSQL
   ↓
Apply queue ordering
   ↓
Jinja2 renders the result
   ↓
Tailwind makes it look respectable

And the UI can still be properly designed with:

Dashboard
Ticket table
Priority badges
Overdue indicators
Search bar
Filters
Assignment controls
Pagination
Create/edit ticket forms
Empty/loading/error states where appropriate
One important clarification

Tailwind isn't doing validation. Pydantic handles the data validation on the Python side.

For example:

Frontend
   ↓
"priority": "urgent"
   ↓
Pydantic
   ↓
Valid? ── No → Error
   │
  Yes
   ↓
FastAPI
   ↓
PostgreSQL

That's a clean separation of responsibilities.

So from now on, for this project, our baseline is:

FastAPI + Jinja2 + Tailwind CSS + PostgreSQL + SQLAlchemy + Pydantic + Pytest

We'll introduce each piece only when we actually need it, because learning seven technologies simultaneously would be a particularly creative way to lose a timed assessment.

okk add reactt inn itt forr better ui 

Yep. If we're willing to add React, I'd use it because the UI will be much easier to make polished and interactive, especially for filters, assignment, search, pagination, and live queue updates.

Final Stack 🔒
Layer	Technology	Purpose
Frontend	React + Vite	Interactive UI
Styling	Tailwind CSS	Modern, responsive design
Backend	FastAPI	Python REST API
Validation	Pydantic	Validate API data
Database	PostgreSQL	Store tickets and users
ORM	SQLAlchemy	Python ↔ PostgreSQL
Testing	Pytest	Backend testing
Version Control	Git + GitHub	Source control
Architecture
                  React + Vite
                       │
                 Tailwind CSS
                       │
                    REST API
                       │
                       ▼
                    FastAPI
                       │
                 Pydantic
                       │
                  SQLAlchemy
                       │
                       ▼
                  PostgreSQL
How the project will work
User
 │
 ▼
React UI
 │
 │ HTTP requests
 ▼
FastAPI
 │
 ├── Ticket creation
 ├── Queue ordering ⭐
 ├── Overdue filtering
 ├── Customer search
 ├── Assignment
 └── Pagination
 │
 ▼
SQLAlchemy
 │
 ▼
PostgreSQL
The main thing we'll focus on

The queue ordering algorithm gets built first.

Something along the lines of:

                 Tickets
                    │
                    ▼
             Check deadline
                    │
          ┌─────────┴─────────┐
          │                   │
       Overdue            Not overdue
          │                   │
          ▼                   ▼
       Higher            Check priority
       urgency                 │
          │             Urgent → Normal
          │                   │
          └─────────┬─────────┘
                    ▼
             Earlier deadline
                    │
                    ▼
              Final Queue

We'll define the exact ordering rule before implementing it, because "most pressing" is the core requirement and we don't want to casually invent business logic halfway through.

Final project structure

Eventually something like:

helpdesk/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   └── database.py
│   │
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   │
│   └── ...
│
├── README.md
├── REASONING.md
└── AI_LOG.md

This gives us a proper Python backend + modern React frontend, without unnecessarily adding things like Redux, Docker, or ten other technologies just to make the package.json look intimidating.

Locked stack:

🐍 FastAPI + Pydantic + SQLAlchemy + PostgreSQL
⚛️ React + Vite + Tailwind CSS
🧪 Pytest
🔧 Git/GitHub

okk soo ivee crretedda blankk folder noww lettt startt  movingg 
foundd the oldd onee noww tell mee nextt i dottn wantt ot testt 
beforee strtingg thiss iss till noww
whenn i clickk crete a tivkett this apper in bg
this is terminall onee this iss two 

andd alsoo btww this iss the 3

Yes. This is the actual twist, and we should handle it now before spending more time on UI.

The new requirement is:

Every automated run:
    ↓
Find tickets past response_deadline
    ↓
normal → high
high   → urgent
urgent → stays urgent
    ↓
Only ONE level per run

So a ticket that is normal and overdue does not become urgent in one run.

1. Install the scheduler dependency

In your backend terminal where (venv) is active:

pip install apscheduler
2. Replace backend/app/main.py

Use this complete version:

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import Base, SessionLocal, engine
from app.models import Ticket
from app.routes import router


Base.metadata.create_all(bind=engine)


PRIORITY_LEVELS = {
    "normal": "high",
    "high": "urgent",
    "urgent": "urgent",
}


def escalate_overdue_tickets():
    db = SessionLocal()

    try:
        from datetime import datetime

        now = datetime.utcnow()

        overdue_tickets = (
            db.query(Ticket)
            .filter(
                Ticket.response_deadline < now,
                Ticket.priority != "urgent",
                Ticket.status != "resolved",
            )
            .all()
        )

        for ticket in overdue_tickets:
            current_priority = ticket.priority.lower()

            if current_priority in PRIORITY_LEVELS:
                ticket.priority = PRIORITY_LEVELS[current_priority]

        db.commit()

        if overdue_tickets:
            print(
                f"Escalation check completed: "
                f"{len(overdue_tickets)} ticket(s) processed."
            )

    except Exception as error:
        db.rollback()
        print(f"Escalation check failed: {error}")

    finally:
        db.close()


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        escalate_overdue_tickets,
        "interval",
        minutes=1,
        id="ticket_escalation_check",
        replace_existing=True,
    )

    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(
    title="Helpdesk Ticket System",
    lifespan=lifespan,
)


app.include_router(router)


@app.get("/")
def root():
    return {"message": "Helpdesk Ticket System API is running"}
3. Fix the priority ordering in routes.py

Your current queue logic only understands urgent and normal.

Open:

backend/app/routes.py

Replace the whole file with:

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Ticket
from app.schemas import TicketCreate, TicketResponse


router = APIRouter(prefix="/tickets", tags=["Tickets"])


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=TicketResponse)
def create_ticket(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
):
    new_ticket = Ticket(**ticket.model_dump())

    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return new_ticket


@router.get("/", response_model=list[TicketResponse])
def get_tickets(
    db: Session = Depends(get_db),
    overdue: bool | None = Query(default=None),
    assigned_to: str | None = Query(default=None),
    customer: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    now = datetime.utcnow()

    query = db.query(Ticket)

    if overdue is True:
        query = query.filter(Ticket.response_deadline < now)

    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)

    if customer:
        query = query.filter(
            Ticket.customer_name.ilike(f"%{customer}%")
        )

    tickets = query.all()

    priority_rank = {
        "urgent": 0,
        "high": 1,
        "normal": 2,
    }

    tickets.sort(
        key=lambda ticket: (
            ticket.response_deadline >= now,
            priority_rank.get(ticket.priority.lower(), 3),
            ticket.response_deadline,
            ticket.created_at,
        )
    )

    start = (page - 1) * page_size
    end = start + page_size

    return tickets[start:end]
4. Update schemas.py

Your priority should explicitly allow:

normal
high
urgent

Replace backend/app/schemas.py with:

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


Priority = Literal["normal", "high", "urgent"]


class TicketCreate(BaseModel):
    customer_name: str
    title: str
    description: str
    priority: Priority
    response_deadline: datetime
    assigned_to: str | None = None


class TicketResponse(TicketCreate):
    id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
5. Important: your database model already supports this

Because models.py currently stores priority as:

String(20)

we do not need a database migration just to add high.

So the escalation can work immediately.

6. What the automated check now does

Every 1 minute:

Scheduler
   ↓
Find overdue tickets
   ↓
Is priority normal?
   ↓
YES → high

Next run
   ↓
Still overdue?
   ↓
high → urgent

Next run
   ↓
urgent → urgent

That satisfies the "one level per run" requirement.

And the queue then understands all three levels:

OVERDUE URGENT
OVERDUE HIGH
OVERDUE NORMAL
URGENT
HIGH
NORMAL

with earlier deadlines breaking ties.

One thing we need to fix next

Your frontend currently only lets you create:

Normal
Urgent

We need to add High to the priority dropdown and make the dashboard recognize it.

Do the three backend file replacements above first, then restart FastAPI with:

uvicorn app.main:app --reload --host 0.0.0.0

The scheduler will start automatically with FastAPI.

oko nowwletss createe thatt read mee andd all i teoldd oyu forr 

Done. I created the README.md covering the assignment, problem statement, tech stack, why each technology was chosen, architecture, queue-ordering rule, automated escalation, API endpoints, frontend, setup, and project structure.

Download the completed README.md

For your CodeSpace project, replace the existing root README.md with this file.

README.md
Document
okk noww givee ee codee to enhaee myyuii 

Yes. Since the functionality is already there, now we can make the UI look much more like a real helpdesk product instead of a neatly arranged form collection.

Replace the entire frontend/src/App.jsx with this version:

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = window.location.hostname.includes(".app.github.dev")
  ? `https://${window.location.hostname.replace(
      /-\d+\.app\.github\.dev$/,
      "-8000.app.github.dev"
    )}`
  : "http://localhost:8000";

const PAGE_SIZE = 10;

const initialForm = {
  customer_name: "",
  title: "",
  description: "",
  priority: "normal",
  response_deadline: "",
  assigned_to: "",
};

function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });

      if (filter === "overdue") {
        params.set("overdue", "true");
      }

      if (filter === "my") {
        params.set("assigned_to", "Priya");
      }

      if (customerSearch.trim()) {
        params.set("customer", customerSearch.trim());
      }

      const response = await fetch(
        `${API_BASE_URL}/tickets/?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load tickets.");
      }

      const data = await response.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load tickets. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter, customerSearch, page]);

  const overdueCount = useMemo(() => {
    return tickets.filter(
      (ticket) => new Date(ticket.response_deadline) < new Date()
    ).length;
  }, [tickets]);

  const urgentCount = useMemo(() => {
    return tickets.filter(
      (ticket) => ticket.priority?.toLowerCase() === "urgent"
    ).length;
  }, [tickets]);

  const highCount = useMemo(() => {
    return tickets.filter(
      (ticket) => ticket.priority?.toLowerCase() === "high"
    ).length;
  }, [tickets]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/tickets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: form.customer_name.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          response_deadline: form.response_deadline,
          assigned_to: form.assigned_to.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to create the ticket."
        );
      }

      setForm(initialForm);
      setShowModal(false);
      setPage(1);

      await fetchTickets();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getPriorityClasses = (ticket) => {
    if (isOverdue(ticket.response_deadline)) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    const priority = ticket.priority?.toLowerCase();

    if (priority === "urgent") {
      return "border-orange-200 bg-orange-50 text-orange-700";
    }

    if (priority === "high") {
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  const getPriorityLabel = (ticket) => {
    if (isOverdue(ticket.response_deadline)) {
      return "OVERDUE";
    }

    return ticket.priority?.toUpperCase() || "NORMAL";
  };

  const getPriorityDot = (ticket) => {
    if (isOverdue(ticket.response_deadline)) {
      return "bg-red-500";
    }

    const priority = ticket.priority?.toLowerCase();

    if (priority === "urgent") {
      return "bg-orange-500";
    }

    if (priority === "high") {
      return "bg-yellow-500";
    }

    return "bg-slate-400";
  };

  const changeFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const handleSearch = (event) => {
    setCustomerSearch(event.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Sidebar */}
      <aside className="fixed hidden h-screen w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                HD
              </div>

              <div>
                <h1 className="text-lg font-bold">HelpDesk</h1>
                <p className="text-xs text-slate-400">
                  Support workspace
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            <div className="space-y-1">
              <button className="flex w-full items-center gap-3 rounded-lg bg-slate-900 px-3 py-2.5 text-left text-sm font-medium text-white">
                <span>▦</span>
                Dashboard
              </button>

              <button
                onClick={() => changeFilter("all")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  filter === "all"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>◫</span>
                All Tickets
              </button>

              <button
                onClick={() => changeFilter("overdue")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  filter === "overdue"
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>!</span>
                Overdue
                {overdueCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    {overdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => changeFilter("my")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  filter === "my"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>◉</span>
                My Tickets
              </button>
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">
                P
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  Priya
                </p>
                <p className="truncate text-xs text-slate-400">
                  IT Helpdesk
                </p>
              </div>

              <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Support operations
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                Ticket Queue
              </h2>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              + New Ticket
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Tickets
                </p>

                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                  Page
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold">
                {tickets.length}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Currently displayed
              </p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Overdue
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-sm text-red-600">
                  !
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-red-600">
                {overdueCount}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Past response deadline
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Urgent
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-sm text-orange-600">
                  ↑
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-orange-600">
                {urgentCount}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Highest priority
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  High Priority
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50 text-sm text-yellow-600">
                  ↑
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-yellow-600">
                {highCount}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Escalated tickets
              </p>
            </div>
          </div>

          {/* Queue Card */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Search / filters */}
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Active queue
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Overdue and high-priority tickets are surfaced first.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      ⌕
                    </span>

                    <input
                      type="text"
                      value={customerSearch}
                      onChange={handleSearch}
                      placeholder="Search customer..."
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 sm:w-64"
                    />
                  </div>

                  <select
                    value={filter}
                    onChange={(event) =>
                      changeFilter(event.target.value)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="all">All Tickets</option>
                    <option value="overdue">Overdue</option>
                    <option value="my">My Tickets</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "overdue", label: "Overdue" },
                  { value: "my", label: "My Tickets" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => changeFilter(item.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filter === item.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="p-16 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                <p className="mt-4 text-sm text-slate-500">
                  Loading queue...
                </p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                  ✓
                </div>

                <p className="mt-4 text-lg font-semibold text-slate-700">
                  No tickets found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing the filter or create a new ticket.
                </p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden grid-cols-[minmax(0,1.7fr)_140px_130px_190px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:grid">
                  <div>Ticket</div>
                  <div>Priority</div>
                  <div>Assignee</div>
                  <div>Response deadline</div>
                </div>

                {/* Tickets */}
                <div className="divide-y divide-slate-100">
                  {tickets.map((ticket) => {
                    const overdue = isOverdue(ticket.response_deadline);

                    return (
                      <article
                        key={ticket.id}
                        className="p-5 transition hover:bg-slate-50"
                      >
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_140px_130px_190px] lg:items-center">
                          {/* Ticket info */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-slate-400">
                                #{ticket.id}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-500">
                                {ticket.status}
                              </span>
                            </div>

                            <h4 className="mt-2 truncate text-sm font-semibold text-slate-900 sm:text-base">
                              {ticket.title}
                            </h4>

                            <p className="mt-1 text-sm text-slate-500">
                              {ticket.customer_name}
                            </p>

                            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                              {ticket.description}
                            </p>
                          </div>

                          {/* Priority */}
                          <div>
                            <p className="mb-1 text-xs text-slate-400 lg:hidden">
                              Priority
                            </p>

                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold ${getPriorityClasses(
                                ticket
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getPriorityDot(
                                  ticket
                                )}`}
                              />

                              {getPriorityLabel(ticket)}
                            </span>
                          </div>

                          {/* Assignee */}
                          <div>
                            <p className="mb-1 text-xs text-slate-400 lg:hidden">
                              Assigned to
                            </p>

                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                {ticket.assigned_to
                                  ? ticket.assigned_to
                                      .charAt(0)
                                      .toUpperCase()
                                  : "U"}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-700">
                                  {ticket.assigned_to ||
                                    "Unassigned"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Deadline */}
                          <div>
                            <p className="mb-1 text-xs text-slate-400 lg:hidden">
                              Response deadline
                            </p>

                            <p
                              className={`text-sm font-medium ${
                                overdue
                                  ? "text-red-600"
                                  : "text-slate-700"
                              }`}
                            >
                              {formatDate(
                                ticket.response_deadline
                              )}
                            </p>

                            <p
                              className={`mt-1 text-xs ${
                                overdue
                                  ? "font-semibold text-red-500"
                                  : "text-slate-400"
                              }`}
                            >
                              {overdue
                                ? "Response time breached"
                                : "Within SLA"}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {tickets.length} ticket
                    {tickets.length !== 1 ? "s" : ""} · Page{" "}
                    {page}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setPage((current) =>
                          Math.max(1, current - 1)
                        )
                      }
                      disabled={page === 1 || loading}
                      className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Previous
                    </button>

                    <button
                      onClick={() =>
                        setPage((current) => current + 1)
                      }
                      disabled={
                        tickets.length < PAGE_SIZE || loading
                      }
                      className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Create New Ticket
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add a request to the support queue.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateTicket}
              className="max-h-[80vh] space-y-5 overflow-y-auto p-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Customer Name
                  </label>

                  <input
                    required
                    name="customer_name"
                    value={form.customer_name}
                    onChange={handleFormChange}
                    placeholder="Acme Corp"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Assigned To
                  </label>

                  <input
                    name="assigned_to"
                    value={form.assigned_to}
                    onChange={handleFormChange}
                    placeholder="Priya"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Ticket Title
                </label>

                <input
                  required
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Laptop won't boot"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  required
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows="4"
                  placeholder="Describe the issue..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Response Deadline
                  </label>

                  <input
                    required
                    type="datetime-local"
                    name="response_deadline"
                    value={form.response_deadline}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Queue rule
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Overdue tickets are surfaced first, followed by
                  priority and response deadline.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Creating..."
                    : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

Save:

Ctrl + S

Your existing index.css can stay as:

@import "tailwindcss";
What this improves

The dashboard now has a proper support-workspace layout, sidebar, stats, priority badges, assignee display, SLA/deadline indicators, responsive ticket list, cleaner filters, and a more polished creation modal. It also includes the missing High priority option so the UI matches the escalation requirement.

One thing to keep in mind: the statistics currently reflect the tickets returned for the current page, because your backend doesn't yet return a total ticket count. That's acceptable for the MVP, but we can improve that when we do the final polish.

itss good butt here thee pagee is nott interactivee simplee whitee plainn howw t
