// ========================================
// AUTO-HIGHLIGHT PROGRESS STEPS ON SCROLL
// For Complete Profile Page (Google User)
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const completeProfilePage = document.getElementById('completeProfilePage');
    const completeProfileForm = document.getElementById('completeProfileForm');
    
    if (!completeProfilePage || !completeProfileForm) return; // Exit jika bukan di Complete Profile Page
    
    // ⭐ FIX: Get steps and sections ONLY inside completeProfilePage
    const progressStepsContainer = completeProfilePage.querySelector('.progress-steps');
    if (!progressStepsContainer) {
        console.log('⚠️ Progress steps container not found in completeProfilePage');
        return;
    }
    
    const steps = progressStepsContainer.querySelectorAll('.step');
    const sections = completeProfileForm.querySelectorAll('.form-section');
    
    if (steps.length === 0 || sections.length === 0) {
        console.log('⚠️ No steps or sections found');
        return;
    }
    
    console.log('✅ Auto-highlight progress steps initialized for Complete Profile');
    console.log('Steps:', steps.length, 'Sections:', sections.length);
    
    // Function to check if section is completed
    function isSectionCompleted(index) {
        if (index === 0) {
            // Section 1: Data Pribadi
            const namaLengkap = document.getElementById('googleNamaLengkap')?.value;
            const jenisKelamin = document.querySelector('input[name="googleJenisKelamin"]:checked');
            const tempatLahir = document.getElementById('googleTempatLahir')?.value;
            const tanggalLahir = document.getElementById('googleTanggalLahir')?.value;
            const golonganDarah = document.getElementById('googleGolonganDarah')?.value;
            const nomorWA = document.getElementById('googleNomorWA')?.value;
            
            return !!(namaLengkap && jenisKelamin && tempatLahir && tanggalLahir && golonganDarah && nomorWA);
            
        } else if (index === 1) {
            // Section 2: Data Fisik
            const tinggiBadan = document.getElementById('googleTinggiBadan')?.value;
            const beratBadanAwal = document.getElementById('googleBeratBadanAwal')?.value;
            
            return !!(tinggiBadan && beratBadanAwal);
            
        } else if (index === 2) {
            // Section 3: Target
            const goal = document.querySelector('input[name="googleGoal"]:checked');
            const beratBadanTarget = document.getElementById('googleBeratBadanTarget')?.value;
            
            // Jika goal = maintain, tidak perlu target weight
            if (goal && goal.value === 'maintain') {
                return true;
            }
            
            // Jika goal = turun/naik, harus ada target weight
            return !!(goal && beratBadanTarget);
        }
        
        return false;
    }
    
    // Function to update active step
    function updateActiveStep() {
        // ⭐ FIX: completeProfileForm IS the form-container, use it directly
        const formContainer = completeProfileForm;
        if (!formContainer) return;
        
        const scrollTop = formContainer.scrollTop;
        const containerHeight = formContainer.clientHeight;
        
        // Calculate which section is currently visible
        let currentIndex = 0;
        
        sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            // Check if section is in viewport (with some offset for better UX)
            if (scrollTop + 150 >= sectionTop && scrollTop + 150 < sectionBottom) {
                currentIndex = index;
            }
        });
        
        // Update step classes
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            
            // Check if section is completed
            const isCompleted = isSectionCompleted(index);
            
            if (isCompleted) {
                step.classList.add('completed'); // Section sudah lengkap = hijau ✓
            } else if (index === currentIndex) {
                step.classList.add('active'); // Section saat ini = purple
            }
            // Else: tidak ada class = abu-abu (default)
        });
        
        // Debug log
        const completedCount = Array.from(steps).filter(s => s.classList.contains('completed')).length;
        console.log('📍 Current section:', currentIndex + 1, '| Completed:', completedCount);
    }
    
    // ⭐ FIX: Listen to scroll event on completeProfileForm directly
    completeProfileForm.addEventListener('scroll', updateActiveStep);
    
    // Initial highlight
    setTimeout(updateActiveStep, 100);
    
    console.log('✅ Scroll listener attached to completeProfileForm');
    
    // Optional: Click on step to scroll to section
    steps.forEach((step, index) => {
        step.style.cursor = 'pointer';
        
        step.addEventListener('click', function() {
            if (sections[index]) {
                // ⭐ FIX: Scroll directly on completeProfileForm
                const sectionTop = sections[index].offsetTop - 20;
                
                completeProfileForm.scrollTo({
                    top: sectionTop,
                    behavior: 'smooth'
                });
                
                console.log('🖱️ Clicked step', index + 1, '- scrolling to section');
            }
        });
    });
    
    console.log('✅ Click handlers added to progress steps');
    
    // ========================================
    // REAL-TIME UPDATE SAAT USER ISI FIELD
    // ========================================
    
    // Listen to all input changes
    const allInputs = completeProfileForm.querySelectorAll('input, select');
    
    allInputs.forEach(input => {
        input.addEventListener('input', updateActiveStep);
        input.addEventListener('change', updateActiveStep);
    });
    
    console.log('✅ Real-time update listeners added to all inputs');
});

