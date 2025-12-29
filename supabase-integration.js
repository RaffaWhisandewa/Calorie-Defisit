// ====================================
// SUPABASE COMPLETE INTEGRATION
// File: supabase-integration.js
// ====================================
// INSTRUKSI: Tambahkan file ini di HTML setelah Supabase CDN
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="supabase-integration.js"></script>
// ====================================

// ====================================
// CONFIGURATION
// ====================================
const SUPABASE_URL = 'https://ypyxrfsvxubnngghroqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweXhyZnN2eHVibm5nZ2hyb3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODQ3NzIsImV4cCI6MjA3NzM2MDc3Mn0.iyDb8saqfbooAU7teO5M97na00ESe7EWt0nkbs1tYmk';

// Initialize Supabase client - WILL BE SET BELOW
let supabaseClient = null;

// ====================================
// INITIALIZATION (IMMEDIATE)
// ====================================
// Create client immediately when script loads
(function() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // ⭐ CRITICAL: Expose to window for other scripts
        window.supabaseClient = supabaseClient;
        console.log('✅ Supabase client initialized and exposed to window');
    } else {
        console.error('❌ Supabase library not loaded yet');
    }
})();

// ====================================
// INITIALIZATION FUNCTION (for manual call)
// ====================================
function initSupabase() {
    if (supabaseClient) {
        console.log('✅ Supabase already initialized');
        return true;
    }
    
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient;
        console.log('✅ Supabase initialized successfully');
        return true;
    } else {
        console.error('❌ Supabase library not loaded. Add CDN script first.');
        return false;
    }
}

// ====================================
// AUTHENTICATION FUNCTIONS
// ====================================

/**
 * Register new user with email and password
 */
async function registerWithEmail(email, password, userData) {
    try {
        console.log('📝 Registering new user:', email);
        
        // 1. Create auth user
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: userData.namaLengkap,
                    full_name: userData.namaLengkap
                }
            }
        });
        
        if (authError) {
            console.error('❌ Auth error:', authError);
            return { success: false, error: authError.message };
        }
        
        if (!authData.user) {
            return { success: false, error: 'Failed to create user' };
        }
        
        console.log('✅ Auth user created:', authData.user.id);
        
        // 2. Create user profile in users table
        const profileData = {
            id: authData.user.id,
            email: email,
            nama_lengkap: userData.namaLengkap || null,
            jenis_kelamin: userData.jenisKelamin || null,
            tempat_lahir: userData.tempatLahir || null,
            tanggal_lahir: userData.tanggalLahir || null,
            golongan_darah: userData.golonganDarah || null,
            tinggi_badan: userData.tinggiBadan ? parseFloat(userData.tinggiBadan) : null,
            berat_badan: userData.beratBadan ? parseFloat(userData.beratBadan) : null,
            nomor_wa: userData.nomorWA || null,
            goal: userData.goal || null,
            berat_badan_target: userData.beratBadanTarget ? parseFloat(userData.beratBadanTarget) : null,
            has_completed_data: true,
            is_google_user: false,
            created_at: new Date().toISOString()
        };
        
        const { error: profileError } = await supabase
            .from('users')
            .upsert(profileData);
        
        if (profileError) {
            console.error('❌ Profile error:', profileError);
            // Don't return error - auth user is created
        } else {
            console.log('✅ User profile created in database');
        }
        
        return { 
            success: true, 
            user: authData.user,
            session: authData.session,
            needsEmailConfirmation: !authData.session // If no session, email needs confirmation
        };
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login with email and password
 */
async function loginWithEmail(email, password) {
    try {
        console.log('🔐 Logging in:', email);
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('❌ Login error:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Login successful:', data.user.email);
        
        // Get user profile
        const profile = await getUserProfile(data.user.id);
        
        return { 
            success: true, 
            user: data.user,
            session: data.session,
            profile: profile.data
        };
        
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login with Google OAuth
 */
async function loginWithGoogle() {
    try {
        console.log('🔐 Logging in with Google...');
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) {
            console.error('❌ Google login error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, data };
        
    } catch (error) {
        console.error('❌ Google login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout current user
 */
async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('❌ Logout error:', error);
            return { success: false, error: error.message };
        }
        
        // Clear local storage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('supabaseUser');
        
        console.log('✅ Logged out successfully');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current logged in user
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error || !user) {
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('❌ Error getting current user:', error);
        return null;
    }
}

/**
 * Get current session
 */
async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('❌ Session error:', error);
            return null;
        }
        
        return session;
    } catch (error) {
        console.error('❌ Error getting session:', error);
        return null;
    }
}

