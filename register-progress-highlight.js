// ========================================
// AUTO-HIGHLIGHT PROGRESS STEPS FOR REGISTER FORM
// File: register-progress-highlight.js
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    if (!registerForm) return;
    
    // Get progress steps and sections for register form
    const progressSteps = document.getElementById('regProgressSteps');
    if (!progressSteps) return;
    
    const steps = progressSteps.querySelectorAll('.step');
    const sections = [
        document.getElementById('regSection1'),
        document.getElementById('regSection2'),
        document.getElementById('regSection3'),
        document.getElementById('regSection4')
    ].filter(s => s !== null);
    
    if (steps.length === 0 || sections.length === 0) return;
    
    console.log('✅ Register form progress steps initialized');
    console.log('Steps:', steps.length, 'Sections:', sections.length);
    
    // Function to check if section is completed
    function isSectionCompleted(index) {
        if (index === 0) {
            // Section 1: Akun
            const email = document.getElementById('regEmail')?.value;
            const password = document.getElementById('regPassword')?.value;
            const passwordConfirm = document.getElementById('regPasswordConfirm')?.value;
            
            return !!(email && password && passwordConfirm && password.length >= 6 && password === passwordConfirm);
            
        } else if (index === 1) {
            // Section 2: Data Pribadi
            const namaLengkap = document.getElementById('regNamaLengkap')?.value;
            const jenisKelamin = document.querySelector('input[name="jenisKelamin"]:checked');
            const tempatLahir = document.getElementById('regTempatLahir')?.value;
            const tanggalLahir = document.getElementById('regTanggalLahir')?.value;
            const golonganDarah = document.getElementById('regGolonganDarah')?.value;
            const nomorWA = document.getElementById('regNomorWA')?.value;
            
            return !!(namaLengkap && jenisKelamin && tempatLahir && tanggalLahir && golonganDarah && nomorWA);
            
        } else if (index === 2) {
            // Section 3: Data Fisik
            const tinggiBadan = document.getElementById('regTinggiBadan')?.value;
            const beratBadanAwal = document.getElementById('regBeratBadanAwal')?.value;
            
            return !!(tinggiBadan && beratBadanAwal);
            
        } else if (index === 3) {
            // Section 4: Target
            const goal = document.querySelector('input[name="goal"]:checked');
            const beratBadanTarget = document.getElementById('regBeratBadanTarget')?.value;
            
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
        // Find the form-container inside registerForm
        const formContainer = registerForm;
        if (!formContainer) return;
        
        const scrollTop = formContainer.scrollTop;
        
        // Calculate which section is currently visible
        let currentIndex = 0;
        
        sections.forEach((section, index) => {
            if (!section) return;
            
            const sectionTop = section.offsetTop - formContainer.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            // Check if section is in viewport
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
                step.classList.add('completed');
            } else if (index === currentIndex) {
                step.classList.add('active');
            }
        });
    }
    
    // Listen to scroll event on register form container
    registerForm.addEventListener('scroll', updateActiveStep);
    
    // Initial highlight
    updateActiveStep();
    
    // Click on step to scroll to section
    steps.forEach((step, index) => {
        step.style.cursor = 'pointer';
        
        step.addEventListener('click', function() {
            if (sections[index]) {
                const sectionTop = sections[index].offsetTop - registerForm.offsetTop - 20;
                
                registerForm.scrollTo({
                    top: sectionTop,
                    behavior: 'smooth'
                });
                
                console.log('🖱️ Clicked step', index + 1, '- scrolling to section');
            }
        });
    });
    
    // Listen to all input changes in register form
    const allInputs = registerForm.querySelectorAll('input, select');
    
    allInputs.forEach(input => {
        input.addEventListener('input', updateActiveStep);
        input.addEventListener('change', updateActiveStep);
    });
    
    console.log('✅ Register form progress tracking loaded!');
});

// ========================================
// VALIDATION FOR REGISTER FORM
// ========================================

function validateRegisterForm() {
    const errors = [];
    
    // Section 1: Akun
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const passwordConfirm = document.getElementById('regPasswordConfirm')?.value;
    
    if (!email) errors.push('Email');
    if (!password) errors.push('Password');
    if (!passwordConfirm) errors.push('Konfirmasi Password');
    if (password && password.length < 6) errors.push('Password minimal 6 karakter');
    if (password && passwordConfirm && password !== passwordConfirm) errors.push('Password tidak cocok');
    
    // Section 2: Data Pribadi
    const namaLengkap = document.getElementById('regNamaLengkap')?.value;
    const jenisKelamin = document.querySelector('input[name="jenisKelamin"]:checked');
    const tempatLahir = document.getElementById('regTempatLahir')?.value;
    const tanggalLahir = document.getElementById('regTanggalLahir')?.value;
    const golonganDarah = document.getElementById('regGolonganDarah')?.value;
    const nomorWA = document.getElementById('regNomorWA')?.value;
    
    if (!namaLengkap) errors.push('Nama Lengkap');
    if (!jenisKelamin) errors.push('Jenis Kelamin');
    if (!tempatLahir) errors.push('Tempat Lahir');
    if (!tanggalLahir) errors.push('Tanggal Lahir');
    if (!golonganDarah) errors.push('Golongan Darah');
    if (!nomorWA) errors.push('Nomor WhatsApp');
    
    // Section 3: Data Fisik
    const tinggiBadan = document.getElementById('regTinggiBadan')?.value;
    const beratBadanAwal = document.getElementById('regBeratBadanAwal')?.value;
    
    if (!tinggiBadan) errors.push('Tinggi Badan');
    if (!beratBadanAwal) errors.push('Berat Badan');
    
    // Section 4: Target
    const goal = document.querySelector('input[name="goal"]:checked');
    const beratBadanTarget = document.getElementById('regBeratBadanTarget')?.value;
    
    if (!goal) errors.push('Tujuan (Goal)');
    if (goal && goal.value !== 'maintain' && !beratBadanTarget) {
        errors.push('Berat Badan Target');
    }
    
    return errors;
}

console.log('✅ Register Progress Highlight Script loaded');