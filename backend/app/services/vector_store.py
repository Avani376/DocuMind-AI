from pathlib import Path
import numpy as np
class LocalVectorStore:
    """Per-user persisted FAISS index. Chunk metadata remains in SQLite."""
    def __init__(self, base:Path): self.base=base; self.base.mkdir(parents=True,exist_ok=True)
    def _path(self,user_id:int,chat_id:int): return self.base/f"user_{user_id}_chat_{chat_id}.index"
    def add(self,user_id:int,chat_id:int, vectors, ids:list[int]):
        try: import faiss
        except ImportError as e: raise RuntimeError("FAISS is unavailable. Install faiss-cpu for your Python version.") from e
        vec=np.asarray(vectors,dtype="float32"); path=self._path(user_id,chat_id)
        if path.exists(): index=faiss.read_index(str(path))
        else: index=faiss.IndexIDMap2(faiss.IndexFlatIP(vec.shape[1]))
        index.add_with_ids(vec,np.asarray(ids,dtype="int64")); faiss.write_index(index,str(path))
    def search(self,user_id:int,chat_id:int, vector, k:int):
        try: import faiss
        except ImportError as e: raise RuntimeError("FAISS is unavailable. Install faiss-cpu.") from e
        path=self._path(user_id,chat_id)
        if not path.exists(): return []
        index=faiss.read_index(str(path)); scores,ids=index.search(np.asarray(vector,dtype="float32"),k)
        return [(int(i),float(s)) for i,s in zip(ids[0],scores[0]) if i>=0]
    def remove_user_index(self,user_id:int,chat_id:int): self._path(user_id,chat_id).unlink(missing_ok=True)
