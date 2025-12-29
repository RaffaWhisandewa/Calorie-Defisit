// ====================================
// SUPABASE ACTIVITY SYNC - MATCHED TO DB
// File: supabase-activity-sync.js
// Version: 3.0.0
// ====================================
// Disesuaikan dengan struktur tabel yang ada di Supabase
// ====================================

console.log('📡 Loading Supabase Activity Sync v3.0...');

const ACTIVITY_SYNC_VERSION = '3.0.0';
let activitySyncEnabled = true;

// ====================================
// HELPER FUNCTIONS
// ====================================

// ⭐ Helper untuk mendapatkan Supabase client yang benar
function getSupabaseClient() {
    // Priority: window.supabaseClient > SupabaseDB.client > create new
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
        console.log('✅ Created new Supabase client');
        return client;
    }
    console.error('❌ No Supabase client available');
    return null;
}

function getCurrentUserId() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser.id || null;
}

function getCurrentUserEmail() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser.email || null;
}

// ====================================
// STEPS ACTIVITY
// Kolom: id, user_id, steps, date, created_at
// ====================================

async function saveStepsToSupabase(stepsEntry) {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            console.log('⚠️ No user ID, skipping Supabase save');
            return { success: false };
        }

        const dataToSave = {
            user_id: userId,
            steps: parseInt(stepsEntry.value),
            date: new Date(stepsEntry.date).toISOString(),
            created_at: new Date().toISOString()
        };

        const { error } = await getSupabaseClient()
            .from('steps_activity')
            .insert(dataToSave);

        if (error) {
            console.error('❌ Steps save error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Steps saved to Supabase:', dataToSave.steps);
        return { success: true };
    } catch (err) {
        console.error('❌ Error saving steps:', err);
        return { success: false };
    }
}

async function loadStepsFromSupabase() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await getSupabaseClient()
            .from('steps_activity')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(100);

        if (error) {
            console.error('❌ Steps load error:', error);
            return [];
        }

        console.log(`✅ Loaded ${data.length} steps entries from Supabase`);
        return data.map(entry => ({
            value: entry.steps,
            date: entry.date || entry.created_at
        }));
    } catch (err) {
        console.error('❌ Error loading steps:', err);
        return [];
    }
}

// ====================================
// RUNNING ACTIVITY
// Kolom: id, user_id, distance, date, created_at
// ====================================

async function saveRunningToSupabase(runningEntry) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };

        const dataToSave = {
            user_id: userId,
            distance: parseFloat(runningEntry.value),
            date: new Date(runningEntry.date).toISOString(),
            created_at: new Date().toISOString()
        };

        const { error } = await getSupabaseClient()
            .from('running_activity')
            .insert(dataToSave);

        if (error) {
            console.error('❌ Running save error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Running saved to Supabase:', dataToSave.distance, 'km');
        return { success: true };
    } catch (err) {
        console.error('❌ Error saving running:', err);
        return { success: false };
    }
}

async function loadRunningFromSupabase() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await getSupabaseClient()
            .from('running_activity')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(100);

        if (error) {
            console.error('❌ Running load error:', error);
            return [];
        }

        console.log(`✅ Loaded ${data.length} running entries from Supabase`);
        return data.map(entry => ({
            value: entry.distance,
            date: entry.date || entry.created_at
        }));
    } catch (err) {
        console.error('❌ Error loading running:', err);
        return [];
    }
}

// ====================================
// WATER CONSUMPTION
// Kolom: id, user_id, amount, date, created_at
// Constraint: unique (user_id, date)
// ====================================

async function saveWaterToSupabase(amount, date) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };

        const dateObj = new Date(date);
        const dateStr = dateObj.toISOString().split('T')[0];

        // ⭐ LANGSUNG gunakan amount yang dikirim - ini sudah TOTAL dari addWater()
        const totalAmount = parseFloat(amount);
        console.log('📊 Saving water to Supabase:', totalAmount, 'L');

        // ⭐ UPSERT: Update jika ada, insert jika tidak ada
        const { data: existing, error: selectError } = await getSupabaseClient()
            .from('water_consumption')
            .select('id, amount')
            .eq('user_id', userId)
            .gte('date', dateStr + 'T00:00:00')
            .lt('date', dateStr + 'T23:59:59')
            .single();

        if (existing && !selectError) {
            // ⭐ Set ke total amount yang dikirim
            const { error } = await getSupabaseClient()
                .from('water_consumption')
                .update({ amount: totalAmount })
                .eq('id', existing.id);

            if (error) {
                console.error('❌ Water update error:', error);
                return { success: false };
            }
            console.log('✅ Water updated in Supabase:', totalAmount, 'L');
        } else {
            // Insert new
            const { error } = await getSupabaseClient()
                .from('water_consumption')
                .insert({
                    user_id: userId,
                    amount: totalAmount,
                    date: new Date(date).toISOString(),
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('❌ Water insert error:', error);
                return { success: false };
            }
            console.log('✅ Water saved to Supabase:', totalAmount, 'L');
        }

        return { success: true };
    } catch (err) {
        console.error('❌ Error saving water:', err);
        return { success: false };
    }
}

