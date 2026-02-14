from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from fastapi.responses import JSONResponse
from app.services.ai_service import ai_service
from app.models import QuestionRequest, QuestionResponse
import os

router = APIRouter()


@router.post("/session/create")
async def create_session(response: Response):
    """Create a new session for a user"""
    session_id = ai_service.create_session()
    
    # Set session cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=86400,  # 24 hours
        samesite="lax"
    )
    
    return {"session_id": session_id}


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), session_id: str = None):
    """Upload PDF for a specific session"""
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    success = await ai_service.process_pdf(session_id, file)
    
    if success:
        return {"message": "PDF uploaded and processed successfully."}
    return {"error": "Failed to process PDF."}


@router.delete("/delete-file")
async def delete_file(session_id: str = None, filename: str = None):
    """Delete a specific PDF file from session"""
    
    if not session_id or not filename:
        raise HTTPException(status_code=400, detail="Session ID and filename required")
    
    success = ai_service.delete_file(session_id, filename)
    
    if success:
        return {"message": f"File {filename} deleted successfully"}
    return {"error": "Failed to delete file"}


@router.post("/ask")
async def ask_question(request: QuestionRequest, session_id: str = None):
    """Ask question for a specific session"""
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    answer = ai_service.ask_question(session_id, request.question)
    
    return QuestionResponse(answer=answer)


@router.post("/reset")
async def reset_conversation(session_id: str = None):
    """Reset a specific session"""
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    ai_service.reset_session(session_id)
    
    return {"message": "Session reset successfully"}


@router.get("/files")
async def get_files(session_id: str = None):
    """Get files for a specific session"""
    
    if not session_id:
        return {"files": []}
    
    files = ai_service.get_session_files(session_id)
    return {"files": files}


@router.get("/chat-history")
async def get_chat_history(session_id: str = None):
    """Get chat history for a specific session"""
    
    if not session_id:
        return {"messages": []}
    
    messages = ai_service.get_chat_history(session_id)
    return {"messages": messages}


@router.post("/save-message")
async def save_message(request: dict, session_id: str = None):
    """Save a message to session history"""
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    question = request.get("question", "")
    answer = request.get("answer", "")
    
    ai_service.save_message(session_id, question, answer)
    return {"message": "Message saved"}