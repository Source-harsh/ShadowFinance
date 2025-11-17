const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const error = document.getElementById('error');

dropzone.addEventListener('click', () => {
    fileInput.click();
});

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-pink-400', 'bg-white/5');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-pink-400', 'bg-white/5');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-pink-400', 'bg-white/5');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        updateFileName(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        updateFileName(e.target.files[0]);
    }
});

function updateFileName(file) {
    if (file.type === 'application/pdf') {
        fileName.textContent = file.name;
        fileName.classList.add('text-green-400');
        analyzeBtn.disabled = false;
    } else {
        fileName.textContent = 'Please select a PDF file';
        fileName.classList.remove('text-green-400');
        fileName.classList.add('text-red-400');
        analyzeBtn.disabled = true;
    }
}

analyzeBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Please select a PDF file first');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    analyzeBtn.disabled = true;
    
    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        sessionStorage.setItem('analysisResults', JSON.stringify(data));
        window.location.href = '/dashboard';
    } catch (err) {
        showError(err.message);
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});

function displayResults(data) {
    document.getElementById('totalWaste').textContent = `₹${data.total_waste.toLocaleString('en-IN')}`;
    document.getElementById('transactionCount').textContent = data.transaction_count;
    
    const categoriesCount = [
        data.category_summary.repeating_charges.count > 0,
        data.category_summary.micro_transactions.count > 0,
        data.category_summary.fees.count > 0,
        data.category_summary.penalties.count > 0
    ].filter(Boolean).length;
    document.getElementById('categoriesCount').textContent = categoriesCount;
    
    displayTopMerchants(data.top_merchants);
    displayCategorySpending(data.category_spending);
    displayCategorySummary(data.category_summary);
    displaySuggestions(data.suggestions);
    
    displayRepeatingCharges(data.repeating_charges);
    displayMicroTransactions(data.micro_transactions);
    displayFees(data.fees);
    displayPenalties(data.penalties);
    
    results.classList.remove('hidden');
}

