// KrishiMitra AI - JavaScript Functionality


// OpenWeatherMap API Key
const API_KEY = '8371e0a55f78972661743dbb15d9ae17';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Gemini API Key (replace with your actual key from Google AI Studio)
const GEMINI_API_KEYS = [
    'AIzaSyCkYSqPtuZ0fSmZ0SeUkg-ZrCvIgseRMOM', // Key 1
    'AIzaSyC__DBjJfrc-DpEAiDnGwPuusLEYg2-w-Y', // Key 2
    'AIzaSyCvFbapdFnHNoRDAp2kJJl5Cg13KKV4y-k', // Key 3
    'AIzaSyB5QZQ3llnJTubA8UKP82b_k1hqRCahdB4', // Key 4
    'AIzaSyBX-_ERHuecL8U9yLRRIVFAyfGwCN3inZ4'
];
let activeApiKey = null; // Tracks the currently active API key
let genAI; // Global Gemini client instance
let useRestAPI = false; // Flag to use REST API if CDN fails

// Global variables
let currentWeatherData = null;
let chatHistory = [];
let attachedImage = null; // Stores the selected File object
let attachedImagePreview = null; // URL for preview (revoke after use)
let userLocation = ''; // Global for quick access
let isLoadingHistory = false;

// Sample crop data for recommendations
const realCrops = [
    {
        name: "",
        expectedYield: "",
        profitMargin: "",
        season: "",
        waterRequirement: ""
    },
    {
        name: "",
        expectedYield: "",
        profitMargin: "",
        season: "",
        waterRequirement: ""
    }
];

// AI responses for fallback
const aiResponses = {
    default: [
        "I'm here to help with farming questions! Ask about crop selection, soil management, pest control, irrigation, or other agricultural topics.",
        "Feel free to ask about the best crops for your soil type, weather-appropriate techniques, or yield improvement!",
        "I can guide on sustainable farming, crop rotation, fertilizers, and more. What would you like to know?"
    ],
    crops: [
        "Based on soil analysis, focus on crops matching your soil pH and nutrients. Corn and soybeans work well with proper fertilization.",
        "For your climate, consider drought-resistant varieties if water is scarce. Wheat is great for winter, corn and soybeans for summer.",
        "Crop rotation helps soil health. Alternate nitrogen-fixing crops like soybeans with nutrient-heavy crops like corn."
    ],
    soil: [
        "Healthy soil is key! Aim for a soil pH of 6.0-7.0 for most crops. Use lime if pH is too low.",
        "Test soil every 2-3 years to track nutrients. Maintain organic matter with compost or cover crops.",
        "Good drainage is vital. For clay soil, add organic matter or use raised beds for better water management."
    ],
    weather: [
        "Weather impacts crop selection and timing. Monitor local forecasts and historical data for planting.",
        "Use climate adaptation strategies like drought-resistant varieties or season extension.",
        "Timing based on frost dates and temperatures can boost your harvest."
    ],
    pest: [
        "Integrated Pest Management (IPM) combines biological, cultural, and chemical controls for sustainability.",
        "Regular field scouting catches pest issues early when they're easier to manage.",
        "Beneficial insects and companion planting can reduce pest populations naturally."
    ],
    photo: [
        "The uploaded image shows a crop field. Want me to check for pests, diseases, or nutrient issues?",
        "The image depicts a farm area. Specify what you need help with, like crop health or soil conditions!",
        "Thanks for the photo! Describe what you need analyzed, like pests or crop health."
    ]
};

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const soilForm = document.getElementById('soil-form');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const weatherWidget = document.getElementById('weather-widget');
const cropRecommendations = document.querySelector('.crop-grid');
const toastContainer = document.getElementById('toast-container');
const photoButton = document.getElementById('photo-button');
const photoUpload = document.getElementById('photo-upload');
const photoCapture = document.getElementById('photo-capture');
const speechButton = document.getElementById('speech-button');
const modal = document.getElementById('signin-modal');
const appContainer = document.querySelector('.app-container'); // For optional dimming
const profileContent = document.getElementById('profile-content');

// Initialize Gemini client with REST API fallback


// Helper function to try REST API with multiple keys
async function tryRestApiInitialization() {
    for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
        const apiKey = GEMINI_API_KEYS[i];
        try {
            // Test the API key with a simple request
            const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Test' }] }] })
            });
            if (response.ok) {
                console.log(REST API initialized successfully with key ${i + 1});
                activeApiKey = apiKey;
                // showToast(AI assistant Active with REST API (Key ${i + 1}), 'success');
                return true;
            } else {
                const errorData = await response.json();
                console.error(REST API initialization failed with key ${i + 1}:, errorData.error?.message);
            }
        } catch (error) {
            console.error(REST API initialization error with key ${i + 1}:, error.message);
        }
    }
    console.error('All API keys failed for REST API initialization');
    showToast('AI Assistant Offline', 'error');
    return false;
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Weather Functions
async function fetchWeatherData() {
  // Prioritize stored location
  const userData = JSON.parse(localStorage.getItem('krishimitra_user') || '{}');
  let city = userData.city || 'Faridabad'; // Use stored city

  console.log('Fetching weather for:', city);
  try {
    if (navigator.geolocation && !userData.city) { // Only if no stored city
      await fetchAndUpdateLocation(); // Syncs and updates weather
      return; // Early exit—location fetch handles weather
    } else {
      await updateWeatherByCity(city); // Use stored/parsed city
    }
  } catch (error) {
    console.error('Weather error:', error);
    updateDefaultWeatherDisplay();
  }
}

