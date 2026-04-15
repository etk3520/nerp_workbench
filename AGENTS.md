# AGENTS.md — N-ERP Workbench

OpenCode `/init` 시 이 파일을 읽어 프로젝트 전체 컨텍스트를 파악한다.

---

## 프로젝트 개요

**N-ERP Workbench** — 사내 ERP 관련 업무를 웹으로 처리하는 내부 툴 플랫폼.

현재 구현된 모듈: **협력사 전/출입 관리** (`/apps/partner-access`)
- 협력사 투입 인력의 전입/출입 이력을 Grid 기반으로 입력·저장
- 보안서약서 발송 / AD 계정 발급 / S-RBS 계정 발급 신청

기능 스펙 전문: `docs/partner-access-spec.md`

---

## 아키텍처

```
[Browser]
  └─ nginx :3001 (frontend 컨테이너)
       ├─ /login, /logout, /_auth  →  auth :5000 (Flask, 내부 전용)
       ├─ /api/                    →  backend :8001 (FastAPI)
       └─ /                        →  React SPA (정적 파일)
```

### Docker Compose 서비스

| 서비스 | 역할 | 외부 포트 |
|--------|------|-----------|
| `db` | PostgreSQL 16 | 127.0.0.1:5433 |
| `backend` | FastAPI API 서버 | 8001 |
| `auth` | 인증 서비스 (Flask) | 없음 (내부) |
| `frontend` | nginx + React SPA | 3001 |

`db` 볼륨 경로: `/mnt/hdd/nerp-postgres-data` — 환경에 맞게 `docker-compose.yml`에서 변경

---

## 기술 스택

**Backend**
- Python 3.10+, FastAPI, SQLAlchemy 2.0 (async), asyncpg
- 패키지 관리: `uv` (`pyproject.toml`)
- DB: PostgreSQL 16, 테이블은 앱 시작 시 `create_all`로 자동 생성 (Alembic 미사용)

**Frontend**
- React 18, TypeScript, Vite
- 라우팅: react-router-dom
- 스타일: CSS Variables (`src/styles/global.css`)
- Grid: 자체 구현 table (Excel 호환 복사/붙여넣기, 키보드 네비게이션)

**Infra**
- Docker Compose, nginx
- nginx: `auth_request` 인증 게이트, rate limiting, 보안 헤더

---

## 디렉토리 구조

```
nerp_workbench/
├── AGENTS.md               ← 이 파일 (OpenCode 컨텍스트)
├── docker-compose.yml
├── pyproject.toml          ← Python 의존성
├── .env                    ← 환경변수 (gitignore — 직접 생성 필요)
├── .env.example            ← 환경변수 템플릿
│
├── auth/                   ← 인증 서비스
│   ├── app.py              ← Flask 앱 (로그인/로그아웃/세션 검증)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── templates/login.html
│
├── backend/
│   ├── Dockerfile
│   └── app/
│       ├── main.py         ← FastAPI 앱 진입점, CORS, lifespan
│       ├── core/
│       │   ├── config.py   ← Settings (환경변수 기반)
│       │   └── database.py ← AsyncSession, Base, get_db
│       ├── models/
│       │   └── partner_entry.py  ← PartnerEntry ORM 모델
│       └── api/routes/
│           ├── apps.py
│           └── partner_entries.py  ← /draft, /submit, /bulk, GET /
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf          ← reverse proxy + auth_request 설정
│   └── src/
│       ├── App.tsx          ← 라우팅 정의
│       ├── api/
│       │   └── partnerEntries.ts  ← API 호출 함수
│       ├── components/
│       │   ├── Layout.tsx         ← 공통 헤더
│       │   ├── Dashboard.tsx
│       │   └── partner/
│       │       ├── PartnerLayout.tsx  ← 좌측 메뉴 (미구현)
│       │       └── NewEntry.tsx       ← 신규 신청 Grid 화면
│       └── styles/global.css
│
└── docs/
    └── partner-access-spec.md
```

---

## ⚠️ 인증 수정 필수 (회사 PC 환경)

**회사 환경에서는 Google Authenticator(TOTP) 기반 모바일 인증을 사용하지 않는다.**

아래 작업을 수행해야 한다:

### 1. `auth/app.py` 수정

TOTP 로직을 **정적 비밀번호 로그인**으로 교체한다.

- 제거: `pyotp`, `qrcode` import 및 관련 함수(`get_totp_secret`, `is_registered`, `mark_registered`)
- 추가: `ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")`
- `/login` POST 핸들러: `code` 검증 → `password` 검증으로 변경
- 세션 쿠키 발급/검증 로직(`_sign`, `_verify_cookie`)은 그대로 유지

