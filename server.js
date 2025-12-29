// server.js - FINAL VERSION dengan Support JPG/JPEG/PNG/WebP
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

console.log('\n🔍 Checking OpenAI Configuration...');

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ OPENAI_API_KEY tidak valid!');
    process.exit(1);
}

console.log('✅ API Key valid');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        openai: 'configured',
        visionModel: 'gpt-4o-mini',
        supportedFormats: ['JPG', 'JPEG', 'PNG', 'WebP'],
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({
        status: 'Health Tracker Backend API',
        version: '2.3',
        visionModel: 'gpt-4o-mini (economical)',
        supportedImageFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        endpoints: {
            health: 'GET /api/health',
            aiAnalysis: 'POST /api/ai-analysis',
            detectFood: 'POST /api/detect-food'
        }
    });
});

// AI Analysis Endpoint
app.post('/api/ai-analysis', async (req, res) => {
    try {
        console.log('\n🔥 New AI Analysis Request');
        
        const { prompt, type } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                success: false,
                error: 'Prompt diperlukan' 
            });
        }

        const systemPrompts = {
            steps: 'Kamu adalah ahli kesehatan dan fitness yang memberikan analisis tentang aktivitas langkah kaki. Berikan analisis yang praktis, memotivasi, dan menggunakan emoji yang relevan.',
            running: 'Kamu adalah pelatih lari profesional yang memberikan analisis performa lari. Berikan tips yang actionable dan motivasi.',
            water: 'Kamu adalah ahli kesehatan dan hidrasi yang memberikan rekomendasi konsumsi air. Berikan saran yang praktis berdasarkan berat badan, aktivitas, dan kondisi tubuh.',
            calorieOut: 'Kamu adalah nutritionist dan fitness expert yang menganalisis pembakaran kalori. Berikan insight yang membantu user mencapai target mereka.',
            gym: 'Kamu adalah personal trainer profesional yang memberikan program latihan. Berikan saran yang aman dan efektif.',
            sleep: 'Kamu adalah sleep specialist dan ahli kesehatan yang menganalisis pola tidur. Berikan saran untuk meningkatkan kualitas tidur.',
            food: 'Kamu adalah ahli gizi dan nutritionist profesional yang menganalisis asupan nutrisi. Berikan rekomendasi yang seimbang dan praktis.',
            general: 'Kamu adalah asisten kesehatan yang membantu pengguna mencapai gaya hidup sehat.'
        };

        const systemPrompt = systemPrompts[type] || systemPrompts.general;

        console.log('🤖 Calling OpenAI API (gpt-3.5-turbo)...');

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.7
        });

        const aiResponse = completion.choices[0].message.content;
        
        console.log('✅ OpenAI Response received');
        
        res.json({ 
            success: true, 
            response: aiResponse,
            usage: completion.usage
        });

    } catch (error) {
        console.error('\n❌ ERROR in /api/ai-analysis:', error.message);
        
        let errorMessage = 'Terjadi kesalahan saat menghubungi AI';
        let statusCode = 500;

        if (error.message.includes('API key')) {
            errorMessage = '❌ API Key OpenAI tidak valid';
            statusCode = 401;
        } else if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
            errorMessage = '❌ Kuota OpenAI habis';
            statusCode = 429;
        } else if (error.message.includes('rate_limit')) {
            errorMessage = '⚠️ Terlalu banyak request';
            statusCode = 429;
        }
        
        res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            details: error.message
        });
    }
});