async function updateWeatherByCity(city) {
    try {
        console.log(Fetching weather for city: ${city});
        const response = await fetch(${API_URL}?q=${city}&appid=${API_KEY}&units=metric);
        if (!response.ok) throw new Error('City not found');
        const data = await response.json();
        updateWeatherDisplay(data);
    } catch (error) {
        console.error('Error fetching weather by city:', error);
        updateErrorDisplay('City not found');
    }
}

async function updateWeatherByCoords(lat, lon) {
    try {
        console.log(Fetching weather for coordinates: lat=${lat}, lon=${lon});
        const response = await fetch(${API_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric);
        if (!response.ok) throw new Error('Weather data not available');
        const data = await response.json();
        updateWeatherDisplay(data);
    } catch (error) {
        console.error('Error fetching weather by coordinates:', error);
        updateErrorDisplay('Failed to load weather data');
    }
}

function updateWeatherDisplay(data) {
    const temperature = document.querySelector('.temperature');
    const condition = document.querySelector('.condition');
    const location = document.querySelector('.location');
    const humidity = document.querySelector('.weather-detail:nth-child(1) span:last-child');
    const wind = document.querySelector('.weather-detail:nth-child(2) span:last-child');
    const rainfall = document.querySelector('.weather-detail:nth-child(3) span:last-child');
    const weatherIcon = document.querySelector('.weather-icon i');

    temperature.textContent = ${Math.round(data.main.temp)}°C;
    condition.textContent = data.weather[0].main;
    location.textContent = ${data.name}, ${data.sys.country};
    humidity.textContent = ${data.main.humidity}%;
    wind.textContent = ${Math.round(data.wind.speed * 3.6)} km/h;
    rainfall.textContent = data.rain ? ${data.rain['1h'] || 0} mm : '0 mm';

    currentWeatherData = {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main
    };

    updateWeatherIcon(weatherIcon, data.weather[0].main);
}

function updateWeatherIcon(iconElement, condition) {
    const iconClasses = {
        'Clear': 'fa-sun',
        'Clouds': 'fa-cloud',
        'Rain': 'fa-cloud-rain',
        'Drizzle': 'fa-cloud-rain',
        'Thunderstorm': 'fa-bolt',
        'Snow': 'fa-snowflake',
        'Mist': 'fa-smog',
        'Fog': 'fa-smog'
    };
    iconElement.className = 'fas';
    iconElement.classList.add(iconClasses[condition] || 'fa-cloud');
}

function updateErrorDisplay(message) {
    const location = document.querySelector('.location');
    location.textContent = message;
}

// Soil Form Submission
document.getElementById('soil-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    showToast('Analysing data...', 'info');

    const formData = {
    location: document.getElementById('location').value.trim(),
    last_crop: document.getElementById('last-crop').value.trim(),
    farm_size: document.getElementById('farm-size').value.trim(),
    farm_size_unit: document.getElementById('farm-size-unit').value.trim(),
    crop_type: document.getElementById('crop-type').value.trim()  // New addition
    };

    if (!formData.location || !formData.farm_size || !formData.farm_size_unit || !formData.crop_type) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    if (isNaN(parseFloat(formData.farm_size)) || parseFloat(formData.farm_size) <= 0) {
        showToast('Farm size must be a positive number', 'error');
        return;
    }

    try {
        const response = await fetch("https://innervisionsih.vercel.app/analyze", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
        }

        const data = await response.json();

        window.pdfBase64 = data.pdf_base64;

        showToast('Data analysed', 'success');

        document.querySelector('.analyze-show').style.display = 'flex';
        
        const realCrops = data.crops.map(crop => ({
            name: crop.name,
            suitability: crop.suitability || 85,
            expectedYield: crop.expectedYield,
            profitMargin: crop.profitMargin,
            season: crop.season,
            waterRequirement: crop.waterRequirement
        }));
        
        displayCropRecommendations(realCrops);
        
        window.pdfUrl = data.pdf_url;

        const recommendationsSection = document.getElementById('recommendations');
        if (recommendationsSection) {
            recommendationsSection.classList.add('active');
            document.querySelectorAll('.section').forEach(section => {
                if (section.id !== 'recommendations') section.classList.remove('active');
            });
            const navItem = document.querySelector('.nav-item[data-section="recommendations"]');
            if (navItem) {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                navItem.classList.add('active');
            }
        }

        const cropGrid = document.querySelector('.crop-grid');
        if (cropGrid) {
            cropGrid.scrollIntoView({ behavior: 'smooth' });
        } else {
            recommendationsSection.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Error analysing data: ' + error.message, 'error');
    }
});

function openPdf() {
    if (window.pdfBase64) {
        const byteCharacters = atob(window.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } else {
        showToast('PDF not available', 'error');
    }
}

function generateCropRecommendations(soilData) {
    console.log('Generating crop recommendations for:', soilData);
    const recommendations = [...realCrops];
    
    recommendations.forEach(crop => {
        let adjustedSuitability = crop.suitability;
        
        const phLevel = parseFloat(soilData.phLevel) || 6.5;
        if (phLevel < 6.0 || phLevel > 8.0) {
            adjustedSuitability -= 10;
        }
        
        if (soilData.soilType === 'sandy' && crop.waterRequirement === 'High') {
            adjustedSuitability -= 15;
        } else if (soilData.soilType === 'clay' && crop.waterRequirement === 'Low') {
            adjustedSuitability += 5;
        }
        
        const nitrogen = parseFloat(soilData.nitrogen) || 0;
        const phosphorus = parseFloat(soilData.phosphorus) || 0;
        const potassium = parseFloat(soilData.potassium) || 0;
        
        if (nitrogen > 2.0 && phosphorus > 1.0 && potassium > 2.5) {
            adjustedSuitability += 10;
        }
        
        crop.adjustedSuitability = Math.max(20, Math.min(100, adjustedSuitability));
    });
    
    recommendations.sort((a, b) => b.adjustedSuitability - a.adjustedSuitability);
    
    displayCropRecommendations(recommendations);
}

function displayCropRecommendations(crops) {
    console.log('Displaying crop recommendations:', crops);
    if (!cropRecommendations) {
        console.error('Crop recommendations container not found');
        showToast('Error: Crop recommendations container not found', 'error');
        return;
    }
    if (!crops || !Array.isArray(crops) || crops.length === 0) {
        console.error('No valid crop data provided');
        return;
    }

    cropRecommendations.innerHTML = '';
    
    crops.forEach(crop => {
        const suitability = crop.adjustedSuitability || crop.suitability;
        const suitabilityClass = suitability >= 80 ? 'high' : suitability >= 60 ? 'medium' : 'low';
        
        const cropCard = document.createElement('div');
        cropCard.className = 'card crop-card';
        cropCard.innerHTML = `
            <div class="card-header">
                <div class="crop-header">
                    <div class="crop-title">
                        <i class="fas fa-seedling"></i>
                        <span>${crop.name}</span>
                    </div>
                    <div class="crop-badge ${suitabilityClass}">
                        ${Math.round(suitability)}% Match
                    </div>
                </div>
            </div>
            <div class="card-content">
                <div class="crop-details">
                    <div class="crop-detail">
                        <i class="fas fa-chart-line"></i>
                        <span class="label">Yield:</span>
                        <span class="value">${crop.expectedYield}</span>
                    </div>
                    <div class="crop-detail">
                        <i class="fas fa-rupee-sign"></i>
                        <span class="label">Current Price:</span>
                        <span class="value success">${crop.profitMargin}</span>
                    </div>
                    <div class="crop-detail">
                        <i class="fas fa-question"></i>
                        <span class="label">Reason:</span>
                        <span class="value">${crop.season}</span>
                    </div>
                    <div class="crop-detail">
                        <i class="fas fa-tint"></i>
                        <span class="label">Water:</span>
                        <span class="value">${crop.waterRequirement}</span>
                    </div>
                </div>
            </div>
        `;
        
        cropRecommendations.appendChild(cropCard);
    });

    const recommendationsSection = document.getElementById('recommendations');
    if (recommendationsSection && window.innerWidth <= 767) {
        recommendationsSection.classList.add('active');
        document.querySelectorAll('.section').forEach(section => {
            if (section.id !== 'recommendations') section.classList.remove('active');
        });
        const navItem = document.querySelector('.nav-item[data-section="recommendations"]');
        if (navItem) {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            navItem.classList.add('active');
        }
    }
}

// Text-to-Speech Function
function speakText(text) {
    if (!('speechSynthesis' in window)) {
        showToast('Text-to-speech not supported in this browser.', 'error');
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Default to English
    utterance.volume = 1.0;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Attempt to use a voice that matches the selected language, if available
    const selectedLang = document.getElementById('language-toggle')?.value || 'en';
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(voice => voice.lang.startsWith(selectedLang));
    if (matchingVoice) {
        utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
}

// Chat Functions
async function handleChatSubmit(event) {
    event.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message && !attachedImage) return; // Nothing to send
    
    // Display user's message (with image if attached)
    if (attachedImage) {
        addChatMessage({ text: message || 'Photo uploaded', imageUrl: attachedImagePreview });
    } else {
        addChatMessage(message, 'user');
    }
    
    chatInput.value = '';
    chatInput.disabled = true;
    
    const loadingMsg = addChatMessage('AI is thinking...', 'ai');
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await generateAIResponse(message, attachedImage); // Pass image if attached
        chatMessages.removeChild(loadingMsg);
        addChatMessage(response, 'ai');
    } catch (error) {
        chatMessages.removeChild(loadingMsg);
        addChatMessage('Sorry, something went wrong. Please try again.', 'ai');
        showToast('Chat error: ' + error.message, 'error');
    } finally {
        clearAttachedImage();
        const previewContainer = document.getElementById('image-preview-container');
        if (previewContainer) {
            previewContainer.style.transition = 'opacity 0.3s';
            previewContainer.style.opacity = '0';
            setTimeout(() => {
                previewContainer.innerHTML = '';
                previewContainer.style.opacity = '';
            }, 300);
        }
        chatInput.disabled = false;
        chatInput.focus();
    }
}

function addChatMessage(content, type = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = message ${type}-message;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    let textContent = '';
    if (typeof content === 'string') {
        textContent = content;
        contentDiv.innerHTML = <p>${content}</p>;
    } else if (content && content.text) { // Handle object with image
        textContent = content.text;
        let html = <p>${content.text}</p>;
        if (content.imageUrl) {
            html += <img src="${content.imageUrl}" alt="Uploaded photo" style="max-width: 100%; margin-top: 10px; border-radius: 8px;">;
        }
        contentDiv.innerHTML = html;
    }
    
    // Add speaker button for AI messages, excluding 'AI is thinking...'
    if (type === 'ai' && textContent !== 'AI is thinking...') {
        const speakerButton = document.createElement('button');
        speakerButton.className = 'speaker-button';
        speakerButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        speakerButton.title = 'Speak message';
        speakerButton.style.marginLeft = '10px';
        speakerButton.style.cursor = 'pointer';
        speakerButton.style.background = 'none';
        speakerButton.style.border = 'none';
        speakerButton.style.fontSize = '14px';
        speakerButton.addEventListener('click', () => speakText(textContent));
        contentDiv.appendChild(speakerButton);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    const currentUserData = JSON.parse(localStorage.getItem('krishimitra_user') || '{}');
    if (currentUserData.email && !isLoadingHistory && (type !== 'ai' || (typeof content === 'string' && content !== 'AI is thinking...'))) {
        const parts = typeof content === 'string' ? [{ text: content }] : [{ text: content.text || '' }];
        chatHistory.push({
            role: type === 'user' ? 'user' : 'model',
            parts,
            timestamp: new Date()
        });
        localStorage.setItem(chatHistory_${currentUserData.email}, JSON.stringify(chatHistory));
    }
    
    return messageDiv;
}

async function generateAIResponse(userMessage, imageFile = null) {
    if (!activeApiKey || GEMINI_API_KEYS.every(key => !key || key === 'YOUR_API_KEY_HERE')) {
        return generateFallbackResponse(userMessage);
    }

    const systemPrompt = You are KrishiMitra AI, a helpful farming assistant and advanced agricultural research advisor. You combine practical guidance for Indian farmers with deep expertise in soil science, plant physiology, crop genetics, precision agriculture, and sustainable farming practices. Respond concisely, in simple language that farmers can easily understand, but also provide scientific insights when useful. Focus on crops, soil, weather, pests, irrigation, market trends, and sustainable methods. Do not use Markdown formatting like bold or italics. Maintain context from the conversation history, and always end your response with a question to keep the conversation going.;
    //  If relevant, reference current weather: ${JSON.stringify(currentWeatherData || {})}.

    let categoryPrompt = '';
    const messageLower = userMessage.toLowerCase();
    if (messageLower.includes('crop') || messageLower.includes('plant') || messageLower.includes('grow') || messageLower.includes('recommend')) {
        categoryPrompt = ' Focus on crop recommendations based on soil, weather, and yield.';
    } else if (messageLower.includes('soil') || messageLower.includes('ph') || messageLower.includes('nutrient') || messageLower.includes('fertilizer')) {
        categoryPrompt = ' Provide soil management tips, including pH and nutrients.';
    } else if (messageLower.includes('weather') || messageLower.includes('rain') || messageLower.includes('temperature') || messageLower.includes('climate')) {
        categoryPrompt = ' Give weather-based farming advice.';
    } else if (messageLower.includes('pest') || messageLower.includes('insect') || messageLower.includes('disease') || messageLower.includes('bug')) {
        categoryPrompt = ' Suggest integrated pest management strategies.';
    } else if (messageLower.includes('photo') || messageLower.includes('image') || messageLower.includes('picture') || imageFile) {
        categoryPrompt = ' Analyze farming-related images for crop health, pests, or soil issues.';
    }

    let userParts = [{ text: userMessage }];
    if (imageFile) {
        const base64Image = await fileToBase64(imageFile);
        userParts.push({
            inlineData: {
                mimeType: imageFile.type,
                data: base64Image.split(',')[1]
            }
        });
        // Adjust prompt for image if not already image-focused
        if (!categoryPrompt.includes('image')) {
            categoryPrompt += ' Analyze the attached image for crop health, pests, soil issues, or other farming aspects based on the user\'s message.';
        }
    }

    // Prepare conversation history for Gemini API, excluding timestamp
    const contents = [
        {
            role: 'user',
            parts: [{ text: systemPrompt + categoryPrompt }]
        },
        ...chatHistory.map(({ role, parts }) => ({ role, parts })),
        {
            role: 'user',
            parts: userParts
        }
    ];

    // Try each API key
    for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
        const apiKey = GEMINI_API_KEYS[i];
        try {
            if (useRestAPI || !genAI) {
                // Use REST API
                const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'REST API request failed');
                }

                const result = await response.json();
                const responseText = result.candidates[0].content.parts[0].text;
                if (!responseText) {
                    throw new Error('Empty response from REST API');
                }
                activeApiKey = apiKey; // Update active key
                console.log(Response generated with key ${i + 1});
                return responseText.trim();
            } else {
                // Use SDK
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', apiKey });
                const result = await model.generateContent({ contents });
                const responseText = result.response.text();
                if (!responseText) {
                    throw new Error('Empty response from SDK');
                }
                activeApiKey = apiKey; // Update active key
                console.log(Response generated with key ${i + 1});
                return responseText.trim();
            }
        } catch (error) {
            console.error(Error with API key ${i + 1}:, error.message);
            if (i === GEMINI_API_KEYS.length - 1) {
                showToast('All AI keys failed or rate-limited. Using basic responses.', 'error');
                return generateFallbackResponse(userMessage);
            }
        }
    }
}

function generateFallbackResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    let responseCategory = 'default';
    
    if (message.includes('crop') || message.includes('plant') || message.includes('grow') || message.includes('recommend')) {
        responseCategory = 'crops';
    } else if (message.includes('soil') || message.includes('ph') || message.includes('nutrient') || message.includes('fertilizer')) {
        responseCategory = 'soil';
    } else if (message.includes('weather') || message.includes('rain') || message.includes('temperature') || message.includes('climate')) {
        responseCategory = 'weather';
    } else if (message.includes('pest') || message.includes('insect') || message.includes('disease') || message.includes('bug')) {
        responseCategory = 'pest';
    } else if (message.includes('photo') || message.includes('image') || message.includes('picture')) {
        responseCategory = 'photo';
    }
    
    const responses = aiResponses[responseCategory];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    let contextualInfo = '';
    if (currentWeatherData && (responseCategory === 'weather' || responseCategory === 'crops')) {
        contextualInfo = ` Given the current ${currentWeatherData.condition.toLowerCase()} weather at ${currentWeatherData.temperature}°C, `;
        if (responseCategory === 'crops') {
            contextualInfo += 'consider timing your planting and irrigation accordingly.';
        } else {
            contextualInfo += 'monitor field conditions closely for any necessary adjustments.';
        }
    }
    
    return randomResponse + contextualInfo;
}

