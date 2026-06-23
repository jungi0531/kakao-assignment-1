# Goal: FastAPI Todo CRUD API 구현

## 목표 개요

2차 과제에서 로컬스토리지로 관리하던 Todo 데이터를 FastAPI + SQLite 서버로 이전한다.
프론트엔드는 더 이상 데이터를 직접 들고 있지 않고, API 요청을 통해서만 데이터에 접근한다.

---

## 이번 단계 범위

**포함**
- SQLite DB 연결 설정 (SQLAlchemy)
- Todo 테이블 모델 정의
- Pydantic 스키마로 요청/응답 유효성 검사
- CORS 설정 (Next.js 개발 서버 허용)
- Todo CRUD 엔드포인트 4개 구현
- `date` 쿼리 파라미터로 날짜별 Todo 필터링 (주간 뷰 지원)

**제외**
- 사용자 인증/인가
- 페이지네이션
- 검색 기능 (도전 미션에서 진행)
- 완료 상태별 필터링 (`filter=active/completed`, 도전 미션에서 진행)

---

## 2차 과제와의 핵심 차이

| 항목 | 2차 과제 (React + localStorage) | 3차 과제 (FastAPI + SQLite) |
|------|-------------------------------|---------------------------|
| 데이터 저장 위치 | 브라우저 localStorage | 서버 SQLite DB |
| 데이터 접근 방식 | `localStorage.getItem()` 직접 호출 | HTTP API 요청 |
| 데이터 영속성 | 같은 브라우저에서만 유지 | 서버에 영구 저장, 어디서든 접근 가능 |
| 상태 관리 | `useState`로 메모리에 보관 | 서버가 원본, 프론트는 조회만 |
| Todo 생성 | `crypto.randomUUID()`로 ID 생성 | DB `auto_increment`로 ID 자동 부여 |

---

## API 명세

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/todos` | 전체 Todo 목록 조회 (`?date=YYYY-MM-DD`로 날짜 필터 가능) |
| POST | `/todos` | 새 Todo 생성 |
| PUT | `/todos/{id}` | Todo 수정 (title, completed 변경) |
| DELETE | `/todos/{id}` | Todo 삭제 |

---

## DB 모델 설계

```
todos 테이블
├── id        INTEGER  PK, auto increment
├── title     TEXT     NOT NULL (Todo 내용)
├── completed BOOLEAN  DEFAULT false (완료 여부)
└── date      TEXT     NOT NULL (날짜 키, 예: "2026-06-20")
```

2차 과제의 `text` 필드명을 `title`로 변경했다. `title`이 Todo 항목의 제목이라는 의미를 더 명확하게 전달하기 때문이다.

> **주의:** `main.py`에서 `from sqlalchemy.ext.declarative import declarative_base`를 사용 중인데,
> 이 경로는 SQLAlchemy 2.0에서 deprecated됐다. 올바른 경로는 `from sqlalchemy.orm import declarative_base`다.
> 과제 가이드 템플릿을 따라 현재 방식을 유지하지만, 실제 프로젝트에서는 신버전 경로를 사용할 것.

---

## Pydantic 스키마 설계

```
TodoCreate   → POST 요청 시 받는 데이터: title, date
TodoUpdate   → PUT 요청 시 받는 데이터: title?, completed? (둘 다 Optional)
TodoResponse → API 응답으로 돌려주는 데이터: id, title, completed, date
```

`TodoUpdate`의 필드가 Optional인 이유: 제목만 바꾸거나 완료 상태만 바꾸는 경우를 모두 지원하기 위해.

---

## 2차 과제 참고 로직 매핑

| 2차 과제 함수 | 위치 | FastAPI 대응 |
|-------------|------|-------------|
| `handleAddTodo(text)` | App.jsx | `POST /todos` |
| `handleToggleTodo(id)` | App.jsx | `PUT /todos/{id}` (completed 토글) |
| `handleSaveEdit(id, text)` | App.jsx | `PUT /todos/{id}` (title 수정) |
| `handleDeleteTodo(id)` | App.jsx | `DELETE /todos/{id}` |
| `loadTodosFromStorage()` | utils/storage.js | `GET /todos` |
| `saveTodosToStorage(todos)` | utils/storage.js | 불필요 — DB가 영속성 담당 |

---

## 구현 체크리스트

### 기반 설정
- [x] SQLAlchemy DB 연결 설정 (engine, SessionLocal, Base)
- [x] Todo DB 모델 정의 (id, title, completed, date)
- [x] Pydantic 스키마 정의 (TodoCreate, TodoUpdate, TodoResponse)
- [x] CORS 미들웨어 설정
- [x] `get_db()` 의존성 함수 구현

### 엔드포인트
- [x] GET `/todos` — 목록 조회 (date 필터 포함)
- [x] POST `/todos` — Todo 생성
- [x] PUT `/todos/{id}` — Todo 수정
- [x] DELETE `/todos/{id}` — Todo 삭제

---

## 확인 포인트

- `localhost:8000/docs`에서 각 엔드포인트가 보이는가?
- `backend/` 폴더에 `todos.db` 파일이 생성되었는가?
- 각 API를 직접 실행했을 때 의도한 대로 응답이 오는가?
- Todo 생성 후 목록 조회 시 데이터가 포함되어 있는가?
- `?date=YYYY-MM-DD` 파라미터로 필터링하면 해당 날짜 Todo만 반환되는가?
