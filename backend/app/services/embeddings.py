from functools import lru_cache
@lru_cache(maxsize=1)
def model(name:str):
    try: from sentence_transformers import SentenceTransformer
    except ImportError as e: raise RuntimeError("Sentence Transformers is not installed. Install backend requirements.") from e
    return SentenceTransformer(name)
def embed(texts:list[str], name:str):
    if not texts: return []
    return model(name).encode(texts, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False)
