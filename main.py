from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pdfplumber
import pytesseract
import shutil
import re
import os
import logging
import tempfile
from werkzeug.utils import secure_filename
import uuid
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')
CORS(app)

# NVIDIA AI Configuration
NVIDIA_API_KEY = os.environ.get('NVIDIA_API_KEY')
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# Allow users to set the tesseract executable path using environment variable
# Useful on Windows if tesseract isn't on PATH or uses a custom install location
if os.environ.get('TESSERACT_CMD'):
    tesseract_cmd = os.environ.get('TESSERACT_CMD')
    if os.path.exists(tesseract_cmd):
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        logger.info(f"Using TESSERACT_CMD from env: {pytesseract.pytesseract.tesseract_cmd}")
    else:
        logger.warning(f"TESSERACT_CMD is set but the path does not exist: {tesseract_cmd}. "
                       "If Tesseract is installed, set TESSERACT_CMD to the full path or add tesseract to PATH.")

def extract_transactions(pdf_path):
    transactions = []
    # check for tesseract either in PATH or via TESSERACT_CMD env var
    tesseract_env = os.environ.get('TESSERACT_CMD')
    tesseract_path = tesseract_env or shutil.which('tesseract')
    tesseract_available = False
    if tesseract_path:
        # If we were given a path via env var, ensure it exists
        if tesseract_env:
            if os.path.exists(tesseract_env):
                tesseract_available = True
            else:
                logger.debug("TESSERACT_CMD set but not found on disk; OCR disabled")
        else:
            # found via PATH
            tesseract_available = True

    if not tesseract_available:
        logger.debug("Tesseract command not found; OCR won't be available. Set TESSERACT_CMD or add tesseract to PATH.")

    try:
        with pdfplumber.open(pdf_path) as pdf:
            logger.info(f"PDF opened successfully. Total pages: {len(pdf.pages)}")
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                
                if not text or len(text.strip()) < 10:
                    logger.info(f"Page {page_num}: No text found, trying OCR...")
                    try:
                        if not tesseract_available:
                            raise EnvironmentError("tesseract is not installed or TESSERACT_CMD is not set to a valid path")
                        img = page.to_image(resolution=300)
                        pil_image = img.original
                        text = pytesseract.image_to_string(pil_image)
                        logger.info(f"Page {page_num}: OCR extracted {len(text)} characters")
                    except Exception as ocr_error:
                        logger.warning(
                            f"Page {page_num}: OCR failed: {ocr_error}. "
                            "If your PDF is scanned or contains images, install Tesseract or set TESSERACT_CMD (see README)."
                        )
                        text = ""
                else:
                    logger.info(f"Page {page_num}: Regular extraction got {len(text)} characters")
                
                if text:
                    lines = text.split('\n')
                    transactions.extend(lines)
                    logger.debug(f"Page {page_num}: Added {len(lines)} lines")
            
            logger.info(f"Total transactions extracted: {len(transactions)}")
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}", exc_info=True)
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

def categorize_transaction(line):
    line_lower = line.lower()
    
    categories = {
        'Food': ['restaurant', 'cafe', 'food', 'zomato', 'swiggy', 'dominos', 'pizza', 'mcdonald', 
                 'kfc', 'burger', 'starbucks', 'subway', 'dining', 'eatery', 'kitchen', 'bakery'],
        'Travel': ['uber', 'ola', 'rapido', 'taxi', 'metro', 'railway', 'irctc', 'flight', 'airline',
                   'indigo', 'spicejet', 'makemytrip', 'goibibo', 'bus', 'fuel', 'petrol', 'diesel'],
        'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall', 'store', 'retail',
                     'mart', 'supermarket', 'grocery', 'fashion', 'clothing', 'bigbasket'],
        'Entertainment': ['netflix', 'prime', 'hotstar', 'disney', 'spotify', 'youtube', 'movie',
                         'cinema', 'theatre', 'pvr', 'inox', 'game', 'gaming', 'steam'],
        'Subscriptions': ['subscription', 'membership', 'monthly', 'yearly', 'renewal', 'premium',
                         'plan', 'recharge', 'recurring']
    }
    
    for category, keywords in categories.items():
        if any(keyword in line_lower for keyword in keywords):
            return category
    
    return 'Other'

def remove_duplicates(transactions):
    seen = set()
    unique_transactions = []
    
    for trans in transactions:
        trans_key = (trans.get('line', '').strip(), trans.get('amount', 0))
        
        if trans_key not in seen and trans_key[0]:
            seen.add(trans_key)
            unique_transactions.append(trans)
    
    return unique_transactions

