// ============================================
// WEIGHT TRACKER SYSTEM
// File: weight-tracker.js
// ============================================

// Global Variables
let weightData = [];
let weightMiniChart = null;
let weightFullChart = null;
let useSupabase = true; // Use Supabase if available

// ============================================
// HELPER FUNCTION: Format Weight Display
// Menghilangkan .0 jika angka bulat
// ============================================
function formatWeight(value) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    const num = parseFloat(value);
    // Jika bilangan bulat, tampilkan tanpa desimal
    // Jika ada desimal, tampilkan 1 angka di belakang koma
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW (CRITICAL FIX)
// Functions must be accessible from HTML onclick
// ============================================
window.openWeightInputModal = function() {
    console.log('🔓 Opening weight input modal...');
    const modal = document.getElementById('weightInputModal');
    if (modal) {
        modal.classList.add('active');
        
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('weightDate');
        if (dateInput) {
            dateInput.value = today;
            dateInput.max = today;
        }
        
        const valueInput = document.getElementById('weightValue');
        if (valueInput) valueInput.value = '';
        
        const noteInput = document.getElementById('weightNote');
        if (noteInput) noteInput.value = '';
        
        const timeSelect = document.getElementById('weightTime');
        if (timeSelect) timeSelect.value = '';
        
        const preview = document.getElementById('weightChangePreview');
        if (preview) preview.style.display = 'none';
        
        console.log('✅ Modal opened');
    } else {
        console.error('❌ Modal element not found!');
    }
};