// Photo Upload and Capture Functions
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function handlePhotoButtonClick() {
    if (isMobileDevice()) {
        const choice = confirm("Would you like to upload a photo or capture one with your camera?");
        if (choice) {
            photoCapture.click();
        } else {
            photoUpload.click();
        }
    } else {
        photoUpload.click();
    }
}

async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        showToast('No file selected or camera access denied.', 'error');
        return;
    }
    
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }

    // Store the file and create a preview URL
    attachedImage = file;
    attachedImagePreview = URL.createObjectURL(file);

    // Show preview above the input
    const previewContainer = document.getElementById('image-preview-container');
    if (!previewContainer) {
        console.error('Add <div id="image-preview-container"></div> above chat-form in your HTML');
        return;
    }
    previewContainer.innerHTML = `
        <img src="${attachedImagePreview}" alt="Attached image preview">
        <button id="remove-attachment">X</button>
    `;
    showToast('Image attached!', 'success');

    // Allow removing the attachment
    document.getElementById('remove-attachment').addEventListener('click', () => {
        clearAttachedImage();
        showToast('Image removed.', 'info');
    });
}

function clearAttachedImage() {
    attachedImage = null;
    if (attachedImagePreview) {
        URL.revokeObjectURL(attachedImagePreview);
        attachedImagePreview = null;
    }
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) previewContainer.innerHTML = '';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Speech-to-Text Functions
function handleSpeechButtonClick() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        showToast('Speech recognition not supported in this browser.', 'error');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
        showToast('Listening... (Say something and pause to stop)', 'info');
        speechButton.classList.add('active');
        speechButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript.trim();
        showToast(Recognized: "${transcript}", 'success');
    };
    
    recognition.onend = () => {
        speechButton.classList.remove('active');
        speechButton.innerHTML = '<i class="fas fa-microphone"></i>';
    };
    
    recognition.onerror = (event) => {
        showToast(Speech recognition error: ${event.error} (Check microphone permissions), 'error');
        speechButton.classList.remove('active');
        speechButton.innerHTML = '<i class="fas fa-microphone"></i>';
    };
    
    try {
        recognition.start();
        console.log('Speech recognition started');
    } catch (e) {
        showToast('Failed to start speech recognition: ' + e.message, 'error');
    }
}

