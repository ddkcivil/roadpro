import fitz
import os

downloads = os.path.expanduser("~/Downloads")
target = None
for f in os.listdir(downloads):
    if 'Recommendation' in f and '49' in f:
        target = os.path.join(downloads, f)
        break

if target:
    print(f"Extracting from: {target}")
    doc = fitz.open(target)
    print(f"Pages: {len(doc)}")
    for i in range(min(3, len(doc))):
        page = doc[i]
        text = page.get_text()
        print(f"\n=== PAGE {i+1} (length={len(text)}) ===")
        print(repr(text[:5000]))
    doc.close()
else:
    print("PDF not found")
    # List all PDFs with Recommendation
    for f in os.listdir(downloads):
        if 'Recommendation' in f:
            print(f" - {f}")