async function loadWaterFromSupabase() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return {};

        const { data, error } = await getSupabaseClient()
            .from('water_consumption')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(30);

        if (error) {
            console.error('❌ Water load error:', error);
            return {};
        }

        console.log(`✅ Loaded ${data.length} water entries from Supabase`);
        
        const waterObj = {};
        data.forEach(entry => {
            const dateKey = new Date(entry.date).toDateString();
            waterObj[dateKey] = parseFloat(entry.amount) || 0;
        });
        
        // ⭐ SYNC ke localStorage userActivityData
        if (typeof userActivityData !== 'undefined' && currentUser?.email) {
            if (!userActivityData[currentUser.email]) {
                userActivityData[currentUser.email] = {};
            }
            if (!userActivityData[currentUser.email].water) {
                userActivityData[currentUser.email].water = {};
            }
            
            // Merge Supabase data ke localStorage
            Object.keys(waterObj).forEach(dateKey => {
                userActivityData[currentUser.email].water[dateKey] = waterObj[dateKey];
            });
            
            localStorage.setItem('userActivityData', JSON.stringify(userActivityData));
            console.log('✅ Water data synced to localStorage');
        }
        
        return waterObj;
    } catch (err) {
        console.error('❌ Error loading water:', err);
        return {};
    }
}

// ====================================
// GYM SESSIONS
// Kolom: id, user_id, category, exercise_type, duration, date, created_at
// ====================================

async function saveGymToSupabase(gymEntry) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };

        const dataToSave = {
            user_id: userId,
            category: gymEntry.category || gymEntry.type || 'general',
            exercise_type: gymEntry.exerciseType || gymEntry.exercises || 'workout',
            duration: parseInt(gymEntry.duration),
            date: new Date(gymEntry.date).toISOString(),
            created_at: new Date().toISOString()
        };

        const { error } = await getSupabaseClient()
            .from('gym_sessions')
            .insert(dataToSave);

        if (error) {
            console.error('❌ Gym save error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Gym session saved to Supabase:', dataToSave.duration, 'minutes');
        return { success: true };
    } catch (err) {
        console.error('❌ Error saving gym:', err);
        return { success: false };
    }
}

async function loadGymFromSupabase() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await getSupabaseClient()
            .from('gym_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(100);

        if (error) {
            console.error('❌ Gym load error:', error);
            return [];
        }

        console.log(`✅ Loaded ${data.length} gym sessions from Supabase`);
        return data.map(entry => ({
            type: entry.category,
            category: entry.category,
            exerciseType: entry.exercise_type,
            exercises: entry.exercise_type,
            duration: entry.duration,
            date: entry.date || entry.created_at
        }));
    } catch (err) {
        console.error('❌ Error loading gym:', err);
        return [];
    }
}

// ====================================
// SLEEP RECORDS
// Kolom: id, user_id, hours, date, created_at
// ====================================

async function saveSleepToSupabase(sleepEntry) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };

        const dataToSave = {
            user_id: userId,
            hours: parseFloat(sleepEntry.value || sleepEntry.hours),
            date: new Date(sleepEntry.date).toISOString(),
            created_at: new Date().toISOString()
        };

        const { error } = await getSupabaseClient()
            .from('sleep_records')
            .insert(dataToSave);

        if (error) {
            console.error('❌ Sleep save error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Sleep saved to Supabase:', dataToSave.hours, 'hours');
        return { success: true };
    } catch (err) {
        console.error('❌ Error saving sleep:', err);
        return { success: false };
    }
}

async function loadSleepFromSupabase() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await getSupabaseClient()
            .from('sleep_records')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(100);

        if (error) {
            console.error('❌ Sleep load error:', error);
            return [];
        }

        console.log(`✅ Loaded ${data.length} sleep records from Supabase`);
        return data.map(entry => ({
            value: entry.hours,
            hours: entry.hours,
            date: entry.date || entry.created_at
        }));
    } catch (err) {
        console.error('❌ Error loading sleep:', err);
        return [];
    }
}

