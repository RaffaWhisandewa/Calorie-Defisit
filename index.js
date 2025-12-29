// ====================================
// CALORIE DEFICIT AI - ADVANCED JAVASCRIPT
// Google Auth + Chart.js + Complete Analytics
// ====================================

const API_BASE_URL = 'http://localhost:3000';

let usersDatabase = [];
let currentUser = null;
const GOOGLE_CLIENT_ID = '137570212811-eqkc9tbr9h11u85l25q2fctom0r5lgtv.apps.googleusercontent.com';
let userActivityData = {};

// Chart instances
let dailySummaryChart = null;
let activityTrendChart = null;
let calorieBalanceChart = null;
let activityDistributionChart = null;
let weeklyComparisonChart = null;

// Current analytics period
let currentPeriod = '7days';
let customStartDate = null;
let customEndDate = null;

// Google Auth variables
let gapi = null;
let auth2 = null;

// ====================================
// GOOGLE AUTHENTICATION
// ====================================
function initGoogleAuth() {
    if (typeof google !== 'undefined' && google.accounts) {
        // Initialize Google Sign-In
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        
        console.log('Google Auth initialized successfully');
    } else {
        console.warn('Google Auth library not loaded');
    }
}

function handleGoogleSignIn(response) {
    try {
        // Decode the JWT token
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        
        console.log('Google Sign-In successful:', payload);
        
        // Create user object from Google data
        const googleUser = {
            id: generateId(),
            name: payload.name,
            email: payload.email,
            googleId: payload.sub,
            picture: payload.picture,
            hasCompletedData: false,
            isGoogleUser: true
        };
        
        // Check if user already exists
        let existingUser = usersDatabase.find(u => u.email === googleUser.email);
        
        if (existingUser) {
            // Update existing user with Google data
            existingUser.picture = googleUser.picture;
            existingUser.googleId = googleUser.googleId;
            existingUser.isGoogleUser = true;
            currentUser = existingUser;
        } else {
            // Add new Google user
            usersDatabase.push(googleUser);
            currentUser = googleUser;
        }
        
        localStorage.setItem('usersDatabase', JSON.stringify(usersDatabase));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Navigate based on data completion
        if (currentUser.hasCompletedData) {
            goToDashboard();
        } else {
            // Google user belum lengkap data → ke Complete Profile Page
            goToCompleteProfile();
        }
        
    } catch (error) {
        console.error('Error handling Google Sign-In:', error);
        showError('loginError', 'Error saat login dengan Google. Silakan coba lagi.');
    }
}

function initGoogleSignUp() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.log('Google Sign-Up prompt not displayed');
            }
        });
    } else {
        alert('Google Auth tidak tersedia. Silakan gunakan form manual.');
    }
}

function signOutGoogle() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
}

// ====================================
// AI HELPER FUNCTIONS
// ====================================
async function callOpenAI(prompt, type = 'general') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, type })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 404) return '⚠️ Backend tidak ditemukan. Pastikan server running.';
            if (response.status === 401 || response.status === 403) return '❌ API Key tidak valid.';
            if (response.status === 429) return '⚠️ Terlalu banyak request.';
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.success ? data.response : '❌ Respons tidak valid.';
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            return '❌ Tidak dapat terhubung ke backend.';
        }
        return `❌ Error: ${error.message}`;
    }
}

function showAILoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<p>🤖 AI sedang menganalisis...</p><p style="opacity:0.6">⏳ Tunggu sebentar</p>';
    }
}

// ====================================
// CHART.JS FUNCTIONS
// ====================================
function initializeCharts() {
    createDailySummaryChart();
    createActivityTrendChart();
    createCalorieBalanceChart();
    createActivityDistributionChart();
    createWeeklyComparisonChart();
}

function createDailySummaryChart() {
    const ctx = document.getElementById('dailySummaryChart');
    if (!ctx) return;

    const data = getDailySummaryData();
    
    if (dailySummaryChart) {
        dailySummaryChart.destroy();
    }

    dailySummaryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Langkah (ribu)', 'Lari (km)', 'Air (L)', 'Tidur (jam)', 'Gym (menit)', 'Makan (100 kal)'],
            datasets: [{
                data: data,
                backgroundColor: [
                    '#22c55e',  // Hijau - Langkah
                    '#3b82f6',  // Biru - Lari
                    '#06b6d4',  // Cyan - Air
                    '#8b5cf6',  // Ungu - Tidur
                    '#f59e0b',  // Orange - Gym
                    '#ef4444'   // ⭐ Merah - Makan
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            
                            // ⭐ Custom tooltip untuk menampilkan nilai asli
                            if (label.includes('Langkah')) {
                                return `Langkah: ${(value * 1000).toLocaleString()}`;
                            } else if (label.includes('Makan')) {
                                return `Makan: ${(value * 100).toLocaleString()} kal`;
                            }
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

function createActivityTrendChart() {
    const ctx = document.getElementById('activityTrendChart');
    if (!ctx) return;

    const data = getActivityTrendData();
    
    if (activityTrendChart) {
        activityTrendChart.destroy();
    }

    activityTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Langkah (ribuan)',
                    data: data.steps,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Lari (km)',
                    data: data.running,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Air (L)',
                    data: data.water,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Tanggal'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Nilai'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function createCalorieBalanceChart() {
    const ctx = document.getElementById('calorieBalanceChart');
    if (!ctx) return;

    const data = getCalorieBalanceData();
    
    if (calorieBalanceChart) {
        calorieBalanceChart.destroy();
    }

    calorieBalanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Kalori Masuk',
                    data: data.caloriesIn,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                },
                {
                    label: 'Kalori Keluar',
                    data: data.caloriesOut,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: '#22c55e',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Tanggal'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Kalori'
                    }
                }
            }
        }
    });
}

function createActivityDistributionChart() {
    const ctx = document.getElementById('activityDistributionChart');
    if (!ctx) return;

    const data = getActivityDistributionData();
    
    if (activityDistributionChart) {
        activityDistributionChart.destroy();
    }

    activityDistributionChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    '#22c55e',
                    '#3b82f6',
                    '#a855f7',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed.r;
                            return `${label}: ${value} sesi`;
                        }
                    }
                }
            }
        }
    });
}

function createWeeklyComparisonChart() {
    const ctx = document.getElementById('weeklyComparisonChart');
    if (!ctx) return;

    const data = getWeeklyComparisonData();
    
    if (weeklyComparisonChart) {
        weeklyComparisonChart.destroy();
    }

    weeklyComparisonChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Langkah', 'Lari', 'Air', 'Tidur', 'Gym', 'Makanan'],
            datasets: [
                {
                    label: 'Minggu Ini',
                    data: data.thisWeek,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#ffffff',
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#22c55e'
                },
                {
                    label: 'Minggu Lalu',
                    data: data.lastWeek,
                    borderColor: '#6b7280',
                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                    pointBackgroundColor: '#6b7280',
                    pointBorderColor: '#ffffff',
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#6b7280'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

// Chart Data Functions
function getDailySummaryData() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        return [0, 0, 0, 0, 0, 0];
    }

    const todaySteps = getTodayTotal('steps') / 1000; // Convert to thousands
    const todayDistance = getTodayTotal('running');
    const todayWater = getTodayWaterTotal();
    const todaySleep = getLastSleep();
    const todayGym = getTodayGymTotal();
    const todayCalories = getTodayTotal('food') / 100; // ⭐ Convert to hundreds untuk skala yang seimbang

    return [todaySteps, todayDistance, todayWater, todaySleep, todayGym, todayCalories];
}

function getActivityTrendData() {
    const labels = [];
    const steps = [];
    const running = [];
    const water = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        labels.push(dateStr);

        if (currentUser && userActivityData[currentUser.email]) {
            const daySteps = getDayTotal('steps', date) / 1000; // Convert to thousands
            const dayRunning = getDayTotal('running', date);
            const dayWater = getDayWaterTotal(date);

            steps.push(daySteps);
            running.push(dayRunning);
            water.push(dayWater);
        } else {
            steps.push(0);
            running.push(0);
            water.push(0);
        }
    }

    return { labels, steps, running, water };
}

function getCalorieBalanceData() {
    const labels = [];
    const caloriesIn = [];
    const caloriesOut = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        labels.push(dateStr);

        if (currentUser && userActivityData[currentUser.email]) {
            const dayCaloriesIn = getDayTotal('food', date);
            const daySteps = getDayTotal('steps', date);
            const dayRunning = getDayTotal('running', date);
            const dayCaloriesOut = Math.round(daySteps * 0.04 + dayRunning * 60); // Estimation

            caloriesIn.push(dayCaloriesIn);
            caloriesOut.push(dayCaloriesOut);
        } else {
            caloriesIn.push(0);
            caloriesOut.push(0);
        }
    }

    return { labels, caloriesIn, caloriesOut };
}

function getActivityDistributionData() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        return { labels: [], values: [] };
    }

    const userData = userActivityData[currentUser.email];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const categoryStats = {};
    
    if (userData.gym) {
        userData.gym
            .filter(item => new Date(item.date) >= weekAgo)
            .forEach(item => {
                const category = item.category || 'Other';
                categoryStats[category] = (categoryStats[category] || 0) + 1;
            });
    }

    // Convert to readable names
    const labels = Object.keys(categoryStats).map(key => {
        return gymExerciseData[key] ? gymExerciseData[key].name : key;
    });
    const values = Object.values(categoryStats);

    if (labels.length === 0) {
        return { labels: ['Belum ada data'], values: [1] };
    }

    return { labels, values };
}

function getWeeklyComparisonData() {
    const thisWeek = [
        Math.min(getWeeklyTotal('steps') / 70000 * 100, 100), // 70k steps = 100%
        Math.min(getWeeklyTotal('running') / 35 * 100, 100), // 35km = 100%
        Math.min(getWeeklyTotal('water') / 14 * 100, 100), // 14L (2L x 7 days) = 100%
        Math.min(getWeeklyAverage('sleep') / 8 * 100, 100), // 8 hours = 100%
        Math.min(getMonthlyGymSessions() / 12 * 100, 100), // 12 sessions/month = 100%
        Math.min(getWeeklyTotal('food') / 14000 * 100, 100) // 14k calories = 100%
    ];

    // For last week, we'll simulate some data (in real app, you'd store historical data)
    const lastWeek = thisWeek.map(value => Math.max(0, value - Math.random() * 30));

    return { thisWeek, lastWeek };
}

function getDayTotal(type, date) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }

    const data = userActivityData[currentUser.email][type];
    const dateStr = date.toDateString();

    if (type === 'food') {
        return data
            .filter(item => new Date(item.date).toDateString() === dateStr)
            .reduce((sum, item) => sum + (item.calories || 0), 0);
    }

    return data
        .filter(item => new Date(item.date).toDateString() === dateStr)
        .reduce((sum, item) => sum + (item.value || 0), 0);
}

function getDayWaterTotal(date) {
    const dateStr = date.toDateString();
    return userActivityData[currentUser.email]?.water?.[dateStr] || 0;
}

// ====================================
// NAVIGATION FUNCTIONS
// ====================================
function showDashboard() {
    switchPage('dashboard');
    updateDashboardStats();
    updateProgressBars();
    
    // Initialize or update daily summary chart
    setTimeout(() => {
        createDailySummaryChart();
    }, 100);
}

