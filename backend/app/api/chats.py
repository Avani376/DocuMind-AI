from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import current_user
from ..models import User,Chat,Message
from ..schemas import ChatCreate,ChatRename,ChatOut,MessageOut
from ..config import get_settings
import json
router=APIRouter(prefix="/api/chats",tags=["chats"])
def owned(db,user,chat_id):
    chat=db.query(Chat).filter(Chat.id==chat_id,Chat.user_id==user.id).first()
    if not chat: raise HTTPException(404,"Chat not found")
    return chat
def msgout(m): return {"id":m.id,"role":m.role,"content":m.content,"sources":json.loads(m.sources_json or "[]"),"created_at":m.created_at}
@router.get("",response_model=list[ChatOut])
def list_chats(db:Session=Depends(get_db),user:User=Depends(current_user)): return db.query(Chat).filter(Chat.user_id==user.id).order_by(Chat.updated_at.desc()).all()
@router.post("",response_model=ChatOut)
def create_chat(data:ChatCreate,db:Session=Depends(get_db),user:User=Depends(current_user)):
    c=Chat(title=data.title,user_id=user.id); db.add(c); db.commit(); db.refresh(c); return c
@router.get("/{chat_id}")
def get_chat(chat_id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
    c=owned(db,user,chat_id); return {"id":c.id,"title":c.title,"messages":[msgout(m) for m in c.messages]}
@router.patch("/{chat_id}",response_model=ChatOut)
def rename_chat(chat_id:int,data:ChatRename,db:Session=Depends(get_db),user:User=Depends(current_user)):
    c=owned(db,user,chat_id); c.title=data.title.strip(); db.commit(); db.refresh(c); return c
@router.delete("/{chat_id}")
def delete_chat(chat_id:int,db:Session=Depends(get_db),user:User=Depends(current_user)):
    c=owned(db,user,chat_id)
    upload_dir=get_settings().upload_path
    for doc in c.documents: (upload_dir/doc.stored_name).unlink(missing_ok=True)
    db.delete(c); db.commit(); return {"ok":True}
