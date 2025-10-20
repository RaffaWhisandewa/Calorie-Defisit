// ===== KONFIGURASI AI =====
// GANTI dengan API Key BARU dari https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 'AIzaSyDWDnINL-ZnEP1nSg9lOvNEfksLcBuycY8'; // ⚠️ GANTI INI!

// Update endpoint ke yang benar
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Simulasi database pengguna
let usersDatabase = [];
let currentUser = null;
const GOOGLE_CLIENT_ID = '137570212811-eqkc9tbr9h11u85l25q2fctom0r5lgtv.apps.googleusercontent.com';
let userActivityData = {};

// ===== FUNGSI AI HELPER (DIPERBAIKI) =====
async function callGeminiAI(prompt) {
    // Validasi API Key
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_NEW_API_KEY_HERE') {
        console.error('⚠️ API Key Gemini belum diisi!');
        return '⚠️ Maaf, fitur AI belum dikonfigurasi. Silakan hubungi administrator untuk mengatur API Key.';
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    topP: 0.8,
                    topK: 10
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', response.status, errorData);
            
            if (response.status === 404) {
                return '❌ Error: API endpoint tidak ditemukan. Pastikan menggunakan model yang benar (gemini-1.5-flash).';
            } else if (response.status === 403) {
                return '❌ Error: API Key tidak valid atau belum diaktifkan. Silakan periksa API Key Anda.';
            } else if (response.status === 429) {
                return '⚠️ Terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.';
            }
            
            throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            console.error('Invalid response structure:', data);
            return '❌ Respons AI tidak valid. Silakan coba lagi.';
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini AI:', error);
        return `❌ Maaf, terjadi kesalahan saat menghubungi AI: ${error.message}`;
    }
}

function showAILoading(elementId) {
    const element = document.getElementById(elementId);
    element.innerHTML = '<p>🤖 AI sedang menganalisis data Anda...</p><p style="opacity: 0.6;">⏳ Mohon tunggu sebentar</p>';
}

// Initialize Google Sign In
function initGoogleSignIn() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn
        });
        
        google.accounts.id.renderButton(
            document.getElementById('googleLoginBtn'),
            { 
                theme: 'outline', 
                size: 'large',
                width: 400,
                text: 'signin_with',
                locale: 'id'
            }
        );
        
        google.accounts.id.renderButton(
            document.getElementById('googleSignupBtn'),
            { 
                theme: 'outline', 
                size: 'large',
                width: 400,
                text: 'signup_with',
                locale: 'id'
            }
        );
    }
}

function handleGoogleSignIn(response) {
    try {
        const userInfo = parseJwt(response.credential);
        const existingUser = usersDatabase.find(u => u.email === userInfo.email);
        
        if (existingUser) {
            if (existingUser.hasCompleteData) {
                currentUser = existingUser;
                initializeUserData();
                goToDashboard();
            } else {
                currentUser = existingUser;
                document.getElementById('namaLengkap').value = existingUser.name || '';
                goToInputData();
            }
        } else {
            const newUser = {
                email: userInfo.email,
                name: userInfo.name || '',
                password: null,
                loginMethod: 'google',
                hasCompleteData: false,
                userData: null
            };
            usersDatabase.push(newUser);
            currentUser = newUser;
            document.getElementById('namaLengkap').value = userInfo.name || '';
            goToInputData();
        }
    } catch (error) {
        showError('loginError', 'Terjadi kesalahan saat login dengan Google');
    }
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function toggleForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    hideError('loginError');
    hideError('registerError');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showError('loginError', 'Email dan password harus diisi!');
        return;
    }
    
    const user = usersDatabase.find(u => u.email === email);
    
    if (!user) {
        showError('loginError', 'Akun tidak ditemukan! Silakan daftar terlebih dahulu.');
        return;
    }
    
    if (user.loginMethod !== 'google' && user.password !== password) {
        showError('loginError', 'Email atau password salah!');
        return;
    }
    
    currentUser = user;
    
    if (user.hasCompleteData) {
        initializeUserData();
        goToDashboard();
    } else {
        if (user.name) {
            document.getElementById('namaLengkap').value = user.name;
        }
        goToInputData();
    }
}