// Utility Functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = toast ${type};
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toastContainer.removeChild(toast);
        }
    }, 2500);
}

function scrollToSection(sectionId) {
    const navItem = document.querySelector(.nav-item[data-section="${sectionId}"]);
    if (navItem) {
        navItem.click();
    }
    const section = sectionId === 'home' ? document.querySelector('.hero.section') : document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
        document.querySelectorAll('.section').forEach(s => {
            if (s !== section) s.classList.remove('active');
        });
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Fetch live location and update profile (shortened & deduplicated)
async function fetchAndUpdateLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported. Using default.', 'error');
      userLocation = 'Faridabad, Haryana, India';
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(Geolocation: ${latitude}, ${longitude});

        try {
          const geoResponse = await fetch(
            https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en
          );
          const geoData = await geoResponse.json();

          // Parse structured address
          const address = geoData.address || {};
          const townCity = address.town || address.city || address.village || 'Unknown City';
          const district = address.district || address.county || '';
          const state = address.state || 'Unknown State';
          const postcode = address.postcode || 'Unknown PIN';
          const country = address.country || 'India';

          // Deduplicate: Skip district if it matches town
          const locationParts = [townCity];
          if (district && district.toLowerCase() !== townCity.toLowerCase()) {
            locationParts.push(district);
          }
          locationParts.push(state, postcode, country);

          const shortAddress = locationParts.join(', ');
          userLocation = shortAddress; // For global use

          // Update storage
          const userData = JSON.parse(localStorage.getItem('krishimitra_user') || '{}');
          userData.location = shortAddress;
          userData.city = townCity; // For weather
          localStorage.setItem('krishimitra_user', JSON.stringify(userData));

          // Update profile
          const addressEl = document.getElementById('profile-address');
          if (addressEl) addressEl.textContent = shortAddress;

          // Trigger weather with city
          updateWeatherByCity(townCity);

          showToast(Location: ${townCity}, ${state}, 'success');
          resolve();
        } catch (error) {
          console.error('Geocoding error:', error);
          const fallback = ${latitude.toFixed(4)}, ${longitude.toFixed(4)}, Haryana, India;
          userLocation = fallback;
          const userData = JSON.parse(localStorage.getItem('krishimitra_user') || '{}');
          userData.location = fallback;
          userData.city = 'Faridabad';
          localStorage.setItem('krishimitra_user', JSON.stringify(userData));
          document.getElementById('profile-address').textContent = fallback;
          updateWeatherByCity('Faridabad');
          resolve();
        }
      },
      (error) => {
        // console.error('Geolocation error:', error);
        // userLocation = 'Faridabad, Haryana, India';
        // updateWeatherByCity('Faridabad');
        showToast('GeoLocation Error', 'error');
        resolve();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// Close modal without login (for guest link in HTML)
function closeModalWithoutLogin() {
    const modal = document.getElementById('signin-modal');
    if (modal) modal.classList.remove('show');
    return false; // Prevent link default
}

// Event delegation for locked elements (add if missing)
document.addEventListener('click', (e) => {
    const lockedEl = e.target.closest('.locked');
    if (lockedEl) {
        e.preventDefault(); // Stop action (e.g., form submit, scroll)
        e.stopPropagation(); // Prevent bubbling if needed
        
        const modal = document.getElementById('signin-modal');
        if (modal) {
            modal.classList.add('show'); // Show modal
        }
        showToast('Please sign in to continue.', 'info');
    }
});

// Close button handler (add if missing)
document.addEventListener('DOMContentLoaded', () => {
    const modalClose = document.getElementById('modal-close');
    const modal = document.getElementById('signin-modal');
    if (modalClose && modal) {
        modalClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.remove('show');
            showToast('Sign-in cancelled.', 'info');
        });
    }

    // Close on outside click (overlay)
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                // showToast('Sign-in cancelled.', 'info');
            }
        });
    }
});

