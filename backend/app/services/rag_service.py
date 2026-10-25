from .retrieval import Retriever
from .llm_service import LLMService
from ..models import Document
class RAGService:
    def __init__(self,settings): self.retriever=Retriever(settings); self.llm=LLMService(settings)
    def ask(self,db,user_id:int,chat_id:int,question:str):
        has_ready_documents=db.query(Document.id).filter(Document.user_id==user_id,Document.chat_id==chat_id,Document.status=="ready").first()
        contexts=self.retriever.retrieve(db,user_id,chat_id,question) if has_ready_documents else []
        answer=self.llm.answer(question,contexts)
        sources=[{"document_id":c["document_id"],"filename":c["filename"],"page_number":c["page_number"],"chunk_id":c["chunk_id"],"excerpt":c["content"][:280]} for c in contexts]
        return answer,sources