function showAnalytics() {
    switchPage('analytics');
    initializeAnalytics();
    
    // Initialize all charts with delay to ensure elements are rendered
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

function showHarian() {
    switchPage('harian');
    updateHarianSummary();
}

function switchPage(page) {
    console.log('Switching to page:', page);
    
    // Hide all content
    document.querySelectorAll('.content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected content
    const targetContent = document.getElementById(`${page}Content`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Update desktop navigation
    document.querySelectorAll('.nav-links .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const targetNav = document.getElementById(`nav-${page}`);
    if (targetNav) {
        targetNav.classList.add('active');
    }
    
    // Update mobile navigation
    updateMobileNavActive(page);
}

// ====================================
// USER AUTHENTICATION
// ====================================
function toggleForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    console.log('🔐 Login attempt for:', email);
    
    if (!email || !password) {
        showError('loginError', 'Email dan password tidak boleh kosong!');
        return;
    }
    
    // Show loading
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.textContent = '⏳ Loading...';
    
    // ✅ CHECK IF SupabaseDB EXISTS (from supabase-integration.js)
    if (typeof SupabaseDB !== 'undefined') {
        console.log('📡 Using SupabaseDB authentication...');
        
        const result = await SupabaseDB.login(email, password);
        
        if (result.success) {
            // Map to currentUser format untuk kompatibilitas
            currentUser = {
                id: result.user.id,
                email: result.user.email,
                name: result.profile?.nama_lengkap || result.profile?.name || result.user.email,
                picture: result.profile?.picture,
                namaLengkap: result.profile?.nama_lengkap,
                jenisKelamin: result.profile?.jenis_kelamin,
                tempatLahir: result.profile?.tempat_lahir,
                tanggalLahir: result.profile?.tanggal_lahir,
                golonganDarah: result.profile?.golongan_darah,
                tinggiBadan: result.profile?.tinggi_badan,
                beratBadan: result.profile?.berat_badan,
                nomorWA: result.profile?.nomor_wa,
                goal: result.profile?.goal,
                beratBadanTarget: result.profile?.berat_badan_target,
                hasCompletedData: result.profile?.has_completed_data || false,
                isGoogleUser: result.profile?.is_google_user || false
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('✅ Login successful:', currentUser.email);
            
            if (currentUser.hasCompletedData) {
                goToDashboard();
            } else {
                if (currentUser.isGoogleUser) {
                    goToCompleteProfile();
                } else {
                    goToInputData();
                }
            }
        } else {
            console.error('❌ Login error:', result.error);
            showError('loginError', result.error || 'Login gagal!');
        }
        
    } else if (typeof supabase !== 'undefined') {
        // Fallback ke supabase langsung jika SupabaseDB tidak ada
        console.log('📡 Using Supabase direct authentication...');
        
        try {
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (signInError) throw signInError;
            
            const { data: userData, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            
            if (profileError) throw profileError;
            
            currentUser = {
                id: userData.id,
                email: userData.email,
                name: userData.nama_lengkap || userData.name,
                picture: userData.picture,
                namaLengkap: userData.nama_lengkap,
                jenisKelamin: userData.jenis_kelamin,
                tempatLahir: userData.tempat_lahir,
                tanggalLahir: userData.tanggal_lahir,
                golonganDarah: userData.golongan_darah,
                tinggiBadan: userData.tinggi_badan,
                beratBadan: userData.berat_badan,
                nomorWA: userData.nomor_wa,
                goal: userData.goal,
                beratBadanTarget: userData.berat_badan_target,
                hasCompletedData: userData.has_completed_data,
                isGoogleUser: userData.is_google_user
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            if (userData.has_completed_data) {
                goToDashboard();
            } else {
                if (userData.is_google_user) {
                    goToCompleteProfile();
                } else {
                    goToInputData();
                }
            }
            
        } catch (error) {
            console.error('❌ Supabase login error:', error);
            showError('loginError', error.message || 'Login gagal!');
        }
        
    } else {
        // ⚠️ FALLBACK: Use localStorage (old method)
        console.log('⚠️ SupabaseDB not available, using localStorage...');
        
        let user = usersDatabase.find(u => u.email === email && u.password === password);
        
        // ⭐ Jika tidak ditemukan di localStorage, coba load dari Supabase
        if (!user && typeof supabase !== 'undefined') {
            console.log('🔍 User not in localStorage, checking Supabase...');
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .single();
                
                if (data && !error) {
                    // Verify password (stored as password_hash)
                    if (data.password_hash === password) {
                        // Convert dari snake_case ke camelCase
                        user = {
                            id: data.id,
                            email: data.email,
                            password: data.password_hash,
                            name: data.name,
                            googleId: data.google_id,
                            picture: data.picture,
                            isGoogleUser: data.is_google_user,
                            namaLengkap: data.nama_lengkap,
                            tempatLahir: data.tempat_lahir,
                            tanggalLahir: data.tanggal_lahir,
                            golonganDarah: data.golongan_darah,
                            tinggiBadan: data.tinggi_badan,
                            beratBadan: data.berat_badan,
                            nomorWA: data.nomor_wa,
                            hasCompletedData: data.has_completed_data,
                            goal: data.goal,
                            beratBadanTarget: data.berat_badan_target,
                            jenisKelamin: data.jenis_kelamin
                        };
                        
                        // Simpan ke localStorage untuk next login
                        usersDatabase.push(user);
                        localStorage.setItem('usersDatabase', JSON.stringify(usersDatabase));
                        console.log('✅ User loaded from Supabase and cached locally');
                    }
                }
            } catch (err) {
                console.warn('⚠️ Supabase check failed:', err);
            }
        }
        
        if (!user) {
            showError('loginError', 'Email atau password salah!');
            return;
        }
        
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (user.hasCompletedData) {
            goToDashboard();
        } else {
            if (user.isGoogleUser) {
                goToCompleteProfile();
            } else {
                goToInputData();
            }
        }
    }
}

async function handleRegister_OLD() {
    // ⚠️ DEPRECATED - Use handleRegisterComplete() from registration-handler.js instead
    // This old function only handles basic 3-field registration (name, email, password)
    // The new handleRegisterComplete() handles full 12-field registration with BMR/TDEE
    
    console.warn('⚠️ handleRegister_OLD called - This function is deprecated!');
    console.warn('⚠️ Use handleRegisterComplete() from registration-handler.js instead');
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regPasswordConfirm').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showError('registerError', 'Semua field harus diisi!');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('registerError', 'Password tidak sama!');
        return;
    }
    
    if (password.length < 6) {
        showError('registerError', 'Password minimal 6 karakter!');
        return;
    }
    
    // Show loading
    const errorEl = document.getElementById('registerError');
    if (errorEl) errorEl.textContent = '⏳ Mendaftarkan akun...';
    
    // ✅ CHECK IF SupabaseDB EXISTS (from supabase-integration.js)
    if (typeof SupabaseDB !== 'undefined') {
        console.log('📡 Using SupabaseDB registration...');
        
        const userData = {
            namaLengkap: name
        };
        
        const result = await SupabaseDB.register(email, password, userData);
        
        if (result.success) {
            if (result.needsEmailConfirmation) {
                alert('✅ Registrasi berhasil! Silakan cek email untuk verifikasi.');
                toggleForm(); // Kembali ke login
            } else {
                currentUser = {
                    id: result.user.id,
                    email: email,
                    name: name,
                    hasCompletedData: false
                };
                
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                goToInputData();
            }
        } else {
            console.error('❌ Registration error:', result.error);
            showError('registerError', result.error || 'Registrasi gagal!');
        }
        
    } else if (typeof supabase !== 'undefined') {
        console.log('📡 Using Supabase direct registration...');
        
        try {
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password
            });
            
            if (signUpError) throw signUpError;
            
            const { error: profileError } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email: email,
                    name: name,
                    nama_lengkap: name,
                    is_google_user: false,
                    has_completed_data: false
                }]);
            
            if (profileError) throw profileError;
            
            currentUser = {
                id: authData.user.id,
                email: email,
                name: name,
                hasCompletedData: false
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            alert('✅ Registrasi berhasil! Silakan cek email untuk verifikasi.');
            goToInputData();
            
        } catch (error) {
            console.error('❌ Supabase register error:', error);
            showError('registerError', error.message || 'Registrasi gagal!');
        }
        
    } else {
        // ⚠️ FALLBACK: Use localStorage (old method)
        console.log('⚠️ Supabase not available, using localStorage...');
        
        if (usersDatabase.find(u => u.email === email)) {
            showError('registerError', 'Email sudah terdaftar!');
            return;
        }
        
        const newUser = {
            id: generateId(),
            name: name,
            email: email,
            password: password,
            hasCompletedData: false,
            isGoogleUser: false
        };
        
        usersDatabase.push(newUser);
        localStorage.setItem('usersDatabase', JSON.stringify(usersDatabase));
        
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        
        goToInputData();
    }
}

function saveDataAndGoToDashboard() {
    const userData = {
        namaLengkap: document.getElementById('namaLengkap').value,
        tempatLahir: document.getElementById('tempatLahir').value,
        tanggalLahir: document.getElementById('tanggalLahir').value,
        golonganDarah: document.getElementById('golonganDarah').value,
        tinggiBadan: document.getElementById('tinggiBadan').value,
        beratBadan: document.getElementById('beratBadan').value,
        nomorWA: document.getElementById('nomorWA').value
    };
    
    // Validate all fields
    for (const [key, value] of Object.entries(userData)) {
        if (!value) {
            alert('Semua field harus diisi!');
            return;
        }
    }
    
    // Update user data
    currentUser = { ...currentUser, ...userData, hasCompletedData: true };
    
    // Update database
    const userIndex = usersDatabase.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = currentUser;
        localStorage.setItem('usersDatabase', JSON.stringify(usersDatabase));
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Initialize user activity data
    initializeUserActivityData();
    
    goToDashboard();
}

async function logout() {
    console.log('🚪 Logging out...');
    
    // Logout dari Supabase (dengan try-catch untuk handle error)
    try {
        if (typeof SupabaseDB !== 'undefined' && SupabaseDB.logout) {
            await SupabaseDB.logout();
        } else if (typeof supabase !== 'undefined' && supabase && supabase.auth) {
            await supabase.auth.signOut();
        }
    } catch (error) {
        console.warn('⚠️ Supabase logout error (ignored):', error.message);
    }
    
    // Disable Google auto-select
    try {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.disableAutoSelect();
        }
    } catch (error) {
        console.warn('⚠️ Google disable auto-select error (ignored):', error.message);
    }
    
    // Hapus SEMUA data user termasuk weight tracking
    const keysToRemove = [
        'currentUser', 
        'userActivityData', 
        'usersDatabase', 
        'supabaseUser',
        'weightData',           // ⭐ Data berat badan
        'weightTrackingData',   // ⭐ Data tracking berat
        'weight_data',          // ⭐ Alternatif key
        'weightTracking'        // ⭐ Key lama (global)
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // ⭐ Hapus juga weight tracking per-user jika ada
    const userId = currentUser?.id || currentUser?.email;
    if (userId) {
        localStorage.removeItem(`weightTracking_${userId}`);
    }
    
    // Reset variables
    currentUser = null;
    window.currentUser = null;
    userActivityData = {};
    
    // ⭐ Reset weight data di memory jika ada
    if (typeof weightData !== 'undefined') {
        window.weightData = [];
    }
    
    console.log('✅ Logged out successfully - all user data cleared');
    
    // Navigate TANPA reload
    goToLanding();
}

// ====================================
// PAGE NAVIGATION
// ====================================
function goToLanding() {
    showPage('landingPage');
    
    // ⭐ PENTING: Pastikan form LOGIN yang ditampilkan, bukan register
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm && registerForm) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        console.log('✅ Showing login form (not register)');
    }
}

function goToInputData() {
    showPage('inputDataPage');
    prefillInputData();
}

function goToCompleteProfile() {
    console.log('🚀 goToCompleteProfile() called for Google user');
    
    // Populate Google user name
    if (currentUser && currentUser.name) {
        const googleUserNameSpan = document.getElementById('googleUserName');
        if (googleUserNameSpan) {
            googleUserNameSpan.textContent = currentUser.name;
        }
        
        // ⭐ Pre-fill nama lengkap dari Google
        const googleNamaLengkap = document.getElementById('googleNamaLengkap');
        if (googleNamaLengkap && !googleNamaLengkap.value) {
            googleNamaLengkap.value = currentUser.name;
        }
    }
    
    // Save temp Google user to sessionStorage for the complete profile form
    if (currentUser) {
        sessionStorage.setItem('tempGoogleUser', JSON.stringify(currentUser));
        // ⭐ JUGA simpan ke localStorage sebagai backup
        localStorage.setItem('tempGoogleUser', JSON.stringify(currentUser));
        console.log('✅ Saved tempGoogleUser to sessionStorage and localStorage');
    }
    
    showPage('completeProfilePage');
}

function goToDashboard() {
    console.log('🚀 goToDashboard() called');
    
    // ⭐ SELALU reload currentUser dari source terbaru (bukan hanya jika null)
    // Prioritas: window.currentUser > localStorage > existing currentUser
    
    // 1. Coba dari window.currentUser (set oleh registration-handler.js)
    if (window.currentUser && window.currentUser.email) {
        currentUser = window.currentUser;
        console.log('✅ Loaded currentUser from window.currentUser');
    } 
    // 2. Coba dari localStorage
    else {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            console.log('✅ Loaded currentUser from localStorage');
        }
    }
    
    // Jika masih tidak ada user
    if (!currentUser || !currentUser.email) {
        console.error('❌ No current user!');
        alert('Error: Please login first');
        showPage('landingPage');
        return;
    }
    
    console.log('👤 Current user:', currentUser.email);
    console.log('📋 User data:', {
        nama: currentUser.namaLengkap,
        tempatLahir: currentUser.tempatLahir,
        beratBadan: currentUser.beratBadan,
        hasCompletedData: currentUser.hasCompletedData
    });
    
    // Update email display
    const emailDisplay = document.getElementById('userEmailDisplay');
    if (emailDisplay) {
        emailDisplay.textContent = currentUser.email;
        console.log('✅ Email updated');
    } else {
        console.warn('⚠️ userEmailDisplay element not found in HTML');
    }
    
    // Show user photo if available
    if (currentUser.picture) {
        const userPhoto = document.getElementById('userPhoto');
        if (userPhoto) {
            userPhoto.src = currentUser.picture;
            userPhoto.style.display = 'inline-block';
        }
    }
    
    // ✅ CRITICAL: Show dashboard page
    console.log('📄 Showing dashboard page...');
    showPage('dashboardPage');
    
    // Initialize data
    console.log('📊 Initializing data...');
    initializeUserActivityData();
    loadUserProfile();
    showDashboard();

    // ⭐ SUPABASE SYNC: Load data dari Supabase saat login
    if (typeof window.SupabaseActivitySync !== 'undefined') {
        console.log('🔄 Syncing activity data from Supabase...');
        window.SupabaseActivitySync.sync().then(() => {
            console.log('✅ Activity data synced from Supabase');
            // Refresh displays after sync
            updateDashboardStats();
            updateProgressBars();
        }).catch(err => {
            console.warn('⚠️ Activity sync failed:', err);
        });
    }

    // ✅ Initialize charts with longer delay
    console.log('📈 Will initialize charts in 500ms...');
    setTimeout(() => {
        console.log('📈 Initializing charts NOW...');
        
        // ⭐ PENTING: Refresh weight tracker dengan data user terbaru
        if (typeof window.initializeWeightTracker === 'function') {
            console.log('✅ Refreshing Weight Tracker...');
            window.initializeWeightTracker();
        } else if (typeof initializeWeightTracker === 'function') {
            console.log('✅ Refreshing Weight Tracker (local)...');
            initializeWeightTracker();
        }
        
        if (typeof window.initializeCharts === 'function') {
            console.log('✅ Found window.initializeCharts');
            window.initializeCharts();
        } else if (typeof initializeCharts === 'function') {
            console.log('✅ Found initializeCharts');
            initializeCharts();
        } else {
            console.error('❌ initializeCharts NOT FOUND!');
            console.log('Available functions:', Object.keys(window).filter(k => k.includes('Chart')));
        }
    }, 500);
    
    console.log('✅ Dashboard loaded!');
}

