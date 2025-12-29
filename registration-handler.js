/* ========================================
   COMPLETE REGISTRATION HANDLER
   ======================================== */

// ====================================
// SUPABASE USER SAVE FUNCTION
// ====================================

// ⭐ Helper untuk mendapatkan Supabase client yang benar
function getSupabaseClientForReg() {
    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
        return window.supabaseClient;
    }
    if (typeof SupabaseDB !== 'undefined' && SupabaseDB.client) {
        return SupabaseDB.client;
    }
    if (typeof SupabaseDB !== 'undefined' && typeof SupabaseDB.getClient === 'function') {
        return SupabaseDB.getClient();
    }
    // Fallback: create new client
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        const SUPABASE_URL = 'https://ypyxrfsvxubnngghroqc.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweXhyZnN2eHVibm5nZ2hyb3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODQ3NzIsImV4cCI6MjA3NzM2MDc3Mn0.iyDb8saqfbooAU7teO5M97na00ESe7EWt0nkbs1tYmk';
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseClient = client;
        console.log('✅ Created new Supabase client in registration');
        return client;
    }
    return null;
}

/**
 * Simpan user ke Supabase users table
 * @param {object} userData - Data user lengkap
 * @returns {object} { success: boolean, error?: string }
 */
async function saveUserToSupabase(userData) {
    try {
        // Check if Supabase is available
        const sbClient = getSupabaseClientForReg();
        if (!sbClient) {
            console.log('⚠️ Supabase not available, skipping cloud save');
            return { success: false, error: 'Supabase not available' };
        }

        console.log('💾 Saving user to Supabase:', userData.email);

        // Prepare data sesuai struktur tabel users di Supabase
        const userToSave = {
            id: userData.id || ('user-' + Date.now()),
            email: userData.email,
            password_hash: userData.password || null, // Untuk user non-Google
            name: userData.name || userData.namaLengkap,
            google_id: userData.googleId || null,
            picture: userData.picture || null,
            is_google_user: userData.isGoogleUser || false,
            nama_lengkap: userData.namaLengkap || null,
            tempat_lahir: userData.tempatLahir || null,
            tanggal_lahir: userData.tanggalLahir || null,
            golongan_darah: userData.golonganDarah || null,
            tinggi_badan: userData.tinggiBadan ? parseInt(userData.tinggiBadan) : null,
            berat_badan: userData.beratBadan ? parseFloat(userData.beratBadan) : null,
            nomor_wa: userData.nomorWA || null,
            has_completed_data: userData.hasCompletedData || false,
            goal: userData.goal || null,
            berat_badan_target: userData.beratBadanTarget ? parseFloat(userData.beratBadanTarget) : null,
            jenis_kelamin: userData.jenisKelamin || null
        };

        // Check if user already exists
        const { data: existingUser, error: selectError } = await sbClient
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();

        if (existingUser && !selectError) {
            // Update existing user
            const { error: updateError } = await sbClient
                .from('users')
                .update(userToSave)
                .eq('email', userData.email);

            if (updateError) {
                console.error('❌ Supabase update error:', updateError);
                return { success: false, error: updateError.message };
            }

            console.log('✅ User updated in Supabase');
            return { success: true, action: 'updated' };
        } else {
            // Insert new user
            userToSave.created_at = new Date().toISOString();
            
            const { error: insertError } = await sbClient
                .from('users')
                .insert(userToSave);

            if (insertError) {
                console.error('❌ Supabase insert error:', insertError);
                return { success: false, error: insertError.message };
            }

            console.log('✅ User saved to Supabase');
            return { success: true, action: 'inserted' };
        }

    } catch (err) {
        console.error('❌ Error saving user to Supabase:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Load user dari Supabase berdasarkan email
 * @param {string} email - Email user
 * @returns {object|null} User data atau null
 */
async function loadUserFromSupabase(email) {
    try {
        if (typeof supabase === 'undefined' || !supabase) {
            return null;
        }

        console.log('📥 Loading user from Supabase:', email);

        const { data, error } = await sbClient
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // User not found
                console.log('📭 User not found in Supabase');
                return null;
            }
            console.error('❌ Supabase load error:', error);
            return null;
        }

        // Convert dari snake_case ke camelCase
        const userData = {
            id: data.id,
            email: data.email,
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
            jenisKelamin: data.jenis_kelamin,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        console.log('✅ User loaded from Supabase');
        return userData;

    } catch (err) {
        console.error('❌ Error loading user from Supabase:', err);
        return null;
    }
}

// ====================================
// KALKULASI BMR & TDEE
// ====================================

/**
 * Hitung BMR menggunakan Harris-Benedict Formula
 * @param {string} jenisKelamin - "laki-laki" atau "perempuan"
 * @param {number} beratBadan - dalam kg
 * @param {number} tinggiBadan - dalam cm
 * @param {number} umur - dalam tahun
 * @returns {number} BMR dalam kalori
 */
function hitungBMR(jenisKelamin, beratBadan, tinggiBadan, umur) {
    let bmr;
    
    if (jenisKelamin === 'laki-laki') {
        // Pria: BMR = 88.362 + (13.397 × BB) + (4.799 × TB) - (5.677 × Umur)
        bmr = 88.362 + (13.397 * beratBadan) + (4.799 * tinggiBadan) - (5.677 * umur);
    } else {
        // Wanita: BMR = 447.593 + (9.247 × BB) + (3.098 × TB) - (4.330 × Umur)
        bmr = 447.593 + (9.247 * beratBadan) + (3.098 * tinggiBadan) - (4.330 * umur);
    }
    
    return Math.round(bmr);
}

/**
 * Hitung TDEE (Total Daily Energy Expenditure)
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Level aktivitas (default: "light")
 * @returns {number} TDEE dalam kalori
 */
function hitungTDEE(bmr, activityLevel = 'light') {
    const activityMultipliers = {
        sedentary: 1.2,    // Tidak olahraga
        light: 1.375,      // Olahraga ringan 1-3x/minggu
        moderate: 1.55,    // Olahraga sedang 3-5x/minggu
        active: 1.725,     // Olahraga berat 6-7x/minggu
        veryActive: 1.9    // Atlet / pekerjaan fisik berat
    };
    
    const multiplier = activityMultipliers[activityLevel] || activityMultipliers.light;
    return Math.round(bmr * multiplier);
}

/**
 * Hitung target kalori harian berdasarkan goal
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goal - "turun", "naik", atau "maintain"
 * @param {string} jenisKelamin - "laki-laki" atau "perempuan"
 * @returns {object} { targetKalori, defisitSurplus }
 */
function hitungTargetKalori(tdee, goal, jenisKelamin) {
    let targetKalori;
    let defisitSurplus = 0;
    
    if (goal === 'turun') {
        // Defisit 500-1000 kalori untuk turun 0.5-1 kg/minggu
        defisitSurplus = -500; // Default 500 kalori defisit
        targetKalori = tdee + defisitSurplus;
        
        // Validasi minimal kalori
        const minKalori = jenisKelamin === 'laki-laki' ? 1500 : 1100;
        if (targetKalori < minKalori) {
            targetKalori = minKalori;
            defisitSurplus = targetKalori - tdee;
        }
        
    } else if (goal === 'naik') {
        // Surplus 300-500 kalori untuk naik bertahap
        defisitSurplus = 400; // Default 400 kalori surplus
        targetKalori = tdee + defisitSurplus;
        
    } else { // maintain
        targetKalori = tdee;
        defisitSurplus = 0;
    }
    
    return {
        targetKalori: Math.round(targetKalori),
        defisitSurplus: Math.round(defisitSurplus)
    };
}

/**
 * Hitung umur dari tanggal lahir
 * @param {string} tanggalLahir - Format YYYY-MM-DD
 * @returns {number} Umur dalam tahun
 */
function hitungUmur(tanggalLahir) {
    const today = new Date();
    const birthDate = new Date(tanggalLahir);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Estimasi waktu mencapai target (dalam minggu)
 * @param {number} beratAwal - BB awal
 * @param {number} beratTarget - BB target
 * @param {string} goal - "turun" atau "naik"
 * @returns {object} { minggu, bulan }
 */
function estimasiWaktu(beratAwal, beratTarget, goal) {
    const selisih = Math.abs(beratTarget - beratAwal);
    
    // Asumsi: turun/naik 0.5 kg per minggu (aman)
    const mingguPerKg = 2; // 2 minggu untuk 1 kg
    const totalMinggu = Math.ceil(selisih * mingguPerKg);
    const totalBulan = Math.ceil(totalMinggu / 4);
    
    return {
        minggu: totalMinggu,
        bulan: totalBulan
    };
}

// ====================================
// FORM VALIDATION & PREVIEW
// ====================================

/**
 * Update Goal Info - Manual Registration
 */
function updateGoalInfo() {
    const goal = document.querySelector('input[name="goal"]:checked')?.value;
    const targetWeightGroup = document.getElementById('targetWeightGroup');
    const goalPreview = document.getElementById('goalPreview');
    
    if (!goal) return;
    
    // Show/hide target weight input
    if (goal === 'maintain') {
        targetWeightGroup.style.display = 'none';
        document.getElementById('regBeratBadanTarget').required = false;
    } else {
        targetWeightGroup.style.display = 'block';
        document.getElementById('regBeratBadanTarget').required = true;
    }
    
    // Update preview jika semua data sudah diisi
    updatePreview();
}

/**
 * Update Google Goal Info - Google Registration
 */
function updateGoogleGoalInfo() {
    const goal = document.querySelector('input[name="googleGoal"]:checked')?.value;
    const targetWeightGroup = document.getElementById('googleTargetWeightGroup');
    
    if (!goal) return;
    
    if (goal === 'maintain') {
        targetWeightGroup.style.display = 'none';
        document.getElementById('googleBeratBadanTarget').required = false;
    } else {
        targetWeightGroup.style.display = 'block';
        document.getElementById('googleBeratBadanTarget').required = true;
    }
    
    // Update preview
    updateGooglePreview();
}

/**
 * Update Google Preview - Real-time calculation untuk Google user
 */
function updateGooglePreview() {
    const jenisKelamin = document.querySelector('input[name="googleJenisKelamin"]:checked')?.value;
    const tanggalLahir = document.getElementById('googleTanggalLahir').value;
    const tinggiBadan = parseFloat(document.getElementById('googleTinggiBadan').value);
    const beratBadanAwal = parseFloat(document.getElementById('googleBeratBadanAwal').value);
    const beratBadanTarget = parseFloat(document.getElementById('googleBeratBadanTarget').value);
    const goal = document.querySelector('input[name="googleGoal"]:checked')?.value;
    
    const goalPreview = document.getElementById('googleGoalPreview');
    
    // Cek apakah semua data penting sudah diisi
    if (!jenisKelamin || !tanggalLahir || !tinggiBadan || !beratBadanAwal || !goal) {
        goalPreview.style.display = 'none';
        return;
    }
    
    // Jika maintain, set target = awal
    const targetBB = goal === 'maintain' ? beratBadanAwal : beratBadanTarget;
    
    if (!targetBB && goal !== 'maintain') {
        goalPreview.style.display = 'none';
        return;
    }
    
    // Hitung kalori
    const umur = hitungUmur(tanggalLahir);
    const bmr = hitungBMR(jenisKelamin, beratBadanAwal, tinggiBadan, umur);
    const tdee = hitungTDEE(bmr, 'light');
    const { targetKalori, defisitSurplus } = hitungTargetKalori(tdee, goal, jenisKelamin);
    
    // Update preview
    document.getElementById('googlePreviewBBAwal').textContent = `${beratBadanAwal} kg`;
    document.getElementById('googlePreviewBBTarget').textContent = `${targetBB} kg`;
    
    const selisih = targetBB - beratBadanAwal;
    const selisihText = selisih > 0 ? `+${selisih.toFixed(1)} kg` : `${selisih.toFixed(1)} kg`;
    document.getElementById('googlePreviewSelisih').textContent = selisihText;
    
    document.getElementById('googlePreviewKalori').textContent = `${targetKalori} kalori/hari`;
    
    // Update note
    let noteText = '';
    if (goal === 'turun') {
        noteText = `Defisit ${Math.abs(defisitSurplus)} kalori/hari untuk turun berat badan`;
    } else if (goal === 'naik') {
        noteText = `Surplus ${defisitSurplus} kalori/hari untuk nambah berat badan`;
    } else {
        noteText = 'Pertahankan kalori harian untuk maintain berat badan';
    }
    document.getElementById('googlePreviewNote').textContent = noteText;
    
    goalPreview.style.display = 'block';
}

/**
 * Update Preview Kalori - Real-time calculation
 */
function updatePreview() {
    const jenisKelamin = document.querySelector('input[name="jenisKelamin"]:checked')?.value;
    const tanggalLahir = document.getElementById('regTanggalLahir').value;
    const tinggiBadan = parseFloat(document.getElementById('regTinggiBadan').value);
    const beratBadanAwal = parseFloat(document.getElementById('regBeratBadanAwal').value);
    const beratBadanTarget = parseFloat(document.getElementById('regBeratBadanTarget').value);
    const goal = document.querySelector('input[name="goal"]:checked')?.value;
    
    const goalPreview = document.getElementById('goalPreview');
    
    // Cek apakah semua data penting sudah diisi
    if (!jenisKelamin || !tanggalLahir || !tinggiBadan || !beratBadanAwal || !goal) {
        goalPreview.style.display = 'none';
        return;
    }
    
    // Jika maintain, set target = awal
    const targetBB = goal === 'maintain' ? beratBadanAwal : beratBadanTarget;
    
    if (!targetBB && goal !== 'maintain') {
        goalPreview.style.display = 'none';
        return;
    }
    
    // Hitung kalori
    const umur = hitungUmur(tanggalLahir);
    const bmr = hitungBMR(jenisKelamin, beratBadanAwal, tinggiBadan, umur);
    const tdee = hitungTDEE(bmr, 'light'); // Default: light activity
    const { targetKalori, defisitSurplus } = hitungTargetKalori(tdee, goal, jenisKelamin);
    
    // Update preview
    document.getElementById('previewBBAwal').textContent = `${beratBadanAwal} kg`;
    document.getElementById('previewBBTarget').textContent = `${targetBB} kg`;
    
    const selisih = targetBB - beratBadanAwal;
    const selisihText = selisih > 0 ? `+${selisih.toFixed(1)} kg` : `${selisih.toFixed(1)} kg`;
    document.getElementById('previewSelisih').textContent = selisihText;
    
    document.getElementById('previewKalori').textContent = `${targetKalori} kalori/hari`;
    
    // Update note
    let noteText = '';
    if (goal === 'turun') {
        noteText = `Defisit ${Math.abs(defisitSurplus)} kalori/hari untuk turun berat badan`;
    } else if (goal === 'naik') {
        noteText = `Surplus ${defisitSurplus} kalori/hari untuk nambah berat badan`;
    } else {
        noteText = 'Pertahankan kalori harian untuk maintain berat badan';
    }
    document.getElementById('previewNote').textContent = noteText;
    
    goalPreview.style.display = 'block';
}

// Event listeners untuk auto-update preview
document.addEventListener('DOMContentLoaded', function() {
    // Manual registration inputs
    const previewInputs = [
        'regTinggiBadan',
        'regBeratBadanAwal',
        'regBeratBadanTarget',
        'regTanggalLahir'
    ];
    
    previewInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updatePreview);
        }
    });
    
    // Gender radio buttons
    const genderRadios = document.querySelectorAll('input[name="jenisKelamin"]');
    genderRadios.forEach(radio => {
        radio.addEventListener('change', updatePreview);
    });
    
    // Google registration inputs
    const googlePreviewInputs = [
        'googleTinggiBadan',
        'googleBeratBadanAwal',
        'googleBeratBadanTarget',
        'googleTanggalLahir'
    ];
    
    googlePreviewInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateGooglePreview);
        }
    });
    
    // Google gender radio buttons
    const googleGenderRadios = document.querySelectorAll('input[name="googleJenisKelamin"]');
    googleGenderRadios.forEach(radio => {
        radio.addEventListener('change', updateGooglePreview);
    });
});