// 📸 FOOD DETECTION - Support JPG/JPEG/PNG/WebP
app.post('/api/detect-food', async (req, res) => {
    try {
        console.log('\n📸 New Food Detection Request');
        
        const { imageBase64 } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({ 
                success: false,
                error: 'Image diperlukan' 
            });
        }

        console.log('🤖 Analyzing food with GPT-4o-mini...');
        console.log('Image size:', Math.round(imageBase64.length / 1024), 'KB');

        // ✅ AUTO-DETECT IMAGE FORMAT dari base64 signature
        let imageFormat = 'jpeg'; // default
        if (imageBase64.startsWith('/9j/')) {
            imageFormat = 'jpeg'; // JPEG/JPG
        } else if (imageBase64.startsWith('iVBORw0KGgo')) {
            imageFormat = 'png'; // PNG
        } else if (imageBase64.startsWith('UklGR')) {
            imageFormat = 'webp'; // WebP
        }
        
        console.log('📸 Detected format:', imageFormat);

        // ✅ GUNAKAN GPT-4O-MINI (Support vision)
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analisis foto makanan ini. HARUS respond dengan JSON valid:

{
  "nama": "nama makanan indonesia",
  "kalori": 300,
  "karbohidrat": 40,
  "protein": 20,
  "lemak": 10,
  "deskripsi": "deskripsi singkat"
}

PENTING:
- Output HANYA JSON tanpa teks apapun
- Angka harus integer (bukan string)
- Estimasi berdasarkan porsi foto
- Bahasa Indonesia`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/${imageFormat};base64,${imageBase64}`,
                                detail: "low"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 300,
            temperature: 0.1
        });

        const aiResponse = completion.choices[0].message.content.trim();
        
        console.log('✅ Food detection completed');
        console.log('Response preview:', aiResponse.substring(0, 100) + '...');
        console.log('Tokens used:', completion.usage);

        // Parse JSON dengan robust error handling
        let foodData;
        try {
            let cleanResponse = aiResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .replace(/^[^{]*/, '')
                .replace(/[^}]*$/, '')
                .trim();
            
            foodData = JSON.parse(cleanResponse);
            
            // Ensure all fields exist and are integers
            foodData.nama = foodData.nama || "Makanan";
            foodData.kalori = parseInt(foodData.kalori) || 250;
            foodData.karbohidrat = parseInt(foodData.karbohidrat) || 30;
            foodData.protein = parseInt(foodData.protein) || 15;
            foodData.lemak = parseInt(foodData.lemak) || 10;
            foodData.deskripsi = foodData.deskripsi || "Nilai gizi estimasi";
            
            console.log('✅ Final food data:', foodData);
            
        } catch (parseError) {
            console.error('❌ JSON Parse failed:', parseError.message);
            console.error('Raw response:', aiResponse);
            
            foodData = extractFoodDataManually(aiResponse);
        }

        res.json({
            success: true,
            food: foodData,
            imageFormat: imageFormat,
            usage: completion.usage,
            model: 'gpt-4o-mini'
        });

    } catch (error) {
        console.error('\n❌ ERROR in /api/detect-food:');
        console.error('Type:', error.constructor.name);
        console.error('Message:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }

        let errorMessage = 'Gagal mendeteksi makanan';
        let errorDetails = error.message;
        let statusCode = 500;

        if (error.message.includes('insufficient_quota') || error.message.includes('exceeded your current quota')) {
            errorMessage = '❌ Kuota OpenAI Habis';
            errorDetails = 'Akun Anda kehabisan credit. Isi saldo di: https://platform.openai.com/account/billing/overview';
            statusCode = 402;
        } else if (error.message.includes('model') && error.message.includes('does not exist')) {
            errorMessage = '❌ Model Tidak Tersedia';
            errorDetails = 'Model gpt-4o-mini tidak tersedia untuk akun Anda.';
            statusCode = 403;
        } else if (error.message.includes('API key')) {
            errorMessage = '❌ API Key Invalid';
            errorDetails = 'Periksa OPENAI_API_KEY di file .env';
            statusCode = 401;
        } else if (error.message.includes('rate_limit')) {
            errorMessage = '⚠️ Rate Limit';
            errorDetails = 'Terlalu banyak request. Tunggu 1 menit.';
            statusCode = 429;
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            details: errorDetails,
            help: 'Gunakan input manual jika deteksi foto tidak tersedia'
        });
    }
});

// Helper: Extract data manually
function extractFoodDataManually(text) {
    console.log('🔧 Manual extraction fallback...');
    
    const foodData = {
        nama: "Makanan",
        kalori: 250,
        karbohidrat: 30,
        protein: 15,
        lemak: 10,
        deskripsi: "Estimasi"
    };
    
    try {
        const patterns = {
            nama: [/"nama"\s*:\s*"([^"]+)"/i, /nama[:\s]+([^\n,}]+)/i],
            kalori: [/"kalori"\s*:\s*(\d+)/i, /kalori[:\s]+(\d+)/i, /(\d{2,3})\s*kalori/i],
            karbohidrat: [/"karbohidrat"\s*:\s*(\d+)/i, /karbohidrat[:\s]+(\d+)/i],
            protein: [/"protein"\s*:\s*(\d+)/i, /protein[:\s]+(\d+)/i],
            lemak: [/"lemak"\s*:\s*(\d+)/i, /lemak[:\s]+(\d+)/i]
        };
        
        for (const [key, regexList] of Object.entries(patterns)) {
            for (const regex of regexList) {
                const match = text.match(regex);
                if (match) {
                    if (key === 'nama') {
                        foodData[key] = match[1].trim();
                    } else {
                        foodData[key] = parseInt(match[1]);
                    }
                    break;
                }
            }
        }
        
        console.log('✅ Extraction result:', foodData);
    } catch (e) {
        console.error('❌ Extraction error:', e.message);
    }
    
    return foodData;
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('✅ SERVER RUNNING - Support JPG/JPEG/PNG/WebP');
    console.log('='.repeat(70));
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🤖 AI Analysis: POST /api/ai-analysis`);
    console.log(`📸 Food Detection: POST /api/detect-food`);
    console.log('='.repeat(70));
    console.log('💡 Vision Model: gpt-4o-mini');
    console.log('📁 Image Formats: JPG, JPEG, PNG, WebP');
    console.log('⚡ Ready!\n');
});

process.on('SIGTERM', () => {
    console.log('\n👋 Server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 Stopped by user');
    process.exit(0);
});