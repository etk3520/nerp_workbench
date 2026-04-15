import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.partner_entry import PartnerEntry

router = APIRouter(prefix="/partner-entries", tags=["partner-entries"])


class EntryIn(BaseModel):
    category: str | None = None
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
    remark: str | None = None
    req_pledge: bool = False
    req_ad: bool = False
    req_srbs: bool = False


class BulkSaveRequest(BaseModel):
    entries: list[EntryIn]


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
VALID_CATEGORIES = {"과제", "ITO"}


def validate_entries(entries: list[EntryIn]) -> list[str]:
    errors: list[str] = []
    emails_seen: set[str] = set()
    for i, e in enumerate(entries, 1):
        row = f"{i}행"
        if e.category and e.category not in VALID_CATEGORIES:
            errors.append(f"{row}: 구분은 '과제' 또는 'ITO'만 입력 가능합니다. (입력값: {e.category})")
        if e.start_date and not DATE_RE.match(e.start_date):
            errors.append(f"{row}: 투입일 형식이 올바르지 않습니다. (YYYY-MM-DD)")
        if e.end_date and not DATE_RE.match(e.end_date):
            errors.append(f"{row}: 종료일 형식이 올바르지 않습니다. (YYYY-MM-DD)")
        if e.email:
            if e.email in emails_seen:
                errors.append(f"{row}: E-mail이 중복됩니다. ({e.email})")
            emails_seen.add(e.email)
    return errors


@router.post("/draft")
async def draft_save(body: BulkSaveRequest, db: AsyncSession = Depends(get_db)):
    """임시저장 — 유효성 검증 후 DB 저장 (status=임시저장)"""
    errors = validate_entries(body.entries)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    saved = []
    for entry_in in body.entries:
        entry = PartnerEntry(**entry_in.model_dump(), status="임시저장")
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        saved.append(entry.id)
    await db.commit()
    return {"ids": saved, "count": len(saved)}


@router.post("/submit")
async def submit_entries(body: dict, db: AsyncSession = Depends(get_db)):
    """신청 — 임시저장된 항목의 status를 '신청'으로 변경"""
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="ids가 필요합니다.")
    await db.execute(
        update(PartnerEntry).where(PartnerEntry.id.in_(ids)).values(status="신청")
    )
    await db.commit()
    return {"count": len(ids)}


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
                "category": e.category,
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
                "remark": e.remark,
                "req_pledge": e.req_pledge,
                "req_ad": e.req_ad,
                "req_srbs": e.req_srbs,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
    }
