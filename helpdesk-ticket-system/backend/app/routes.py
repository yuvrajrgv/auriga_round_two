from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.escalation import escalate_overdue_tickets
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
    db: Session = Depends(get_db)
):
    new_ticket = Ticket(**ticket.model_dump())

    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return new_ticket


@router.post("/escalate-overdue")
def run_overdue_escalation(db: Session = Depends(get_db)):
    escalated_count = escalate_overdue_tickets(db)
    return {"escalated_count": escalated_count}


@router.get("/", response_model=list[TicketResponse])
def get_tickets(
    db: Session = Depends(get_db),
    overdue: bool | None = Query(default=None),
    assigned_to: str | None = Query(default=None),
    customer: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    query = db.query(Ticket)

    # Filter by overdue status
    now = datetime.utcnow()

    if overdue is True:
        query = query.filter(Ticket.response_deadline < now)

    # Filter by assigned helpdesk employee
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)

    # Search customer name
    if customer:
        query = query.filter(
            Ticket.customer_name.ilike(f"%{customer}%")
        )

    tickets = query.all()

    # ---------------------------------------------------------
    # QUEUE ORDERING
    # ---------------------------------------------------------
    #
    # 1. Overdue tickets first
    # 2. Urgent tickets before normal tickets
    # 3. Earlier response deadline first
    # 4. Older tickets first as a tie-breaker
    #
    # False comes before True, so:
    # overdue -> False
    # not overdue -> True
    #
    # ---------------------------------------------------------

    tickets.sort(
        key=lambda ticket: (
            ticket.response_deadline >= now,
            0 if ticket.priority.lower() == "urgent" else 1,
            ticket.response_deadline,
            ticket.created_at,
        )
    )

    # ---------------------------------------------------------
    # PAGINATION
    # ---------------------------------------------------------

    start = (page - 1) * page_size
    end = start + page_size

    paginated_tickets = tickets[start:end]

    return paginated_tickets