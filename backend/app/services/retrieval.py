from sqlalchemy.orm import Session
from ..models import DocumentChunk, Document
from .embeddings import embed
from .vector_store import LocalVectorStore
from pathlib import Path
class Retriever:
    def __init__(self,settings): self.settings=settings; self.store=LocalVectorStore(Path("./vector_indexes"))
    def index_chunks(self,db:Session,user_id:int,chat_id:int, chunks:list[DocumentChunk]):
        vectors=embed([c.content for c in chunks],self.settings.embedding_model)
        self.store.add(user_id,chat_id,vectors,[c.id for c in chunks])
    def retrieve(self,db:Session,user_id:int,chat_id:int,query:str):
        vector=embed([query],self.settings.embedding_model)
        hits=self.store.search(user_id,chat_id,vector,self.settings.retrieval_top_k)
        if not hits: return []
        ids=[i for i,_ in hits]; rows=db.query(DocumentChunk,Document).join(Document,Document.id==DocumentChunk.document_id).filter(DocumentChunk.id.in_(ids),DocumentChunk.user_id==user_id,Document.user_id==user_id,Document.chat_id==chat_id,Document.status=="ready").all()
        byid={c.id:(c,d) for c,d in rows}
        return [{"chunk_id":cid,"score":score,"content":byid[cid][0].content,"filename":byid[cid][1].filename,"page_number":byid[cid][0].page_number,"document_id":byid[cid][1].id} for cid,score in hits if cid in byid]
