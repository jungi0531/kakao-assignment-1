from __future__ import annotations  # Python 3.9에서 str | None 구문 허용

import os
from dotenv import load_dotenv

load_dotenv(".env.local")

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel, Field

# DB 설정
DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# DB 모델 (테이블 구조 정의)
class Todo(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)       # Todo 내용
    completed = Column(Boolean, default=False)   # 완료 여부 (기본값: 미완료)
    date = Column(String, nullable=False)        # 날짜 키 (예: "2026-06-20")

# Pydantic 스키마 (요청/응답 데이터 유효성 검사)
class TodoCreate(BaseModel):
    # 생성 요청 시 클라이언트가 보내야 하는 필드
    # id, completed는 서버가 결정하므로 포함하지 않음
    title: str = Field(min_length=1)  # 빈 문자열 차단
    date: str

class TodoUpdate(BaseModel):
    # 수정 요청 시 받을 필드 — 제목이나 완료 상태 중 하나만 바꿀 수도 있으므로 Optional
    title: str | None = Field(default=None, min_length=1)  # 제공 시 빈 문자열 차단
    completed: bool | None = None

class TodoResponse(BaseModel):
    # API 응답으로 돌려줄 필드 — DB의 모든 필드 포함
    id: int
    title: str
    completed: bool
    date: str

    class Config:
        # ORM 모델(SQLAlchemy 객체)을 Pydantic이 바로 읽을 수 있도록 허용
        from_attributes = True

# 테이블 생성
Base.metadata.create_all(bind=engine)

# FastAPI 앱 생성
app = FastAPI(title="Todo API")

# FastAPI 앱 미들웨어 및 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 개발 서버 주소
    allow_methods=["*"],                      # GET, POST, PUT, DELETE 전부 허용
    allow_headers=["*"],                      # 모든 헤더 허용
)

# DB 세션 의존성
# 엔드포인트 함수에서 Depends(get_db)로 주입받아 사용
def get_db():
    db = SessionLocal()  # 세션 열기
    try:
        yield db         # 엔드포인트 함수에 세션 전달
    finally:
        db.close()       # 요청 완료 후 세션 닫기 (에러 나도 반드시 실행)

# 엔드포인트 구현

# GET /todos — 전체 또는 특정 날짜의 Todo 목록 조회
# date 파라미터가 있으면 해당 날짜만, 없으면 전체 반환
@app.get("/todos", response_model=list[TodoResponse])
def get_todos(date: str | None = None, db=Depends(get_db)):
    if date:
        return db.query(Todo).filter(Todo.date == date).all()
    return db.query(Todo).all()

# POST /todos — 새 Todo 생성
# 클라이언트가 title, date를 보내면 DB에 저장 후 생성된 Todo 반환
@app.post("/todos", response_model=TodoResponse, status_code=201)
def create_todo(todo: TodoCreate, db=Depends(get_db)):
    db_todo = Todo(title=todo.title, date=todo.date)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)  # DB가 부여한 id, default값을 객체에 반영
    return db_todo

# GET /todos/{todo_id} — 단건 조회
# id에 해당하는 Todo가 없으면 404 반환
@app.get("/todos/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, db=Depends(get_db)):
    db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo

# PUT /todos/{id} — Todo 수정
# title이나 completed 중 보낸 필드만 업데이트 (보내지 않은 필드는 유지)
@app.put("/todos/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: int, todo: TodoUpdate, db=Depends(get_db)):
    db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    if todo.title is not None:
        db_todo.title = todo.title
    if todo.completed is not None:
        db_todo.completed = todo.completed

    db.commit()
    db.refresh(db_todo)
    return db_todo

# DELETE /todos/{id} — Todo 삭제
@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db=Depends(get_db)):
    db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(db_todo)
    db.commit()
