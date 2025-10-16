// Simulasi database pengguna (dalam aplikasi nyata ini harus di backend/database)
let usersDatabase = [];

// Current logged in user
let currentUser = null;

// Google Client ID - GANTI DENGAN CLIENT ID ANDA
const GOOGLE_CLIENT_ID = '137570212811-eqkc9tbr9h11u85l25q2fctom0r5lgtv.apps.googleusercontent.com';

// Initialize Google Sign In
function initGoogleSignIn() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn
        });
        
        // Render button untuk login
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
        
        // Render button untuk signup
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

// Handle Google Sign In Response
function handleGoogleSignIn(response) {
    try {
        // Decode JWT token untuk mendapatkan user info
        const userInfo = parseJwt(response.credential);
        
        // Cek apakah user sudah terdaftar
        const existingUser = usersDatabase.find(u => u.email === userInfo.email);
        
        if (existingUser) {
            // User sudah ada dan punya data lengkap
            if (existingUser.hasCompleteData) {
                currentUser = existingUser;
                goToDashboard();
            } else {
                // User ada tapi belum lengkap data
                currentUser = existingUser;
                document.getElementById('namaLengkap').value = existingUser.name || '';
                goToInputData();
            }
        } else {
            // User baru - buat akun dan minta lengkapi data
            const newUser = {
                email: userInfo.email,
                name: userInfo.name || '',
                password: null, // Google auth tidak pakai password
                loginMethod: 'google',
                hasCompleteData: false,
                userData: null
            };
            usersDatabase.push(newUser);
            currentUser = newUser;
            
            // Pre-fill nama jika ada
            document.getElementById('namaLengkap').value = userInfo.name || '';
            goToInputData();
        }
    } catch (error) {
        showError('loginError', 'Terjadi kesalahan saat login dengan Google');
    }
}

// Parse JWT Token
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Toggle antara form Login dan Register
function toggleForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // Clear error messages
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

// Handle Login dengan Email & Password
function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Validasi input
    if (!email || !password) {
        showError('loginError', 'Email dan password harus diisi!');
        return;
    }
    
    // Cek apakah user ada di database
    const user = usersDatabase.find(u => u.email === email);
    
    if (!user) {
        showError('loginError', 'Akun tidak ditemukan! Silakan daftar terlebih dahulu.');
        return;
    }
    
    // Cek password (untuk user yang daftar manual, bukan Google)
    if (user.loginMethod !== 'google' && user.password !== password) {
        showError('loginError', 'Email atau password salah!');
        return;
    }
    
    // Login berhasil
    currentUser = user;
    
    // Cek apakah user sudah lengkap data
    if (user.hasCompleteData) {
        goToDashboard();
    } else {
        // Pre-fill nama jika ada
        if (user.name) {
            document.getElementById('namaLengkap').value = user.name;
        }
        goToInputData();
    }
}

// Handle Register dengan Email & Password
function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    
    // Validasi input
    if (!name || !email || !password || !passwordConfirm) {
        showError('registerError', 'Semua field harus diisi!');
        return;
    }
    
    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('registerError', 'Format email tidak valid!');
        return;
    }
    
    // Validasi password minimal 6 karakter
    if (password.length < 6) {
        showError('registerError', 'Password minimal 6 karakter!');
        return;
    }
    
    // Validasi password match
    if (password !== passwordConfirm) {
        showError('registerError', 'Password tidak cocok!');
        return;
    }
    
    // Cek apakah email sudah terdaftar
    const existingUser = usersDatabase.find(u => u.email === email);
    if (existingUser) {
        showError('registerError', 'Email sudah terdaftar! Silakan login.');
        return;
    }
    
    // Daftar user baru
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
    
    // Pre-fill nama di form input data
    document.getElementById('namaLengkap').value = name;
    
    // Langsung ke halaman input data
    goToInputData();
}

// Show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

// Hide error message
function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = '';
    errorElement.classList.remove('show');
}

// Navigasi ke halaman Input Data
function goToInputData() {
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('inputDataPage').classList.add('active');
}

// Simpan data dan navigasi ke Dashboard
function saveDataAndGoToDashboard() {
    // Ambil data dari form
    const namaLengkap = document.getElementById('namaLengkap').value.trim();
    const tempatLahir = document.getElementById('tempatLahir').value.trim();
    const tanggalLahir = document.getElementById('tanggalLahir').value;
    const golonganDarah = document.getElementById('golonganDarah').value;
    const tinggiBadan = document.getElementById('tinggiBadan').value;
    const beratBadan = document.getElementById('beratBadan').value;
    const nomorWA = document.getElementById('nomorWA').value.trim();
    
    // Validasi: pastikan semua field terisi
    if (!namaLengkap || !tempatLahir || !tanggalLahir || !golonganDarah || 
        !tinggiBadan || !beratBadan || !nomorWA) {
        alert('Mohon lengkapi semua data!');
        return;
    }
    
    // Simpan data ke current user
    currentUser.userData = {
        namaLengkap: namaLengkap,
        tempatLahir: tempatLahir,
        tanggalLahir: tanggalLahir,
        golonganDarah: golonganDarah,
        tinggiBadan: tinggiBadan,
        beratBadan: beratBadan,
        nomorWA: nomorWA
    };
    
    // Update status data lengkap
    currentUser.hasCompleteData = true;
    
    // Update name jika berbeda
    if (currentUser.name !== namaLengkap) {
        currentUser.name = namaLengkap;
    }
    
    // Update user di database
    const userIndex = usersDatabase.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        usersDatabase[userIndex] = currentUser;
    }
    
    // Navigasi ke Dashboard
    goToDashboard();
}

// Navigasi ke Dashboard
function goToDashboard() {
    // Update email di navbar
    document.getElementById('userEmailDisplay').textContent = currentUser.email;
    
    // Pindah ke dashboard
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('inputDataPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
}

// Toggle Profile Modal
function toggleProfile() {
    const modal = document.getElementById('profileModal');
    
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    } else {
        // Update data di modal sebelum menampilkan
        updateProfileModal();
        modal.classList.add('active');
    }
}

// Update data di Profile Modal
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

// Logout - Kembali ke Landing Page
function logout() {
    // Konfirmasi logout
    if (!confirm('Apakah Anda yakin ingin keluar?')) {
        return;
    }
    
    // Reset current user
    currentUser = null;
    
    // Reset form input data
    document.getElementById('namaLengkap').value = '';
    document.getElementById('tempatLahir').value = '';
    document.getElementById('tanggalLahir').value = '';
    document.getElementById('golonganDarah').value = '';
    document.getElementById('tinggiBadan').value = '';
    document.getElementById('beratBadan').value = '';
    document.getElementById('nomorWA').value = '';
    
    // Reset form login
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    // Reset form register
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regPasswordConfirm').value = '';
    
    // Hide errors
    hideError('loginError');
    hideError('registerError');
    
    // Tutup modal jika terbuka
    document.getElementById('profileModal').classList.remove('active');
    
    // Kembali ke Landing Page
    document.getElementById('dashboardPage').classList.remove('active');
    document.getElementById('inputDataPage').classList.remove('active');
    document.getElementById('landingPage').classList.add('active');
    
    // Pastikan form login yang muncul
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

// Close modal ketika klik di luar modal
window.onclick = function(event) {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
        modal.classList.remove('active');
    }
}

// Initialize saat halaman dimuat
window.onload = function() {
    // Initialize Google Sign In
    initGoogleSignIn();
    
    // Untuk testing: tambahkan beberapa user dummy
    // Hapus ini di production
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
}