function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    if (!name || !email || !password || !passwordConfirm) {
        showError('registerError', 'Semua field harus diisi!');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('registerError', 'Format email tidak valid!');
        return;
    }
    
    if (password.length < 6) {
        showError('registerError', 'Password minimal 6 karakter!');
        return;
    }
    
    if (password !== passwordConfirm) {
        showError('registerError', 'Password tidak cocok!');
        return;
    }
    
    const existingUser = usersDatabase.find(u => u.email === email);
    if (existingUser) {
        showError('registerError', 'Email sudah terdaftar! Silakan login.');
        return;
    }
    
    const newUser = {
        email: email,
        name: name,
        password: password,
        loginMethod: 'email',
        hasCompleteData: false,
        userData: null
    };
    
    usersDatabase.push(newUser);
    currentUser = newUser;
    document.getElementById('namaLengkap').value = name;
    goToInputData();
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = '';
    errorElement.classList.remove('show');
}

function goToInputData() {
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('inputDataPage').classList.add('active');
}

function saveDataAndGoToDashboard() {
    const namaLengkap = document.getElementById('namaLengkap').value.trim();
    const tempatLahir = document.getElementById('tempatLahir').value.trim();
    const tanggalLahir = document.getElementById('tanggalLahir').value;
    const golonganDarah = document.getElementById('golonganDarah').value;
    const tinggiBadan = document.getElementById('tinggiBadan').value;
    const beratBadan = document.getElementById('beratBadan').value;
    const nomorWA = document.getElementById('nomorWA').value.trim();
    
    if (!namaLengkap || !tempatLahir || !tanggalLahir || !golonganDarah || 
        !tinggiBadan || !beratBadan || !nomorWA) {
        alert('Mohon lengkapi semua data!');
        return;
    }
    
    currentUser.userData = {
        namaLengkap: namaLengkap,
        tempatLahir: tempatLahir,
        tanggalLahir: tanggalLahir,
        golonganDarah: golonganDarah,
        tinggiBadan: tinggiBadan,
        beratBadan: beratBadan,
        nomorWA: nomorWA
    };
    
    currentUser.hasCompleteData = true;
    
    if (currentUser.name !== namaLengkap) {
        currentUser.name = namaLengkap;
    }
    
    const userIndex = usersDatabase.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = currentUser;
    }
    
    initializeUserData();
    goToDashboard();
}

function initializeUserData() {
    if (!userActivityData[currentUser.email]) {
        userActivityData[currentUser.email] = {
            steps: [],
            running: [],
            calorieOut: [],
            gym: [],
            sleep: [],
            food: []
        };
    }
    updateDashboardStats();
}

function goToDashboard() {
    document.getElementById('userEmailDisplay').textContent = currentUser.email;
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('inputDataPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
    updateDashboardStats();
}

function updateDashboardStats() {
    if (!currentUser || !userActivityData[currentUser.email]) return;
    
    const today = new Date().toDateString();
    const data = userActivityData[currentUser.email];
    
    const todaySteps = data.steps.filter(s => new Date(s.date).toDateString() === today)
        .reduce((sum, s) => sum + s.value, 0);
    document.getElementById('todaySteps').textContent = todaySteps;
    
    const todayDistance = data.running.filter(r => new Date(r.date).toDateString() === today)
        .reduce((sum, r) => sum + r.value, 0);
    document.getElementById('todayDistance').textContent = todayDistance.toFixed(1);
    
    const todayCalorieBurn = calculateCalorieBurn(todaySteps, todayDistance);
    document.getElementById('todayCalorieBurn').textContent = todayCalorieBurn;
    
    const thisMonth = new Date().getMonth();
    const gymSessions = data.gym.filter(g => new Date(g.date).getMonth() === thisMonth).length;
    document.getElementById('gymSessions').textContent = gymSessions;
    
    const lastSleep = data.sleep.length > 0 ? data.sleep[data.sleep.length - 1].value : 0;
    document.getElementById('lastSleep').textContent = lastSleep;
    
    const todayCalorieIn = data.food.filter(f => new Date(f.date).toDateString() === today)
        .reduce((sum, f) => sum + f.calories, 0);
    document.getElementById('todayCalorieIn').textContent = todayCalorieIn;
}

function calculateCalorieBurn(steps, distanceKm) {
    const stepsCalorie = steps * 0.04;
    const runningCalorie = distanceKm * 60;
    return Math.round(stepsCalorie + runningCalorie);
}

function toggleProfile() {
    const modal = document.getElementById('profileModal');
    
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    } else {
        updateProfileModal();
        modal.classList.add('active');
    }
}