window.closeWeightInputModal = function() {
    console.log('🔒 Closing weight input modal...');
    const modal = document.getElementById('weightInputModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

window.openWeightHistoryModal = async function() {
    console.log('📊 Opening weight history modal...');
    const modal = document.getElementById('weightHistoryModal');
    if (modal) {
        modal.classList.add('active');
        
        // CRITICAL: Load data first!
        console.log('📥 Loading weight data...');
        await loadWeightData();
        
        // Update summary cards
        console.log('📊 Updating summary...');
        if (typeof updateHistorySummary === 'function') {
            updateHistorySummary();
        }
        
        // Display full history table
        console.log('📋 Displaying history...');
        if (typeof displayFullHistory === 'function') {
            displayFullHistory();
        }
        
        // Initialize chart
        console.log('📈 Initializing chart...');
        if (typeof initWeightFullChart === 'function') {
            initWeightFullChart();
        }
    }
};

window.closeWeightHistoryModal = function() {
    console.log('🔒 Closing weight history modal...');
    const modal = document.getElementById('weightHistoryModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('⚖️ Weight Tracker initialized');
    loadWeightData();
    
    // Initialize when dashboard loads
    setTimeout(() => {
        if (document.getElementById('weightMiniChart')) {
            initializeWeightTracker();
        }
    }, 500);
});

async function initializeWeightTracker() {
    console.log('🔄 Initializing Weight Tracker...');
    
    // Load data (will try Supabase first, then localStorage)
    await loadWeightData();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const weightDateInput = document.getElementById('weightDate');
    if (weightDateInput) {
        weightDateInput.value = today;
        weightDateInput.max = today;
    }
    
    // Update displays
    updateWeightDisplay();
    
    // Init mini chart
    if (document.getElementById('weightMiniChart')) {
        initWeightMiniChart();
    }
    
    console.log('✅ Weight Tracker ready');
}

// ============================================
// DATA MANAGEMENT
// ============================================

async function loadWeightData() {
    console.log('📥 Loading weight data...');
    
    // ⭐ FIXED: Get currentUser from localStorage
    const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUserData?.id || currentUserData?.email || 'guest';
    
    // Check if Supabase functions are available
    if (typeof loadWeightFromSupabase === 'function' && useSupabase && currentUserData?.id) {
        try {
            console.log('🔄 Loading from Supabase...');
            weightData = await loadWeightFromSupabase();
            
            // Also update localStorage as cache (per user)
            localStorage.setItem(`weightTracking_${userId}`, JSON.stringify(weightData));
            
            console.log('✅ Loaded', weightData.length, 'entries from Supabase');
            return;
        } catch (err) {
            console.warn('⚠️ Supabase load failed, falling back to localStorage:', err);
        }
    }
    
    // Fallback to localStorage (per user)
    const storageKey = `weightTracking_${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
        weightData = JSON.parse(stored);
        console.log('✅ Loaded', weightData.length, 'weight entries from localStorage for user:', userId);
    } else {
        weightData = [];
        console.log('📭 No weight data found for user:', userId);
    }
}

async function saveWeightToStorage() {
    // Save to localStorage first (per user)
    const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUserData?.id || currentUserData?.email || 'guest';
    const storageKey = `weightTracking_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(weightData));
    console.log('💾 Weight data saved to localStorage for user:', userId);
    
    // ⭐ FIXED: Langsung save ke Supabase tanpa cek isUserAuthenticated
    if (typeof saveWeightToSupabase === 'function' && useSupabase && weightData.length > 0) {
        try {
            const latestEntry = weightData[0];
            console.log('📤 Saving to Supabase:', latestEntry);
            const result = await saveWeightToSupabase(latestEntry);
            if (result && result.success) {
                console.log('✅ Weight data synced to Supabase');
            } else {
                console.warn('⚠️ Supabase save returned:', result);
            }
        } catch (err) {
            console.warn('⚠️ Supabase sync failed:', err);
        }
    } else {
        console.log('ℹ️ Supabase save skipped - saveWeightToSupabase:', typeof saveWeightToSupabase, 'useSupabase:', useSupabase, 'weightData.length:', weightData.length);
    }
}

function getWeightData() {
    return weightData;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openWeightInputModal() {
    const modal = document.getElementById('weightInputModal');
    if (modal) {
        modal.classList.add('active');
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('weightDate').value = today;
        document.getElementById('weightValue').value = '';
        document.getElementById('weightNote').value = '';
        
        const preview = document.getElementById('weightPreviewInfo');
        if (preview) preview.style.display = 'none';
    }
}

function closeWeightInputModal() {
    const modal = document.getElementById('weightInputModal');
    if (modal) modal.classList.remove('active');
}

function openWeightHistoryModal() {
    const modal = document.getElementById('weightHistoryModal');
    if (modal) {
        modal.classList.add('active');
        displayFullHistory();
        initWeightFullChart();
    }
}

function closeWeightHistoryModal() {
    const modal = document.getElementById('weightHistoryModal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// SAVE WEIGHT DATA
// ============================================

async function saveWeightData() {
    event.preventDefault();
    const date = document.getElementById('weightDate').value;
    const weight = parseFloat(document.getElementById('weightValue').value);
    const note = document.getElementById('weightNote').value;
    
    // Validation
    if (!date) {
        alert('❌ Harap pilih tanggal!');
        return;
    }
    
    if (!weight || weight <= 0) {
        alert('❌ Harap masukkan berat badan yang valid!');
        return;
    }
    
    if (weight < 30 || weight > 300) {
        alert('❌ Berat badan harus antara 30-300 kg!');
        return;
    }
    
    // Check if date exists
    const existingIndex = weightData.findIndex(entry => entry.date === date);
    
    if (existingIndex !== -1) {
        const confirmReplace = window.confirm(`Data untuk tanggal ${formatDate(date)} sudah ada. Timpa?`);
        if (!confirmReplace) return;
        
        weightData[existingIndex] = {
            date: date,
            weight: weight,
            note: note,
            timestamp: new Date().toISOString()
        };
    } else {
        weightData.push({
            date: date,
            weight: weight,
            note: note,
            timestamp: new Date().toISOString()
        });
    }
    
    // Sort by date (newest first)
    weightData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save to localStorage first
    const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUserData?.id || currentUserData?.email || 'guest';
    const storageKey = `weightTracking_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(weightData));
    console.log('💾 Weight data saved to localStorage');
    
    // ⭐ Save ke Supabase
    if (typeof saveWeightToSupabase === 'function') {
        try {
            const latestEntry = weightData[0];
            console.log('📤 Saving to Supabase:', latestEntry);
            const result = await saveWeightToSupabase(latestEntry);
            if (result && result.success) {
                console.log('✅ Weight synced to Supabase');
            }
        } catch (err) {
            console.warn('⚠️ Supabase sync failed:', err);
        }
    }
    
    // Close modal
    closeWeightInputModal();
    
    // ⭐ SOLUSI: Reload halaman untuk refresh semua data
    alert('✅ Berat badan berhasil disimpan!');
    location.reload();
}

// Expose to window
window.saveWeightData = saveWeightData;

// ============================================
// UPDATE DISPLAY
// ============================================

async function updateWeightDisplay() {
    console.log('📊 Updating weight display...');
    
    // ⭐ FIXED: Langsung ambil dari localStorage
    let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser || !currentUser.email) {
        console.log('❌ No user logged in');
        return;
    }
    
    // Get weight data
    const data = getWeightData();
    
    // Get user's weight info
    const initialWeight = parseFloat(currentUser.beratBadan || currentUser.beratBadanAwal || currentUser.berat_badan) || 0;
    const targetWeight = parseFloat(currentUser.beratBadanTarget || currentUser.berat_badan_target) || initialWeight;
    const goal = currentUser.goal || 'maintain';
    
    // Get current weight (latest entry or initial)
    const currentWeight = data.length > 0 ? data[0].weight : initialWeight;
    
    // ⭐ UPDATE DENGAN ID YANG BENAR
    const weightInitialEl = document.getElementById('weightInitial');
    const weightCurrentEl = document.getElementById('weightCurrent');
    const weightTargetEl = document.getElementById('weightTarget');
    const weightChangeEl = document.getElementById('weightChange');
    const weightRemainingEl = document.getElementById('weightRemaining');
    const weightTrendEl = document.getElementById('weightTrend');
    const weightGoalTextEl = document.getElementById('weightGoalText');
    
    // Display initial weight (tanpa .0 jika bulat)
    if (weightInitialEl) {
        weightInitialEl.textContent = initialWeight > 0 ? formatWeight(initialWeight) : '-';
    }
    
    // Display current weight (tanpa .0 jika bulat)
    if (weightCurrentEl) {
        weightCurrentEl.textContent = currentWeight > 0 ? formatWeight(currentWeight) : '-';
    }
    
    // Display target weight (tanpa .0 jika bulat)
    if (weightTargetEl) {
        weightTargetEl.textContent = targetWeight > 0 ? formatWeight(targetWeight) : '-';
    }
    
    // Calculate and display change from initial
    const totalChange = currentWeight - initialWeight;
    if (weightChangeEl && weightTrendEl) {
        let changeClass = '';
        let trendIcon = '→';
        let trendText = 'Tetap';
        
        if (Math.abs(totalChange) > 0.1) {
            if (totalChange > 0) {
                changeClass = 'up';
                trendIcon = '📈';
                trendText = 'Naik';
            } else {
                changeClass = 'down';
                trendIcon = '📉';
                trendText = 'Turun';
            }
        }
        
        // Update trend indicator
        weightTrendEl.innerHTML = `
            <span class="trend-icon">${trendIcon}</span>
            <span class="trend-text">${trendText}</span>
        `;
        
        // Update change value (tanpa .0 jika bulat)
        const sign = totalChange > 0 ? '+' : '';
        weightChangeEl.textContent = `${sign}${formatWeight(totalChange)} kg`;
        weightChangeEl.className = `progress-change ${changeClass}`;
    }
    
    // Calculate and display remaining to target (tanpa .0 jika bulat)
    const remaining = Math.abs(targetWeight - currentWeight);
    if (weightRemainingEl) {
        if (goal === 'maintain') {
            weightRemainingEl.textContent = remaining < 1 ? '✅ Tercapai' : `Selisih: ${formatWeight(remaining)} kg`;
        } else {
            weightRemainingEl.textContent = remaining < 0.5 ? '🎉 Tercapai!' : `Sisa: ${formatWeight(remaining)} kg`;
        }
    }
    
    // Update goal text
    if (weightGoalTextEl) {
        let goalText = '';
        if (goal === 'turun') {
            goalText = 'Tujuan: Menurunkan Berat Badan';
        } else if (goal === 'naik') {
            goalText = 'Tujuan: Menaikkan Berat Badan';
        } else {
            goalText = 'Tujuan: Maintain Berat Badan';
        }
        weightGoalTextEl.textContent = goalText;
    }
    
    // Update history
    updateWeightHistory();
    
    console.log('✅ Weight display updated:', {
        initial: initialWeight,
        current: currentWeight,
        target: targetWeight,
        change: totalChange,
        remaining: remaining
    });
}

function updateWeightHistory() {
    const historyList = document.getElementById('weightHistoryList');
    if (!historyList) return;
    
    if (weightData.length === 0) {
        historyList.innerHTML = '<p class="no-data">Belum ada data. Klik "Input Berat" untuk mulai tracking.</p>';
        return;
    }
    
    const recentEntries = weightData.slice(0, 5);
    let html = '';
    
    recentEntries.forEach((entry, index) => {
        const prevEntry = weightData[index + 1];
        let changeHtml = '';
        
        if (prevEntry) {
            const change = entry.weight - prevEntry.weight;
            const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            const sign = change > 0 ? '+' : '';
            changeHtml = `<span class="history-change ${changeClass}">${sign}${formatWeight(change)} kg</span>`;
        }
        
        html += `
            <div class="history-item">
                <span class="history-date">${formatDate(entry.date)}</span>
                <span class="history-weight">${formatWeight(entry.weight)} kg</span>
                ${changeHtml}
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// ============================================
// FULL HISTORY
// ============================================

function displayFullHistory() {
    updateHistorySummary();
    
    const tableContainer = document.getElementById('weightHistoryTable');
    if (!tableContainer) return;
    
    if (weightData.length === 0) {
        tableContainer.innerHTML = '<p class="no-data">Belum ada riwayat.</p>';
        return;
    }
    
    let html = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Tanggal</th>
                    <th>Berat (kg)</th>
                    <th>Perubahan</th>
                    <th>Catatan</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    weightData.forEach((entry, index) => {
        const prevEntry = weightData[index + 1];
        let changeText = '-';
        
        if (prevEntry) {
            const change = entry.weight - prevEntry.weight;
            const sign = change > 0 ? '+' : '';
            const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            changeText = `<span class="history-change ${changeClass}">${sign}${formatWeight(change)}</span>`;
        }
        
        html += `
            <tr>
                <td>${formatDate(entry.date)}</td>
                <td><strong>${formatWeight(entry.weight)}</strong></td>
                <td>${changeText}</td>
                <td>${entry.note || '-'}</td>
                <td>
                    <button onclick="deleteWeightEntry('${entry.date}')" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

function updateHistorySummary() {
    console.log('📊 updateHistorySummary called, weightData length:', weightData.length);
    
    if (weightData.length === 0) {
        console.log('⚠️ No weight data to summarize');
        return;
    }
    
    const firstEntry = weightData[weightData.length - 1];
    const latestEntry = weightData[0];
    const totalChange = latestEntry.weight - firstEntry.weight;
    
    console.log('📈 Total change:', totalChange, 'kg');
    
    // FIX: Use correct IDs - summaryTotalChange not totalWeightChange
    const totalChangeEl = document.getElementById('summaryTotalChange');
    if (totalChangeEl) {
        const sign = totalChange > 0 ? '+' : '';
        totalChangeEl.textContent = `${sign}${formatWeight(totalChange)} kg`;
        console.log('✅ Updated summaryTotalChange');
    } else {
        console.error('❌ summaryTotalChange element not found');
    }
    
    // FIX: Use correct ID - summaryTotalEntries not totalWeightEntries
    const totalEntriesEl = document.getElementById('summaryTotalEntries');
    if (totalEntriesEl) {
        totalEntriesEl.textContent = weightData.length;
        console.log('✅ Updated summaryTotalEntries');
    } else {
        console.error('❌ summaryTotalEntries element not found');
    }
    
    // FIX: Use correct ID - summaryAvgChange not avgWeightChange
    const avgChangeEl = document.getElementById('summaryAvgChange');
    if (avgChangeEl && weightData.length > 1) {
        const firstDate = new Date(firstEntry.date);
        const latestDate = new Date(latestEntry.date);
        const daysDiff = (latestDate - firstDate) / (1000 * 60 * 60 * 24);
        const weeksDiff = daysDiff / 7;
        
        if (weeksDiff > 0) {
            const avgPerWeek = totalChange / weeksDiff;
            const sign = avgPerWeek > 0 ? '+' : '';
            avgChangeEl.textContent = `${sign}${avgPerWeek.toFixed(2)} kg/minggu`;
            console.log('✅ Updated summaryAvgChange');
        }
    } else if (!avgChangeEl) {
        console.error('❌ summaryAvgChange element not found');
    }
    
    // Add progress percentage
    const progressEl = document.getElementById('summaryProgress');
    if (progressEl && currentUser) {
        const initialWeight = parseFloat(currentUser.beratBadan);
        const targetWeight = parseFloat(currentUser.beratBadanTarget || initialWeight);
        const currentWeight = latestEntry.weight;
        
        const totalNeeded = Math.abs(targetWeight - initialWeight);
        const achieved = Math.abs(currentWeight - initialWeight);
        const progress = totalNeeded > 0 ? (achieved / totalNeeded * 100) : 0;
        
        progressEl.textContent = `${Math.min(100, progress).toFixed(0)}%`;
        console.log('✅ Updated summaryProgress');
    } else if (!progressEl) {
        console.error('❌ summaryProgress element not found');
    }
}

async function deleteWeightEntry(date) {
    if (!confirm(`Hapus data ${formatDate(date)}?`)) return;
    
    // ⭐ Delete from Supabase
    if (typeof deleteWeightFromSupabase === 'function' && useSupabase) {
        try {
            const result = await deleteWeightFromSupabase(date);
            if (result && result.success) {
                console.log('✅ Deleted from Supabase');
            }
        } catch (err) {
            console.warn('⚠️ Supabase delete failed:', err);
        }
    }
    
    // Delete from local array
    weightData = weightData.filter(entry => entry.date !== date);
    
    // Save to localStorage
    const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUserData?.id || currentUserData?.email || 'guest';
    const storageKey = `weightTracking_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(weightData));
    
    // ⭐ Reload halaman untuk refresh
    alert('✅ Data berhasil dihapus!');
    location.reload();
}

// Expose to window
window.deleteWeightEntry = deleteWeightEntry;

// ============================================
// EDIT WEIGHT ENTRY
// ============================================

function editWeightEntry(date) {
    console.log('✏️ Editing weight entry:', date);
    
    const entry = weightData.find(e => e.date === date);
    if (!entry) {
        alert('❌ Data tidak ditemukan!');
        return;
    }
    
    // Close history modal if open
    closeWeightHistoryModal();
    
    // Open input modal
    openWeightInputModal();
    
    // Fill form with existing data
    document.getElementById('weightDate').value = entry.date;
    document.getElementById('weightValue').value = entry.weight;
    
    const timeInput = document.getElementById('weightTime');
    if (timeInput && entry.time) {
        timeInput.value = entry.time;
    }
    
    const noteInput = document.getElementById('weightNote');
    if (noteInput && entry.note) {
        noteInput.value = entry.note;
    }
}

// Expose to window
window.editWeightEntry = editWeightEntry;

// ============================================
// CHARTS
// ============================================

function initWeightMiniChart() {
    const canvas = document.getElementById('weightMiniChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // ⭐ SET CANVAS HEIGHT EXPLICITLY
    canvas.style.height = '380px';
    canvas.height = 380;
    
    if (weightMiniChart) weightMiniChart.destroy();
    
    const chartData = prepareChartData(7);
    
    weightMiniChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Berat (kg)',
                data: chartData.weights,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,  // ⭐ UBAH JADI FALSE
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatWeight(ctx.parsed.y) + ' kg'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: (val) => formatWeight(val) + ' kg'
                    }
                }
            }
        }
    });
}

function initWeightFullChart() {
    const canvas = document.getElementById('weightFullChart');
    if (!canvas) {
        console.error('❌ weightFullChart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy old chart if it exists and has destroy method
    if (weightFullChart && typeof weightFullChart.destroy === 'function') {
        weightFullChart.destroy();
    }
    
    const chartData = prepareChartData(30);
    
    weightFullChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Berat Badan',
                data: chartData.weights,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                spanGaps: true // Connect points even with null values
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: (ctx) => 'Berat: ' + formatWeight(ctx.parsed.y) + ' kg'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: (val) => formatWeight(val) + ' kg'
                    }
                }
            }
        }
    });
    
    console.log('✅ Weight chart initialized successfully');
}

