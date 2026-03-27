from fastapi import APIRouter

router = APIRouter(prefix="/apps", tags=["apps"])

# 대시보드에 표시할 앱 목록
APPS = [
    {
        "id": "partner-access",
        "name": "협력사 전/출입 관리",
        "description": "협력사 방문자 전출입 신청 및 승인",
        "icon": "BadgeOutlined",
        "category": "보안",
        "path": "/apps/partner-access",
    },
    {
        "id": "ito-cost",
        "name": "ITO 비용 정산",
        "description": "ITO 비용 등록 및 정산 처리",
        "icon": "ReceiptLong",
        "category": "비용관리",
        "path": "/apps/ito-cost",
    },
    {
        "id": "part-cost",
        "name": "파트 비용관리",
        "description": "파트별 비용 등록 및 관리",
        "icon": "PieChartOutline",
        "category": "비용관리",
        "path": "/apps/part-cost",
    },
]


@router.get("/")
def get_apps():
    return {"apps": APPS}


@router.get("/{app_id}")
def get_app(app_id: str):
    for app in APPS:
        if app["id"] == app_id:
            return app
    return {"error": "App not found"}, 404
