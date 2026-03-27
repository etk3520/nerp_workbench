from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.partner_entry import PartnerEntry

router = APIRouter(prefix="/partner-entries", tags=["partner-entries"])


class EntryIn(BaseModel):
    project_name: str | None = None
    project_pm: str | None = None
    module: str | None = None
    role: str | None = None
    contract_company: str | None = None
    belong_company: str | None = None
    team: str | None = None
    name: str | None = None
    email: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    req_pledge: bool = False
    req_ad: bool = False
    req_srbs: bool = False


class BulkSaveRequest(BaseModel):
    entries: list[EntryIn]


@router.post("/bulk")
async def bulk_save(body: BulkSaveRequest, db: AsyncSession = Depends(get_db)):
    saved = []
    for entry_in in body.entries:
        entry = PartnerEntry(**entry_in.model_dump())
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        saved.append(entry.id)
    await db.commit()
    return {"ids": saved, "count": len(saved)}


@router.get("/")
async def list_entries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PartnerEntry).order_by(PartnerEntry.created_at.desc())
    )
    entries = result.scalars().all()
    return {
        "entries": [
            {
                "id": e.id,
                "project_name": e.project_name,
                "project_pm": e.project_pm,
                "module": e.module,
                "role": e.role,
                "contract_company": e.contract_company,
                "belong_company": e.belong_company,
                "team": e.team,
                "name": e.name,
                "email": e.email,
                "start_date": e.start_date,
                "end_date": e.end_date,
                "req_pledge": e.req_pledge,
                "req_ad": e.req_ad,
                "req_srbs": e.req_srbs,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
    }
