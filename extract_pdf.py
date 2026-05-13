import sys

pdf_path = r"c:\Users\gonza\Downloads\API MODULO - Manual de Integracion 1.1.0 (1).pdf"

def try_pdfplumber():
    import pdfplumber
    all_text = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                all_text.append(f"--- PAGE {i+1} ---\n{text}")
    return "\n\n".join(all_text)

def try_pymupdf():
    import fitz
    doc = fitz.open(pdf_path)
    all_text = []
    for i, page in enumerate(doc):
        text = page.get_text()
        all_text.append(f"--- PAGE {i+1} ---\n{text}")
    doc.close()
    return "\n\n".join(all_text)

def try_pypdf():
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    all_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        all_text.append(f"--- PAGE {i+1} ---\n{text}")
    return "\n\n".join(all_text)

for fn in [try_pdfplumber, try_pymupdf, try_pypdf]:
    try:
        result = fn()
        print(result)
        sys.exit(0)
    except ImportError:
        continue
    except Exception as e:
        print(f"Error with {fn.__name__}: {e}", file=sys.stderr)
        continue

print("No PDF library available.", file=sys.stderr)
sys.exit(1)
