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
 - For OCR on Windows, ensure you have Tesseract installed and `pytesseract` configured with the correct path.

Installing Tesseract on Windows (recommended):

1. Download the Tesseract installer from https://github.com/tesseract-ocr/tesseract/releases and run it.
2. During install, note the install directory (default: C:\Program Files\Tesseract-OCR).
3. Add the installation folder to your PATH: open PowerShell as Admin and run:

```powershell
setx PATH "$($env:PATH);C:\\Program Files\\Tesseract-OCR"
```

4. Close and reopen PowerShell/terminal and verify:

```powershell
tesseract --version
```

If `tesseract` reports a version, restart the Flask app and upload the PDF again. If you still see OCR warnings, ensure `pytesseract` is installed and the path is correct.
- This project stores uploaded PDFs in a temporary system file and removes them after processing.
