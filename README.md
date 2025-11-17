# ShadowFinance

ShadowFinance is a Flask web app that extracts and analyzes bank statement transactions from PDFs to detect micro-transactions, repeating charges, fees, and penalties. It uses `pdfplumber` for text extraction and `pytesseract` for OCR of scanned pages.

## Quick start

1. Create and activate a virtual environment

```powershell
python -m venv ven
ven\Scripts\Activate.ps1
```

2. Install requirements

```powershell
pip install -r requirements.txt
```

3. Run the app

```powershell
python main.py
```

4. Open http://127.0.0.1:5000/ and upload a PDF bank statement in the UI.

## Notes
- For OCR on Windows, ensure you have Tesseract installed and `pytesseract` configured with the correct path.
- This project stores uploaded PDFs in a temporary system file and removes them after processing.
