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
    error.classList.add('hidden');
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
        
        displayResults(data);
    } catch (err) {
        showError(err.message);
    } finally {
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
});

function displayResults(data) {
    document.getElementById('totalWaste').textContent = `₹${data.total_waste.toLocaleString('en-IN')}`;
    
    displayRepeatingCharges(data.repeating_charges);
    displayMicroTransactions(data.micro_transactions);
    displayFees(data.fees);
    displayPenalties(data.penalties);
    
    results.classList.remove('hidden');
}

function displayRepeatingCharges(charges) {
    const container = document.getElementById('repeatingCharges');
    
    if (charges.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No repeating charges detected</p>';
        return;
    }
    
    let html = '<ul class="space-y-3">';
    charges.forEach(charge => {
        html += `
            <li class="bg-black/30 p-4 rounded-lg">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-semibold text-white">${charge.merchant}</span>
                    <span class="text-red-400 font-bold">₹${charge.total.toLocaleString('en-IN')}</span>
                </div>
                <p class="text-sm text-gray-400">Appears ${charge.count} times</p>
            </li>
        `;
    });
    html += '</ul>';
    
    container.innerHTML = html;
}

function displayMicroTransactions(transactions) {
    const container = document.getElementById('microTransactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No micro transactions detected</p>';
        return;
    }
    
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    let html = `<p class="mb-3 text-yellow-400 font-semibold">Found ${transactions.length} small charges totaling ₹${total.toLocaleString('en-IN')}</p>`;
    html += '<ul class="space-y-2 max-h-60 overflow-y-auto">';
    
    transactions.slice(0, 10).forEach(trans => {
        html += `
            <li class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <span class="text-sm truncate mr-2">${trans.line}</span>
                <span class="text-yellow-400 font-semibold whitespace-nowrap">₹${trans.amount}</span>
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
        container.innerHTML = '<p class="text-gray-400 italic">No fees or charges detected</p>';
        return;
    }
    
    const total = fees.reduce((sum, f) => sum + f.amount, 0);
    
    let html = `<p class="mb-3 text-orange-400 font-semibold">Found ${fees.length} fees totaling ₹${total.toLocaleString('en-IN')}</p>`;
    html += '<ul class="space-y-2 max-h-60 overflow-y-auto">';
    
    fees.forEach(fee => {
        html += `
            <li class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <span class="text-sm truncate mr-2">${fee.line}</span>
                <span class="text-orange-400 font-semibold whitespace-nowrap">₹${fee.amount}</span>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

function displayPenalties(penalties) {
    const container = document.getElementById('penalties');
    
    if (penalties.length === 0) {
        container.innerHTML = '<p class="text-gray-400 italic">No penalties or interest charges detected</p>';
        return;
    }
    
    const total = penalties.reduce((sum, p) => sum + p.amount, 0);
    
    let html = `<p class="mb-3 text-purple-400 font-semibold">Found ${penalties.length} penalties totaling ₹${total.toLocaleString('en-IN')}</p>`;
    html += '<ul class="space-y-2 max-h-60 overflow-y-auto">';
    
    penalties.forEach(penalty => {
        html += `
            <li class="bg-black/30 p-3 rounded-lg flex justify-between items-center">
                <span class="text-sm truncate mr-2">${penalty.line}</span>
                <span class="text-purple-400 font-semibold whitespace-nowrap">₹${penalty.amount}</span>
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
