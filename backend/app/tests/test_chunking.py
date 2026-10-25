from app.services.chunking import chunk_pages
def test_chunk_metadata_and_overlap():
    chunks=chunk_pages([(3,"abcdefghij")],size=6,overlap=2)
    assert chunks[0]["page_number"]==3 and chunks[0]["content"]=="abcdef"
    assert chunks[1]["content"].startswith("ef")
def test_invalid_overlap():
    try: chunk_pages([(1,"x")],size=4,overlap=4)
    except ValueError: return
    assert False
