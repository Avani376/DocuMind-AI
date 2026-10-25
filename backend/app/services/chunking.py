def chunk_pages(pages:list[tuple[int|None,str]], size:int=800, overlap:int=120):
    if size<1 or overlap<0 or overlap>=size: raise ValueError("Require size > overlap >= 0")
    out=[]; idx=0
    for page,text in pages:
        clean=" ".join(text.split())
        start=0
        while start<len(clean):
            end=min(len(clean),start+size); piece=clean[start:end].strip()
            if piece: out.append({"chunk_index":idx,"page_number":page,"content":piece}); idx+=1
            if end==len(clean): break
            start=end-overlap
    return out