// ====================================
// USER PROFILE FUNCTIONS
// ====================================

/**
 * Get user profile from database
 */
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('❌ Error getting profile:', error);
            return { success: false, data: null };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error getting profile:', error);
        return { success: false, data: null };
    }
}

/**
 * Update user profile
 */
async function updateUserProfile(userId, profileData) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                nama_lengkap: profileData.namaLengkap,
                jenis_kelamin: profileData.jenisKelamin,
                tempat_lahir: profileData.tempatLahir,
                tanggal_lahir: profileData.tanggalLahir,
                golongan_darah: profileData.golonganDarah,
                tinggi_badan: parseFloat(profileData.tinggiBadan),
                berat_badan: parseFloat(profileData.beratBadan),
                nomor_wa: profileData.nomorWA,
                goal: profileData.goal,
                berat_badan_target: profileData.beratBadanTarget ? parseFloat(profileData.beratBadanTarget) : null,
                has_completed_data: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) {
            console.error('❌ Error updating profile:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Profile updated successfully');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        return { success: false, error: error.message };
    }
}

// ====================================
// WEIGHT TRACKING FUNCTIONS
// ====================================

/**
 * Save weight entry to Supabase
 */
async function saveWeight(weightData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ No authenticated user');
            return { success: false, error: 'User not authenticated' };
        }
        
        console.log('💾 Saving weight:', weightData);
        
        const { data, error } = await supabase
            .from('weight_tracking')
            .upsert({
                user_id: user.id,
                weight: parseFloat(weightData.weight),
                date: weightData.date,
                time: weightData.time || null,
                note: weightData.note || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,date'
            });
        
        if (error) {
            console.error('❌ Error saving weight:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Weight saved to Supabase');
        
        // Also save to localStorage as backup
        saveWeightToLocalStorage(weightData);
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error saving weight:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Load all weight entries from Supabase
 */
async function loadWeight() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('⚠️ No authenticated user, loading from localStorage');
            return loadWeightFromLocalStorage();
        }
        
        console.log('📥 Loading weight data from Supabase...');
        
        const { data, error } = await supabase
            .from('weight_tracking')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });
        
        if (error) {
            console.error('❌ Error loading weight:', error);
            return loadWeightFromLocalStorage();
        }
        
        console.log(`✅ Loaded ${data.length} weight entries from Supabase`);
        
        // Transform data to match frontend format
        const weightData = data.map(entry => ({
            weight: parseFloat(entry.weight),
            date: entry.date,
            time: entry.time,
            note: entry.note,
            timestamp: entry.created_at
        }));
        
        // Sync to localStorage
        localStorage.setItem('weightTracking', JSON.stringify(weightData));
        
        return weightData;
    } catch (error) {
        console.error('❌ Error loading weight:', error);
        return loadWeightFromLocalStorage();
    }
}

/**
 * Delete weight entry from Supabase
 */
async function deleteWeight(date) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ No authenticated user');
            return { success: false, error: 'User not authenticated' };
        }
        
        console.log('🗑️ Deleting weight entry:', date);
        
        const { error } = await supabase
            .from('weight_tracking')
            .delete()
            .eq('user_id', user.id)
            .eq('date', date);
        
        if (error) {
            console.error('❌ Error deleting weight:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Weight entry deleted from Supabase');
        
        // Also delete from localStorage
        deleteWeightFromLocalStorage(date);
        
        return { success: true };
    } catch (error) {
        console.error('❌ Error deleting weight:', error);
        return { success: false, error: error.message };
    }
}

// ====================================
// LOCAL STORAGE BACKUP FUNCTIONS
// ====================================

function saveWeightToLocalStorage(weightData) {
    try {
        const existing = JSON.parse(localStorage.getItem('weightTracking') || '[]');
        const index = existing.findIndex(e => e.date === weightData.date);
        
        if (index >= 0) {
            existing[index] = weightData;
        } else {
            existing.unshift(weightData);
        }
        
        existing.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem('weightTracking', JSON.stringify(existing));
    } catch (error) {
        console.error('❌ Error saving to localStorage:', error);
    }
}

function loadWeightFromLocalStorage() {
    try {
        return JSON.parse(localStorage.getItem('weightTracking') || '[]');
    } catch (error) {
        console.error('❌ Error loading from localStorage:', error);
        return [];
    }
}

