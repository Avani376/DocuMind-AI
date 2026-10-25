from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import Credentials,RegisterCredentials,TokenOut,UserOut
from ..security import hash_password,verify_password,create_access_token
from ..deps import current_user
router=APIRouter(prefix="/api/auth",tags=["authentication"])
@router.post("/register",response_model=TokenOut)
def register(data:RegisterCredentials,db:Session=Depends(get_db)):
    email=data.email.lower()
    if db.query(User).filter(User.email==email).first(): raise HTTPException(409,"An account with this email already exists")
    user=User(email=email,name=data.name.strip(),password_hash=hash_password(data.password)); db.add(user); db.commit(); db.refresh(user)
    return {"access_token":create_access_token(user.id),"user":user}
@router.post("/login",response_model=TokenOut)
def login(data:Credentials,db:Session=Depends(get_db)):
    user=db.query(User).filter(User.email==data.email.lower()).first()
    if not user or not verify_password(data.password,user.password_hash): raise HTTPException(401,"Invalid email or password")
    return {"access_token":create_access_token(user.id),"user":user}
@router.get("/me",response_model=UserOut)
def me(user:User=Depends(current_user)): return user