// New Google Sign-In Handler
function handleCredentialResponse(response) {
  try {
    // Decode token
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const userData = {
      name: payload.name,
      email: payload.email,
      token: response.credential,
      location: '' // Will be set by geolocation
    };
    localStorage.setItem('krishimitra_user', JSON.stringify(userData));

    chatHistory = JSON.parse(localStorage.getItem(chatHistory_${userData.email}) || '[]');
    isLoadingHistory = true;
    chatMessages.innerHTML = '';
    chatHistory.forEach(({ role, parts }) => {
        const type = role === 'user' ? 'user' : 'ai';
        addChatMessage(parts[0].text, type);
    });
    isLoadingHistory = false;

    // Update profile DOM
    document.getElementById('profile-name').textContent = userData.name;
    document.getElementById('profile-email').textContent = userData.email;
    const profileContent = document.getElementById('profile-content');
    if (profileContent) profileContent.style.display = 'block';
    // document.getElementById('profile-address').textContent = 'Fetching location...'; // Temp text

    // Fetch and update location
    fetchAndUpdateLocation();

    // Hide modal and unlock
    const modal = document.getElementById('signin-modal');
    if (modal) modal.classList.remove('show');
    unlockProtectedElements();
    setTimeout(() => {
        location.reload(); // Delay slight for toast visibility
    }, 100);
  } catch (error) {
    console.error('Sign-in error:', error);
    showToast('Sign-in failed. Try again.', 'error');
  }
}