def detect_leaks(transactions):
    repeating_charges = []
    micro_transactions = []
    fees = []
    penalties = []
    
    merchant_counts = {}
    merchant_to_lines = {}
    merchant_amounts = {}
    counted_lines = set()
    transaction_count = 0
    
    for idx, line in enumerate(transactions):
        if not line.strip():
            continue
            
        line_lower = line.lower()
        
        amount_match = re.search(r'(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)', line)
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
        
        is_debit = any(marker in line_lower for marker in ['debit', 'dr', 'withdrawal', 'paid'])
        is_credit = any(marker in line_lower for marker in ['credit', 'cr', 'deposit', 'received'])
        
        if is_credit and not is_debit:
            continue
        
        transaction_count += 1
        
        merchant = extract_merchant_name(line)
        if merchant:
            merchant_counts[merchant] = merchant_counts.get(merchant, 0) + 1
            merchant_amounts[merchant] = merchant_amounts.get(merchant, 0) + amount
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
        item['category'] = categorize_transaction(item['line'])
        del item['idx']
    for item in fees:
        item['category'] = categorize_transaction(item['line'])
        del item['idx']
    for item in penalties:
        item['category'] = categorize_transaction(item['line'])
        del item['idx']
    
    micro_transactions = remove_duplicates(micro_transactions)
    fees = remove_duplicates(fees)
    penalties = remove_duplicates(penalties)
    
    category_spending = {'Food': 0, 'Travel': 0, 'Shopping': 0, 'Entertainment': 0, 'Subscriptions': 0, 'Other': 0}
    
    for item in micro_transactions + fees + penalties:
        category = item.get('category', 'Other')
        category_spending[category] += item['amount']
    
    for charge in repeating_charges:
        category = categorize_transaction(charge['merchant'])
        category_spending[category] += charge['total']
    
    top_merchants = sorted(
        [(merchant, merchant_amounts[merchant], merchant_counts[merchant]) 
         for merchant in merchant_amounts],
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    top_merchants_list = [
        {'name': merchant, 'amount': round(amount, 2), 'count': count}
        for merchant, amount, count in top_merchants
    ]
    
    category_summary = {
        'repeating_charges': {
            'count': len(repeating_charges),
            'total': round(sum(item['total'] for item in repeating_charges), 2)
        },
        'micro_transactions': {
            'count': len(micro_transactions),
            'total': round(sum(item['amount'] for item in micro_transactions), 2)
        },
        'fees': {
            'count': len(fees),
            'total': round(sum(item['amount'] for item in fees), 2)
        },
        'penalties': {
            'count': len(penalties),
            'total': round(sum(item['amount'] for item in penalties), 2)
        }
    }
    
    # Generate AI-powered suggestions
    suggestions = generate_ai_suggestions(
        repeating_charges=repeating_charges,
        micro_transactions=micro_transactions,
        fees=fees,
        penalties=penalties,
        category_spending=category_spending,
        total_waste=total_waste,
        transaction_count=transaction_count
    )
    
    category_spending_list = [
        {'category': cat, 'amount': round(amt, 2)}
        for cat, amt in sorted(category_spending.items(), key=lambda x: x[1], reverse=True)
        if amt > 0
    ]
    
    return {
        'transaction_count': transaction_count,
        'top_merchants': top_merchants_list,
        'category_summary': category_summary,
        'category_spending': category_spending_list,
        'suggestions': suggestions,
        'repeating_charges': repeating_charges,
        'micro_transactions': micro_transactions,
        'fees': fees,
        'penalties': penalties,
        'total_waste': round(total_waste, 2)
    }

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/dashboard')
def dashboard():
    return send_from_directory('static', 'dashboard.html')

@app.route('/app.js')
def serve_js():
    return send_from_directory('static', 'app.js')

@app.route('/dashboard.js')
def serve_dashboard_js():
    return send_from_directory('static', 'dashboard.js')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        logger.warning("No file in request")
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        logger.warning("Empty filename")
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        logger.warning(f"Invalid file type: {file.filename}")
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    safe_name = secure_filename(file.filename)
    # Save to system temp directory in a unique temp file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uuid.uuid4().hex}_{safe_name}")
    try:
        temp_path = temp_file.name
        logger.info(f"Saving file to: {temp_path}")
        # close so Werkzeug can write to the same file on Windows
        temp_file.close()
        file.save(temp_path)
    
        logger.info("Extracting transactions from PDF...")
        transactions = extract_transactions(temp_path)
    except Exception as e:
        logger.error("Error handling uploaded file", exc_info=True)
        return jsonify({'error': 'Failed to process uploaded file'}), 500
    finally:
        # cleanup
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            logger.warning("Failed to remove temporary file", exc_info=True)
    
    if not transactions:
        logger.error("No transactions extracted from PDF")
        return jsonify({'error': 'Could not extract text from PDF. The PDF might be scanned/image-based or empty. Please upload a text-based PDF bank statement.'}), 400
    
    logger.info(f"Analyzing {len(transactions)} transactions...")
    results = detect_leaks(transactions)
    logger.info(f"Analysis complete. Found {len(results['repeating_charges'])} repeating charges, {len(results['micro_transactions'])} micro transactions")
    
    return jsonify(results)

def generate_ai_suggestions(repeating_charges, micro_transactions, fees, penalties, category_spending, total_waste, transaction_count):
    """Use NVIDIA Llama to generate personalized financial suggestions"""
    
    if not NVIDIA_API_KEY:
        # Fallback to rule-based suggestions if no API key
        logger.warning("NVIDIA_API_KEY not set, using rule-based suggestions")
        suggestions = []
        if len(repeating_charges) > 0:
            suggestions.append("Review your recurring subscriptions - you might be paying for services you no longer use.")
        if len(fees) > 3:
            suggestions.append("Consider switching to a bank account with lower or no fees.")
        if len(penalties) > 0:
            suggestions.append("Set up automatic payments to avoid late fees and interest charges.")
        if len(micro_transactions) > 10:
            suggestions.append("Small purchases add up! Try tracking your daily spending more carefully.")
        if not suggestions:
            suggestions.append("Good job! Your spending looks relatively clean. Keep monitoring regularly.")
        return suggestions
    
    try:
        # Prepare data summary for AI
        top_categories = sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:3]
        top_cat_str = ", ".join([f"{cat}: ₹{amt:.0f}" for cat, amt in top_categories if amt > 0])
        
        prompt = f"""You are a financial advisor. Analyze this user's spending and provide 3-4 specific, actionable suggestions to save money.

Financial Data:
- Total Transactions: {transaction_count}
- Money Wasted: ₹{total_waste:.2f}
- Repeating Charges: {len(repeating_charges)} merchants (totaling ₹{sum(c['total'] for c in repeating_charges):.2f})
- Micro-Transactions (₹20-200): {len(micro_transactions)} items
- Bank Fees: {len(fees)} charges
- Penalties/Interest: {len(penalties)} charges
- Top Spending Categories: {top_cat_str}

Provide practical, specific suggestions. Be encouraging but direct. Format as bullet points."""

        headers = {
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "meta/llama-3.1-8b-instruct",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 400,
            "top_p": 1,
            "stream": False
        }
        
        response = requests.post(NVIDIA_API_URL, headers=headers, json=data, timeout=10)
        
        if response.status_code == 200:
            ai_response = response.json()['choices'][0]['message']['content']
            # Parse bullet points into list
            suggestions = [line.strip('- •').strip() for line in ai_response.split('\n') if line.strip() and (line.strip().startswith('-') or line.strip().startswith('•'))]
            if not suggestions:  # If no bullet points, split by newlines
                suggestions = [s.strip() for s in ai_response.split('\n') if s.strip()]
            logger.info(f"Generated {len(suggestions)} AI suggestions")
            return suggestions[:5]  # Limit to 5 suggestions
        else:
            logger.error(f"NVIDIA API error: {response.status_code} - {response.text}")
            raise Exception("AI API failed")
            
    except Exception as e:
        logger.error(f"Error generating AI suggestions: {e}")
        # Fallback to rule-based
        suggestions = []
        if len(repeating_charges) > 0:
            suggestions.append("Review your recurring subscriptions - you might be paying for services you no longer use.")
        if len(fees) > 3:
            suggestions.append("Consider switching to a bank account with lower or no fees.")
        if len(penalties) > 0:
            suggestions.append("Set up automatic payments to avoid late fees and interest charges.")
        if len(micro_transactions) > 10:
            suggestions.append("Small purchases add up! Try tracking your daily spending more carefully.")
        if not suggestions:
            suggestions.append("Good job! Your spending looks relatively clean. Keep monitoring regularly.")
        return suggestions

