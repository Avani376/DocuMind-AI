from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from pwdlib import PasswordHash
from .config import get_settings
password_hash=PasswordHash.recommended()
ALGORITHM="HS256"
def hash_password(password:str)->str: return password_hash.hash(password)
def verify_password(password:str, hashed:str)->bool: return password_hash.verify(password, hashed)
def create_access_token(user_id:int)->str:
    s=get_settings(); exp=datetime.now(timezone.utc)+timedelta(hours=8)
    return jwt.encode({"sub":str(user_id),"exp":exp},s.secret_key,algorithm=ALGORITHM)
def decode_access_token(token:str)->int|None:
    try: return int(jwt.decode(token,get_settings().secret_key,algorithms=[ALGORITHM])["sub"])
    except (JWTError,KeyError,ValueError): return None
