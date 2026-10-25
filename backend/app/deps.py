from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .security import decode_access_token
bearer=HTTPBearer(auto_error=False)
def current_user(creds:HTTPAuthorizationCredentials|None=Depends(bearer), db:Session=Depends(get_db))->User:
    uid=decode_access_token(creds.credentials) if creds else None
    if not uid: raise HTTPException(401,"Authentication required")
    user=db.get(User,uid)
    if not user: raise HTTPException(401,"Invalid authentication")
    return user