@app.route('/ask-ai', methods=['POST'])
def ask_ai():
    """AI-powered financial assistant endpoint"""
    
    if not NVIDIA_API_KEY:
        return jsonify({'error': 'AI service not configured'}), 503
    
    try:
        data = request.json
        user_query = data.get('query', '').strip()
        analysis_data = data.get('results', {})
        
        if not user_query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Prepare context from analysis data
        context = f"""Transaction Analysis:
- Total Transactions: {analysis_data.get('transaction_count', 0)}
- Money Wasted: ₹{analysis_data.get('total_waste', 0)}
- Repeating Charges: {len(analysis_data.get('repeating_charges', []))} items
- Micro-Transactions: {len(analysis_data.get('micro_transactions', []))} items
- Fees: {len(analysis_data.get('fees', []))} items
- Penalties: {len(analysis_data.get('penalties', []))} items

Top Merchants: {', '.join([m['name'] for m in analysis_data.get('top_merchants', [])[:3]])}

User Question: {user_query}

Provide a helpful, specific answer with numbers from the data. Be conversational and encouraging."""

        headers = {
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "meta/llama-3.1-8b-instruct",
            "messages": [{"role": "user", "content": context}],
            "temperature": 0.7,
            "max_tokens": 500,
            "top_p": 1,
            "stream": False
        }
        
        response = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=15)
        
        if response.status_code == 200:
            ai_answer = response.json()['choices'][0]['message']['content']
            return jsonify({'answer': ai_answer})
        else:
            logger.error(f"NVIDIA API error: {response.status_code} - {response.text}")
            return jsonify({'error': 'AI service unavailable'}), 503
            
    except Exception as e:
        logger.error(f"Error in ask-ai endpoint: {e}", exc_info=True)
        return jsonify({'error': 'Failed to process AI request'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
