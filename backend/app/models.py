from pydantic import BaseModel
from typing import List, Optional


class QuestionRequest(BaseModel):
    question: str


class QuestionResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = []


class SessionResponse(BaseModel):
    session_id: str