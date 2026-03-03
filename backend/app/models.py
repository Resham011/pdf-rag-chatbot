from pydantic import BaseModel
from typing import List, Optional


class QuestionRequest(BaseModel):
    question: str


class SourceReference(BaseModel):
    file: str
    page: str


class QuestionResponse(BaseModel):
    answer: str
    sources: Optional[List[SourceReference]] = []


class SessionResponse(BaseModel):
    session_id: str