function showPage(pageId) {
    console.log('📄 showPage called:', pageId);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        console.log('  Hiding:', page.id);
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('  ✅ Showing:', pageId);
    } else {
        console.error('  ❌ Page not found:', pageId);
    }
}

function prefillInputData() {
    if (currentUser && currentUser.hasCompletedData) {
        document.getElementById('namaLengkap').value = currentUser.namaLengkap || currentUser.name || '';
        document.getElementById('tempatLahir').value = currentUser.tempatLahir || '';
        document.getElementById('tanggalLahir').value = currentUser.tanggalLahir || '';
        document.getElementById('golonganDarah').value = currentUser.golonganDarah || '';
        document.getElementById('tinggiBadan').value = currentUser.tinggiBadan || '';
        document.getElementById('beratBadan').value = currentUser.beratBadan || '';
        document.getElementById('nomorWA').value = currentUser.nomorWA || '';
    } else if (currentUser && currentUser.name) {
        // Pre-fill name from Google Auth
        document.getElementById('namaLengkap').value = currentUser.name;
    }
}



// ====================================
// PROGRESS BAR UPDATES
// ====================================
function updateProgressBars() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        return;
    }

    // Steps progress (target: 10,000)
    const todaySteps = getTodayTotal('steps');
    const stepsProgress = Math.min((todaySteps / 10000) * 100, 100);
    setProgressBar('stepsProgress', stepsProgress);

    // Running progress (target: 5km)
    const todayDistance = getTodayTotal('running');
    const runningProgress = Math.min((todayDistance / 5) * 100, 100);
    setProgressBar('runningProgress', runningProgress);

    // Water progress (target: 2L)
    const todayWater = getTodayWaterTotal();
    const waterProgress = Math.min((todayWater / 2) * 100, 100);
    setProgressBar('waterProgress', waterProgress);

    // Sleep progress (target: 8 hours)
    const lastSleep = getLastSleep();
    const sleepProgress = Math.min((lastSleep / 8) * 100, 100);
    setProgressBar('sleepProgress', sleepProgress);

    // Gym progress (target: 1 hour)
    const todayGym = getTodayGymTotal();
    const gymProgress = Math.min((todayGym / 60) * 100, 100);
    setProgressBar('gymProgress', gymProgress);

    // Calorie progress (target: 2000 calories)
    const todayCalories = getTodayTotal('food');
    const calorieProgress = Math.min((todayCalories / 2000) * 100, 100);
    setProgressBar('calorieProgress', calorieProgress);
}

function setProgressBar(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.width = percentage + '%';
    }
}

// ====================================
// MODAL FUNCTIONS - STEPS
// ====================================
function openStepsModal() {
    document.getElementById('stepsModal').classList.add('active');
    updateStepsDisplay();
    loadStepsHistory();
}

function closeStepsModal() {
    document.getElementById('stepsModal').classList.remove('active');
}

