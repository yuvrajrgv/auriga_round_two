from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Ticket


PRIORITY_LEVELS = ("normal", "high", "urgent")


def escalate_overdue_tickets(
    db: Session,
    now: datetime | None = None,
) -> int:
    """Raise each overdue ticket by one priority level and return the count."""
    check_time = now or datetime.utcnow()
    tickets = (
        db.query(Ticket)
        .filter(
            Ticket.response_deadline < check_time,
            Ticket.priority.in_(PRIORITY_LEVELS[:-1]),
        )
        .all()
    )

    for ticket in tickets:
        current_level = PRIORITY_LEVELS.index(ticket.priority.lower())
        ticket.priority = PRIORITY_LEVELS[current_level + 1]

    if tickets:
        db.commit()

    return len(tickets)