function displayTopMerchants(merchants) {
    const container = document.getElementById('topMerchants');
    
    if (merchants.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No merchant data available</p>';
        return;
    }
    
    let html = '';
    merchants.forEach((merchant, index) => {
        html += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <div class="flex items-center gap-3">
                    <span class="text-lg font-bold text-gray-500">${index + 1}.</span>
                    <div>
                        <p class="font-semibold text-gray-800">${merchant.name}</p>
                        <p class="text-xs text-gray-500">${merchant.count} transactions</p>
                    </div>
                </div>
                <span class="text-emerald-600 font-bold">₹${merchant.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayCategorySpending(categories) {
    const container = document.getElementById('categorySpending');
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No category data available</p>';
        return;
    }
    
    const categoryIcons = {
        'Food': '🍔',
        'Travel': '✈️',
        'Shopping': '🛍️',
        'Entertainment': '🎬',
        'Subscriptions': '📱',
        'Other': '📦'
    };
    
    let html = '';
    categories.forEach(cat => {
        const icon = categoryIcons[cat.category] || '📦';
        html += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <div class="flex items-center gap-2">
                    <span class="text-xl">${icon}</span>
                    <span class="font-semibold text-gray-800">${cat.category}</span>
                </div>
                <span class="text-teal-600 font-bold">₹${cat.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayCategorySummary(summary) {
    const container = document.getElementById('categorySummary');
    
    const categories = [
        { name: 'Repeating Charges', data: summary.repeating_charges, color: 'red' },
        { name: 'Micro Transactions', data: summary.micro_transactions, color: 'yellow' },
        { name: 'Fees & Charges', data: summary.fees, color: 'orange' },
        { name: 'Penalties & Interest', data: summary.penalties, color: 'purple' }
    ];
    
    let html = '';
    categories.forEach(cat => {
        html += `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p class="text-sm text-gray-600 mb-1 font-medium">${cat.name}</p>
                <p class="text-xl font-bold text-${cat.color}-600">₹${cat.data.total.toLocaleString('en-IN')}</p>
                <p class="text-xs text-gray-500">${cat.data.count} items</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displaySuggestions(suggestions) {
    const container = document.getElementById('suggestions');
    
    let html = '';
    suggestions.forEach(suggestion => {
        html += `
            <li class="flex items-start gap-2 text-gray-700">
                <svg class="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span>${suggestion}</span>
            </li>
        `;
    });
    
    container.innerHTML = html;
}

function displayRepeatingCharges(charges) {
    const container = document.getElementById('repeatingCharges');
    
    if (charges.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No repeating charges detected</p>';
        return;
    }
    
    let html = '<ul class="space-y-3">';
    charges.forEach(charge => {
        html += `
            <li class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-semibold text-gray-800">${charge.merchant}</span>
                    <span class="text-red-600 font-bold">₹${charge.total.toLocaleString('en-IN')}</span>
                </div>
                <p class="text-sm text-gray-600">Appears ${charge.count} times</p>
            </li>
        `;
    });
    html += '</ul>';
    
    container.innerHTML = html;
}

function displayMicroTransactions(transactions) {
    const container = document.getElementById('microTransactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No micro transactions detected</p>';
        return;
    }
    
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    let html = `<p class="mb-3 text-yellow-600 font-semibold">Found ${transactions.length} small charges totaling ₹${total.toLocaleString('en-IN')}</p>`;
    html += '<ul class="space-y-2 max-h-60 overflow-y-auto">';
    
    transactions.slice(0, 10).forEach(trans => {
        html += `
            <li class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <span class="text-sm truncate mr-2 text-gray-700">${trans.line}</span>
                <span class="text-yellow-600 font-semibold whitespace-nowrap">₹${trans.amount}</span>
            </li>
        `;
    });
    
    if (transactions.length > 10) {
        html += `<li class="text-sm text-gray-400 italic p-2">...and ${transactions.length - 10} more</li>`;
    }
    
    html += '</ul>';
    container.innerHTML = html;
}

function displayFees(fees) {
    const container = document.getElementById('fees');
    
    if (fees.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No fees or charges detected</p>';
        return;
    }
    
    const total = fees.reduce((sum, f) => sum + f.amount, 0);
    
    let html = `<p class="mb-3 text-orange-600 font-semibold">Found ${fees.length} fees totaling ₹${total.toLocaleString('en-IN')}</p>`;
    html += '<ul class="space-y-2 max-h-60 overflow-y-auto">';
    
    fees.forEach(fee => {
        html += `
            <li class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <span class="text-sm truncate mr-2 text-gray-700">${fee.line}</span>
                <span class="text-orange-600 font-semibold whitespace-nowrap">₹${fee.amount}</span>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

function displayPenalties(penalties) {
    const container = document.getElementById('penalties');
    
    if (penalties.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No penalties or interest charges detected</p>';
        return;
    }
    
    const total = penalties.reduce((sum, p) => sum + p.amount, 0);
    
    let html = `<p class="mb-3 text-purple-600 font-semibold">Found ${penalties.length} penalties totaling ₹${total.toLocaleString('en-IN')}</p>`;
    html += '<ul class="space-y-2 max-h-60 overflow-y-auto">';
    
    penalties.forEach(penalty => {
        html += `
            <li class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <span class="text-sm truncate mr-2 text-gray-700">${penalty.line}</span>
                <span class="text-purple-600 font-semibold whitespace-nowrap">₹${penalty.amount}</span>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    error.classList.remove('hidden');
    results.classList.add('hidden');
}

function toggleSection(sectionName) {
    const content = document.getElementById(`${sectionName}Content`);
    const icon = document.getElementById(`${sectionName}Icon`);
    
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
}

function loadDoubts() {
    const doubts = JSON.parse(localStorage.getItem('doubts') || '[]');
    displayDoubts(doubts);
}

function displayDoubts(doubts) {
    const doubtsList = document.getElementById('doubtsList');
    
    if (doubts.length === 0) {
        doubtsList.innerHTML = '<p class="text-gray-400 italic">No doubts added yet</p>';
        return;
    }
    
    let html = '';
    doubts.forEach((doubt, index) => {
        html += `
            <div class="bg-black/30 p-4 rounded-lg flex items-start gap-3">
                <button onclick="toggleDoubtResolved(${index})" class="flex-shrink-0 mt-1">
                    ${doubt.resolved 
                        ? '<svg class="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
                        : '<svg class="w-6 h-6 text-gray-400 hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"></circle></svg>'
                    }
                </button>
                <div class="flex-grow ${doubt.resolved ? 'opacity-60' : ''}">
                    <p class="text-white ${doubt.resolved ? 'line-through' : ''}">${doubt.text}</p>
                    <p class="text-xs text-gray-400 mt-1">${new Date(doubt.timestamp).toLocaleString()}</p>
                </div>
                <button onclick="removeDoubt(${index})" class="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;
    });
    
    doubtsList.innerHTML = html;
}

function addDoubt() {
    const input = document.getElementById('doubtInput');
    const text = input.value.trim();
    
    if (!text) {
        alert('Please enter a doubt or query');
        return;
    }
    
    const doubts = JSON.parse(localStorage.getItem('doubts') || '[]');
    doubts.push({
        text: text,
        timestamp: new Date().toISOString(),
        resolved: false
    });
    
    localStorage.setItem('doubts', JSON.stringify(doubts));
    input.value = '';
    displayDoubts(doubts);
    
    const content = document.getElementById('doubtsContent');
    content.style.maxHeight = content.scrollHeight + 'px';
}

function toggleDoubtResolved(index) {
    const doubts = JSON.parse(localStorage.getItem('doubts') || '[]');
    doubts[index].resolved = !doubts[index].resolved;
    localStorage.setItem('doubts', JSON.stringify(doubts));
    displayDoubts(doubts);
}

function removeDoubt(index) {
    const doubts = JSON.parse(localStorage.getItem('doubts') || '[]');
    doubts.splice(index, 1);
    localStorage.setItem('doubts', JSON.stringify(doubts));
    displayDoubts(doubts);
}

loadDoubts();