// ====================================
// FOOD INTAKE
// Kolom: id, user_id, food_name, calories, carbs, protein, fat, date, created_at
// ====================================

async function saveFoodToSupabase(foodEntry) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };

        const dataToSave = {
            user_id: userId,
            food_name: foodEntry.name || 'Unknown food',
            calories: parseInt(foodEntry.calories || foodEntry.value) || 0,
            carbs: parseFloat(foodEntry.carbs) || 0,
            protein: parseFloat(foodEntry.protein) || 0,
            fat: parseFloat(foodEntry.fat) || 0,
            date: new Date(foodEntry.date).toISOString(),
            created_at: new Date().toISOString()
        };

        const { error } = await getSupabaseClient()
            .from('food_intake')
            .insert(dataToSave);

        if (error) {
            console.error('❌ Food save error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Food saved to Supabase:', dataToSave.food_name, dataToSave.calories, 'kcal');
        return { success: true };
    } catch (err) {
        console.error('❌ Error saving food:', err);
        return { success: false };
    }
}

async function loadFoodFromSupabase() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await getSupabaseClient()
            .from('food_intake')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(100);

        if (error) {
            console.error('❌ Food load error:', error);
            return [];
        }

        console.log(`✅ Loaded ${data.length} food entries from Supabase`);
        return data.map(entry => ({
            name: entry.food_name,
            value: entry.calories,
            calories: entry.calories,
            carbs: entry.carbs,
            protein: entry.protein,
            fat: entry.fat,
            date: entry.date || entry.created_at
        }));
    } catch (err) {
        console.error('❌ Error loading food:', err);
        return [];
    }
}

// ====================================
// WEIGHT TRACKING
// Kolom: id, user_id, weight, date, time, note, created_at, updated_at
// Constraint: unique (user_id, date)
// ====================================

async function saveWeightToSupabase(weightEntry) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };

        const dateStr = weightEntry.date;

        const dataToSave = {
            user_id: userId,
            weight: parseFloat(weightEntry.weight),
            date: dateStr,
            time: weightEntry.time || null,
            note: weightEntry.note || null,
            updated_at: new Date().toISOString()
        };

        // ⭐ Gunakan UPSERT - otomatis insert atau update
        const { error } = await getSupabaseClient()
            .from('weight_tracking')
            .upsert(dataToSave, { 
                onConflict: 'user_id,date'  // Jika ada conflict pada user_id+date, update
            });

        if (error) {
            console.error('❌ Weight upsert error:', error);
            return { success: false };
        }
        
        console.log('✅ Weight saved/updated in Supabase:', dataToSave.weight, 'kg');
        return { success: true };
    } catch (err) {
        console.error('❌ Error saving weight:', err);
        return { success: false };
    }
}

async function loadWeightFromSupabase() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return [];

        const { data, error } = await getSupabaseClient()
            .from('weight_tracking')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(100);

        if (error) {
            console.error('❌ Weight load error:', error);
            return [];
        }

        console.log(`✅ Loaded ${data.length} weight entries from Supabase`);
        return data.map(entry => ({
            weight: parseFloat(entry.weight),
            date: entry.date,
            time: entry.time,
            note: entry.note,
            timestamp: entry.created_at
        }));
    } catch (err) {
        console.error('❌ Error loading weight:', err);
        return [];
    }
}

// ====================================
// SYNC ALL DATA FROM SUPABASE
// ====================================

async function syncAllActivityData() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.email || !currentUser.id) {
            console.log('⚠️ No user logged in, cannot sync');
            return null;
        }

        console.log('🔄 Syncing all activity data from Supabase for:', currentUser.email);

        const [steps, running, water, gym, sleep, food, weight] = await Promise.all([
            loadStepsFromSupabase(),
            loadRunningFromSupabase(),
            loadWaterFromSupabase(),
            loadGymFromSupabase(),
            loadSleepFromSupabase(),
            loadFoodFromSupabase(),
            loadWeightFromSupabase()
        ]);

        let localData = JSON.parse(localStorage.getItem('userActivityData') || '{}');
        
        if (!localData[currentUser.email]) {
            localData[currentUser.email] = {};
        }

        const userData = localData[currentUser.email];

        userData.steps = mergeArrayByTimestamp(userData.steps || [], steps);
        userData.running = mergeArrayByTimestamp(userData.running || [], running);
        userData.gym = mergeArrayByTimestamp(userData.gym || [], gym);
        userData.sleep = mergeArrayByTimestamp(userData.sleep || [], sleep);
        userData.food = mergeArrayByTimestamp(userData.food || [], food);
        userData.water = { ...(userData.water || {}), ...water };

        localStorage.setItem('userActivityData', JSON.stringify(localData));

        const weightKey = `weightTracking_${currentUser.email}`;
        if (weight.length > 0) {
            localStorage.setItem(weightKey, JSON.stringify(weight));
        }

        if (typeof userActivityData !== 'undefined') {
            userActivityData[currentUser.email] = userData;
        }

        console.log('✅ All activity data synced from Supabase!');
        return userData;

    } catch (err) {
        console.error('❌ Error syncing activity data:', err);
        return null;
    }
}

