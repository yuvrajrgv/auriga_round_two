from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TicketCreate(BaseModel):
    customer_name: str
    title: str
    description: str
    priority: str
    response_deadline: datetime
    assigned_to: str | None = None


class TicketResponse(TicketCreate):
    id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)