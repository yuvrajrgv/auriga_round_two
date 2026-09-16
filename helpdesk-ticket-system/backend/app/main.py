import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.database import SessionLocal
from app.escalation import escalate_overdue_tickets
from app.models import Ticket
from app.routes import router

Base.metadata.create_all(bind=engine)

async def overdue_escalation_loop():
    while True:
        db = SessionLocal()
        try:
            escalate_overdue_tickets(db)
        finally:
            db.close()

        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    overdue_escalation_loop_task = asyncio.create_task(overdue_escalation_loop())
    try:
        yield
    finally:
        overdue_escalation_loop_task.cancel()
        await asyncio.gather(overdue_escalation_loop_task, return_exceptions=True)


app = FastAPI(title="Helpdesk Ticket System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.app\.github\.dev",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Helpdesk Ticket System API is running"}