async function addSteps() {
    const input = document.getElementById('stepsInput');
    const steps = parseInt(input.value);
    
    if (!steps || steps <= 0) {
        alert('Masukkan jumlah langkah yang valid!');
        return;
    }
    
    const stepsEntry = {
        value: steps,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    
    userActivityData[currentUser.email].steps.push(stepsEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    // ⭐ AUTO-SAVE TO SUPABASE
    if (window.SupabaseActivitySync) {
        window.SupabaseActivitySync.autoSave('steps', stepsEntry);
    }
    
    // Get AI analysis
    showAILoading('stepsAIAnalysis');
    const totalSteps = getTodayTotal('steps');
    const userData = getUserProfile();
    
    const prompt = `Saya telah berjalan ${totalSteps} langkah hari ini. 
    Data saya: Berat ${userData.beratBadan}kg, Tinggi ${userData.tinggiBadan}cm, Umur ${calculateAge(userData.tanggalLahir)} tahun.
    Berikan analisis aktivitas fisik dan motivasi untuk mencapai target 10,000 langkah harian!`;
    
    const aiResponse = await callOpenAI(prompt, 'steps');
    document.getElementById('stepsAIAnalysis').innerHTML = `<p>${aiResponse}</p>`;
    
    input.value = '';
    updateStepsDisplay();
    loadStepsHistory();
    updateDashboardStats();
    updateProgressBars();
    
    // ⭐ REALTIME: Refresh Ringkasan Aktivitas Hari Ini
    refreshActivitySummary();
}

function updateStepsDisplay() {
    const totalSteps = getTodayTotal('steps');
    const element = document.getElementById('totalStepsToday');
    if (element) {
        element.textContent = totalSteps.toLocaleString();
    }
}

function loadStepsHistory() {
    const historyDiv = document.getElementById('stepsHistory');
    if (!historyDiv) return;
    
    const stepsData = userActivityData[currentUser.email]?.steps || [];
    const last7Days = getLast7DaysEntries(stepsData);
    
    if (last7Days.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">Belum ada data langkah</p>';
        return;
    }
    
    const historyHTML = last7Days.map(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('id-ID');
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="history-item">
                <div class="item-info">
                    <div class="item-value">${entry.value.toLocaleString()} langkah</div>
                    <div class="item-time">${dateStr} ${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
    
    historyDiv.innerHTML = historyHTML;
}

// ====================================
// MODAL FUNCTIONS - RUNNING
// ====================================
function openRunningModal() {
    document.getElementById('runningModal').classList.add('active');
    updateRunningDisplay();
    loadRunningHistory();
}

function closeRunningModal() {
    document.getElementById('runningModal').classList.remove('active');
}

async function addRunning() {
    const input = document.getElementById('runningInput');
    const distance = parseFloat(input.value);
    
    if (!distance || distance <= 0) {
        alert('Masukkan jarak lari yang valid!');
        return;
    }
    
    const runningEntry = {
        value: distance,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    
    userActivityData[currentUser.email].running.push(runningEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    // ⭐ AUTO-SAVE TO SUPABASE
    if (window.SupabaseActivitySync) {
        window.SupabaseActivitySync.autoSave('running', runningEntry);
    }
    
    // Get AI analysis
    showAILoading('runningAIAnalysis');
    const totalDistance = getTodayTotal('running');
    const userData = getUserProfile();
    
    const prompt = `Saya telah berlari total ${totalDistance}km hari ini. 
    Data saya: Berat ${userData.beratBadan}kg, Tinggi ${userData.tinggiBadan}cm, Umur ${calculateAge(userData.tanggalLahir)} tahun.
    Berikan analisis performa lari dan tips untuk meningkatkan kemampuan lari saya!`;
    
    const aiResponse = await callOpenAI(prompt, 'running');
    document.getElementById('runningAIAnalysis').innerHTML = `<p>${aiResponse}</p>`;
    
    input.value = '';
    updateRunningDisplay();
    loadRunningHistory();
    updateDashboardStats();
    updateProgressBars();
    
    // ⭐ REALTIME: Refresh Ringkasan Aktivitas Hari Ini
    refreshActivitySummary();
}

function updateRunningDisplay() {
    const totalDistance = getTodayTotal('running');
    const element = document.getElementById('totalDistanceToday');
    if (element) {
        element.textContent = totalDistance.toFixed(1);
    }
}

function loadRunningHistory() {
    const historyDiv = document.getElementById('runningHistory');
    if (!historyDiv) return;
    
    const runningData = userActivityData[currentUser.email]?.running || [];
    const last7Days = getLast7DaysEntries(runningData);
    
    if (last7Days.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">Belum ada data lari</p>';
        return;
    }
    
    const historyHTML = last7Days.map(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('id-ID');
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="history-item">
                <div class="item-info">
                    <div class="item-value">${entry.value}km</div>
                    <div class="item-time">${dateStr} ${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
    
    historyDiv.innerHTML = historyHTML;
}

// ====================================
// MODAL FUNCTIONS - WATER (FIXED CENTERING)
// ====================================
function openWaterModal() {
    document.getElementById('waterModal').classList.add('active');
    updateWaterProgress();
    loadWaterHistory();
}

function closeWaterModal() {
    document.getElementById('waterModal').classList.remove('active');
}

async function addWater() {
    const input = document.getElementById('waterInput');
    const unit = document.getElementById('waterUnit').value;
    let amount = parseFloat(input.value);
    
    if (!amount || amount <= 0) {
        alert('Masukkan jumlah air yang valid!');
        return;
    }
    
    // Convert to liters
    if (unit === 'gelas') {
        amount = amount * 0.25; // 1 gelas = 250ml = 0.25L
    }
    
    // ⭐ FIX: Round ke 2 decimal untuk menghindari floating point error
    // 0.25 tetap 0.25, bukan 0.3
    amount = Math.round(amount * 100) / 100;
    
    const today = new Date().toDateString();
    
    if (!userActivityData[currentUser.email]) {
        userActivityData[currentUser.email] = {};
    }
    if (!userActivityData[currentUser.email].water) {
        userActivityData[currentUser.email].water = {};
    }
    if (!userActivityData[currentUser.email].water[today]) {
        userActivityData[currentUser.email].water[today] = 0;
    }
    
    userActivityData[currentUser.email].water[today] += amount;
    
    // ⭐ FIX: Round total ke 2 decimal untuk menghindari floating point error
    // 3.25 tetap 3.25, bukan 3.2499999999
    userActivityData[currentUser.email].water[today] = 
        Math.round(userActivityData[currentUser.email].water[today] * 100) / 100;
    
    // Get AI recommendation
    const waterData = userActivityData[currentUser.email].water[today];
    const userData = getUserProfile();
    
    showAILoading('waterAI');
    
    const prompt = `Saya telah minum ${waterData.toFixed(1)}L air hari ini. 
    Data saya: Berat ${userData.beratBadan}kg, Tinggi ${userData.tinggiBadan}cm, Umur ${calculateAge(userData.tanggalLahir)} tahun.
    Berikan rekomendasi konsumsi air yang tepat berdasarkan aktivitas dan kondisi tubuh saya!`;
    
    const aiResponse = await callOpenAI(prompt, 'water');
    document.getElementById('waterAI').innerHTML = `<p>${aiResponse}</p>`;
    
    input.value = '';
    updateWaterProgress();
    loadWaterHistory();
    updateDashboardStats();
    updateProgressBars();
    
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    // ⭐ AUTO-SAVE TO SUPABASE - Kirim TOTAL yang sudah di-round
    const totalWaterToday = userActivityData[currentUser.email].water[today];
    console.log('📤 Sending to Supabase:', totalWaterToday, 'L');
    
    if (window.saveWaterToSupabase) {
        window.saveWaterToSupabase(totalWaterToday, new Date()).then(result => {
            if (result.success) {
                console.log('✅ Water total synced to Supabase:', totalWaterToday, 'L');
            }
        });
    } else if (window.SupabaseActivitySync) {
        window.SupabaseActivitySync.saveWater(totalWaterToday, new Date());
    }
    
    // ⭐ REALTIME: Refresh Ringkasan Aktivitas Hari Ini
    refreshActivitySummary();
}

function updateWaterProgress() {
    const today = new Date().toDateString();
    const currentWater = userActivityData[currentUser.email]?.water?.[today] || 0;
    const target = 2.0; // 2L target
    
    // ⭐ FIX: Tampilkan 2 decimal agar 0.25 tetap 0.25 (bukan 0.3)
    const displayWater = currentWater.toFixed(2).replace(/\.?0+$/, ''); // 0.25 → "0.25", 1.00 → "1"
    
    // Update total water display in modal
    const totalWaterElement = document.getElementById('totalWaterToday');
    if (totalWaterElement) {
        totalWaterElement.textContent = displayWater;
    }
    
    // Update progress elements
    const currentWaterElement = document.getElementById('currentWater');
    const targetWaterElement = document.getElementById('targetWater');
    const progressElement = document.getElementById('waterProgressBar');
    
    if (currentWaterElement) currentWaterElement.textContent = displayWater;
    if (targetWaterElement) targetWaterElement.textContent = target.toFixed(1);
    
    const percentage = Math.min((currentWater / target) * 100, 100);
    if (progressElement) progressElement.style.width = percentage + '%';
}

function loadWaterHistory() {
    const historyDiv = document.getElementById('waterHistory');
    if (!historyDiv) return;
    
    const waterData = userActivityData[currentUser.email]?.water || {};
    
    const entries = Object.entries(waterData)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .slice(0, 7);
    
    if (entries.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">Belum ada data konsumsi air</p>';
        return;
    }
    
    const historyHTML = entries.map(([dateStr, amount]) => {
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('id-ID');
        // ⭐ FIX: Tampilkan 2 decimal
        const displayAmount = amount.toFixed(2).replace(/\.?0+$/, '');
        
        return `
            <div class="history-item">
                <div class="item-info">
                    <div class="item-value">${displayAmount}L</div>
                    <div class="item-time">${formattedDate}</div>
                </div>
            </div>
        `;
    }).join('');
    
    historyDiv.innerHTML = historyHTML;
}

// ====================================
// MODAL FUNCTIONS - GYM
// ====================================
function openGymModal() {
    document.getElementById('gymModal').classList.add('active');
    loadGymHistory();
}

function closeGymModal() {
    document.getElementById('gymModal').classList.remove('active');
}

// ====================================
// GYM EXERCISE CATEGORIES & TYPES
// ====================================
const gymExerciseData = {
    cardio: {
        name: "Cardio & Aerobik",
        icon: "🏃",
        description: "Latihan untuk meningkatkan daya tahan kardiovaskular dan membakar kalori",
        exercises: [
            { value: "Treadmill Walking", name: "🚶 Treadmill Walking" },
            { value: "Treadmill Running", name: "🏃 Treadmill Running" },
            { value: "Elliptical Machine", name: "⭕ Elliptical Machine" },
            { value: "Stationary Bike", name: "🚴 Stationary Bike" },
            { value: "Spinning/Cycle Class", name: "🚴 Spinning/Cycle Class" },
            { value: "Rowing Machine", name: "🚣 Rowing Machine" },
            { value: "Stair Climber", name: "🪜 Stair Climber" },
            { value: "Arc Trainer", name: "🏃 Arc Trainer" },
            { value: "Jump Rope", name: "🪢 Jump Rope" },
            { value: "Battle Ropes", name: "🪢 Battle Ropes" },
            { value: "Burpees", name: "💥 Burpees" },
            { value: "Mountain Climbers", name: "⛰️ Mountain Climbers" },
            { value: "High Knees", name: "🦵 High Knees" },
            { value: "Jumping Jacks", name: "🤸 Jumping Jacks" }
        ],
        benefits: ["Membakar Kalori", "Kesehatan Jantung", "Stamina", "Mood Booster"]
    },
    strength: {
        name: "Strength Training",
        icon: "🏋️",
        description: "Latihan beban untuk membangun massa otot dan kekuatan",
        exercises: [
            // Upper Body
            { value: "Bench Press", name: "🏋️ Bench Press" },
            { value: "Incline Bench Press", name: "🏋️ Incline Bench Press" },
            { value: "Decline Bench Press", name: "🏋️ Decline Bench Press" },
            { value: "Dumbbell Press", name: "🏋️ Dumbbell Press" },
            { value: "Push Ups", name: "💪 Push Ups" },
            { value: "Pull Ups", name: "💪 Pull Ups" },
            { value: "Lat Pulldown", name: "💪 Lat Pulldown" },
            { value: "Seated Cable Row", name: "💪 Seated Cable Row" },
            { value: "Bent Over Row", name: "💪 Bent Over Row" },
            { value: "Shoulder Press", name: "💪 Shoulder Press" },
            { value: "Lateral Raises", name: "💪 Lateral Raises" },
            { value: "Front Raises", name: "💪 Front Raises" },
            { value: "Rear Delt Flyes", name: "💪 Rear Delt Flyes" },
            { value: "Bicep Curls", name: "💪 Bicep Curls" },
            { value: "Hammer Curls", name: "💪 Hammer Curls" },
            { value: "Tricep Dips", name: "💪 Tricep Dips" },
            { value: "Tricep Extensions", name: "💪 Tricep Extensions" },
            { value: "Cable Tricep Pushdown", name: "💪 Cable Tricep Pushdown" },
            
            // Lower Body
            { value: "Squats", name: "🦵 Squats" },
            { value: "Leg Press", name: "🦵 Leg Press" },
            { value: "Deadlifts", name: "🦵 Deadlifts" },
            { value: "Romanian Deadlifts", name: "🦵 Romanian Deadlifts" },
            { value: "Lunges", name: "🦵 Lunges" },
            { value: "Bulgarian Split Squats", name: "🦵 Bulgarian Split Squats" },
            { value: "Leg Curls", name: "🦵 Leg Curls" },
            { value: "Leg Extensions", name: "🦵 Leg Extensions" },
            { value: "Calf Raises", name: "🦵 Calf Raises" },
            { value: "Hip Thrusts", name: "🦵 Hip Thrusts" },
            { value: "Goblet Squats", name: "🦵 Goblet Squats" },
            
            // Core
            { value: "Planks", name: "🧘 Planks" },
            { value: "Russian Twists", name: "🧘 Russian Twists" },
            { value: "Crunches", name: "🧘 Crunches" },
            { value: "Leg Raises", name: "🧘 Leg Raises" },
            { value: "Dead Bug", name: "🧘 Dead Bug" },
            { value: "Bird Dog", name: "🧘 Bird Dog" }
        ],
        benefits: ["Massa Otot", "Kekuatan", "Metabolisme", "Density Tulang"]
    },
    functional: {
        name: "Functional Training",
        icon: "🤸",
        description: "Latihan yang meniru gerakan sehari-hari untuk meningkatkan performa fungsional",
        exercises: [
            { value: "CrossFit WOD", name: "💪 CrossFit WOD" },
            { value: "Kettlebell Swings", name: "🏋️ Kettlebell Swings" },
            { value: "Kettlebell Goblet Squats", name: "🏋️ Kettlebell Goblet Squats" },
            { value: "Kettlebell Clean & Press", name: "🏋️ Kettlebell Clean & Press" },
            { value: "TRX Suspension Training", name: "🪢 TRX Suspension Training" },
            { value: "Medicine Ball Slams", name: "⚽ Medicine Ball Slams" },
            { value: "Medicine Ball Throws", name: "⚽ Medicine Ball Throws" },
            { value: "Box Jumps", name: "📦 Box Jumps" },
            { value: "Step Ups", name: "📦 Step Ups" },
            { value: "Agility Ladder", name: "🪜 Agility Ladder" },
            { value: "Cone Drills", name: "🔺 Cone Drills" },
            { value: "Farmer's Walk", name: "🚶 Farmer's Walk" },
            { value: "Bear Crawl", name: "🐻 Bear Crawl" },
            { value: "Crab Walk", name: "🦀 Crab Walk" },
            { value: "Tire Flips", name: "🛞 Tire Flips" },
            { value: "Sled Push/Pull", name: "🛷 Sled Push/Pull" },
            { value: "Sandbag Training", name: "🎒 Sandbag Training" },
            { value: "Plyometric Exercises", name: "💥 Plyometric Exercises" },
            { value: "Circuit Training", name: "🔄 Circuit Training" },
            { value: "Tabata Protocol", name: "⏱️ Tabata Protocol" }
        ],
        benefits: ["Koordinasi", "Stabilitas", "Power", "Agility"]
    },
    flexibility: {
        name: "Flexibility & Recovery",
        icon: "🧘",
        description: "Latihan untuk meningkatkan fleksibilitas, keseimbangan, dan pemulihan",
        exercises: [
            // Yoga
            { value: "Hatha Yoga", name: "🧘 Hatha Yoga" },
            { value: "Vinyasa Yoga", name: "🧘 Vinyasa Yoga" },
            { value: "Ashtanga Yoga", name: "🧘 Ashtanga Yoga" },
            { value: "Yin Yoga", name: "🧘 Yin Yoga" },
            { value: "Hot Yoga/Bikram", name: "🧘 Hot Yoga/Bikram" },
            { value: "Power Yoga", name: "🧘 Power Yoga" },
            { value: "Restorative Yoga", name: "🧘 Restorative Yoga" },
            
            // Pilates
            { value: "Mat Pilates", name: "🤸 Mat Pilates" },
            { value: "Reformer Pilates", name: "🤸 Reformer Pilates" },
            { value: "Pilates Ball", name: "🤸 Pilates Ball" },
            { value: "Pilates Ring", name: "🤸 Pilates Ring" },
            
            // Stretching & Mobility
            { value: "Dynamic Stretching", name: "🤸 Dynamic Stretching" },
            { value: "Static Stretching", name: "🤸 Static Stretching" },
            { value: "PNF Stretching", name: "🤸 PNF Stretching" },
            { value: "Foam Rolling", name: "🔄 Foam Rolling" },
            { value: "Mobility Work", name: "🔄 Mobility Work" },
            { value: "Balance Training", name: "⚖️ Balance Training" },
            { value: "Tai Chi", name: "🧘 Tai Chi" },
            { value: "Qigong", name: "🧘 Qigong" },
            { value: "Meditation", name: "🧘 Meditation" },
            { value: "Breathing Exercises", name: "🫁 Breathing Exercises" }
        ],
        benefits: ["Fleksibilitas", "Keseimbangan", "Recovery", "Stress Relief"]
    },
    sports: {
        name: "Sports & Martial Arts",
        icon: "⚽",
        description: "Olahraga kompetitif dan seni bela diri",
        exercises: [
            // Martial Arts
            { value: "Boxing", name: "🥊 Boxing" },
            { value: "Kickboxing", name: "🥊 Kickboxing" },
            { value: "Muay Thai", name: "🥊 Muay Thai" },
            { value: "Mixed Martial Arts (MMA)", name: "🥊 Mixed Martial Arts (MMA)" },
            { value: "Taekwondo", name: "🥋 Taekwondo" },
            { value: "Karate", name: "🥋 Karate" },
            { value: "Judo", name: "🥋 Judo" },
            { value: "Brazilian Jiu-Jitsu", name: "🥋 Brazilian Jiu-Jitsu" },
            { value: "Krav Maga", name: "🥋 Krav Maga" },
            { value: "Capoeira", name: "🥋 Capoeira" },
            
            // Racket Sports
            { value: "Tennis", name: "🎾 Tennis" },
            { value: "Badminton", name: "🏸 Badminton" },
            { value: "Squash", name: "🎾 Squash" },
            { value: "Table Tennis", name: "🏓 Table Tennis" },
            
            // Team Sports
            { value: "Basketball", name: "🏀 Basketball" },
            { value: "Football/Soccer", name: "⚽ Football/Soccer" },
            { value: "Volleyball", name: "🏐 Volleyball" },
            { value: "Futsal", name: "⚽ Futsal" },
            
            // Individual Sports
            { value: "Rock Climbing", name: "🧗 Rock Climbing" },
            { value: "Bouldering", name: "🧗 Bouldering" },
            { value: "Parkour", name: "🏃 Parkour" },
            { value: "Fencing", name: "🤺 Fencing" },
            { value: "Archery", name: "🏹 Archery" }
        ],
        benefits: ["Skill Development", "Coordination", "Competition", "Self Defense"]
    },
    aquatic: {
        name: "Aquatic Exercise",
        icon: "🏊",
        description: "Latihan berbasis air untuk low-impact training",
        exercises: [
            { value: "Freestyle Swimming", name: "🏊 Freestyle Swimming" },
            { value: "Backstroke Swimming", name: "🏊 Backstroke Swimming" },
            { value: "Breaststroke Swimming", name: "🏊 Breaststroke Swimming" },
            { value: "Butterfly Swimming", name: "🏊 Butterfly Swimming" },
            { value: "Water Aerobics", name: "🏊 Water Aerobics" },
            { value: "Aqua Jogging", name: "🏊 Aqua Jogging" },
            { value: "Water Polo", name: "🏊 Water Polo" },
            { value: "Synchronized Swimming", name: "🏊 Synchronized Swimming" },
            { value: "Pool Walking", name: "🏊 Pool Walking" },
            { value: "Water Resistance Training", name: "🏊 Water Resistance Training" },
            { value: "Aqua Zumba", name: "🏊 Aqua Zumba" },
            { value: "Deep Water Running", name: "🏊 Deep Water Running" }
        ],
        benefits: ["Low Impact", "Full Body", "Joint Friendly", "Resistance Training"]
    },
    group: {
        name: "Group Classes",
        icon: "👥",
        description: "Kelas berkelompok dengan instruktur untuk motivasi dan variasi",
        exercises: [
            // Dance Fitness
            { value: "Zumba", name: "💃 Zumba" },
            { value: "Dance Fitness", name: "💃 Dance Fitness" },
            { value: "Barre", name: "💃 Barre" },
            { value: "Bollywood Dance", name: "💃 Bollywood Dance" },
            { value: "Hip Hop Dance", name: "💃 Hip Hop Dance" },
            
            // High Intensity
            { value: "HIIT Class", name: "🔥 HIIT Class" },
            { value: "Boot Camp", name: "🔥 Boot Camp" },
            { value: "Circuit Training Class", name: "🔥 Circuit Training Class" },
            { value: "Insanity Workout", name: "🔥 Insanity Workout" },
            { value: "P90X", name: "🔥 P90X" },
            { value: "Orange Theory", name: "🔥 Orange Theory" },
            
            // Mind-Body
            { value: "Group Yoga Class", name: "🧘 Group Yoga Class" },
            { value: "Group Pilates Class", name: "🧘 Group Pilates Class" },
            { value: "Meditation Class", name: "🧘 Meditation Class" },
            { value: "Breathwork Class", name: "🧘 Breathwork Class" },
            
            // Strength Classes
            { value: "Body Pump", name: "🏋️ Body Pump" },
            { value: "Group Strength Training", name: "🏋️ Group Strength Training" },
            { value: "Kettlebell Class", name: "🏋️ Kettlebell Class" },
            { value: "TRX Class", name: "🏋️ TRX Class" },
            
            // Cardio Classes
            { value: "Step Aerobics", name: "📦 Step Aerobics" },
            { value: "Spinning Class", name: "🚴 Spinning Class" },
            { value: "Cardio Kickboxing", name: "🥊 Cardio Kickboxing" },
            { value: "Cardio Dance", name: "💃 Cardio Dance" }
        ],
        benefits: ["Motivation", "Social", "Structured", "Fun"]
    }
};

function updateExerciseTypes() {
    const categorySelect = document.getElementById('exerciseCategorySelect');
    const typeSelect = document.getElementById('exerciseTypeSelect');
    const selectedCategory = categorySelect.value;
    
    // Clear previous options
    typeSelect.innerHTML = '<option value="">Pilih jenis latihan</option>';
    
    if (selectedCategory && gymExerciseData[selectedCategory]) {
        const category = gymExerciseData[selectedCategory];
        
        // Add exercises for selected category
        category.exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.value;
            option.textContent = exercise.name;
            typeSelect.appendChild(option);
        });
        
        // Show category info (optional - you can add this to the modal)
        showCategoryInfo(category);
    }
}

function showCategoryInfo(category) {
    // Check if info section already exists
    let infoSection = document.getElementById('categoryInfo');
    if (!infoSection) {
        infoSection = document.createElement('div');
        infoSection.id = 'categoryInfo';
        infoSection.className = 'exercise-category-info';
        
        // Insert after category select
        const categorySelect = document.getElementById('exerciseCategorySelect');
        categorySelect.parentNode.insertAdjacentElement('afterend', infoSection);
    }
    
    infoSection.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 1.5rem;">${category.icon}</span>
            <strong>${category.name}</strong>
        </div>
        <p style="margin-bottom: 10px;">${category.description}</p>
        <div class="exercise-benefits">
            ${category.benefits.map(benefit => `<div class="benefit-item">${benefit}</div>`).join('')}
        </div>
    `;
}

async function addGymSession() {
    const exerciseCategory = document.getElementById('exerciseCategorySelect').value;
    const exerciseType = document.getElementById('exerciseTypeSelect').value;
    const duration = parseInt(document.getElementById('durationInput').value);
    
    if (!exerciseCategory || !exerciseType || !duration || duration <= 0) {
        alert('Pilih kategori, jenis latihan, dan masukkan durasi yang valid!');
        return;
    }
    
    const gymEntry = {
        category: exerciseCategory,
        exerciseType: exerciseType,
        type: exerciseType,
        duration: duration,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    if (!userActivityData[currentUser.email].gym) {
        userActivityData[currentUser.email].gym = [];
    }
    
    userActivityData[currentUser.email].gym.push(gymEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    // ⭐ AUTO-SAVE TO SUPABASE
    if (window.SupabaseActivitySync) {
        window.SupabaseActivitySync.autoSave('gym', gymEntry);
    }
    
    // Get AI analysis with more detailed info
    showAILoading('gymAI');
    const userData = getUserProfile();
    const categoryData = gymExerciseData[exerciseCategory];
    
    const prompt = `Saya baru selesai latihan ${exerciseType} (kategori: ${categoryData.name}) selama ${duration} menit. 
    Data saya: Berat ${userData.beratBadan}kg, Tinggi ${userData.tinggiBadan}cm, Umur ${calculateAge(userData.tanggalLahir)} tahun.
    
    Ini adalah latihan yang fokus pada: ${categoryData.benefits.join(', ')}.
    
    Berikan analisis latihan ini, perkiraan kalori yang terbakar, dan rekomendasi:
    1. Recovery yang diperlukan
    2. Kombinasi latihan yang baik untuk sesi berikutnya
    3. Nutrisi yang disarankan
    4. Frekuensi latihan optimal untuk kategori ini`;
    
    const aiResponse = await callOpenAI(prompt, 'gym');
    document.getElementById('gymAI').innerHTML = `<p>${aiResponse}</p>`;
    
    // Clear inputs
    document.getElementById('exerciseCategorySelect').value = '';
    document.getElementById('exerciseTypeSelect').value = '';
    document.getElementById('durationInput').value = '';
    
    // Remove category info
    const infoSection = document.getElementById('categoryInfo');
    if (infoSection) {
        infoSection.remove();
    }
    
    loadGymHistory();
    updateDashboardStats();
    updateProgressBars();
    
    // ⭐ REALTIME: Refresh Ringkasan Aktivitas Hari Ini
    refreshActivitySummary();
}

function loadGymHistory() {
    const historyDiv = document.getElementById('gymHistory');
    if (!historyDiv) return;
    
    const gymData = userActivityData[currentUser.email]?.gym || [];
    const last7Days = getLast7DaysEntries(gymData);
    
    if (last7Days.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">Belum ada data gym</p>';
        return;
    }
    
    const historyHTML = last7Days.map(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('id-ID');
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        // Get category info for icon
        const categoryData = gymExerciseData[entry.category] || { icon: '🏋️' };
        
        return `
            <div class="history-item">
                <div class="item-info">
                    <div class="item-value">
                        ${categoryData.icon} ${entry.type || entry.category} - ${entry.duration} menit
                    </div>
                    <div class="item-time">${dateStr} ${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
    
    historyDiv.innerHTML = historyHTML;
}

// Update activity distribution chart to use new category data
function getActivityDistributionData() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        return { labels: [], values: [] };
    }

    const userData = userActivityData[currentUser.email];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const categoryStats = {};
    
    if (userData.gym) {
        userData.gym
            .filter(item => new Date(item.date) >= weekAgo)
            .forEach(item => {
                const category = item.category || 'Other';
                categoryStats[category] = (categoryStats[category] || 0) + 1;
            });
    }

    // Convert to readable names
    const labels = Object.keys(categoryStats).map(key => {
        return gymExerciseData[key] ? gymExerciseData[key].name : key;
    });
    const values = Object.values(categoryStats);

    if (labels.length === 0) {
        return { labels: ['Belum ada data'], values: [1] };
    }

    return { labels, values };
}

// ====================================
// MODAL FUNCTIONS - SLEEP
// ====================================
function openSleepModal() {
    document.getElementById('sleepModal').classList.add('active');
    loadSleepHistory();
}

function closeSleepModal() {
    document.getElementById('sleepModal').classList.remove('active');
}

async function addSleep() {
    const input = document.getElementById('sleepInput');
    const hours = parseFloat(input.value);
    
    if (!hours || hours <= 0 || hours > 24) {
        alert('Masukkan durasi tidur yang valid (0-24 jam)!');
        return;
    }
    
    const sleepEntry = {
        value: hours,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    if (!userActivityData[currentUser.email].sleep) {
        userActivityData[currentUser.email].sleep = [];
    }
    
    userActivityData[currentUser.email].sleep.push(sleepEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    // ⭐ AUTO-SAVE TO SUPABASE
    if (window.SupabaseActivitySync) {
        window.SupabaseActivitySync.autoSave('sleep', sleepEntry);
    }
    
    // Get AI analysis
    showAILoading('sleepAI');
    const userData = getUserProfile();
    
    const prompt = `Saya tidur selama ${hours} jam semalam. 
    Data saya: Berat ${userData.beratBadan}kg, Tinggi ${userData.tinggiBadan}cm, Umur ${calculateAge(userData.tanggalLahir)} tahun.
    Berikan analisis kualitas tidur dan tips untuk meningkatkan kualitas tidur saya!`;
    
    const aiResponse = await callOpenAI(prompt, 'sleep');
    document.getElementById('sleepAI').innerHTML = `<p>${aiResponse}</p>`;
    
    input.value = '';
    loadSleepHistory();
    updateDashboardStats();
    updateProgressBars();
    
    // ⭐ REALTIME: Refresh Ringkasan Aktivitas Hari Ini
    refreshActivitySummary();
}

function loadSleepHistory() {
    const historyDiv = document.getElementById('sleepHistory');
    if (!historyDiv) return;
    
    const sleepData = userActivityData[currentUser.email]?.sleep || [];
    const last7Days = getLast7DaysEntries(sleepData);
    
    if (last7Days.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">Belum ada data tidur</p>';
        return;
    }
    
    const historyHTML = last7Days.map(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('id-ID');
        
        return `
            <div class="history-item">
                <div class="item-info">
                    <div class="item-value">${entry.value} jam</div>
                    <div class="item-time">${dateStr}</div>
                </div>
            </div>
        `;
    }).join('');
    
    historyDiv.innerHTML = historyHTML;
}

// ====================================
// MODAL FUNCTIONS - FOOD
// ====================================
function openFoodModal() {
    document.getElementById('foodModal').classList.add('active');
    loadFoodHistory();
}

function closeFoodModal() {
    document.getElementById('foodModal').classList.remove('active');
}

async function addFood() {
    const name = document.getElementById('foodNameInput').value.trim();
    const calories = parseInt(document.getElementById('foodCalorieInput').value) || 0;
    const carbs = parseInt(document.getElementById('foodCarbInput').value) || 0;
    const protein = parseInt(document.getElementById('foodProteinInput').value) || 0;
    const fat = parseInt(document.getElementById('foodFatInput').value) || 0;
    
    if (!name || calories <= 0) {
        alert('Masukkan nama makanan dan kalori yang valid!');
        return;
    }
    
    const foodEntry = {
        name: name,
        calories: calories,
        carbs: carbs,
        protein: protein,
        fat: fat,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    if (!userActivityData[currentUser.email].food) {
        userActivityData[currentUser.email].food = [];
    }
    
    userActivityData[currentUser.email].food.push(foodEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    // ⭐ AUTO-SAVE TO SUPABASE
    if (window.SupabaseActivitySync) {
        window.SupabaseActivitySync.autoSave('food', foodEntry);
    }
    
    // Get AI analysis
    showAILoading('foodAI');
    const totalCalories = getTodayTotal('food');
    const userData = getUserProfile();
    
    const prompt = `Saya baru makan ${name} (${calories} kalori, ${carbs}g karbohidrat, ${protein}g protein, ${fat}g lemak). 
    Total kalori hari ini: ${totalCalories}. 
    Data saya: Berat ${userData.beratBadan}kg, Tinggi ${userData.tinggiBadan}cm, Umur ${calculateAge(userData.tanggalLahir)} tahun.
    Berikan analisis nutrisi dan saran makanan untuk mencapai tujuan kesehatan saya!`;
    
    const aiResponse = await callOpenAI(prompt, 'food');
    document.getElementById('foodAI').innerHTML = `<p>${aiResponse}</p>`;
    
    // Clear inputs
    document.getElementById('foodNameInput').value = '';
    document.getElementById('foodCalorieInput').value = '';
    document.getElementById('foodCarbInput').value = '';
    document.getElementById('foodProteinInput').value = '';
    document.getElementById('foodFatInput').value = '';
    
    loadFoodHistory();
    updateDashboardStats();
    updateProgressBars();
    
    // ⭐ REALTIME: Refresh Ringkasan Aktivitas Hari Ini
    refreshActivitySummary();
}

async function detectFoodFromPhoto() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Show loading
        const foodAI = document.getElementById('foodAI');
        foodAI.innerHTML = '<p>📸 Menganalisis foto makanan...</p><p style="opacity:0.6">⏳ Harap tunggu</p>';
        
        try {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = async function(e) {
                const base64 = e.target.result.split(',')[1];
                
                try {
                    const response = await fetch(`${API_BASE_URL}/api/detect-food`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: base64 })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.success && data.food) {
                        // Fill the form with detected food data
                        document.getElementById('foodNameInput').value = data.food.nama || '';
                        document.getElementById('foodCalorieInput').value = data.food.kalori || '';
                        document.getElementById('foodCarbInput').value = data.food.karbohidrat || '';
                        document.getElementById('foodProteinInput').value = data.food.protein || '';
                        document.getElementById('foodFatInput').value = data.food.lemak || '';
                        
                        foodAI.innerHTML = `<p>✅ Makanan terdeteksi: <strong>${data.food.nama}</strong></p>
                                          <p>${data.food.deskripsi || 'Data sudah diisi otomatis di form di atas.'}</p>`;
                    } else {
                        throw new Error(data.error || 'Gagal mendeteksi makanan');
                    }
                } catch (error) {
                    console.error('Food detection error:', error);
                    foodAI.innerHTML = `<p>❌ ${error.message}</p>
                                       <p>Silakan input makanan secara manual.</p>`;
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('File processing error:', error);
            foodAI.innerHTML = '<p>❌ Gagal memproses foto. Silakan coba lagi.</p>';
        }
    };
    
    input.click();
}

function loadFoodHistory() {
    const historyDiv = document.getElementById('foodHistory');
    if (!historyDiv) return;
    
    const foodData = userActivityData[currentUser.email]?.food || [];
    const last7Days = getLast7DaysEntries(foodData);
    
    if (last7Days.length === 0) {
        historyDiv.innerHTML = '<p style="text-align: center; color: #666;">Belum ada data makanan</p>';
        return;
    }
    
    const historyHTML = last7Days.map(entry => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('id-ID');
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="history-item">
                <div class="item-info">
                    <div class="item-value">${entry.name} - ${entry.calories} kal</div>
                    <div class="item-time">${dateStr} ${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
    
    historyDiv.innerHTML = historyHTML;
}

// ====================================
// PROFILE FUNCTIONS
// ====================================
async function toggleProfile() {
    const modal = document.getElementById('profileModal');
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
        // Reset to view mode when closing
        switchToViewMode();
    } else {
        modal.classList.add('active');
        
        // Try to refresh user data from Supabase
        if (typeof supabase !== 'undefined' && currentUser?.id) {
            try {
                console.log('📡 Refreshing user data from Supabase...');
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single();
                
                if (!error && userData) {
                    // Update currentUser with fresh data
                    currentUser = {
                        ...currentUser,
                        name: userData.name,
                        namaLengkap: userData.nama_lengkap || userData.name,
                        tempatLahir: userData.tempat_lahir,
                        tanggalLahir: userData.tanggal_lahir,
                        golonganDarah: userData.golongan_darah,
                        tinggiBadan: userData.tinggi_badan,
                        beratBadan: userData.berat_badan,
                        nomorWA: userData.nomor_wa,
                        picture: userData.picture || currentUser.picture,
                        hasCompletedData: userData.has_completed_data
                    };
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    console.log('✅ User data refreshed from Supabase');
                }
            } catch (err) {
                console.warn('⚠️ Could not refresh from Supabase:', err.message);
            }
        }
        
        loadUserProfile();
    }
}

function loadUserProfile() {
    console.log('📋 loadUserProfile() called');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        console.warn('⚠️ No currentUser found');
        return;
    }
    
    // Show profile photo
    if (currentUser.picture) {
        const profilePhoto = document.getElementById('profilePhoto');
        const profilePlaceholder = document.getElementById('profilePlaceholder');
        if (profilePhoto && profilePlaceholder) {
            profilePhoto.src = currentUser.picture;
            profilePhoto.style.display = 'block';
            profilePlaceholder.style.display = 'none';
        }
    } else {
        // Show placeholder with first letter
        const profilePlaceholder = document.getElementById('profilePlaceholder');
        if (profilePlaceholder) {
            const firstLetter = (currentUser.namaLengkap || currentUser.name || currentUser.email || 'U')[0].toUpperCase();
            profilePlaceholder.innerHTML = `<span style="font-size: 48px; font-weight: bold; color: #667eea;">${firstLetter}</span>`;
            profilePlaceholder.style.display = 'flex';
            profilePlaceholder.style.alignItems = 'center';
            profilePlaceholder.style.justifyContent = 'center';
        }
    }
    
    // Get display name
    const displayName = currentUser.namaLengkap || currentUser.name || '';
    const displayEmail = currentUser.email || '';
    
    // Header section
    setElementText('displayNamaHeader', displayName);
    setElementText('displayEmailHeader', displayEmail);
    
    // Info cards - use helper function for safe assignment
    setElementText('displayEmail', displayEmail);
    setElementText('displayNama', displayName);
    setElementText('displayTempatLahir', currentUser.tempatLahir || '-');
    
    // Format tanggal lahir
    let formattedTanggalLahir = '-';
    if (currentUser.tanggalLahir) {
        try {
            formattedTanggalLahir = formatDate(currentUser.tanggalLahir);
        } catch (e) {
            formattedTanggalLahir = currentUser.tanggalLahir;
        }
    }
    setElementText('displayTanggalLahir', formattedTanggalLahir);
    
    // Legacy TTL field (if exists) - for backward compatibility
    const ttl = currentUser.tempatLahir && currentUser.tanggalLahir 
        ? `${currentUser.tempatLahir}, ${formattedTanggalLahir}` 
        : '-';
    setElementText('displayTTL', ttl);
    
    setElementText('displayGolDar', currentUser.golonganDarah || '-');
    setElementText('displayTinggi', currentUser.tinggiBadan ? `${currentUser.tinggiBadan} cm` : '-');
    setElementText('displayBerat', currentUser.beratBadan ? `${currentUser.beratBadan} kg` : '-');
    setElementText('displayWA', currentUser.nomorWA || '-');
    
    console.log('✅ Profile loaded successfully');
}

function switchToEditMode() {
    const viewMode = document.getElementById('profileViewMode');
    const editMode = document.getElementById('profileEditMode');
    
    if (viewMode && editMode) {
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
        
        // Pre-fill edit form with current data
        populateEditForm();
    }
}

function switchToViewMode() {
    const viewMode = document.getElementById('profileViewMode');
    const editMode = document.getElementById('profileEditMode');
    
    if (viewMode && editMode) {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
    }
    
    // Hide any error/success messages
    const errorEl = document.getElementById('editProfileError');
    const successEl = document.getElementById('editProfileSuccess');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
}

function populateEditForm() {
    if (!currentUser) return;
    
    // Fill form with current user data
    const editNamaLengkap = document.getElementById('editNamaLengkap');
    const editTempatLahir = document.getElementById('editTempatLahir');
    const editTanggalLahir = document.getElementById('editTanggalLahir');
    const editGolonganDarah = document.getElementById('editGolonganDarah');
    const editTinggiBadan = document.getElementById('editTinggiBadan');
    const editBeratBadan = document.getElementById('editBeratBadan');
    const editNomorWA = document.getElementById('editNomorWA');
    
    if (editNamaLengkap) editNamaLengkap.value = currentUser.namaLengkap || currentUser.name || '';
    if (editTempatLahir) editTempatLahir.value = currentUser.tempatLahir || '';
    if (editTanggalLahir) editTanggalLahir.value = currentUser.tanggalLahir || '';
    if (editGolonganDarah) editGolonganDarah.value = currentUser.golonganDarah || '';
    if (editTinggiBadan) editTinggiBadan.value = currentUser.tinggiBadan || '';
    if (editBeratBadan) editBeratBadan.value = currentUser.beratBadan || '';
    if (editNomorWA) editNomorWA.value = currentUser.nomorWA || '';
    
    // Update edit mode photo
    if (currentUser.picture) {
        const profilePhotoEdit = document.getElementById('profilePhotoEdit');
        const profilePlaceholderEdit = document.getElementById('profilePlaceholderEdit');
        if (profilePhotoEdit && profilePlaceholderEdit) {
            profilePhotoEdit.src = currentUser.picture;
            profilePhotoEdit.style.display = 'block';
            profilePlaceholderEdit.style.display = 'none';
        }
    }
}

async function saveProfileChanges() {
    console.log('📝 saveProfileChanges() called');
    
    const namaLengkap = document.getElementById('editNamaLengkap')?.value?.trim() || '';
    const tempatLahir = document.getElementById('editTempatLahir')?.value?.trim() || '';
    const tanggalLahir = document.getElementById('editTanggalLahir')?.value || '';
    const golonganDarah = document.getElementById('editGolonganDarah')?.value || '';
    const tinggiBadan = document.getElementById('editTinggiBadan')?.value || '';
    const beratBadan = document.getElementById('editBeratBadan')?.value || '';
    const nomorWA = document.getElementById('editNomorWA')?.value?.trim() || '';
    
    const errorEl = document.getElementById('editProfileError');
    const successEl = document.getElementById('editProfileSuccess');
    
    // Validation
    if (!namaLengkap || !tempatLahir || !tanggalLahir || !golonganDarah || !tinggiBadan || !beratBadan || !nomorWA) {
        if (errorEl) {
            errorEl.textContent = 'Semua field harus diisi!';
            errorEl.style.display = 'block';
            errorEl.classList.add('show');
        }
        return;
    }
    
    // Update currentUser object
    currentUser.namaLengkap = namaLengkap;
    currentUser.name = namaLengkap;
    currentUser.tempatLahir = tempatLahir;
    currentUser.tanggalLahir = tanggalLahir;
    currentUser.golonganDarah = golonganDarah;
    currentUser.tinggiBadan = parseFloat(tinggiBadan);
    currentUser.beratBadan = parseFloat(beratBadan);
    currentUser.nomorWA = nomorWA;
    currentUser.hasCompletedData = true;
    
    // Save to localStorage FIRST
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    console.log('✅ Profile saved to localStorage');
    
    // Update usersDatabase
    const userIndex = usersDatabase.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = { ...usersDatabase[userIndex], ...currentUser };
        localStorage.setItem('usersDatabase', JSON.stringify(usersDatabase));
    }
    
    // Try to save to Supabase if available
    if (typeof supabase !== 'undefined' && currentUser?.id) {
        try {
            console.log('📡 Saving profile to Supabase...');
            const { data, error } = await supabase
                .from('users')
                .upsert([{
                    id: currentUser.id,
                    email: currentUser.email,
                    name: namaLengkap,
                    nama_lengkap: namaLengkap,
                    tempat_lahir: tempatLahir,
                    tanggal_lahir: tanggalLahir,
                    golongan_darah: golonganDarah,
                    tinggi_badan: parseFloat(tinggiBadan),
                    berat_badan: parseFloat(beratBadan),
                    nomor_wa: nomorWA,
                    has_completed_data: true,
                    picture: currentUser.picture,
                    is_google_user: currentUser.isGoogleUser || false,
                    google_id: currentUser.googleId
                }], { onConflict: 'id' })
                .select();
            
            if (error) {
                console.warn('⚠️ Supabase update warning:', error.message);
            } else {
                console.log('✅ Profile updated in Supabase:', data);
            }
        } catch (err) {
            console.warn('⚠️ Supabase not available, saved locally only:', err.message);
        }
    }
    
    // Show success message
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) {
        successEl.textContent = '✅ Profil berhasil diperbarui!';
        successEl.style.display = 'block';
    }
    
    // Update view mode display
    loadUserProfile();
    
    // Update dashboard display
    updateDashboardUserInfo();
    
    // Switch back to view mode after short delay
    setTimeout(() => {
        switchToViewMode();
    }, 1500);
}

function updateDashboardUserInfo() {
    // Update any dashboard elements that show user info
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    if (userEmailDisplay && currentUser) {
        userEmailDisplay.textContent = currentUser.email || '';
    }
    
    // Update user photo if exists
    const userPhoto = document.getElementById('userPhoto');
    if (userPhoto && currentUser && currentUser.picture) {
        userPhoto.src = currentUser.picture;
        userPhoto.style.display = 'block';
    }
    
    // Update mobile user info
    updateMobileUserInfo();
}

function exportUserData() {
    if (!currentUser) {
        alert('Tidak ada data user untuk di-export!');
        return;
    }
    
    const exportData = {
        user: currentUser,
        activityData: userActivityData[currentUser.email] || {},
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `calorie-deficit-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('✅ Data berhasil di-export!');
}

function clearAllData() {
    if (!confirm('⚠️ PERINGATAN: Semua data aktivitas Anda akan dihapus. Lanjutkan?')) {
        return;
    }
    
    if (!confirm('🔴 Ini tidak bisa dibatalkan! Anda yakin ingin menghapus semua data?')) {
        return;
    }
    
    // Clear activity data for current user
    if (currentUser && userActivityData[currentUser.email]) {
        delete userActivityData[currentUser.email];
        localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    }
    
    // Re-initialize empty activity data
    initializeUserActivityData();
    
    // Update displays
    updateDashboardStats();
    updateProgressBars();
    
    alert('✅ Semua data aktivitas telah dihapus!');
    
    // Close profile modal
    toggleProfile();
}

// ====================================
// ANALYTICS FUNCTIONS
// ====================================
function initializeAnalytics() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        updateAnalyticsOverview();
        return;
    }
    
    updateAnalyticsOverview();
}

function updateAnalyticsOverview() {
    const userData = userActivityData[currentUser.email];
    if (!userData) {
        // Set all to 0 if no data
        setElementText('periodSteps', '0');
        setElementText('periodDistance', '0');
        setElementText('periodWater', '0');
        setElementText('avgSleep', '0');
        setElementText('summaryCalorieIn', '0');
        setElementText('summaryCalorieOut', '0');
        setElementText('summaryDeficit', '0');
        return;
    }
    
    // Calculate period totals based on current filter
    let periodSteps, periodDistance, periodWater, avgSleep;
    
    switch (currentPeriod) {
        case '7days':
            periodSteps = getWeeklyTotal('steps');
            periodDistance = getWeeklyTotal('running');
            periodWater = getWeeklyTotal('water');
            avgSleep = getWeeklyAverage('sleep');
            break;
        case '30days':
            periodSteps = getMonthlyTotal('steps');
            periodDistance = getMonthlyTotal('running');
            periodWater = getMonthlyTotal('water');
            avgSleep = getMonthlyAverage('sleep');
            break;
        case '90days':
            periodSteps = getQuarterlyTotal('steps');
            periodDistance = getQuarterlyTotal('running');
            periodWater = getQuarterlyTotal('water');
            avgSleep = getQuarterlyAverage('sleep');
            break;
        default:
            periodSteps = getWeeklyTotal('steps');
            periodDistance = getWeeklyTotal('running');
            periodWater = getWeeklyTotal('water');
            avgSleep = getWeeklyAverage('sleep');
    }
    
    // Calculate calorie balance
    const totalCalorieIn = getWeeklyTotal('food');
    const totalCalorieOut = Math.round(periodSteps * 0.04 + periodDistance * 60); // Estimation
    const deficit = totalCalorieOut - totalCalorieIn;
    
    // Update display
    setElementText('periodSteps', periodSteps.toLocaleString());
    setElementText('periodDistance', periodDistance.toFixed(1));
    setElementText('periodWater', periodWater.toFixed(1));
    setElementText('avgSleep', avgSleep.toFixed(1));
    setElementText('summaryCalorieIn', totalCalorieIn.toLocaleString());
    setElementText('summaryCalorieOut', totalCalorieOut.toLocaleString());
    setElementText('summaryDeficit', deficit.toLocaleString());
}

function changeAnalyticsPeriod(period) {
    currentPeriod = period;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
    
    // Hide custom date picker if not custom
    if (period !== 'custom') {
        document.getElementById('customDatePicker').style.display = 'none';
    }
    
    // Update analytics
    updateAnalyticsOverview();
    
    // Refresh charts with delay
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

function toggleCustomDatePicker() {
    const picker = document.getElementById('customDatePicker');
    const isHidden = picker.style.display === 'none';
    
    if (isHidden) {
        // Show date picker and set Custom button as active
        picker.style.display = 'flex';
        
        // Update active button to Custom
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-period="custom"]').classList.add('active');
    } else {
        // Hide date picker
        picker.style.display = 'none';
    }
}

function applyCustomDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Pilih tanggal mulai dan selesai!');
        return;
    }
    
    customStartDate = new Date(startDate);
    customEndDate = new Date(endDate);
    currentPeriod = 'custom';
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-period="custom"]').classList.add('active');
    
    updateAnalyticsOverview();
    
    // Refresh charts
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

async function generateAnalyticsInsight() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        alert('Belum ada data untuk dianalisis!');
        return;
    }
    
    showAILoading('analyticsAI');
    
    const periodSteps = getWeeklyTotal('steps');
    const periodDistance = getWeeklyTotal('running');
    const periodWater = getWeeklyTotal('water');
    const avgSleep = getWeeklyAverage('sleep');
    const totalCalorieIn = getWeeklyTotal('food');
    const totalCalorieOut = Math.round(periodSteps * 0.04 + periodDistance * 60);
    const userData = getUserProfile();
    
    const prompt = `Berdasarkan data aktivitas periode saya:
    - Langkah: ${periodSteps}
    - Lari: ${periodDistance}km
    - Air: ${periodWater}L
    - Rata-rata tidur: ${avgSleep} jam/hari
    - Kalori masuk: ${totalCalorieIn}
    - Kalori keluar: ${totalCalorieOut}
    - Net balance: ${totalCalorieOut - totalCalorieIn}
    
    Data pribadi: Berat ${userData.beratBadan}kg, Tinggi ${userData.tinggiBadan}cm, Umur ${calculateAge(userData.tanggalLahir)} tahun.
    
    Berikan insight mendalam, analisis tren, dan rekomendasi strategis yang actionable untuk periode ke depan!`;
    
    const aiResponse = await callOpenAI(prompt, 'analytics');
    document.getElementById('analyticsAI').innerHTML = `<p>${aiResponse}</p>`;
}

// ====================================
// HARIAN FUNCTIONS
// ====================================
function updateHarianSummary() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        // Reset all summary to 0
        setElementText('summarySteps', '0 langkah');
        setElementText('summaryRun', '0 km');
        setElementText('summaryWater', '0 L');
        setElementText('summarySleep', '0 jam');
        setElementText('summaryGym', '0 menit');
        return;
    }
    
    const todaySteps = getTodayTotal('steps');
    const todayRun = getTodayTotal('running');
    const todayWater = getTodayWaterTotal();
    const todaySleep = getLastSleep();
    const todayGym = getTodayGymTotal();
    
    setElementText('summarySteps', `${todaySteps.toLocaleString()} langkah`);
    setElementText('summaryRun', `${todayRun.toFixed(1)} km`);
    setElementText('summaryWater', `${todayWater.toFixed(1)} L`);
    setElementText('summarySleep', `${todaySleep} jam`);
    setElementText('summaryGym', `${todayGym} menit`);
}

function saveHarianSteps() {
    const steps = parseInt(document.getElementById('harianSteps').value);
    if (!steps || steps <= 0) {
        alert('Masukkan jumlah langkah yang valid!');
        return;
    }
    
    const stepsEntry = {
        value: steps,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    
    userActivityData[currentUser.email].steps.push(stepsEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    document.getElementById('harianSteps').value = '';
    updateHarianSummary();
    updateDashboardStats();
    updateProgressBars();
    
    showSuccessMessage('Data langkah berhasil disimpan!');

    // Refresh charts
    if (typeof window.refreshAllCharts === 'function') {
        window.refreshAllCharts();
    }
}


function saveHarianRun() {
    const distance = parseFloat(document.getElementById('harianRun').value);
    if (!distance || distance <= 0) {
        alert('Masukkan jarak lari yang valid!');
        return;
    }
    
    const runEntry = {
        value: distance,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    
    userActivityData[currentUser.email].running.push(runEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    document.getElementById('harianRun').value = '';
    updateHarianSummary();
    updateDashboardStats();
    updateProgressBars();
    
    showSuccessMessage('Data lari berhasil disimpan!');
    
    // ✅ AUTO-UPDATE CHARTS
    if (typeof window.refreshAllCharts === 'function') {
        window.refreshAllCharts();
    }
}

function saveHarianWater() {
    const liters = parseFloat(document.getElementById('harianWater').value);
    if (!liters || liters <= 0) {
        alert('Masukkan jumlah air yang valid!');
        return;
    }
    
    const today = new Date().toDateString();
    
    if (!userActivityData[currentUser.email]) {
        userActivityData[currentUser.email] = {};
    }
    if (!userActivityData[currentUser.email].water) {
        userActivityData[currentUser.email].water = {};
    }
    
    userActivityData[currentUser.email].water[today] = liters;
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    document.getElementById('harianWater').value = '';
    updateHarianSummary();
    updateDashboardStats();
    updateProgressBars();
    
    showSuccessMessage('Data konsumsi air berhasil disimpan!');
    
    // ✅ AUTO-UPDATE CHARTS
    if (typeof window.refreshAllCharts === 'function') {
        window.refreshAllCharts();
    }
}

function saveHarianSleep() {
    const hours = parseFloat(document.getElementById('harianSleep').value);
    if (!hours || hours <= 0 || hours > 24) {
        alert('Masukkan durasi tidur yang valid (0-24 jam)!');
        return;
    }
    
    const sleepEntry = {
        value: hours,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    if (!userActivityData[currentUser.email].sleep) {
        userActivityData[currentUser.email].sleep = [];
    }
    
    userActivityData[currentUser.email].sleep.push(sleepEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    document.getElementById('harianSleep').value = '';
    updateHarianSummary();
    updateDashboardStats();
    updateProgressBars();
    
    showSuccessMessage('Data tidur berhasil disimpan!');
    
    // ✅ AUTO-UPDATE CHARTS
    if (typeof window.refreshAllCharts === 'function') {
        window.refreshAllCharts();
    }
}

function saveHarianGym() {
    const minutes = parseInt(document.getElementById('harianGym').value);
    if (!minutes || minutes <= 0) {
        alert('Masukkan durasi gym yang valid!');
        return;
    }
    
    const gymEntry = {
        type: 'General',
        duration: minutes,
        date: new Date().toISOString()
    };
    
    if (!userActivityData[currentUser.email]) {
        initializeUserActivityData();
    }
    if (!userActivityData[currentUser.email].gym) {
        userActivityData[currentUser.email].gym = [];
    }
    
    userActivityData[currentUser.email].gym.push(gymEntry);
    localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    
    document.getElementById('harianGym').value = '';
    updateHarianSummary();
    updateDashboardStats();
    updateProgressBars();
    
    showSuccessMessage('Data gym berhasil disimpan!');
    
    // ✅ AUTO-UPDATE CHARTS
    if (typeof window.refreshAllCharts === 'function') {
        window.refreshAllCharts();
    }
}

// ====================================
// DASHBOARD UPDATE FUNCTIONS
// ====================================
function updateDashboardStats() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        // Set all dashboard stats to 0
        setElementText('todaySteps', '0');
        setElementText('todayDistance', '0.0');
        setElementText('todayWater', '0.0');
        setElementText('gymSessions', '0');
        setElementText('lastSleep', '0');
        setElementText('todayCalorieIn', '0');
        setElementText('todayCaloriesBurned', '0');
        setElementText('weeklyGoalProgress', '0%');
        setElementText('streakDays', '0');
        return;
    }
    
    const todaySteps = getTodayTotal('steps');
    const todayDistance = getTodayTotal('running');
    const todayWater = getTodayWaterTotal();
    const monthlyGymSessions = getMonthlyGymSessions();
    const lastSleepHours = getLastSleep();
    const todayCalorieIn = getTodayTotal('food');
    
    // Calculate calories burned (estimation)
    const caloriesBurned = Math.round(todaySteps * 0.04 + todayDistance * 60);
    
    // Calculate weekly goal progress (10k steps target)
    const weeklyGoalProgress = Math.min((getWeeklyTotal('steps') / 70000) * 100, 100);
    
    // Calculate streak days (simplified - days with activity)
    const streakDays = calculateActivityStreak();
    
    setElementText('todaySteps', todaySteps.toLocaleString());
    setElementText('todayDistance', todayDistance.toFixed(1));
    // ⭐ FIX: Use toFixed(2) untuk tampilkan 0.75 sebagai "0.75" bukan "0.8"
    setElementText('todayWater', todayWater.toFixed(2).replace(/\.?0+$/, ''));
    setElementText('gymSessions', monthlyGymSessions.toString());
    setElementText('lastSleep', lastSleepHours.toString());
    setElementText('todayCalorieIn', todayCalorieIn.toLocaleString());
    setElementText('todayCaloriesBurned', caloriesBurned.toLocaleString());
    setElementText('weeklyGoalProgress', weeklyGoalProgress.toFixed(0) + '%');
    setElementText('streakDays', streakDays.toString());
}

function calculateActivityStreak() {
    if (!currentUser || !userActivityData[currentUser.email]) {
        return 0;
    }
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        const daySteps = getDayTotal('steps', checkDate);
        const dayRunning = getDayTotal('running', checkDate);
        const dayWater = getDayWaterTotal(checkDate);
        
        // Consider it an active day if they have any activity
        if (daySteps > 0 || dayRunning > 0 || dayWater > 0) {
            streak++;
        } else {
            break; // Streak broken
        }
    }
    
    return streak;
}

// ⭐ REALTIME ACTIVITY SUMMARY UPDATE
// Fungsi untuk refresh semua chart dan ringkasan aktivitas tanpa reload
function refreshActivitySummary() {
    console.log('🔄 Refreshing Activity Summary...');
    
    try {
        // 1. Refresh Daily Summary Chart (Ringkasan Aktivitas Hari Ini)
        if (typeof createDailySummaryChart === 'function') {
            createDailySummaryChart();
            console.log('✅ Daily Summary Chart refreshed');
        }
        
        // 2. Refresh Activity Trend Chart
        if (typeof createActivityTrendChart === 'function') {
            createActivityTrendChart();
            console.log('✅ Activity Trend Chart refreshed');
        }
        
        // 3. Refresh Weekly Comparison Chart
        if (typeof createWeeklyComparisonChart === 'function') {
            createWeeklyComparisonChart();
            console.log('✅ Weekly Comparison Chart refreshed');
        }
        
        // 4. Update Kalori Terbakar display
        updateCaloriesBurnedDisplay();
        
        // 5. Update Target Mingguan display
        updateWeeklyTargetDisplay();
        
        // 6. Update Hari Beruntun display
        updateStreakDisplay();
        
        console.log('✅ Activity Summary refreshed successfully!');
        
    } catch (error) {
        console.error('❌ Error refreshing activity summary:', error);
    }
}

// Helper function untuk update Kalori Terbakar di dashboard card
function updateCaloriesBurnedDisplay() {
    const todaySteps = getTodayTotal('steps');
    const todayDistance = getTodayTotal('running');
    const todayGymMinutes = getTodayGymMinutes();
    
    // Kalkulasi kalori terbakar
    const caloriesBurned = Math.round(
        (todaySteps * 0.04) +      // ~0.04 kal per langkah
        (todayDistance * 60) +     // ~60 kal per km lari
        (todayGymMinutes * 5)      // ~5 kal per menit gym
    );
    
    const element = document.getElementById('caloriesBurnedToday');
    if (element) {
        element.textContent = caloriesBurned.toLocaleString();
    }
    
    // Update juga di stat card jika ada
    setElementText('todayCaloriesBurned', caloriesBurned.toLocaleString());
}

// Helper function untuk update Target Mingguan
function updateWeeklyTargetDisplay() {
    const weeklySteps = getWeeklyTotal('steps');
    const targetSteps = 70000; // 10k per hari x 7 hari
    const progress = Math.min((weeklySteps / targetSteps) * 100, 100);
    
    const progressElement = document.getElementById('weeklyTargetProgress');
    if (progressElement) {
        progressElement.textContent = progress.toFixed(0) + '%';
    }
    
    // Update progress bar jika ada
    const progressBar = document.getElementById('weeklyProgressBar');
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
}

// Helper function untuk update Hari Beruntun (Streak)
function updateStreakDisplay() {
    const streak = calculateActivityStreak();
    
    const streakElement = document.getElementById('streakDaysDisplay');
    if (streakElement) {
        streakElement.textContent = streak;
    }
    
    setElementText('streakDays', streak.toString());
}

// Helper function untuk mendapatkan total menit gym hari ini
function getTodayGymMinutes() {
    if (!currentUser || !userActivityData[currentUser.email]) return 0;
    
    const gymData = userActivityData[currentUser.email].gym || [];
    const today = new Date().toDateString();
    
    return gymData
        .filter(entry => new Date(entry.date).toDateString() === today)
        .reduce((total, entry) => total + (entry.duration || 0), 0);
}

// Expose function to window untuk bisa dipanggil dari mana saja
window.refreshActivitySummary = refreshActivitySummary;

// ====================================
// UTILITY FUNCTIONS
// ====================================
function initializeUserActivityData() {
    if (!userActivityData[currentUser.email]) {
        userActivityData[currentUser.email] = {
            steps: [],
            running: [],
            water: {},
            gym: [],
            sleep: [],
            food: []
        };
        localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
    }
}

function getUserProfile() {
    return {
        beratBadan: currentUser.beratBadan || 70,
        tinggiBadan: currentUser.tinggiBadan || 170,
        tanggalLahir: currentUser.tanggalLahir || '1990-01-01'
    };
}

function getTodayTotal(type) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }
    
    const data = userActivityData[currentUser.email][type];
    const today = new Date().toDateString();
    
    if (type === 'food') {
        // Sum calories for food
        return data
            .filter(item => new Date(item.date).toDateString() === today)
            .reduce((sum, item) => sum + (item.calories || 0), 0);
    }
    
    // For steps and running, sum values
    return data
        .filter(item => new Date(item.date).toDateString() === today)
        .reduce((sum, item) => sum + (item.value || 0), 0);
}

function getTodayWaterTotal() {
    const today = new Date().toDateString();
    return userActivityData[currentUser.email]?.water?.[today] || 0;
}

function getTodayGymTotal() {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email].gym) {
        return 0;
    }
    
    const today = new Date().toDateString();
    return userActivityData[currentUser.email].gym
        .filter(item => new Date(item.date).toDateString() === today)
        .reduce((sum, item) => sum + (item.duration || 0), 0);
}

function getLastSleep() {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email].sleep) {
        return 0;
    }
    
    const sleepData = userActivityData[currentUser.email].sleep;
    if (sleepData.length === 0) return 0;
    
    // Get last sleep entry
    const lastSleep = sleepData[sleepData.length - 1];
    return lastSleep.value || 0;
}

function getMonthlyGymSessions() {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email].gym) {
        return 0;
    }
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return userActivityData[currentUser.email].gym
        .filter(item => new Date(item.date) >= monthStart)
        .length;
}

function getWeeklyTotal(type) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }
    
    const data = userActivityData[currentUser.email][type];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    if (type === 'water') {
        // Water is stored differently (by date string)
        let total = 0;
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            total += data[dateStr] || 0;
        }
        return total;
    }
    
    if (type === 'food') {
        // Sum calories for food
        return data
            .filter(item => new Date(item.date) >= weekAgo)
            .reduce((sum, item) => sum + (item.calories || 0), 0);
    }
    
    // For steps and running, sum values
    return data
        .filter(item => new Date(item.date) >= weekAgo)
        .reduce((sum, item) => sum + (item.value || 0), 0);
}

function getMonthlyTotal(type) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }
    
    const data = userActivityData[currentUser.email][type];
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    if (type === 'water') {
        let total = 0;
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            total += data[dateStr] || 0;
        }
        return total;
    }
    
    if (type === 'food') {
        return data
            .filter(item => new Date(item.date) >= monthAgo)
            .reduce((sum, item) => sum + (item.calories || 0), 0);
    }
    
    return data
        .filter(item => new Date(item.date) >= monthAgo)
        .reduce((sum, item) => sum + (item.value || 0), 0);
}

function getQuarterlyTotal(type) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }
    
    const data = userActivityData[currentUser.email][type];
    const quarterAgo = new Date();
    quarterAgo.setDate(quarterAgo.getDate() - 90);
    
    if (type === 'water') {
        let total = 0;
        for (let i = 0; i < 90; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            total += data[dateStr] || 0;
        }
        return total;
    }
    
    if (type === 'food') {
        return data
            .filter(item => new Date(item.date) >= quarterAgo)
            .reduce((sum, item) => sum + (item.calories || 0), 0);
    }
    
    return data
        .filter(item => new Date(item.date) >= quarterAgo)
        .reduce((sum, item) => sum + (item.value || 0), 0);
}

function getWeeklyAverage(type) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }
    
    const data = userActivityData[currentUser.email][type];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekData = data.filter(item => new Date(item.date) >= weekAgo);
    if (weekData.length === 0) return 0;
    
    const total = weekData.reduce((sum, item) => sum + (item.value || 0), 0);
    return total / weekData.length;
}

function getMonthlyAverage(type) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }
    
    const data = userActivityData[currentUser.email][type];
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const monthData = data.filter(item => new Date(item.date) >= monthAgo);
    if (monthData.length === 0) return 0;
    
    const total = monthData.reduce((sum, item) => sum + (item.value || 0), 0);
    return total / monthData.length;
}

function getQuarterlyAverage(type) {
    if (!userActivityData[currentUser.email] || !userActivityData[currentUser.email][type]) {
        return 0;
    }
    
    const data = userActivityData[currentUser.email][type];
    const quarterAgo = new Date();
    quarterAgo.setDate(quarterAgo.getDate() - 90);
    
    const quarterData = data.filter(item => new Date(item.date) >= quarterAgo);
    if (quarterData.length === 0) return 0;
    
    const total = quarterData.reduce((sum, item) => sum + (item.value || 0), 0);
    return total / quarterData.length;
}

function getLast7DaysEntries(data) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return data
        .filter(item => new Date(item.date) >= weekAgo)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10); // Show last 10 entries
}

function setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }
}

function showSuccessMessage(message) {
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Find current active content area and append
    const activeContent = document.querySelector('.content.active');
    if (activeContent) {
        activeContent.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ====================================
// INITIALIZATION
// ====================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded');
    
    // Initialize Google Auth
    initGoogleAuth();
    
    // Load saved data from localStorage (fallback)
    const savedUsers = localStorage.getItem('usersDatabase');
    if (savedUsers) {
        usersDatabase = JSON.parse(savedUsers);
    }
    
    const savedActivityData = localStorage.getItem('userActivityData');
    if (savedActivityData) {
        userActivityData = JSON.parse(savedActivityData);
    }
    
    // ✅ CHECK SUPABASE SESSION FIRST
    if (typeof SupabaseDB !== 'undefined') {
        console.log('🔐 Checking Supabase session...');
        
        const session = await SupabaseDB.getCurrentSession();
        
        if (session && session.user) {
            console.log('✅ Found existing Supabase session:', session.user.email);
            
            // Get profile from Supabase
            const profile = await SupabaseDB.getUserProfile(session.user.id);
            
            currentUser = {
                id: session.user.id,
                email: session.user.email,
                name: profile.data?.nama_lengkap || profile.data?.name || session.user.email,
                picture: profile.data?.picture,
                namaLengkap: profile.data?.nama_lengkap,
                jenisKelamin: profile.data?.jenis_kelamin,
                tempatLahir: profile.data?.tempat_lahir,
                tanggalLahir: profile.data?.tanggal_lahir,
                golonganDarah: profile.data?.golongan_darah,
                tinggiBadan: profile.data?.tinggi_badan,
                beratBadan: profile.data?.berat_badan,
                nomorWA: profile.data?.nomor_wa,
                goal: profile.data?.goal,
                beratBadanTarget: profile.data?.berat_badan_target,
                hasCompletedData: profile.data?.has_completed_data || false,
                isGoogleUser: profile.data?.is_google_user || false
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            if (currentUser.hasCompletedData) {
                goToDashboard();
            } else {
                if (currentUser.isGoogleUser) {
                    goToCompleteProfile();
                } else {
                    goToInputData();
                }
            }
            
            console.log('Initialization complete (Supabase session)');
            return;
        }
    }
    
    // Fallback: Check localStorage for existing user session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (currentUser.hasCompletedData) {
            goToDashboard();
        } else {
            // Check if Google user atau manual user
            if (currentUser.isGoogleUser) {
                console.log('📍 Google user belum lengkap data → redirect ke completeProfilePage');
                goToCompleteProfile();
            } else {
                console.log('📍 Manual user belum lengkap data → redirect ke inputDataPage (legacy)');
                goToInputData();
            }
        }
    }
    
    console.log('Initialization complete');
});

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// Handle window resize for charts
window.addEventListener('resize', function() {
    setTimeout(() => {
        if (dailySummaryChart) dailySummaryChart.resize();
        if (activityTrendChart) activityTrendChart.resize();
        if (calorieBalanceChart) calorieBalanceChart.resize();
        if (activityDistributionChart) activityDistributionChart.resize();
        if (weeklyComparisonChart) weeklyComparisonChart.resize();
    }, 100);
});

// ====================================
// MOBILE NAVIGATION FUNCTIONS
// ====================================
function toggleMobileMenu() {
    console.log('🍔 toggleMobileMenu() called');
    
    const fixedHamburger = document.getElementById('fixedHamburger');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-nav-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    
    console.log('Elements:', { 
        fixedHamburger: !!fixedHamburger,
        menuToggle: !!menuToggle, 
        mobileMenu: !!mobileMenu, 
        overlay: !!overlay 
    });
    
    if (!mobileMenu || !overlay) {
        console.error('❌ Mobile menu elements not found!');
        return;
    }
    
    // Toggle active class on hamburger buttons
    if (fixedHamburger) fixedHamburger.classList.toggle('active');
    if (menuToggle) menuToggle.classList.toggle('active');
    
    mobileMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    if (mobileMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
        updateMobileUserInfo();
        console.log('✅ Mobile menu OPENED');
    } else {
        document.body.style.overflow = '';
        console.log('✅ Mobile menu CLOSED');
    }
}

// Expose to window for onclick
window.toggleMobileMenu = toggleMobileMenu;

function closeMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-nav-menu');
    
    // Only close if menu is actually open
    if (!mobileMenu || !mobileMenu.classList.contains('active')) {
        return; // Menu not open, do nothing
    }
    
    console.log('🍔 closeMobileMenu() called - closing menu');
    
    const fixedHamburger = document.getElementById('fixedHamburger');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const overlay = document.querySelector('.mobile-menu-overlay');
    
    if (fixedHamburger) fixedHamburger.classList.remove('active');
    if (menuToggle) menuToggle.classList.remove('active');
    if (mobileMenu) mobileMenu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Expose to window for onclick
window.closeMobileMenu = closeMobileMenu;

function updateMobileUserInfo() {
    if (currentUser) {
        const mobileUserName = document.getElementById('mobileUserName');
        const mobileUserEmail = document.getElementById('mobileUserEmail');
        const mobileUserPhoto = document.getElementById('mobileUserPhoto');
        
        if (mobileUserName) {
            mobileUserName.textContent = currentUser.name || currentUser.namaLengkap || 'User';
        }
        if (mobileUserEmail) {
            mobileUserEmail.textContent = currentUser.email || '';
        }
        if (mobileUserPhoto && currentUser.picture) {
            mobileUserPhoto.src = currentUser.picture;
            mobileUserPhoto.style.display = 'block';
        }
    }
}

// Update mobile nav active state when switching pages
function updateMobileNavActive(page) {
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-menu .nav-link');
    mobileNavLinks.forEach(link => {
        link.classList.remove('active');
        if (link.textContent.toLowerCase().includes(page.toLowerCase())) {
            link.classList.add('active');
        }
    });
}

// Close mobile menu on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeMobileMenu();
    }
});

// Close mobile menu on window resize to desktop
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

// Initialize mobile menu event listeners after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🍔 Setting up mobile menu event listeners...');
    
    // Find hamburger button by ID first, then by class
    let hamburgerBtn = document.getElementById('hamburgerBtn');
    if (!hamburgerBtn) {
        hamburgerBtn = document.querySelector('.mobile-menu-toggle');
    }
    
    if (hamburgerBtn) {
        console.log('✅ Hamburger button found:', hamburgerBtn);
        console.log('✅ Event listeners added to hamburger button');
    } else {
        console.error('❌ Hamburger button NOT found!');
    }
});

// Use event delegation on document for hamburger menu
document.addEventListener('click', function(e) {
    // Check if clicked element is hamburger or inside hamburger
    const hamburger = e.target.closest('.mobile-menu-toggle, #hamburgerBtn');
    if (hamburger) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🍔 Hamburger CLICKED via delegation!');
        toggleMobileMenu();
        return;
    }
    
    // Check if clicked on overlay
    if (e.target.classList.contains('mobile-menu-overlay')) {
        e.preventDefault();
        closeMobileMenu();
        return;
    }
}, true); // Use capture phase

// Touch support for mobile
document.addEventListener('touchend', function(e) {
    const hamburger = e.target.closest('.mobile-menu-toggle, #hamburgerBtn');
    if (hamburger) {
        e.preventDefault();
        console.log('🍔 Hamburger TOUCHED via delegation!');
        toggleMobileMenu();
        return;
    }
}, { passive: false, capture: true });