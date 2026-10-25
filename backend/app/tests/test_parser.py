from app.services.document_parser import parse_document
def test_empty_txt(tmp_path):
    p=tmp_path/"empty.txt"; p.write_text("  ")
    try: parse_document(p,".txt")
    except ValueError as e: assert "empty" in str(e).lower()
    else: assert False