function deleteWeightFromLocalStorage(date) {
    try {
        const existing = JSON.parse(localStorage.getItem('weightTracking') || '[]');
        const filtered = existing.filter(e => e.date !== date);
        localStorage.setItem('weightTracking', JSON.stringify(filtered));
    } catch (error) {
        console.error('❌ Error deleting from localStorage:', error);
    }
}

// ====================================
// ACTIVITY TRACKING FUNCTIONS
// ====================================

/**
 * Save steps activity
 */
async function saveSteps(steps) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: 'User not authenticated' };
        
        const { data, error } = await supabase
            .from('steps_activity')
            .insert({
                user_id: user.id,
                steps: parseInt(steps),
                date: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Error saving steps:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Steps saved:', steps);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error saving steps:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save running activity
 */
async function saveRunning(distance) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: 'User not authenticated' };
        
        const { data, error } = await supabase
            .from('running_activity')
            .insert({
                user_id: user.id,
                distance: parseFloat(distance),
                date: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Error saving running:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Running saved:', distance, 'km');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error saving running:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save water consumption
 */
async function saveWater(amount) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: 'User not authenticated' };
        
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('water_consumption')
            .upsert({
                user_id: user.id,
                amount: parseFloat(amount),
                date: today
            }, {
                onConflict: 'user_id,date'
            });
        
        if (error) {
            console.error('❌ Error saving water:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Water saved:', amount, 'L');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error saving water:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save sleep record
 */
async function saveSleep(hours) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: 'User not authenticated' };
        
        const { data, error } = await supabase
            .from('sleep_records')
            .insert({
                user_id: user.id,
                hours: parseFloat(hours),
                date: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Error saving sleep:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Sleep saved:', hours, 'hours');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error saving sleep:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save gym session
 */
async function saveGym(category, exerciseType, duration) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: 'User not authenticated' };
        
        const { data, error } = await supabase
            .from('gym_sessions')
            .insert({
                user_id: user.id,
                category: category,
                exercise_type: exerciseType,
                duration: parseInt(duration),
                date: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Error saving gym:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Gym session saved:', exerciseType, duration, 'min');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error saving gym:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save food intake
 */
async function saveFood(foodData) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: 'User not authenticated' };
        
        const { data, error } = await supabase
            .from('food_intake')
            .insert({
                user_id: user.id,
                food_name: foodData.name,
                calories: parseInt(foodData.calories),
                carbs: parseFloat(foodData.carbs || 0),
                protein: parseFloat(foodData.protein || 0),
                fat: parseFloat(foodData.fat || 0),
                date: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Error saving food:', error);
            return { success: false, error: error.message };
        }
        
        console.log('✅ Food saved:', foodData.name);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Error saving food:', error);
        return { success: false, error: error.message };
    }
}

// ====================================
// LOAD ACTIVITY DATA
// ====================================

/**
 * Load today's activity summary
 */
async function loadTodayActivity() {
    try {
        const user = await getCurrentUser();
        if (!user) return null;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        
        // Load all today's data in parallel
        const [stepsResult, runningResult, waterResult, sleepResult, foodResult] = await Promise.all([
            supabase.from('steps_activity').select('steps').eq('user_id', user.id).gte('date', todayISO),
            supabase.from('running_activity').select('distance').eq('user_id', user.id).gte('date', todayISO),
            supabase.from('water_consumption').select('amount').eq('user_id', user.id).gte('date', todayISO),
            supabase.from('sleep_records').select('hours').eq('user_id', user.id).gte('date', todayISO),
            supabase.from('food_intake').select('calories, carbs, protein, fat').eq('user_id', user.id).gte('date', todayISO)
        ]);
        
        const summary = {
            steps: stepsResult.data?.reduce((sum, item) => sum + (item.steps || 0), 0) || 0,
            running: runningResult.data?.reduce((sum, item) => sum + (parseFloat(item.distance) || 0), 0) || 0,
            water: waterResult.data?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0,
            sleep: sleepResult.data?.reduce((sum, item) => sum + (parseFloat(item.hours) || 0), 0) || 0,
            food: {
                calories: foodResult.data?.reduce((sum, item) => sum + (item.calories || 0), 0) || 0,
                carbs: foodResult.data?.reduce((sum, item) => sum + (item.carbs || 0), 0) || 0,
                protein: foodResult.data?.reduce((sum, item) => sum + (item.protein || 0), 0) || 0,
                fat: foodResult.data?.reduce((sum, item) => sum + (item.fat || 0), 0) || 0
            }
        };
        
        console.log('✅ Today activity loaded:', summary);
        return summary;
    } catch (error) {
        console.error('❌ Error loading today activity:', error);
        return null;
    }
}

/**
 * Load activity history for specified days
 */
async function loadActivityHistory(days = 7) {
    try {
        const user = await getCurrentUser();
        if (!user) return null;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startISO = startDate.toISOString();
        
        const [stepsResult, runningResult, waterResult, sleepResult, gymResult, foodResult] = await Promise.all([
            supabase.from('steps_activity').select('*').eq('user_id', user.id).gte('date', startISO).order('date', { ascending: false }),
            supabase.from('running_activity').select('*').eq('user_id', user.id).gte('date', startISO).order('date', { ascending: false }),
            supabase.from('water_consumption').select('*').eq('user_id', user.id).gte('date', startISO).order('date', { ascending: false }),
            supabase.from('sleep_records').select('*').eq('user_id', user.id).gte('date', startISO).order('date', { ascending: false }),
            supabase.from('gym_sessions').select('*').eq('user_id', user.id).gte('date', startISO).order('date', { ascending: false }),
            supabase.from('food_intake').select('*').eq('user_id', user.id).gte('date', startISO).order('date', { ascending: false })
        ]);
        
        return {
            steps: stepsResult.data || [],
            running: runningResult.data || [],
            water: waterResult.data || [],
            sleep: sleepResult.data || [],
            gym: gymResult.data || [],
            food: foodResult.data || []
        };
    } catch (error) {
        console.error('❌ Error loading activity history:', error);
        return null;
    }
}

// ====================================
// DATA SYNC FUNCTIONS
// ====================================

/**
 * Sync localStorage data to Supabase (one-time migration)
 */
async function syncLocalStorageToSupabase() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('⚠️ No authenticated user for sync');
            return { success: false, error: 'User not authenticated' };
        }
        
        console.log('🔄 Starting sync from localStorage to Supabase...');
        
        // Sync weight data
        const weightData = JSON.parse(localStorage.getItem('weightTracking') || '[]');
        let syncedCount = 0;
        
        for (const entry of weightData) {
            const result = await saveWeight(entry);
            if (result.success) syncedCount++;
        }
        
        console.log(`✅ Synced ${syncedCount}/${weightData.length} weight entries`);
        
        return { success: true, synced: syncedCount };
    } catch (error) {
        console.error('❌ Sync error:', error);
        return { success: false, error: error.message };
    }
}

