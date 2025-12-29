// ============================================
// WEIGHT TRACKER EXPOSE PATCH
// Add this file AFTER weight-tracker-integrated.js
// ============================================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Weight Tracker Expose Patch loading...');
    
    // Check if functions exist and expose them
    if (typeof openWeightInputModal !== 'undefined') {
        window.openWeightInputModal = openWeightInputModal;
        console.log('✅ Exposed: openWeightInputModal');
    }
    
    if (typeof closeWeightInputModal !== 'undefined') {
        window.closeWeightInputModal = closeWeightInputModal;
        console.log('✅ Exposed: closeWeightInputModal');
    }
    
    if (typeof openWeightHistoryModal !== 'undefined') {
        // Wrap the original function to ensure data is loaded first
        const originalOpen = openWeightHistoryModal;
        window.openWeightHistoryModal = async function() {
            console.log('📊 Opening weight history modal (wrapped)...');
            
            // Load data first
            if (typeof loadWeightData === 'function') {
                console.log('📥 Loading weight data first...');
                await loadWeightData();
            }
            
            // Call original function
            originalOpen();
        };
        console.log('✅ Exposed: openWeightHistoryModal (wrapped)');
    } else {
        // Create fallback function if not found
        window.openWeightHistoryModal = async function() {
            console.log('📊 Opening weight history modal (fallback)...');
            const modal = document.getElementById('weightHistoryModal');
            if (!modal) {
                console.error('❌ weightHistoryModal element not found!');
                return;
            }
            
            modal.classList.add('active');
            
            // CRITICAL: Load data first!
            if (typeof loadWeightData === 'function') {
                console.log('📥 Loading weight data first...');
                await loadWeightData();
            }
            
            // Debug: Check weightData
            const weightTracking = localStorage.getItem('weightTracking');
            console.log('📦 WeightTracking:', weightTracking ? JSON.parse(weightTracking).length + ' entries' : 'empty');
            
            // Update summary cards
            if (typeof updateHistorySummary === 'function') {
                console.log('✅ Calling updateHistorySummary...');
                updateHistorySummary();
            }
            
            // Try to call displayFullHistory if it exists
            if (typeof displayFullHistory === 'function') {
                console.log('✅ Calling displayFullHistory...');
                displayFullHistory();
            } else {
                console.log('⚠️ displayFullHistory not found, using fallback...');
                // Fallback: manually update the display
                const tableContainer = document.getElementById('weightHistoryTable');
                if (tableContainer && weightTracking) {
                    const data = JSON.parse(weightTracking);
                    if (data.length === 0) {
                        tableContainer.innerHTML = '<p class="no-data">Belum ada riwayat.</p>';
                    } else {
                        let html = '<table class="history-table"><thead><tr><th>Tanggal</th><th>Berat (kg)</th><th>Catatan</th></tr></thead><tbody>';
                        data.forEach(entry => {
                            const date = new Date(entry.date).toLocaleDateString('id-ID');
                            html += `<tr><td>${date}</td><td>${entry.weight.toFixed(1)}</td><td>${entry.note || '-'}</td></tr>`;
                        });
                        html += '</tbody></table>';
                        tableContainer.innerHTML = html;
                    }
                } else if (tableContainer) {
                    tableContainer.innerHTML = '<p class="no-data">Belum ada data</p>';
                }
            }
            
            // Try to init chart if it exists
            if (typeof initWeightFullChart === 'function') {
                console.log('✅ Calling initWeightFullChart...');
                initWeightFullChart();
            } else {
                console.log('⚠️ initWeightFullChart not found');
            }
        };
        console.log('✅ Created fallback: openWeightHistoryModal');
    }
    
    if (typeof closeWeightHistoryModal !== 'undefined') {
        window.closeWeightHistoryModal = closeWeightHistoryModal;
        console.log('✅ Exposed: closeWeightHistoryModal');
    } else {
        // Create fallback
        window.closeWeightHistoryModal = function() {
            console.log('📊 Closing weight history modal...');
            const modal = document.getElementById('weightHistoryModal');
            if (modal) modal.classList.remove('active');
        };
        console.log('✅ Created fallback: closeWeightHistoryModal');
    }
    
    if (typeof saveWeightData !== 'undefined') {
        // ⭐ OVERRIDE dengan versi yang PASTI reload
        window.saveWeightData = async function() {
            console.log('🔄 saveWeightData called (patched version)');
            
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
            
            // Get current user
            const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = currentUserData?.id || currentUserData?.email || 'guest';
            const storageKey = `weightTracking_${userId}`;
            
            // Load existing data
            let localWeightData = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            // Check if date exists
            const existingIndex = localWeightData.findIndex(entry => entry.date === date);
            
            if (existingIndex !== -1) {
                // Update existing
                localWeightData[existingIndex] = {
                    date: date,
                    weight: weight,
                    note: note,
                    timestamp: new Date().toISOString()
                };
            } else {
                // Add new
                localWeightData.push({
                    date: date,
                    weight: weight,
                    note: note,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Sort by date (newest first)
            localWeightData.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Save to localStorage
            localStorage.setItem(storageKey, JSON.stringify(localWeightData));
            console.log('💾 Saved to localStorage:', weight, 'kg');
            
            // Save to Supabase
            if (typeof window.saveWeightToSupabase === 'function') {
                try {
                    console.log('📤 Saving to Supabase:', weight, 'kg');
                    const result = await window.saveWeightToSupabase({
                        date: date,
                        weight: weight,
                        note: note
                    });
                    console.log('✅ Supabase result:', result);
                } catch (err) {
                    console.warn('⚠️ Supabase error:', err);
                }
            }
            
            // Close modal
            const modal = document.getElementById('weightInputModal');
            if (modal) modal.classList.remove('active');
            
            // ⭐ PASTI RELOAD!
            alert('✅ Berat badan berhasil disimpan! (' + weight + ' kg)');
            window.location.reload();
        };
        console.log('✅ Exposed: saveWeightData (with auto-reload)');
    }
    
    if (typeof deleteWeightEntry !== 'undefined') {
        window.deleteWeightEntry = deleteWeightEntry;
        console.log('✅ Exposed: deleteWeightEntry');
    }
    
    if (typeof exportWeightData !== 'undefined') {
        window.exportWeightData = exportWeightData;
        console.log('✅ Exposed: exportWeightData');
    }
    
    // Add filterWeightChart fallback
    if (typeof filterWeightChart !== 'undefined') {
        window.filterWeightChart = filterWeightChart;
        console.log('✅ Exposed: filterWeightChart');
    } else {
        // Create fallback function
        window.filterWeightChart = function(period) {
            console.log('📊 Filtering weight chart:', period);
            
            // Update active button
            const buttons = document.querySelectorAll('.chart-filter-btn');
            buttons.forEach(btn => {
                btn.classList.remove('active');
                const btnText = btn.textContent.toLowerCase();
                if ((period === 'all' && btnText.includes('semua')) ||
                    (period === '30' && btnText.includes('30')) ||
                    (period === '90' && btnText.includes('90'))) {
                    btn.classList.add('active');
                }
            });
            
            // Re-init chart with new period
            if (typeof initWeightFullChart === 'function') {
                // Modify the chart with the new period
                const days = period === 'all' ? 365 : parseInt(period);
                
                if (typeof prepareChartData === 'function' && typeof weightFullChart !== 'undefined') {
                    const chartData = prepareChartData(days);
                    weightFullChart.data.labels = chartData.labels;
                    weightFullChart.data.datasets[0].data = chartData.weights;
                    weightFullChart.update();
                } else {
                    initWeightFullChart();
                }
            }
        };
        console.log('✅ Created fallback: filterWeightChart');
    }
    
    console.log('✅ Weight Tracker Expose Patch loaded!');
});