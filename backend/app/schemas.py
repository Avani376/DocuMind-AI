from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
class Credentials(BaseModel): email: EmailStr; password: str=Field(min_length=8, max_length=128)
class RegisterCredentials(Credentials): name:str=Field(default="", min_length=1, max_length=100)
class UserOut(BaseModel): id:int; email:str; name:str
class TokenOut(BaseModel): access_token:str; token_type:str="bearer"; user:UserOut
class ChatCreate(BaseModel): title:str=Field(default="New chat", max_length=200)
class ChatRename(BaseModel): title:str=Field(min_length=1,max_length=200)
class MessageCreate(BaseModel): content:str=Field(min_length=1,max_length=12000)
class MessageOut(BaseModel): id:int; role:str; content:str; sources:list[dict]; created_at:datetime
class ChatOut(BaseModel): id:int; title:str; created_at:datetime; updated_at:datetime
class DocumentOut(BaseModel): id:int; filename:str; status:str; error:str|None=None; created_at:datetime
class AnswerOut(BaseModel): user_message:MessageOut; assistant_message:MessageOut