// ====================================
// HANDLE COMPLETE REGISTRATION
// ====================================

/**
 * Handle Manual Registration dengan Data Lengkap
 * UPDATED: Dengan integrasi Supabase
 */
async function handleRegisterComplete() {
    try {
        // Get semua data
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        
        // Data Pribadi
        const namaLengkap = document.getElementById('regNamaLengkap').value.trim();
        const jenisKelamin = document.querySelector('input[name="jenisKelamin"]:checked')?.value;
        const tempatLahir = document.getElementById('regTempatLahir').value.trim();
        const tanggalLahir = document.getElementById('regTanggalLahir').value;
        const golonganDarah = document.getElementById('regGolonganDarah').value;
        const nomorWA = document.getElementById('regNomorWA').value.trim();
        
        // Data Fisik
        const tinggiBadan = parseFloat(document.getElementById('regTinggiBadan').value);
        const beratBadanAwal = parseFloat(document.getElementById('regBeratBadanAwal').value);
        
        // Goal Setting
        const goal = document.querySelector('input[name="goal"]:checked')?.value;
        let beratBadanTarget = parseFloat(document.getElementById('regBeratBadanTarget').value);
        
        // Jika maintain, target = awal
        if (goal === 'maintain') {
            beratBadanTarget = beratBadanAwal;
        }
        
        // Validasi
        const errorDiv = document.getElementById('registerError');
        errorDiv.textContent = '';
        
        // ⭐ VALIDASI DETAIL - Cek setiap field dan kumpulkan error
        const errors = [];
        
        // Validasi Data Akun
        if (!email) {
            errors.push('📧 Email belum diisi');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push('📧 Format email tidak valid');
            }
        }
        
        if (!password) {
            errors.push('🔑 Password belum diisi');
        } else if (password.length < 6) {
            errors.push('🔑 Password minimal 6 karakter');
        }
        
        if (!passwordConfirm) {
            errors.push('🔑 Konfirmasi password belum diisi');
        } else if (password !== passwordConfirm) {
            errors.push('🔑 Password dan konfirmasi password tidak cocok');
        }
        
        // Validasi Data Pribadi
        if (!namaLengkap) {
            errors.push('👤 Nama lengkap belum diisi');
        }
        
        if (!jenisKelamin) {
            errors.push('⚧️ Jenis kelamin belum dipilih');
        }
        
        if (!tempatLahir) {
            errors.push('📍 Tempat lahir belum diisi');
        }
        
        if (!tanggalLahir) {
            errors.push('📅 Tanggal lahir belum diisi');
        } else {
            // Validasi umur minimal 10 tahun
            const umurSementara = hitungUmur(tanggalLahir);
            if (umurSementara < 10) {
                errors.push('📅 Umur minimal 10 tahun');
            }
            if (umurSementara > 120) {
                errors.push('📅 Tanggal lahir tidak valid');
            }
        }
        
        if (!golonganDarah) {
            errors.push('🩸 Golongan darah belum dipilih');
        }
        
        if (!nomorWA) {
            errors.push('📱 Nomor WhatsApp belum diisi');
        } else if (nomorWA.length < 10) {
            errors.push('📱 Nomor WhatsApp minimal 10 digit');
        }
        
        // Validasi Data Fisik
        if (!tinggiBadan || isNaN(tinggiBadan)) {
            errors.push('📏 Tinggi badan belum diisi');
        } else if (tinggiBadan < 100 || tinggiBadan > 250) {
            errors.push('📏 Tinggi badan harus antara 100-250 cm');
        }
        
        if (!beratBadanAwal || isNaN(beratBadanAwal)) {
            errors.push('⚖️ Berat badan saat ini belum diisi');
        } else if (beratBadanAwal < 30 || beratBadanAwal > 300) {
            errors.push('⚖️ Berat badan harus antara 30-300 kg');
        }
        
        // Validasi Goal & Target
        if (!goal) {
            errors.push('🎯 Tujuan (goal) belum dipilih');
        }
        
        if (goal !== 'maintain') {
            if (!beratBadanTarget || isNaN(beratBadanTarget)) {
                errors.push('🎯 Berat badan target belum diisi');
            } else if (beratBadanTarget < 30 || beratBadanTarget > 300) {
                errors.push('🎯 Berat badan target harus antara 30-300 kg');
            }
        }
        
        // Jika ada error, tampilkan semua
        if (errors.length > 0) {
            // Tampilkan maksimal 3 error pertama + info jika ada lebih
            let errorMessage = '❌ Data belum lengkap:\n\n';
            const maxShow = 3;
            
            errors.slice(0, maxShow).forEach(err => {
                errorMessage += `• ${err}\n`;
            });
            
            if (errors.length > maxShow) {
                errorMessage += `\n...dan ${errors.length - maxShow} kesalahan lainnya`;
            }
            
            alert(errorMessage);
            errorDiv.textContent = errors[0]; // Tampilkan error pertama di form
            return;
        }
        
        // Validasi target realistis (setelah semua field terisi)
        const selisihBB = Math.abs(beratBadanTarget - beratBadanAwal);
        
        if (goal === 'turun' && beratBadanTarget >= beratBadanAwal) {
            const msg = `❌ Target Tidak Sesuai!\n\nAnda memilih tujuan "Turun Berat Badan", tetapi:\n• Berat saat ini: ${beratBadanAwal} kg\n• Target: ${beratBadanTarget} kg\n\nTarget harus lebih kecil dari berat saat ini.`;
            alert(msg);
            errorDiv.textContent = '🎯 Target berat badan harus lebih kecil dari berat saat ini';
            return;
        }
        
        if (goal === 'naik' && beratBadanTarget <= beratBadanAwal) {
            const msg = `❌ Target Tidak Sesuai!\n\nAnda memilih tujuan "Naik Berat Badan", tetapi:\n• Berat saat ini: ${beratBadanAwal} kg\n• Target: ${beratBadanTarget} kg\n\nTarget harus lebih besar dari berat saat ini.`;
            alert(msg);
            errorDiv.textContent = '🎯 Target berat badan harus lebih besar dari berat saat ini';
            return;
        }
        
        if (selisihBB > 50) {
            const msg = `⚠️ Target Terlalu Ekstrim!\n\nSelisih berat badan: ${selisihBB} kg\nMaksimal yang diperbolehkan: 50 kg\n\nSilakan sesuaikan target Anda agar lebih realistis.`;
            alert(msg);
            errorDiv.textContent = '⚠️ Target terlalu ekstrim! Selisih maksimal 50 kg';
            return;
        }
        
        // Hitung kalori
        const umur = hitungUmur(tanggalLahir);
        const bmr = hitungBMR(jenisKelamin, beratBadanAwal, tinggiBadan, umur);
        const tdee = hitungTDEE(bmr, 'light');
        const { targetKalori, defisitSurplus } = hitungTargetKalori(tdee, goal, jenisKelamin);
        
        // Show loading
        errorDiv.textContent = '⏳ Mendaftarkan akun...';
        
        // ✅ CHECK IF SupabaseDB EXISTS (from supabase-integration.js)
        if (typeof SupabaseDB !== 'undefined') {
            console.log('📡 Using SupabaseDB registration...');
            
            const userData = {
                namaLengkap: namaLengkap,
                jenisKelamin: jenisKelamin,
                tempatLahir: tempatLahir,
                tanggalLahir: tanggalLahir,
                golonganDarah: golonganDarah,
                tinggiBadan: tinggiBadan,
                beratBadan: beratBadanAwal,
                nomorWA: nomorWA,
                goal: goal,
                beratBadanTarget: beratBadanTarget
            };
            
            const result = await SupabaseDB.register(email, password, userData);
            
            if (result.success) {
                console.log('✅ Supabase registration successful');
                
                // Buat user object untuk localStorage (kompatibilitas)
                const newUser = {
                    id: result.user.id,
                    name: namaLengkap,
                    email: email,
                    isGoogleUser: false,
                    hasCompletedData: true,
                    registeredAt: new Date().toISOString(),
                    namaLengkap: namaLengkap,
                    jenisKelamin: jenisKelamin,
                    tempatLahir: tempatLahir,
                    tanggalLahir: tanggalLahir,
                    umur: umur,
                    golonganDarah: golonganDarah,
                    nomorWA: nomorWA,
                    tinggiBadan: tinggiBadan,
                    beratBadan: beratBadanAwal,
                    beratBadanAwal: beratBadanAwal,
                    beratBadanTarget: beratBadanTarget,
                    goal: goal,
                    bmr: bmr,
                    tdee: tdee,
                    targetKaloriHarian: targetKalori,
                    defisitSurplus: defisitSurplus,
                    activityLevel: 'light'
                };
                
                // Set current user
                localStorage.setItem('currentUser', JSON.stringify(newUser));
                window.currentUser = newUser;
                
                // Also save to usersDatabase for backward compatibility
                let users = JSON.parse(localStorage.getItem('usersDatabase') || '[]');
                users.push(newUser);
                localStorage.setItem('usersDatabase', JSON.stringify(users));
                
                console.log('✅ User registered successfully:', newUser);
                
                // Check if needs email confirmation
                if (result.needsEmailConfirmation) {
                    alert('✅ Registrasi berhasil! Silakan cek email untuk konfirmasi, lalu login.');
                    if (typeof toggleForm === 'function') {
                        toggleForm(); // Go to login form
                    }
                } else {
                    // Go to dashboard
                    if (typeof goToDashboard === 'function') {
                        goToDashboard();
                    } else {
                        window.location.href = '#dashboard';
                        location.reload();
                    }
                }
            } else {
                console.error('❌ Supabase registration error:', result.error);
                errorDiv.textContent = '❌ ' + (result.error || 'Registrasi gagal');
            }
            
        } else {
            // ⚠️ FALLBACK: Use localStorage only (old method)
            console.log('⚠️ Supabase not available, using localStorage...');
            
            // Cek apakah email sudah terdaftar
            let users = JSON.parse(localStorage.getItem('usersDatabase') || '[]');
            const existingUser = users.find(u => u.email === email);
            
            if (existingUser) {
                errorDiv.textContent = '❌ Email sudah terdaftar. Silakan login.';
                return;
            }
            
            // Buat user object lengkap
            const newUser = {
                id: 'user-' + Date.now(),
                name: namaLengkap,
                email: email,
                password: password,
                isGoogleUser: false,
                hasCompletedData: true,
                registeredAt: new Date().toISOString(),
                namaLengkap: namaLengkap,
                jenisKelamin: jenisKelamin,
                tempatLahir: tempatLahir,
                tanggalLahir: tanggalLahir,
                umur: umur,
                golonganDarah: golonganDarah,
                nomorWA: nomorWA,
                tinggiBadan: tinggiBadan,
                beratBadan: beratBadanAwal,        // ⭐ TAMBAH: untuk profile & dashboard
                beratBadanAwal: beratBadanAwal,
                beratBadanTarget: beratBadanTarget,
                goal: goal,
                bmr: bmr,
                tdee: tdee,
                targetKaloriHarian: targetKalori,
                defisitSurplus: defisitSurplus,
                activityLevel: 'light'
            };
            
            // Simpan ke database localStorage
            users.push(newUser);
            localStorage.setItem('usersDatabase', JSON.stringify(users));
            
            // ⭐ JUGA SIMPAN KE SUPABASE
            saveUserToSupabase(newUser).then(result => {
                if (result.success) {
                    console.log('✅ User also saved to Supabase');
                } else {
                    console.warn('⚠️ Failed to save to Supabase:', result.error);
                }
            });
            
            // Set current user
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            window.currentUser = newUser;
            
            console.log('✅ User registered successfully:', newUser);
            
            // Redirect ke dashboard
            if (typeof goToDashboard === 'function') {
                goToDashboard();
            } else {
                window.location.href = '#dashboard';
                location.reload();
            }
        }
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        document.getElementById('registerError').textContent = '❌ Terjadi kesalahan. Coba lagi.';
    }
}

