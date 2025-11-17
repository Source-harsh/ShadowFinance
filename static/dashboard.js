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

let analysisResults = null; // Global variable to store results for AI context

function loadResults() {
    const dataStr = sessionStorage.getItem('analysisResults');
    
    if (!dataStr) {
        window.location.href = '/';
        return;
    }
    
    analysisResults = JSON.parse(dataStr); // Store globally for AI
    displayResults(analysisResults);
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
        { name: 'Penalties', data: summary.penalties, color: 'purple' }
    ];
    
    let html = '';
    categories.forEach(cat => {
        html += `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-600 font-medium">${cat.name}</span>
                    <span class="bg-${cat.color}-500 text-white text-xs px-2 py-1 rounded-full">${cat.data.count}</span>
                </div>
                <p class="text-xl font-bold text-${cat.color}-600">₹${cat.data.total.toLocaleString('en-IN')}</p>
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
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
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
    
    let html = '<div class="space-y-4">';
    charges.forEach(charge => {
        const average = charge.total / charge.count;
        html += `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold text-gray-800 text-lg">${charge.merchant}</p>
                        <p class="text-sm text-gray-600">Occurred ${charge.count} times</p>
                    </div>
                    <span class="text-red-600 font-bold text-xl">₹${charge.total.toLocaleString('en-IN')}</span>
                </div>
                <div class="text-sm text-gray-600">
                    <p>Average: ₹${average.toFixed(2)} per transaction</p>
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
        container.innerHTML = '<p class="text-gray-600 italic">No micro transactions detected</p>';
        return;
    }
    
    let html = '<div class="space-y-2">';
    transactions.forEach(trans => {
        const categoryBadge = trans.category ? `<span class="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">${trans.category}</span>` : '';
        html += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <div class="flex-1">
                    <p class="text-gray-700 text-sm">${trans.line}</p>
                    ${categoryBadge}
                </div>
                <span class="text-yellow-600 font-semibold ml-4">₹${trans.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function displayFees(fees) {
    const container = document.getElementById('fees');
    
    if (fees.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No fees detected</p>';
        return;
    }
    
    let html = '<div class="space-y-2">';
    fees.forEach(fee => {
        const categoryBadge = fee.category ? `<span class="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">${fee.category}</span>` : '';
        html += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <div class="flex-1">
                    <p class="text-gray-700 text-sm">${fee.line}</p>
                    ${categoryBadge}
                </div>
                <span class="text-orange-600 font-semibold ml-4">₹${fee.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function displayPenalties(penalties) {
    const container = document.getElementById('penalties');
    
    if (penalties.length === 0) {
        container.innerHTML = '<p class="text-gray-600 italic">No penalties detected</p>';
        return;
    }
    
    let html = '<div class="space-y-2">';
    penalties.forEach(penalty => {
        const categoryBadge = penalty.category ? `<span class="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">${penalty.category}</span>` : '';
        html += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-200">
                <div class="flex-1">
                    <p class="text-gray-700 text-sm">${penalty.line}</p>
                    ${categoryBadge}
                </div>
                <span class="text-purple-600 font-semibold ml-4">₹${penalty.amount.toLocaleString('en-IN')}</span>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

async function askAI() {
    const input = document.getElementById('aiInput');
    const button = document.getElementById('askButton');
    const query = input.value.trim();
    
    if (!query || !analysisResults) {
        return;
    }
    
    // Disable input while processing
    input.disabled = true;
    button.disabled = true;
    button.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Thinking...';
    
    // Display user message
    displayChatMessage(query, 'user');
    input.value = '';
    
    try {
        const response = await fetch('/ask-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                results: analysisResults
            })
        });
        
        const data = await response.json();
        
        if (data.answer) {
            displayChatMessage(data.answer, 'ai');
        } else if (data.error) {
            displayChatMessage('Sorry, I encountered an error. Please try again.', 'ai', true);
        }
    } catch (error) {
        console.error('Error asking AI:', error);
        displayChatMessage('Sorry, I could not connect to the AI service. Please try again later.', 'ai', true);
    } finally {
        // Re-enable input
        input.disabled = false;
        button.disabled = false;
        button.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Ask AI';
    }
}

function displayChatMessage(message, sender, isError = false) {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex gap-3 animate-fadeIn';
    
    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                You
            </div>
            <div class="flex-1 bg-emerald-50 text-gray-800 p-3 rounded-lg border border-emerald-200">
                <p class="text-sm">${escapeHtml(message)}</p>
            </div>
        `;
    } else {
        const bgClass = isError ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';
        const iconClass = isError ? 'bg-red-500' : 'bg-gradient-to-br from-purple-500 to-pink-600';
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 rounded-full ${iconClass} flex items-center justify-center text-white text-sm">
                🤖
            </div>
            <div class="flex-1 ${bgClass} text-gray-800 p-3 rounded-lg border">
                <p class="text-sm whitespace-pre-wrap">${escapeHtml(message)}</p>
            </div>
        `;
    }
    
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener('load', loadResults);
