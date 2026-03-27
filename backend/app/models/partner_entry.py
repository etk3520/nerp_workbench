from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class PartnerEntry(Base):
    __tablename__ = "partner_entries"

    id: Mapped[int] = mapped_column(primary_key=True)

    # 입력 컬럼
    project_name: Mapped[Optional[str]] = mapped_column(nullable=True)
    project_pm: Mapped[Optional[str]] = mapped_column(nullable=True)
    module: Mapped[Optional[str]] = mapped_column(nullable=True)
    role: Mapped[Optional[str]] = mapped_column(nullable=True)
    contract_company: Mapped[Optional[str]] = mapped_column(nullable=True)
    belong_company: Mapped[Optional[str]] = mapped_column(nullable=True)
    team: Mapped[Optional[str]] = mapped_column(nullable=True)
    name: Mapped[Optional[str]] = mapped_column(nullable=True)
    email: Mapped[Optional[str]] = mapped_column(nullable=True)
    start_date: Mapped[Optional[str]] = mapped_column(nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(nullable=True)

    # 신청 항목 Checkbox
    req_pledge: Mapped[bool] = mapped_column(default=False)
    req_ad: Mapped[bool] = mapped_column(default=False)
    req_srbs: Mapped[bool] = mapped_column(default=False)

    # 시스템 컬럼
    pledge_sent_date: Mapped[Optional[str]] = mapped_column(nullable=True)
    pledge_signed_date: Mapped[Optional[str]] = mapped_column(nullable=True)
    ad_from: Mapped[Optional[str]] = mapped_column(nullable=True)
    ad_to: Mapped[Optional[str]] = mapped_column(nullable=True)
    srbs_from: Mapped[Optional[str]] = mapped_column(nullable=True)
    srbs_to: Mapped[Optional[str]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(default="신규신청")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