// ====================================
// AUTH STATE LISTENER
// ====================================

function setupAuthListener(callback) {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
            console.log('✅ User signed in:', session.user.email);
            if (callback) callback('SIGNED_IN', session.user);
        } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            if (callback) callback('SIGNED_OUT', null);
        }
    });
}

// ====================================
// INITIALIZATION ON LOAD
// ====================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase
    const initialized = initSupabase();
    
    if (initialized) {
        // Check for existing session
        getCurrentSession().then(session => {
            if (session) {
                console.log('✅ Existing session found:', session.user.email);
            } else {
                console.log('ℹ️ No existing session');
            }
        });
    }
});

// ====================================
// EXPOSE FUNCTIONS TO WINDOW
// ====================================
window.SupabaseDB = {
    // Client
    client: supabaseClient,
    getClient: () => supabaseClient,
    
    // Init
    init: initSupabase,
    
    // Auth
    register: registerWithEmail,
    login: loginWithEmail,
    loginWithGoogle: loginWithGoogle,
    logout: logout,
    getCurrentUser: getCurrentUser,
    getCurrentSession: getCurrentSession,
    setupAuthListener: setupAuthListener,
    
    // Profile
    getUserProfile: getUserProfile,
    updateUserProfile: updateUserProfile,
    
    // Weight
    saveWeight: saveWeight,
    loadWeight: loadWeight,
    deleteWeight: deleteWeight,
    
    // Activities
    saveSteps: saveSteps,
    saveRunning: saveRunning,
    saveWater: saveWater,
    saveSleep: saveSleep,
    saveGym: saveGym,
    saveFood: saveFood,
    
    // Load data
    loadTodayActivity: loadTodayActivity,
    loadActivityHistory: loadActivityHistory,
    
    // Sync
    syncLocalStorageToSupabase: syncLocalStorageToSupabase
};

console.log('✅ Supabase Integration Module loaded');
console.log('📚 Usage: SupabaseDB.login(email, password)');