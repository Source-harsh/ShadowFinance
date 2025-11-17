from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pdfplumber
import re
import os

app = Flask(__name__, static_folder='static')
CORS(app)

def extract_transactions(pdf_path):
    transactions = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF opened successfully. Total pages: {len(pdf.pages)}")
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                print(f"Page {page_num} text length: {len(text) if text else 0}")
                if text:
                    lines = text.split('\n')
                    transactions.extend(lines)
                    print(f"Page {page_num} extracted {len(lines)} lines")
            print(f"Total transactions extracted: {len(transactions)}")
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        import traceback
        traceback.print_exc()
    return transactions

def extract_merchant_name(line):
    date_words = {'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
                  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 
                  'october', 'november', 'december', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'}
    
    words = re.findall(r'[A-Za-z]+', line)
    
    merchant_words = []
    for word in words:
        if word.lower() not in date_words and len(word) > 2:
            merchant_words.append(word)
            if len(merchant_words) >= 3:
                break
    
    if merchant_words:
        return ' '.join(merchant_words)
    return None

def detect_leaks(transactions):
    repeating_charges = []
    micro_transactions = []
    fees = []
    penalties = []
    
    merchant_counts = {}
    merchant_to_lines = {}
    counted_lines = set()
    
    for idx, line in enumerate(transactions):
        if not line.strip():
            continue
            
        line_lower = line.lower()
        
        amount_match = re.search(r'₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)', line)
        if amount_match:
            amount_str = amount_match.group(1).replace(',', '')
            try:
                amount = float(amount_str)
            except ValueError:
                amount = 0
        else:
            amount = 0
        
        if amount == 0:
            continue
        
        merchant = extract_merchant_name(line)
        if merchant:
            merchant_counts[merchant] = merchant_counts.get(merchant, 0) + 1
            if merchant not in merchant_to_lines:
                merchant_to_lines[merchant] = []
            merchant_to_lines[merchant].append((idx, line, amount))
        
        if 20 <= amount <= 200:
            micro_transactions.append({
                'line': line,
                'amount': amount,
                'idx': idx
            })
        
        if any(keyword in line_lower for keyword in ['atm', 'fee', 'charge', 'charges']):
            fees.append({
                'line': line,
                'amount': amount,
                'idx': idx
            })
        
        if any(keyword in line_lower for keyword in ['penalty', 'interest', 'late', 'overdue']):
            penalties.append({
                'line': line,
                'amount': amount,
                'idx': idx
            })
    
    for merchant, count in merchant_counts.items():
        if count >= 3:
            lines_info = merchant_to_lines[merchant]
            total = sum(amount for _, _, amount in lines_info)
            
            for idx, _, _ in lines_info:
                counted_lines.add(idx)
            
            repeating_charges.append({
                'merchant': merchant,
                'count': count,
                'total': total,
                'lines': [line for _, line, _ in lines_info[:5]]
            })
    
    total_waste = 0
    total_waste += sum(item['total'] for item in repeating_charges)
    
    for item in micro_transactions:
        if item['idx'] not in counted_lines:
            total_waste += item['amount']
            counted_lines.add(item['idx'])
    
    for item in fees:
        if item['idx'] not in counted_lines:
            total_waste += item['amount']
            counted_lines.add(item['idx'])
    
    for item in penalties:
        if item['idx'] not in counted_lines:
            total_waste += item['amount']
            counted_lines.add(item['idx'])
    
    for item in micro_transactions:
        del item['idx']
    for item in fees:
        del item['idx']
    for item in penalties:
        del item['idx']
    
    return {
        'repeating_charges': repeating_charges,
        'micro_transactions': micro_transactions,
        'fees': fees,
        'penalties': penalties,
        'total_waste': round(total_waste, 2)
    }

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/app.js')
def serve_js():
    return send_from_directory('static', 'app.js')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        print("Error: No file in request")
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        print("Error: Empty filename")
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.pdf'):
        print(f"Error: Invalid file type: {file.filename}")
        return jsonify({'error': 'Only PDF files are allowed'}), 400
    
    temp_path = '/tmp/uploaded.pdf'
    print(f"Saving file to: {temp_path}")
    file.save(temp_path)
    
    print("Extracting transactions from PDF...")
    transactions = extract_transactions(temp_path)
    
    if os.path.exists(temp_path):
        os.remove(temp_path)
    
    if not transactions:
        print("Error: No transactions extracted from PDF")
        return jsonify({'error': 'Could not extract text from PDF. The PDF might be scanned/image-based or empty. Please upload a text-based PDF bank statement.'}), 400
    
    print(f"Analyzing {len(transactions)} transactions...")
    results = detect_leaks(transactions)
    print(f"Analysis complete. Found {len(results['repeating_charges'])} repeating charges, {len(results['micro_transactions'])} micro transactions")
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