function updateProfileLocation(data) {
    const profileLocation = document.querySelector('.location');
    profileLocation.textContent = ${data.name}, ${data.sys.country};
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    fetchWeatherData();
    tryRestApiInitialization().then(initialized => {
        if (initialized) {
            showToast(useRestAPI ? 'AI assistant Active' : 'AI assistant Active!', 'success');
        } else {
            showToast('Running in basic mode with hardcoded responses.', 'info');
        }
    });
    
    let themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    chatForm.addEventListener('submit', handleChatSubmit);
    photoButton.addEventListener('click', handlePhotoButtonClick);
    photoUpload.addEventListener('change', handlePhotoUpload);
    photoCapture.addEventListener('change', handlePhotoUpload);
    speechButton.addEventListener('click', handleSpeechButtonClick);

    if (window.innerWidth <= 767) {
        const headerActions = document.querySelector('.header-actions');
        const mobileActions = document.getElementById('mobile-actions');
        if (headerActions && mobileActions) {
            const themeToggle = headerActions.querySelector('#theme-toggle');
            const languageSelect = document.querySelector('#language-select');
            if (themeToggle) mobileActions.appendChild(themeToggle);
            if (languageSelect) mobileActions.appendChild(languageSelect);
            headerActions.style.display = 'none';
            if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
        }
    }

    const desktopNavItems = document.querySelectorAll('.desktop-nav .nav-item a');
    desktopNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.getAttribute('data-section');
            scrollToSection(sectionId);
            desktopNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.section, .hero.section').forEach(section => {
                section.classList.remove('active');
            });
            const targetSection = sectionId === 'home' ? document.querySelector('.hero.section') : document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    let initialSectionId = 'home';
    const initialDesktopNav = document.querySelector(.desktop-nav .nav-item a[data-section="${initialSectionId}"]);
    const initialMobileNav = document.querySelector(.nav-item[data-section="${initialSectionId}"]);
    if (window.innerWidth > 767 && initialDesktopNav) {
        initialDesktopNav.classList.add('active');
        document.querySelectorAll('.section, .hero.section').forEach(section => {
            section.classList.remove('active');
        });
        const initialTarget = document.querySelector('.hero.section');
        if (initialTarget) {
            initialTarget.classList.add('active');
            window.scrollTo(0, 0);
        }
    } else if (window.innerWidth <= 767 && initialMobileNav) {
        initialMobileNav.classList.add('active');
        document.querySelectorAll('.section, .hero.section').forEach(section => {
            section.classList.remove('active');
        });
        const initialTarget = document.querySelector('.hero.section');
        if (initialTarget) {
            initialTarget.classList.add('active');
            window.scrollTo(0, 0);
        }
    }

    console.log('Displaying initial crop recommendations');
    displayCropRecommendations(realCrops);

    // New: Check for existing login
    const userData = JSON.parse(localStorage.getItem('krishimitra_user') || '{}');
    if (userData.name && userData.email) {
        document.getElementById('profile-name').textContent = userData.name;
        document.getElementById('profile-email').textContent = userData.email;
        profileContent.style.display = 'block';
        chatHistory = JSON.parse(localStorage.getItem(chatHistory_${userData.email}) || '[]');
        isLoadingHistory = true;
        chatHistory.forEach(({ role, parts }) => {
            const type = role === 'user' ? 'user' : 'ai';
            addChatMessage(parts[0].text, type);
        });
        isLoadingHistory = false;
        fetchAndUpdateLocation();
        unlockProtectedElements();
    } else {
        // Default guest state
        document.getElementById('profile-name').textContent = 'Guest';
        document.getElementById('profile-email').textContent = '';
        document.getElementById('profile-address').textContent = 'Unknown';
        // Elements stay locked by default
    }

    // Close modal handler (allows bail-out)
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.remove('show');  // Hide modal (assuming .show class for visibility)
            // showToast('Sign-in cancelled. Protected features remain locked.', 'info');
        });
    }

    // Optional: Close on outside click (overlay)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {  // Clicked outside content
            modal.classList.remove('show');
            showToast('Sign-in cancelled.', 'info');
        }
    });

    // Initialize Google Sign-In (renders in modal)
    google.accounts.id.initialize({
        client_id: '618760627892-3sigk02k7pphk907pnc475j2fr0au0h1.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'), // In modal
        { theme: 'outline', size: 'large' }
    );

    // New: Logout handler
    document.getElementById('logout').addEventListener('click', () => {
        const currentUserData = JSON.parse(localStorage.getItem('krishimitra_user') || '{}');
        if (currentUserData.email) {
            localStorage.setItem(chatHistory_${currentUserData.email}, JSON.stringify(chatHistory));
        }
        localStorage.removeItem('krishimitra_user');
        
        // Reset profile UI immediately (optional, but reload will override)
        const profileContent = document.getElementById('profile-content');
        if (profileContent) profileContent.style.display = 'none'; // Or 'block' for guest view
        document.getElementById('profile-name').textContent = 'Guest';
        document.getElementById('profile-email').textContent = '';
        document.getElementById('profile-address').textContent = 'Unknown';
        
        // Re-lock protected elements
        lockProtectedElements();
        
        // Show confirmation toast briefly
        showToast('Logged out successfully.', 'info');
        
        // Reload page to re-run login check and fully reset state
        setTimeout(() => {
            location.reload(); // Delay slight for toast visibility
        }, 1000); // 1-second delay for UX
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    if (!isMobile) {
        const hideSections = Array.from(document.querySelectorAll('.hide'));
        const showSections = Array.from(document.querySelectorAll('.show')); 

        hideSections.forEach(s => s.style.display = 'block'); 
        showSections.forEach(s => s.style.display = 'none'); 

        function showProfileAndHideOthers() {
            hideSections.forEach(s => s.style.display = 'none');
            showSections.forEach(s => s.style.display = 'block');
            const profileEl = document.getElementById('profile') || showSections[0];
            if (profileEl) profileEl.scrollIntoView({ behavior: 'smooth' });
        }

        function restoreDefaultAndGoto(targetId) {
            hideSections.forEach(s => s.style.display = 'block');
            showSections.forEach(s => s.style.display = 'none');
            if (targetId) {
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        }

        const navLinks = document.querySelectorAll(
            'header a[data-section], nav a[data-section], .nav-item[data-section]'
        );

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-section');

                if (target === 'profile') {
                    showProfileAndHideOthers();
                } else {
                    restoreDefaultAndGoto(target);
                }
            });
        });
    }
});