// ====================================
// HANDLE GOOGLE SIGN UP COMPLETE
// ====================================

/**
 * Handle Complete Profile untuk Google User
 */
async function handleGoogleProfileComplete(event) {
    event.preventDefault();
    
    try {
        // ⭐ FIX: Cek dari multiple sources untuk data Google user
        let tempGoogleUser = JSON.parse(sessionStorage.getItem('tempGoogleUser') || '{}');
        
        // Fallback 1: Coba dari localStorage tempGoogleUser
        if (!tempGoogleUser.email) {
            const localTempUser = JSON.parse(localStorage.getItem('tempGoogleUser') || '{}');
            if (localTempUser.email) {
                tempGoogleUser = localTempUser;
                console.log('✅ Loaded Google user from localStorage tempGoogleUser');
            }
        }
        
        // Fallback 2: Coba dari localStorage currentUser
        if (!tempGoogleUser.email) {
            const currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (currentUserData.email && currentUserData.isGoogleUser) {
                tempGoogleUser = currentUserData;
                console.log('✅ Loaded Google user from localStorage currentUser');
            }
        }
        
        // Fallback 3: Coba dari window.currentUser
        if (!tempGoogleUser.email && window.currentUser && window.currentUser.isGoogleUser) {
            tempGoogleUser = window.currentUser;
            console.log('✅ Loaded Google user from window.currentUser');
        }
        
        // Jika masih tidak ada, tampilkan error
        if (!tempGoogleUser.email) {
            alert('❌ Sesi Google Sign-Up habis. Silakan login ulang dengan Google.');
            showPage('landingPage');
            return;
        }
        
        console.log('📧 Processing Google user:', tempGoogleUser.email);
        
        // Get data dari form
        const namaLengkap = document.getElementById('googleNamaLengkap').value.trim();
        const jenisKelamin = document.querySelector('input[name="googleJenisKelamin"]:checked')?.value;
        const tempatLahir = document.getElementById('googleTempatLahir').value.trim();
        const tanggalLahir = document.getElementById('googleTanggalLahir').value;
        const golonganDarah = document.getElementById('googleGolonganDarah').value;
        const nomorWA = document.getElementById('googleNomorWA').value.trim();
        const tinggiBadan = parseFloat(document.getElementById('googleTinggiBadan').value);
        const beratBadanAwal = parseFloat(document.getElementById('googleBeratBadanAwal').value);
        const goal = document.querySelector('input[name="googleGoal"]:checked')?.value;
        let beratBadanTarget = parseFloat(document.getElementById('googleBeratBadanTarget').value);
        
        // Jika maintain
        if (goal === 'maintain') {
            beratBadanTarget = beratBadanAwal;
        }
        
        // Validasi
        const errorDiv = document.getElementById('completeProfileError');
        errorDiv.textContent = '';
        
        if (!namaLengkap || !jenisKelamin || !tempatLahir || !tanggalLahir || !golonganDarah || 
            !nomorWA || !tinggiBadan || !beratBadanAwal || !goal || !beratBadanTarget) {
            errorDiv.textContent = '❌ Mohon lengkapi semua data';
            return;
        }
        
        // Hitung kalori
        const umur = hitungUmur(tanggalLahir);
        const bmr = hitungBMR(jenisKelamin, beratBadanAwal, tinggiBadan, umur);
        const tdee = hitungTDEE(bmr, 'light');
        const { targetKalori, defisitSurplus } = hitungTargetKalori(tdee, goal, jenisKelamin);
        
        // Buat user object lengkap
        const completeUser = {
            ...tempGoogleUser,
            
            // Override name dengan Nama Lengkap yang user input
            name: namaLengkap,  // ⭐ PENTING: Override nama Google dengan input user
            
            // Data Pribadi
            namaLengkap: namaLengkap,
            jenisKelamin: jenisKelamin,
            tempatLahir: tempatLahir,
            tanggalLahir: tanggalLahir,
            umur: umur,
            golonganDarah: golonganDarah,
            nomorWA: nomorWA,
            
            // Data Fisik
            tinggiBadan: tinggiBadan,
            beratBadan: beratBadanAwal,  // ⭐ Set beratBadan (untuk profil)
            beratBadanAwal: beratBadanAwal,
            beratBadanTarget: beratBadanTarget,
            
            // Goal
            goal: goal,
            
            // Kalori
            bmr: bmr,
            tdee: tdee,
            targetKaloriHarian: targetKalori,
            defisitSurplus: defisitSurplus,
            activityLevel: 'light',
            
            // Status
            hasCompletedData: true,
            completedDataAt: new Date().toISOString()
        };
        
        // Simpan ke database localStorage
        let users = JSON.parse(localStorage.getItem('usersDatabase') || '[]');
        
        // ⭐ FIX: Cek apakah user sudah ada (berdasarkan email)
        const existingUserIndex = users.findIndex(u => u.email === completeUser.email);
        
        if (existingUserIndex >= 0) {
            // Update existing user
            users[existingUserIndex] = completeUser;
            console.log('✅ Updated existing user in database');
        } else {
            // Add new user
            users.push(completeUser);
            console.log('✅ Added new user to database');
        }
        
        localStorage.setItem('usersDatabase', JSON.stringify(users));
        
        // ⭐ SIMPAN KE SUPABASE
        saveUserToSupabase(completeUser).then(result => {
            if (result.success) {
                console.log('✅ Google user also saved to Supabase');
            } else {
                console.warn('⚠️ Failed to save Google user to Supabase:', result.error);
            }
        });
        
        // Set current user
        localStorage.setItem('currentUser', JSON.stringify(completeUser));
        
        // Set as global currentUser
        window.currentUser = completeUser;
        
        // Clear temp data
        sessionStorage.removeItem('tempGoogleUser');
        localStorage.removeItem('tempGoogleUser');  // ⭐ Juga clear dari localStorage
        
        console.log('✅ Google user profile completed:', completeUser);
        
        // Redirect ke dashboard menggunakan SPA navigation
        if (typeof goToDashboard === 'function') {
            goToDashboard();
        } else {
            // Fallback jika function tidak ada
            window.location.href = '#dashboard';
            location.reload();
        }
        
    } catch (error) {
        console.error('❌ Complete profile error:', error);
        document.getElementById('completeProfileError').textContent = '❌ Terjadi kesalahan. Coba lagi.';
    }
}

// Attach event listener untuk complete profile form
document.addEventListener('DOMContentLoaded', function() {
    const completeProfileForm = document.getElementById('completeProfileForm');
    if (completeProfileForm) {
        completeProfileForm.addEventListener('submit', handleGoogleProfileComplete);
    }
});

console.log('✅ Complete Registration Handler loaded');