// ========================================
// VALIDATION BEFORE SUBMIT
// Pastikan semua field terisi sebelum submit
// ========================================

// Intercept form submit
document.addEventListener('DOMContentLoaded', function() {
    const completeProfileForm = document.getElementById('completeProfileForm');
    
    if (!completeProfileForm) return;
    
    completeProfileForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Stop default submit
        
        console.log('📋 Form submit intercepted - validating all fields...');
        
        // Get all required fields
        const namaLengkap = document.getElementById('googleNamaLengkap').value;
        const jenisKelamin = document.querySelector('input[name="googleJenisKelamin"]:checked');
        const tempatLahir = document.getElementById('googleTempatLahir').value;
        const tanggalLahir = document.getElementById('googleTanggalLahir').value;
        const golonganDarah = document.getElementById('googleGolonganDarah').value;
        const nomorWA = document.getElementById('googleNomorWA').value;
        const tinggiBadan = document.getElementById('googleTinggiBadan').value;
        const beratBadanAwal = document.getElementById('googleBeratBadanAwal').value;
        const goal = document.querySelector('input[name="googleGoal"]:checked');
        const beratBadanTarget = document.getElementById('googleBeratBadanTarget').value;
        
        // Validation checks
        const errors = [];
        
        if (!namaLengkap) errors.push('Nama Lengkap');
        if (!jenisKelamin) errors.push('Jenis Kelamin');
        if (!tempatLahir) errors.push('Tempat Lahir');
        if (!tanggalLahir) errors.push('Tanggal Lahir');
        if (!golonganDarah) errors.push('Golongan Darah');
        if (!nomorWA) errors.push('Nomor WhatsApp');
        if (!tinggiBadan) errors.push('Tinggi Badan');
        if (!beratBadanAwal) errors.push('Berat Badan Awal');
        if (!goal) errors.push('Tujuan (Goal)');
        
        // Validate target weight based on goal
        if (goal && goal.value !== 'maintain' && !beratBadanTarget) {
            errors.push('Berat Badan Target');
        }
        
        // Show errors if any
        if (errors.length > 0) {
            const errorElement = document.getElementById('completeProfileError');
            if (errorElement) {
                errorElement.textContent = '❌ Harap lengkapi: ' + errors.join(', ');
                errorElement.style.display = 'block';
            }
            
            // Scroll to first error
            const formContainer = completeProfileForm.closest('.form-container');
            if (formContainer) {
                formContainer.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
            
            console.log('❌ Validation failed:', errors);
            return false;
        }
        
        // All fields valid - call the actual submit handler
        console.log('✅ All fields validated - calling handleGoogleProfileComplete()');
        
        // Clear any errors
        const errorElement = document.getElementById('completeProfileError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        // Call the actual handler from registration-handler.js
        // Pass the event so preventDefault() works
        if (typeof handleGoogleProfileComplete === 'function') {
            handleGoogleProfileComplete(event);  // ⭐ Pass event parameter!
        } else {
            console.error('❌ handleGoogleProfileComplete function not found!');
        }
    });
});

console.log('✅ Complete Profile Form - Auto-highlight & Validation loaded');