function updatePlaceholder() {
    const input = document.getElementById('chat-input');
    if (window.innerWidth <= 767) {
        input.placeholder = 'Ask...';
    } else {
        input.placeholder = 'Ask about crops, soil, or weather...';
    }
}

// Unlock all protected elements
function unlockProtectedElements() {
    document.querySelectorAll('.locked').forEach(el => {
        el.classList.remove('locked');
    });
    // showToast('Access granted! All features unlocked.', 'success');
}

// Lock all protected elements (on logout)
function lockProtectedElements() {
    // Re-add locked class to specific selectors (or all that had it)
    const protectedSelectors = '.btn-primary[data-protected], .nav-item[data-protected], a[data-protected]'; // Customize
    document.querySelectorAll(protectedSelectors).forEach(el => {
        el.classList.add('locked');
    });
    // showToast('Logged out. Protected features locked.', 'info');
}

window.addEventListener('resize', updatePlaceholder);

// Translator
document.addEventListener("DOMContentLoaded", function () {
    function attachTranslator() {
        const languageToggle = document.getElementById("language-toggle");
        const googleSelect = document.querySelector(".goog-te-combo");

        if (languageToggle && googleSelect) {
            languageToggle.addEventListener("change", function () {
                googleSelect.value = this.value;
                googleSelect.dispatchEvent(new Event("change"));
            });
        }
    }

    let checkExist = setInterval(function () {
        if (document.querySelector(".goog-te-combo")) {
            attachTranslator();
            clearInterval(checkExist);
        }
    }, 500);
});

document.addEventListener('DOMContentLoaded', function() {
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
        backToTopButton.addEventListener('click', function() {
            scrollToSection('header');
        });
    }
});

document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
    if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        event.preventDefault();
    }
});

window.scrollToSection = scrollToSection;