function updateProfileModal() {
    if (!currentUser || !currentUser.userData) {
        return;
    }
    
    const userData = currentUser.userData;
    document.getElementById('displayEmail').textContent = currentUser.email;
    document.getElementById('displayNama').textContent = userData.namaLengkap;
    document.getElementById('displayTTL').textContent = userData.tempatLahir + ', ' + userData.tanggalLahir;
    document.getElementById('displayGolDar').textContent = userData.golonganDarah;
    document.getElementById('displayTinggi').textContent = userData.tinggiBadan + ' cm';
    document.getElementById('displayBerat').textContent = userData.beratBadan + ' kg';
    document.getElementById('displayWA').textContent = userData.nomorWA;
}

function logout() {
    if (!confirm('Apakah Anda yakin ingin keluar?')) {
        return;
    }
    
    currentUser = null;
    document.getElementById('namaLengkap').value = '';
    document.getElementById('tempatLahir').value = '';
    document.getElementById('tanggalLahir').value = '';
    document.getElementById('golonganDarah').value = '';
    document.getElementById('tinggiBadan').value = '';
    document.getElementById('beratBadan').value = '';
    document.getElementById('nomorWA').value = '';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPasswordConfirm').value = '';
    
    hideError('loginError');
    hideError('registerError');
    
    document.getElementById('profileModal').classList.remove('active');
    document.getElementById('dashboardPage').classList.remove('active');
    document.getElementById('inputDataPage').classList.remove('active');
    document.getElementById('landingPage').classList.add('active');
    
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// ===== FITUR 1: HITUNG LANGKAH KAKI (DENGAN AI) =====
function openStepsModal() {
    document.getElementById('stepsModal').classList.add('active');
    updateStepsDisplay();
}

function closeStepsModal() {
    document.getElementById('stepsModal').classList.remove('active');
}

function addSteps() {
    const input = document.getElementById('stepsInput');
    const steps = parseInt(input.value);
    
    if (!steps || steps <= 0) {
        alert('Masukkan jumlah langkah yang valid!');
        return;
    }
    
    const data = userActivityData[currentUser.email];
    data.steps.push({
        value: steps,
        date: new Date().toISOString()
    });
    
    input.value = '';
    updateStepsDisplay();
    updateDashboardStats();
    updateCalorieOutData();
}

async function updateStepsDisplay() {
    const data = userActivityData[currentUser.email];
    const today = new Date().toDateString();
    
    const totalToday = data.steps.filter(s => new Date(s.date).toDateString() === today)
        .reduce((sum, s) => sum + s.value, 0);
    document.getElementById('totalStepsToday').textContent = totalToday;
    
    const historyHtml = data.steps.slice().reverse().map(item => {
        const date = new Date(item.date);
        return `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-value">${item.value} langkah</div>
                    <div class="history-item-date">${formatDate(date)}</div>
                </div>
                <div class="history-item-badge">${Math.round(item.value * 0.04)} kal</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('stepsHistory').innerHTML = historyHtml || '<p style="text-align: center; color: #6b7280;">Belum ada data</p>';
    
    // AI Analysis untuk langkah kaki
    if (totalToday > 0) {
        showAILoading('stepsAIAnalysis');
        const weight = currentUser.userData ? parseInt(currentUser.userData.beratBadan) : 70;
        const height = currentUser.userData ? parseInt(currentUser.userData.tinggiBadan) : 170;
        
        const prompt = `Kamu adalah ahli kesehatan dan fitness. Analisis data langkah kaki berikut:
- Total langkah hari ini: ${totalToday} langkah
- Berat badan: ${weight} kg
- Tinggi badan: ${height} cm
- Kalori terbakar: ${Math.round(totalToday * 0.04)} kalori

Berikan analisis singkat dan saran dalam bahasa Indonesia (maksimal 150 kata) yang mencakup:
1. Apakah jumlah langkah sudah cukup (target WHO: 10.000 langkah/hari)
2. Manfaat kesehatan dari aktivitas ini
3. Saran untuk meningkatkan aktivitas jika kurang
Format dengan emoji dan paragraf yang mudah dibaca.`;

        const aiResponse = await callGeminiAI(prompt);
        document.getElementById('stepsAIAnalysis').innerHTML = aiResponse;
    }
}

// ===== FITUR 2: HITUNG LARI (DENGAN AI) =====
function openRunningModal() {
    document.getElementById('runningModal').classList.add('active');
    updateRunningDisplay();
}

function closeRunningModal() {
    document.getElementById('runningModal').classList.remove('active');
}

function addRunning() {
    const input = document.getElementById('runningInput');
    const distance = parseFloat(input.value);
    
    if (!distance || distance <= 0) {
        alert('Masukkan jarak yang valid!');
        return;
    }
    
    const data = userActivityData[currentUser.email];
    data.running.push({
        value: distance,
        date: new Date().toISOString()
    });
    
    input.value = '';
    updateRunningDisplay();
    updateDashboardStats();
    updateCalorieOutData();
}

async function updateRunningDisplay() {
    const data = userActivityData[currentUser.email];
    const today = new Date().toDateString();
    
    const totalToday = data.running.filter(r => new Date(r.date).toDateString() === today)
        .reduce((sum, r) => sum + r.value, 0);
    document.getElementById('totalDistanceToday').textContent = totalToday.toFixed(1);
    
    const historyHtml = data.running.slice().reverse().map(item => {
        const date = new Date(item.date);
        return `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-value">${item.value.toFixed(1)} km</div>
                    <div class="history-item-date">${formatDate(date)}</div>
                </div>
                <div class="history-item-badge">${Math.round(item.value * 60)} kal</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('runningHistory').innerHTML = historyHtml || '<p style="text-align: center; color: #6b7280;">Belum ada data</p>';
    
    // AI Analysis untuk lari
    if (totalToday > 0) {
        showAILoading('runningAIAnalysis');
        const weight = currentUser.userData ? parseInt(currentUser.userData.beratBadan) : 70;
        
        const prompt = `Kamu adalah pelatih lari profesional. Analisis data lari berikut:
- Total jarak hari ini: ${totalToday.toFixed(1)} km
- Berat badan: ${weight} kg
- Kalori terbakar: ${Math.round(totalToday * 60)} kalori

Berikan analisis singkat dalam bahasa Indonesia (maksimal 150 kata):
1. Evaluasi jarak tempuh (pemula: 3-5km, menengah: 5-10km, advanced: >10km)
2. Manfaat kardiovaskular dan pembakaran lemak
3. Saran pace dan recovery
4. Tips untuk meningkatkan performa
Format dengan emoji dan mudah dibaca.`;

        const aiResponse = await callGeminiAI(prompt);
        document.getElementById('runningAIAnalysis').innerHTML = aiResponse;
    }
}

// ===== FITUR 3: KALORI KELUAR (DENGAN AI) =====
function openCalorieOutModal() {
    document.getElementById('calorieOutModal').classList.add('active');
    updateCalorieOutData();
}

function closeCalorieOutModal() {
    document.getElementById('calorieOutModal').classList.remove('active');
}

async function updateCalorieOutData() {
    const data = userActivityData[currentUser.email];
    const today = new Date().toDateString();
    
    const todaySteps = data.steps.filter(s => new Date(s.date).toDateString() === today)
        .reduce((sum, s) => sum + s.value, 0);
    const todayDistance = data.running.filter(r => new Date(r.date).toDateString() === today)
        .reduce((sum, r) => sum + r.value, 0);
    
    const totalCalorieBurn = calculateCalorieBurn(todaySteps, todayDistance);
    document.getElementById('totalCalorieBurnToday').textContent = totalCalorieBurn;
    
    const calorieByDate = {};
    
    data.steps.forEach(s => {
        const date = new Date(s.date).toDateString();
        if (!calorieByDate[date]) calorieByDate[date] = 0;
        calorieByDate[date] += s.value * 0.04;
    });
    
    data.running.forEach(r => {
        const date = new Date(r.date).toDateString();
        if (!calorieByDate[date]) calorieByDate[date] = 0;
        calorieByDate[date] += r.value * 60;
    });
    
    const historyHtml = Object.entries(calorieByDate).reverse().map(([date, calories]) => {
        return `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-value">${Math.round(calories)} kalori</div>
                    <div class="history-item-date">${formatDate(new Date(date))}</div>
                </div>
                <div class="history-item-badge">🔥 Terbakar</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('calorieOutHistory').innerHTML = historyHtml || '<p style="text-align: center; color: #6b7280;">Belum ada data</p>';
    
    // AI Analysis untuk kalori keluar
    if (totalCalorieBurn > 0) {
        showAILoading('calorieOutAI');
        const weight = currentUser.userData ? parseInt(currentUser.userData.beratBadan) : 70;
        const age = currentUser.userData ? calculateAge(currentUser.userData.tanggalLahir) : 25;
        
        const prompt = `Kamu adalah nutritionist dan fitness expert. Analisis pembakaran kalori berikut:
- Total kalori terbakar hari ini: ${totalCalorieBurn} kalori
- Dari langkah kaki: ${todaySteps} langkah (~${Math.round(todaySteps * 0.04)} kal)
- Dari lari: ${todayDistance.toFixed(1)} km (~${Math.round(todayDistance * 60)} kal)
- Berat badan: ${weight} kg
- Usia: ${age} tahun
- BMR estimasi: ${Math.round(10 * weight + 6.25 * 170 - 5 * age + 5)} kalori

Berikan rekomendasi lengkap dalam bahasa Indonesia (maksimal 200 kata):
1. Apakah pembakaran kalori sudah optimal untuk deficit 500 kal/hari?
2. Perbandingan dengan kebutuhan kalori harian
3. Saran aktivitas tambahan jika kurang
4. Tips memaksimalkan pembakaran kalori
Format dengan emoji dan struktur jelas.`;

        const aiResponse = await callGeminiAI(prompt);
        document.getElementById('calorieOutAI').innerHTML = aiResponse;
    }
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

// ===== FITUR 4: GYM TRACKER (DENGAN AI) =====
function openGymModal() {
    document.getElementById('gymModal').classList.add('active');
    updateGymDisplay();
}

function closeGymModal() {
    document.getElementById('gymModal').classList.remove('active');
}

function addGym() {
    const input = document.getElementById('gymInput');
    const session = input.value.trim();
    
    if (!session) {
        alert('Masukkan detail sesi gym Anda!');
        return;
    }
    
    const data = userActivityData[currentUser.email];
    data.gym.push({
        session: session,
        date: new Date().toISOString()
    });
    
    input.value = '';
    updateGymDisplay();
    updateDashboardStats();
}

async function updateGymDisplay() {
    const data = userActivityData[currentUser.email];
    
    const historyHtml = data.gym.slice().reverse().map(item => {
        const date = new Date(item.date);
        return `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-value">${item.session}</div>
                    <div class="history-item-date">${formatDate(date)}</div>
                </div>
                <div class="history-item-badge">💪</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('gymHistory').innerHTML = historyHtml || '<p style="text-align: center; color: #6b7280;">Belum ada data</p>';
    
    // AI Recommendation untuk gym
    if (data.gym.length > 0) {
        showAILoading('gymAI');
        
        const totalSessions = data.gym.length;
        const thisWeek = data.gym.filter(g => {
            const diff = Date.now() - new Date(g.date).getTime();
            return diff < 7 * 24 * 60 * 60 * 1000;
        }).length;
        
        const recentSessions = data.gym.slice(-5).map(g => g.session).join(', ');
        const weight = currentUser.userData ? parseInt(currentUser.userData.beratBadan) : 70;
        
        const prompt = `Kamu adalah personal trainer profesional. Analisis aktivitas gym berikut:
- Total sesi gym: ${totalSessions} sesi
- Sesi minggu ini: ${thisWeek} sesi
- 5 sesi terakhir: ${recentSessions}
- Berat badan: ${weight} kg

Berikan rekomendasi program gym lengkap dalam bahasa Indonesia (maksimal 250 kata):
1. Evaluasi frekuensi latihan (ideal: 3-5x/minggu)
2. Analisis jenis latihan dari riwayat
3. Saran program split (Push/Pull/Legs atau Upper/Lower)
4. Rekomendasi exercise spesifik untuk setiap hari
5. Tips progressive overload dan recovery
Format dengan emoji, bullet points, dan mudah dipraktikkan.`;

        const aiResponse = await callGeminiAI(prompt);
        document.getElementById('gymAI').innerHTML = aiResponse;
    }
}

// ===== FITUR 5: HITUNG TIDUR (DENGAN AI) =====
function openSleepModal() {
    document.getElementById('sleepModal').classList.add('active');
    updateSleepDisplay();
}

function closeSleepModal() {
    document.getElementById('sleepModal').classList.remove('active');
}

function addSleep() {
    const input = document.getElementById('sleepInput');
    const hours = parseFloat(input.value);
    
    if (!hours || hours <= 0 || hours > 24) {
        alert('Masukkan durasi tidur yang valid (0-24 jam)!');
        return;
    }
    
    const data = userActivityData[currentUser.email];
    data.sleep.push({
        value: hours,
        date: new Date().toISOString()
    });
    
    input.value = '';
    updateSleepDisplay();
    updateDashboardStats();
}

async function updateSleepDisplay() {
    const data = userActivityData[currentUser.email];
    
    const historyHtml = data.sleep.slice().reverse().map(item => {
        const date = new Date(item.date);
        const quality = item.value < 6 ? '😴 Kurang' : item.value <= 8 ? '😊 Baik' : '😪 Berlebih';
        return `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-value">${item.value} jam</div>
                    <div class="history-item-date">${formatDate(date)}</div>
                </div>
                <div class="history-item-badge">${quality}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('sleepHistory').innerHTML = historyHtml || '<p style="text-align: center; color: #6b7280;">Belum ada data</p>';
    
    // AI Analysis untuk tidur
    if (data.sleep.length > 0) {
        showAILoading('sleepAI');
        
        const lastSleep = data.sleep[data.sleep.length - 1].value;
        const avgSleep = data.sleep.reduce((sum, s) => sum + s.value, 0) / data.sleep.length;
        const last7Days = data.sleep.slice(-7).map(s => s.value);
        const age = currentUser.userData ? calculateAge(currentUser.userData.tanggalLahir) : 25;
        
        const prompt = `Kamu adalah sleep specialist dan ahli kesehatan. Analisis pola tidur berikut:
- Tidur semalam: ${lastSleep} jam
- Rata-rata tidur: ${avgSleep.toFixed(1)} jam
- Data 7 hari terakhir: ${last7Days.join(', ')} jam
- Usia: ${age} tahun
- Rekomendasi tidur untuk usia ini: ${age < 18 ? '8-10 jam' : age < 65 ? '7-9 jam' : '7-8 jam'}

Berikan analisis komprehensif dalam bahasa Indonesia (maksimal 250 kata):
1. Evaluasi kualitas tidur (kurang/optimal/berlebih)
2. Dampak kesehatan dari pola tidur ini
3. Hubungan tidur dengan metabolisme dan recovery
4. Saran untuk meningkatkan kualitas tidur:
   - Sleep hygiene
   - Jadwal tidur konsisten
   - Aktivitas sebelum tidur
   - Lingkungan tidur ideal
5. Warning jika ada pola tidak sehat
Format dengan emoji dan tips praktis.`;

        const aiResponse = await callGeminiAI(prompt);
        document.getElementById('sleepAI').innerHTML = aiResponse;
    }
}

// ===== FITUR 6: HITUNG MAKAN (DENGAN AI) =====
function openFoodModal() {
    document.getElementById('foodModal').classList.add('active');
    updateFoodDisplay();
}

function closeFoodModal() {
    document.getElementById('foodModal').classList.remove('active');
}

function addFood() {
    const name = document.getElementById('foodNameInput').value.trim();
    const calories = parseInt(document.getElementById('foodCalorieInput').value) || 0;
    const carbs = parseInt(document.getElementById('foodCarbInput').value) || 0;
    const protein = parseInt(document.getElementById('foodProteinInput').value) || 0;
    const fat = parseInt(document.getElementById('foodFatInput').value) || 0;
    
    if (!name || calories <= 0) {
        alert('Masukkan nama makanan dan kalori yang valid!');
        return;
    }
    
    const data = userActivityData[currentUser.email];
    data.food.push({
        name: name,
        calories: calories,
        carbs: carbs,
        protein: protein,
        fat: fat,
        date: new Date().toISOString()
    });
    
    document.getElementById('foodNameInput').value = '';
    document.getElementById('foodCalorieInput').value = '';
    document.getElementById('foodCarbInput').value = '';
    document.getElementById('foodProteinInput').value = '';
    document.getElementById('foodFatInput').value = '';
    
    updateFoodDisplay();
    updateDashboardStats();
}

async function updateFoodDisplay() {
    const data = userActivityData[currentUser.email];
    const today = new Date().toDateString();
    
    const todayFood = data.food.filter(f => new Date(f.date).toDateString() === today);
    const totalCalories = todayFood.reduce((sum, f) => sum + f.calories, 0);
    const totalCarbs = todayFood.reduce((sum, f) => sum + f.carbs, 0);
    const totalProtein = todayFood.reduce((sum, f) => sum + f.protein, 0);
    const totalFat = todayFood.reduce((sum, f) => sum + f.fat, 0);
    
    document.getElementById('totalCalorieIn').textContent = totalCalories;
    document.getElementById('totalCarbs').textContent = totalCarbs;
    document.getElementById('totalProtein').textContent = totalProtein;
    document.getElementById('totalFat').textContent = totalFat;
    
    const historyHtml = todayFood.slice().reverse().map(item => {
        const date = new Date(item.date);
        return `
            <div class="history-item">
                <div class="history-item-info">
                    <div class="history-item-value">${item.name}</div>
                    <div class="history-item-date">${formatTime(date)} - ${item.calories} kal</div>
                </div>
                <div class="history-item-badge">🍽️</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('foodHistory').innerHTML = historyHtml || '<p style="text-align: center; color: #6b7280;">Belum ada makanan yang dicatat hari ini</p>';
    
    // AI Analysis untuk nutrisi
    if (totalCalories > 0) {
        showAILoading('foodAI');
        
        const weight = currentUser.userData ? parseInt(currentUser.userData.beratBadan) : 70;
        const height = currentUser.userData ? parseInt(currentUser.userData.tinggiBadan) : 170;
        const age = currentUser.userData ? calculateAge(currentUser.userData.tanggalLahir) : 25;
        
        // Calculate BMR and TDEE
        const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
        const tdee = Math.round(bmr * 1.55);
        
        // Get calorie burn data
        const todaySteps = data.steps.filter(s => new Date(s.date).toDateString() === today)
            .reduce((sum, s) => sum + s.value, 0);
        const todayDistance = data.running.filter(r => new Date(r.date).toDateString() === today)
            .reduce((sum, r) => sum + r.value, 0);
        const caloriesBurned = calculateCalorieBurn(todaySteps, todayDistance);
        
        const foodList = todayFood.map(f => `${f.name} (${f.calories} kal)`).join(', ');
        
        const prompt = `Kamu adalah ahli gizi dan nutritionist profesional. Analisis asupan nutrisi hari ini:

DATA NUTRISI:
- Total kalori masuk: ${totalCalories} kalori
- Karbohidrat: ${totalCarbs}g
- Protein: ${totalProtein}g  
- Lemak: ${totalFat}g
- Makanan yang dikonsumsi: ${foodList}

DATA PENGGUNA:
- Berat: ${weight} kg
- Tinggi: ${height} cm
- Usia: ${age} tahun
- BMR (metabolisme basal): ${bmr} kalori
- TDEE (kebutuhan harian): ${tdee} kalori
- Kalori terbakar dari aktivitas: ${caloriesBurned} kalori
- Net kalori: ${totalCalories - caloriesBurned} kalori

TARGET NUTRISI IDEAL:
- Protein: ${Math.round(weight * 1.6)}g (1.6g/kg untuk aktif)
- Karbohidrat: ${Math.round(weight * 3)}g (3g/kg)
- Lemak: ${Math.round(weight * 1)}g (1g/kg)
- Kalori untuk deficit 500 kal: ${tdee - 500} kalori

Berikan analisis mendalam dalam bahasa Indonesia (maksimal 300 kata):

1. EVALUASI KALORI:
   - Apakah dalam deficit/surplus/maintenance?
   - Rekomendasi penyesuaian porsi

2. ANALISIS MAKRONUTRIEN:
   - Status protein (cukup/kurang untuk recovery otot?)
   - Status karbohidrat (cukup energi?)
   - Status lemak sehat (omega-3, omega-6)
   
3. MIKRONUTRIEN & VITAMIN:
   - Apakah makanan bervariasi?
   - Saran sumber vitamin A, C, D, B12
   - Mineral: zat besi, kalsium, magnesium

4. SARAN AKTIVITAS:
   - Jika kalori tinggi: aktivitas tambahan yang diperlukan
   - Jika kalori rendah: saran penambahan makanan sehat
   - Timing makan yang optimal

5. REKOMENDASI MAKANAN:
   - Makanan yang harus ditambah
   - Makanan yang harus dikurangi
   - Menu sehat untuk esok hari
   - Snack sehat

6. HIDRASI & SERAT:
   - Target air: 2-3 liter/hari
   - Target serat: 25-30g/hari

Format dengan emoji, bullet points, dan sangat praktis untuk diterapkan.`;

        const aiResponse = await callGeminiAI(prompt);
        document.getElementById('foodAI').innerHTML = aiResponse;
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('id-ID', options);
}

function formatTime(date) {
    const options = { 
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleTimeString('id-ID', options);
}

// Initialize saat halaman dimuat
window.onload = function() {
    // Initialize Google Sign In
    initGoogleSignIn();
    
    // User dummy untuk testing
    usersDatabase.push({
        email: 'test@example.com',
        name: 'User Test',
        password: '123456',
        loginMethod: 'email',
        hasCompleteData: true,
        userData: {
            namaLengkap: 'User Test',
            tempatLahir: 'Jakarta',
            tanggalLahir: '1990-01-01',
            golonganDarah: 'A',
            tinggiBadan: '170',
            beratBadan: '70',
            nomorWA: '081234567890'
        }
    });
    
    // Initialize test user activity data
    userActivityData['test@example.com'] = {
        steps: [
            { value: 5000, date: new Date().toISOString() },
            { value: 3000, date: new Date(Date.now() - 86400000).toISOString() }
        ],
        running: [
            { value: 5.5, date: new Date().toISOString() }
        ],
        calorieOut: [],
        gym: [
            { session: 'Chest Day - 1 jam', date: new Date().toISOString() }
        ],
        sleep: [
            { value: 7.5, date: new Date().toISOString() }
        ],
        food: [
            { name: 'Nasi Goreng', calories: 450, carbs: 60, protein: 15, fat: 18, date: new Date().toISOString() },
            { name: 'Ayam Bakar', calories: 300, carbs: 5, protein: 35, fat: 15, date: new Date().toISOString() }
        ]
    };
}
