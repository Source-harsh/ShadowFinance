# ShadowFinance - Hidden Money Detector

## Overview
A full-stack PDF bank statement analyzer that detects hidden financial leaks and wasted money. Built with Flask backend and vanilla JavaScript frontend.

## Current State
Fully functional MVP with PDF upload, text extraction, pattern detection, and real-time results display.

## Recent Changes
**November 17, 2025**
- Initial project setup with Flask backend and vanilla JS frontend
- Implemented PDF text extraction using pdfplumber
- Added detection algorithms for 4 types of financial leaks
- Created responsive UI with Tailwind CSS
- Configured Flask server on port 5000 for Replit webview
- Improved merchant name extraction with date filtering to avoid false matches
- Fixed total waste calculation to prevent double-counting overlapping categories

## Project Architecture

### File Structure
```
/main.py              - Flask backend API
/requirements.txt     - Python dependencies
/static/index.html    - Frontend page
/static/app.js        - Frontend logic
/.gitignore          - Python ignore rules
```

### Backend (Flask + pdfplumber)
- **POST /analyze** - Accepts PDF file upload, extracts text, detects patterns
- **GET /** - Serves index.html
- **GET /app.js** - Serves JavaScript file

### Detection Algorithms
1. **Repeating Charges**: Merchants appearing 3+ times
2. **Micro Transactions**: Amounts between ₹20-₹200
3. **Fees**: Keywords like "ATM", "fee", "charge"
4. **Penalties**: Keywords like "penalty", "interest", "late"

### Frontend (Tailwind + Vanilla JS)
- Drag-and-drop PDF upload interface
- Real-time analysis with loading states
- Categorized results display with totals
- Clean gradient UI with glassmorphism effects

## Dependencies
- flask - Web framework
- flask-cors - Cross-origin support
- pdfplumber - PDF text extraction

## Run Configuration
- **Port**: 5000 (required for Replit webview)
- **Host**: 0.0.0.0 (allows external access)
- **Workflow**: Flask Server running `python main.py`
