from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import current_user
from ..models import User,Chat,Message
from ..schemas import MessageCreate,MessageOut,AnswerOut
from ..config import get_settings
from ..services.rag_service import RAGService
import logging
import json
router=APIRouter(prefix="/api/chats",tags=["messages"]); settings=get_settings(); logger=logging.getLogger(__name__)
def owned(db,user,cid):
    c=db.query(Chat).filter(Chat.id==cid,Chat.user_id==user.id).first()
    if not c: raise HTTPException(404,"Chat not found")
    return c
def out(m): return {"id":m.id,"role":m.role,"content":m.content,"sources":json.loads(m.sources_json or "[]"),"created_at":m.created_at}
@router.post("/{chat_id}/messages",response_model=AnswerOut)
def send(chat_id:int,data:MessageCreate,db:Session=Depends(get_db),user:User=Depends(current_user)):
    chat=owned(db,user,chat_id); user_msg=Message(chat_id=chat.id,role="user",content=data.content); db.add(user_msg); db.commit(); db.refresh(user_msg)
    try: answer,sources=RAGService(settings).ask(db,user.id,chat_id,data.content)
    except RuntimeError as exc: answer=str(exc); sources=[]
    except Exception as exc:
        logger.exception("AI request failed for chat %s", chat_id)
        raise HTTPException(502,"The AI service could not complete this request. Check provider configuration and server logs.") from exc
    assistant=Message(chat_id=chat.id,role="assistant",content=answer,sources_json=json.dumps(sources)); db.add(assistant)
    if chat.title=="New chat": chat.title=data.content[:48]
    db.commit(); db.refresh(assistant); return {"user_message":out(user_msg),"assistant_message":out(assistant)}
@router.post("/{chat_id}/messages/{message_id}/retry",response_model=MessageOut)
def retry(chat_id:int,message_id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
    chat=owned(db,user,chat_id); target=db.query(Message).filter(Message.id==message_id,Message.chat_id==chat.id,Message.role=="assistant").first()
    if not target: raise HTTPException(404,"Assistant message not found")
    previous=db.query(Message).filter(Message.chat_id==chat.id,Message.role=="user",Message.created_at<=target.created_at).order_by(Message.created_at.desc()).first()
    if not previous: raise HTTPException(400,"No preceding user question found")
    try:
        answer,sources=RAGService(settings).ask(db,user.id,chat_id,previous.content)
    except RuntimeError as exc:
        answer=str(exc); sources=[]
    except Exception as exc:
        logger.exception("AI retry failed for chat %s", chat_id)
        raise HTTPException(502,"The AI service could not complete this request. Check provider configuration and server logs.") from exc
    target.content=answer; target.sources_json=json.dumps(sources); db.commit(); db.refresh(target); return out(target)
