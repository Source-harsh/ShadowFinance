function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + 'Content');
    const icon = document.getElementById(sectionId + 'Icon');
    
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
}

function loadResults() {
    const dataStr = sessionStorage.getItem('analysisResults');
    
    if (!dataStr) {
        window.location.href = '/';
        return;
    }
    
    const data = JSON.parse(dataStr);
    displayResults(data);
}

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
    
    loadDoubts();
}

function displayTopMerchants(merchants) {
    const container = document.getElementById('topMerchants');
    
    if (merchants.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No merchant data available</p>';
        return;
    }
    
    let html = '';
    merchants.forEach((merchant, index) => {
        html += `
            <div class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <span class="text-lg font-bold text-gray-400">${index + 1}.</span>
                    <div>
                        <p class="font-semibold text-white">${merchant.name}</p>
                        <p class="text-xs text-gray-400">${merchant.count} transactions</p>
                    </div>
                </div>
                <span class="text-blue-400 font-bold">₹${merchant.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayCategorySpending(categories) {
    const container = document.getElementById('categorySpending');
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No category data available</p>';
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
            <div class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-xl">${icon}</span>
                    <span class="font-semibold text-white">${cat.category}</span>
                </div>
                <span class="text-pink-400 font-bold">₹${cat.amount.toLocaleString('en-IN')}</span>
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
        { name: 'Penalties', data: summary.penalties, color: 'purple' }
    ];
    
    let html = '';
    categories.forEach(cat => {
        html += `
            <div class="bg-black/30 p-4 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-400">${cat.name}</span>
                    <span class="bg-${cat.color}-500 text-xs px-2 py-1 rounded-full">${cat.data.count}</span>
                </div>
                <p class="text-xl font-bold text-${cat.color}-400">₹${cat.data.amount.toLocaleString('en-IN')}</p>
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
            <li class="flex items-start gap-2 text-green-200">
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
        container.innerHTML = '<p class="text-gray-400 italic">No repeating charges detected</p>';
        return;
    }
    
    let html = '<div class="space-y-4">';
    charges.forEach(charge => {
        html += `
            <div class="bg-black/30 p-4 rounded-lg">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold text-white text-lg">${charge.merchant}</p>
                        <p class="text-sm text-gray-400">Occurred ${charge.count} times</p>
                    </div>
                    <span class="text-red-400 font-bold text-xl">₹${charge.total.toLocaleString('en-IN')}</span>
                </div>
                <div class="text-sm text-gray-300">
                    <p>Average: ₹${charge.average.toLocaleString('en-IN')} per transaction</p>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function displayMicroTransactions(transactions) {
    const container = document.getElementById('microTransactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No micro transactions detected</p>';
        return;
    }
    
    let html = '<div class="space-y-2">';
    transactions.forEach(trans => {
        const categoryBadge = trans.category ? `<span class="text-xs bg-blue-500/30 px-2 py-1 rounded">${trans.category}</span>` : '';
        html += `
            <div class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <div class="flex-1">
                    <p class="text-white text-sm">${trans.line}</p>
                    ${categoryBadge}
                </div>
                <span class="text-yellow-400 font-semibold ml-4">₹${trans.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function displayFees(fees) {
    const container = document.getElementById('fees');
    
    if (fees.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No fees detected</p>';
        return;
    }
    
    let html = '<div class="space-y-2">';
    fees.forEach(fee => {
        const categoryBadge = fee.category ? `<span class="text-xs bg-blue-500/30 px-2 py-1 rounded">${fee.category}</span>` : '';
        html += `
            <div class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <div class="flex-1">
                    <p class="text-white text-sm">${fee.line}</p>
                    ${categoryBadge}
                </div>
                <span class="text-orange-400 font-semibold ml-4">₹${fee.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function displayPenalties(penalties) {
    const container = document.getElementById('penalties');
    
    if (penalties.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No penalties detected</p>';
        return;
    }
    
    let html = '<div class="space-y-2">';
    penalties.forEach(penalty => {
        const categoryBadge = penalty.category ? `<span class="text-xs bg-blue-500/30 px-2 py-1 rounded">${penalty.category}</span>` : '';
        html += `
            <div class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <div class="flex-1">
                    <p class="text-white text-sm">${penalty.line}</p>
                    ${categoryBadge}
                </div>
                <span class="text-purple-400 font-semibold ml-4">₹${penalty.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function addDoubt() {
    const input = document.getElementById('doubtInput');
    const doubt = input.value.trim();
    
    if (!doubt) {
        return;
    }
    
    const doubts = getDoubts();
    doubts.push({
        id: Date.now(),
        text: doubt,
        timestamp: new Date().toLocaleString()
    });
    
    localStorage.setItem('doubts', JSON.stringify(doubts));
    input.value = '';
    loadDoubts();
}

function getDoubts() {
    const doubtsStr = localStorage.getItem('doubts');
    return doubtsStr ? JSON.parse(doubtsStr) : [];
}

function loadDoubts() {
    const doubts = getDoubts();
    const container = document.getElementById('doubtsList');
    
    if (doubts.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic text-sm">No queries added yet</p>';
        return;
    }
    
    let html = '';
    doubts.forEach(doubt => {
        html += `
            <div class="bg-black/30 p-4 rounded-lg">
                <div class="flex justify-between items-start mb-2">
                    <p class="text-white flex-1">${doubt.text}</p>
                    <button onclick="removeDoubt(${doubt.id})" class="text-red-400 hover:text-red-300 ml-4">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <p class="text-xs text-gray-500">${doubt.timestamp}</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function removeDoubt(id) {
    const doubts = getDoubts();
    const filtered = doubts.filter(d => d.id !== id);
    localStorage.setItem('doubts', JSON.stringify(filtered));
    loadDoubts();
}

window.addEventListener('load', loadResults);