function mergeArrayByTimestamp(localArr, supabaseArr) {
    const merged = [...supabaseArr];
    
    localArr.forEach(localItem => {
        const localTime = new Date(localItem.date).getTime();
        const exists = merged.some(item => {
            const itemTime = new Date(item.date).getTime();
            return Math.abs(itemTime - localTime) < 60000;
        });
        
        if (!exists) {
            merged.push(localItem);
        }
    });

    return merged.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ====================================
// AUTO SAVE HELPER
// ====================================

async function autoSaveToSupabase(type, entry) {
    if (!getSupabaseClient()) {
        console.log('⚠️ Supabase not available');
        return { success: false };
    }

    console.log(`💾 Auto-saving ${type} to Supabase...`);
    
    switch(type) {
        case 'steps': return await saveStepsToSupabase(entry);
        case 'running': return await saveRunningToSupabase(entry);
        case 'water': return await saveWaterToSupabase(entry.amount || entry.value, entry.date || new Date());
        case 'gym': return await saveGymToSupabase(entry);
        case 'sleep': return await saveSleepToSupabase(entry);
        case 'food': return await saveFoodToSupabase(entry);
        case 'weight': return await saveWeightToSupabase(entry);
        default: return { success: false };
    }
}

// ====================================
// INITIALIZE
// ====================================

async function initActivitySync() {
    console.log('🚀 Initializing Activity Sync v' + ACTIVITY_SYNC_VERSION);

    if (!getSupabaseClient()) {
        console.log('⚠️ Supabase not available');
        activitySyncEnabled = false;
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
        console.log('⚠️ No user ID found');
        return;
    }

    await syncAllActivityData();
    console.log('✅ Activity Sync initialized!');
}

// ====================================
// EXPOSE TO WINDOW
// ====================================

window.SupabaseActivitySync = {
    sync: syncAllActivityData,
    init: initActivitySync,
    autoSave: autoSaveToSupabase,
    saveSteps: saveStepsToSupabase,
    saveRunning: saveRunningToSupabase,
    saveWater: saveWaterToSupabase,
    saveGym: saveGymToSupabase,
    saveSleep: saveSleepToSupabase,
    saveFood: saveFoodToSupabase,
    saveWeight: saveWeightToSupabase,
    loadSteps: loadStepsFromSupabase,
    loadRunning: loadRunningFromSupabase,
    loadWater: loadWaterFromSupabase,
    loadGym: loadGymFromSupabase,
    loadSleep: loadSleepFromSupabase,
    loadFood: loadFoodFromSupabase,
    loadWeight: loadWeightFromSupabase,
    getCurrentUserId,
    getCurrentUserEmail,
    version: ACTIVITY_SYNC_VERSION
};

// ⭐ JUGA expose ke window global untuk compatibility dengan weight-tracker-integrated.js
window.saveWeightToSupabase = saveWeightToSupabase;
window.loadWeightFromSupabase = loadWeightFromSupabase;
window.saveWaterToSupabase = saveWaterToSupabase;
window.loadWaterFromSupabase = loadWaterFromSupabase;
window.deleteWeightFromSupabase = async function(date) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return { success: false };
        
        const { error } = await getSupabaseClient()
            .from('weight_tracking')
            .delete()
            .eq('user_id', userId)
            .eq('date', date);
        
        if (error) {
            console.error('❌ Weight delete error:', error);
            return { success: false };
        }
        
        console.log('✅ Weight deleted from Supabase');
        return { success: true };
    } catch (err) {
        console.error('❌ Error deleting weight:', err);
        return { success: false };
    }
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (getSupabaseClient()) {
            initActivitySync();
        }
    }, 2000);
});

console.log('✅ Supabase Activity Sync v' + ACTIVITY_SYNC_VERSION + ' loaded!');