function updateWeightCharts() {
    if (weightMiniChart) {
        const chartData = prepareChartData(7);
        weightMiniChart.data.labels = chartData.labels;
        weightMiniChart.data.datasets[0].data = chartData.weights;
        weightMiniChart.update();
    }
    
    if (weightFullChart) {
        const chartData = prepareChartData(30);
        weightFullChart.data.labels = chartData.labels;
        weightFullChart.data.datasets[0].data = chartData.weights;
        weightFullChart.update();
    }
}

function prepareChartData(days) {
    const labels = [];
    const weights = [];
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        labels.push(formatDateShort(dateStr));
        
        const entry = weightData.find(e => e.date === dateStr);
        weights.push(entry ? entry.weight : null);
    }
    
    return { labels, weights };
}

// ============================================
// EXPORT
// ============================================

function exportWeightData() {
    if (weightData.length === 0) {
        alert('Tidak ada data untuk di-export!');
        return;
    }
    
    let csv = 'Tanggal,Berat (kg),Perubahan (kg),Catatan\n';
    
    weightData.forEach((entry, index) => {
        const prevEntry = weightData[index + 1];
        const change = prevEntry ? formatWeight(entry.weight - prevEntry.weight) : '0';
        csv += `${entry.date},${formatWeight(entry.weight)},${change},"${entry.note || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weight-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('✅ Data berhasil di-export!');
}

// ============================================
// UTILITIES
// ============================================

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

console.log('✅ Weight Tracker module loaded');

// ============================================
// EXPOSE FUNCTIONS TO WINDOW - CRITICAL!
// Tanpa ini, onclick di HTML tidak akan bisa akses function
// ============================================
window.openWeightInputModal = openWeightInputModal;
window.closeWeightInputModal = closeWeightInputModal;
window.openWeightHistoryModal = openWeightHistoryModal;
window.closeWeightHistoryModal = closeWeightHistoryModal;
window.saveWeightData = saveWeightData;
window.deleteWeightEntry = deleteWeightEntry;
window.editWeightEntry = editWeightEntry;

// Expose internal functions needed by modal
window.displayFullHistory = displayFullHistory;
window.updateHistorySummary = updateHistorySummary;
window.initWeightFullChart = initWeightFullChart;
window.loadWeightData = loadWeightData;
window.prepareChartData = prepareChartData;

// ⭐ TAMBAHAN: Expose initializeWeightTracker dan updateWeightDisplay
window.initializeWeightTracker = initializeWeightTracker;
window.updateWeightDisplay = updateWeightDisplay;

console.log('✅ Functions exposed:', {
    openWeightInputModal: typeof window.openWeightInputModal,
    closeWeightInputModal: typeof window.closeWeightInputModal,
    saveWeightData: typeof window.saveWeightData,
    deleteWeightEntry: typeof window.deleteWeightEntry,
    editWeightEntry: typeof window.editWeightEntry,
    displayFullHistory: typeof window.displayFullHistory,
    updateHistorySummary: typeof window.updateHistorySummary,
    initWeightFullChart: typeof window.initWeightFullChart,
    loadWeightData: typeof window.loadWeightData,
    initializeWeightTracker: typeof window.initializeWeightTracker,
    updateWeightDisplay: typeof window.updateWeightDisplay
});