수정 후 `/login` POST 핸들러 핵심 흐름:
```python
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me")

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        password = request.form.get("password", "")
        if password == ADMIN_PASSWORD:
            expires = str(int(time.time()) + SESSION_DURATION)
            cookie_value = _sign(expires)
            redirect_url = request.args.get("rd", "/")
            resp = make_response(redirect(redirect_url))
            resp.set_cookie("totp_session", cookie_value,
                            max_age=SESSION_DURATION, httponly=True, samesite="Lax")
            return resp
        error = "비밀번호가 올바르지 않습니다."
    return render_template("login.html", error=error, app_name=APP_NAME)
```

### 2. `auth/requirements.txt` 수정

아래 항목 제거:
```
pyotp
qrcode[pil]
```

Flask, gunicorn 등 나머지는 유지.

### 3. `auth/templates/login.html` 수정

- QR 코드 표시 블록 제거
- TOTP 6자리 코드 입력란 → 비밀번호 입력란(`type="password"`, `name="password"`)으로 변경

### 4. `.env`에 `ADMIN_PASSWORD` 추가

```env
ADMIN_PASSWORD=<안전한 비밀번호 설정>
```

---

## 환경변수 (.env)

`.env.example`을 복사해 `.env`로 만들고 값을 채운다.

| 변수 | 설명 | 예시 |
|------|------|------|
| `POSTGRES_USER` | DB 사용자 | `nerp` |
| `POSTGRES_PASSWORD` | DB 비밀번호 | 직접 설정 |
| `POSTGRES_DB` | DB 이름 | `nerp` |
| `DEBUG` | 백엔드 디버그 모드 | `false` |
| `CORS_ORIGINS` | 허용 CORS 출처 | `http://localhost:3001` |
| `ADMIN_PASSWORD` | 로그인 비밀번호 (TOTP 제거 후) | 직접 설정 |
| `COOKIE_SECRET` | 세션 쿠키 서명 키 | 32자 이상 랜덤 문자열 |
| `SESSION_DURATION` | 세션 유효시간(초) | `86400` |
| `APP_NAME` | 앱 표시명 | `N-ERP Workbench` |

`COOKIE_SECRET` 생성:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 미구현 항목 (TODO)

### 1차 구현 잔여

- [ ] **좌측 메뉴 사이드바** (`frontend/src/components/partner/PartnerLayout.tsx`)
  - 메뉴 항목: 마스터 관리 / 신청(신규 신청) / 신청 대기 / 정보 변경 / 조회
  - 신규 신청만 활성, 나머지는 "준비 중" 표시
- [ ] **행별 삭제 버튼** (`frontend/src/components/partner/NewEntry.tsx`)
  - 각 행 맨 우측에 휴지통 아이콘 버튼 (해당 행만 삭제)

### 이후 구현 예정 (스펙 참조)

- [ ] 마스터 관리 — 투입 과제명 CRUD
- [ ] 변경/재신청
- [ ] 신청 대기 목록
- [ ] 정보 변경
- [ ] 조회 화면

---

## 개발 규칙

### Backend
- API 경로 prefix: `/api/v1/`
- 라우터: `backend/app/api/routes/` 파일 단위로 분리 후 `main.py`에서 include
- 모델: SQLAlchemy ORM (`backend/app/models/`)
- DB 마이그레이션: `create_all` 사용 (Alembic 미적용)
- 새 모듈 추가 시 `backend/app/models/__init__.py`에 import 추가 (create_all 인식을 위해)

### Frontend
- API 호출: `frontend/src/api/` 아래 모듈로 분리
- 스타일: CSS Variables 사용, inline style 객체로 작성 (CSS 파일 최소화)
- 컴포넌트: `src/components/<기능명>/` 디렉토리 단위로 구성

### 공통
- 주석/변수명: 한국어 허용
- 커밋 메시지: `feat:`, `fix:`, `refactor:` prefix 사용

---

## 실행 방법

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 각 값 설정

# 2. 서비스 빌드 및 실행
docker compose up -d --build

# 3. 로그 확인
docker compose logs -f

# 4. 접속
# http://localhost:3001

# 5. 종료
docker compose down
```

### 개발 시 (로컬 직접 실행)

**Backend**
```bash
uv sync
uv run uvicorn backend.app.main:app --reload --port 8001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

---

## 주의사항

- `db` 볼륨 경로 `/mnt/hdd/nerp-postgres-data`는 회사 PC 환경에 맞게 수정
- `.env`는 절대 git에 커밋하지 말 것 (`.gitignore` 포함)
- `COOKIE_SECRET`은 반드시 랜덤 문자열로 설정할 것
- `ADMIN_PASSWORD`는 기본값(`change-me`) 그대로 운영하지 말 것
