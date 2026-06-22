/* AgroAcademy Institute - Advanced Agricultural Learning Platform JavaScript */

// API Configuration
const API_CONFIG = {
    weather: {
        key: '8371e0a55f78972661743dbb15d9ae17',
        url: 'https://api.openweathermap.org/data/2.5/weather'
    },
    gemini: {
        keys: [
            'AIzaSyC6jSWqWOHbyHG67zZKDI4cZZ8ybmseurw',
            'AIzaSyCyFx66GhhBLdxGc319KqeaGhoKp_BhwhQ',
            'AIzaSyDnQPyQSEQLiWZ5yvoPUijP9oF-ZRCm_Vc',
            'AIzaSyB5QZQ3llnJTubA8UKP82b_k1hqRCahdB4',
            'AIzaSyBX-_ERHuecL8U9yLRRIVFAyfGwCN3inZ4'
        ],
        activeKeyIndex: 0
    }
};

// Global State
let currentSection = 'home';
let soilAnalysisData = null;
let weatherData = null;
let aiChatHistory = [];
let geminiAPI = null;

// DOM Elements
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
const themeToggle = document.getElementById('theme-toggle');
const soilForm = document.getElementById('soil-analysis-form');
const aiChatForm = document.getElementById('ai-chat-form');
const aiChatMessages = document.getElementById('ai-chat-messages');
const toastContainer = document.getElementById('toast-container');

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeNavigation();
    initializeGeminiAPI();
    initializeWeather();
    initializeForms();
    
    if (toastContainer) {
        showToast('Welcome to AgroAcademy Institute! 🌱', 'success');
    }
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('institute-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    
    if (themeToggle) {
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    localStorage.setItem('institute-theme', isDark ? 'dark' : 'light');
    
    if (toastContainer) {
        showToast(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'info');
    }
}

// Navigation System
function initializeNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section') || 
                           item.querySelector('a')?.getAttribute('data-section');
            if (section) {
                navigateToSection(section);
            }
        });
    });
}

function navigateToSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
        
        navItems.forEach(item => {
            item.classList.remove('active');
            const itemSection = item.getAttribute('data-section') || 
                               item.querySelector('a')?.getAttribute('data-section');
            if (itemSection === sectionId) {
                item.classList.add('active');
            }
        });
        
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        loadSectionData(sectionId);
    }
}

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'weather-science':
            if (!weatherData) {
                fetchWeatherData();
            }
            break;
        case 'ai-assistant':
            if (aiChatHistory.length === 0) {
                initializeAIChat();
            }
            break;
        case 'our-farmers':
            loadFarmersData();
            break;
    }
}

// Gemini AI Integration
async function initializeGeminiAPI() {
    try {
        const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
        geminiAPI = new GoogleGenerativeAI(API_CONFIG.gemini.keys[0]);
        console.log('Gemini AI initialized successfully');
        if (toastContainer) {
            // showToast('AI Research Assistant is ready! 🤖', 'success');
        }
    } catch (error) {
        console.error('Failed to initialize Gemini AI:', error);
        if (toastContainer) {
            showToast('AI Assistant unavailable. Using fallback responses.', 'warning');
        }
    }
}

// Soil Analysis System
function initializeForms() {
    if (soilForm) {
        soilForm.addEventListener('submit', handleSoilAnalysis);
    }
    
    if (aiChatForm) {
        aiChatForm.addEventListener('submit', handleAIChat);
    }
    
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.getAttribute('data-question');
            if (question) {
                askQuickQuestion(question);
            }
        });
    });
}

async function handleSoilAnalysis(e) {
    e.preventDefault();
    
    if (toastContainer) {
        showToast('Analyzing soil sample...', 'info');
    }
    
    const formData = {
        location: document.getElementById('sample-location')?.value || '',
        depth: parseFloat(document.getElementById('sample-depth')?.value) || 0,
        ph: parseFloat(document.getElementById('soil-ph')?.value) || 0,
        organicCarbon: parseFloat(document.getElementById('organic-carbon')?.value) || 0,
        nitrogen: parseFloat(document.getElementById('nitrogen')?.value) || 0,
        phosphorus: parseFloat(document.getElementById('phosphorus')?.value) || 0,
        potassium: parseFloat(document.getElementById('potassium')?.value) || 0,
        sulfur: parseFloat(document.getElementById('sulfur')?.value) || 0,
        texture: document.getElementById('soil-texture')?.value || '',
        bulkDensity: parseFloat(document.getElementById('bulk-density')?.value) || 0
    };
    
    if (!formData.location) {
        if (toastContainer) {
            showToast('Please enter a sample location', 'error');
        }
        return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    soilAnalysisData = analyzeSoilData(formData);
    
    displaySoilResults(soilAnalysisData);
    
    generateCropRecommendations(soilAnalysisData);
    
    if (toastContainer) {
        showToast('Soil analysis complete! 📊', 'success');
    }
}

function analyzeSoilData(data) {
    const analysis = {
        input: data,
        nutrients: {},
        recommendations: [],
        soilHealth: 'Unknown',
        cropSuitability: []
    };
    
    if (data.ph) {
        analysis.nutrients.pH = {
            value: data.ph,
            status: data.ph >= 6.0 && data.ph <= 7.5 ? 'optimal' : 
                   data.ph >= 5.5 && data.ph <= 8.0 ? 'good' : 
                   data.ph < 5.5 ? 'low' : 'high',
            recommendation: data.ph < 6.0 ? 'Apply lime to increase pH' :
                           data.ph > 7.5 ? 'Apply sulfur to decrease pH' :
                           'pH level is optimal'
        };
    }
    
    if (data.nitrogen) {
        analysis.nutrients.nitrogen = {
            value: data.nitrogen,
            unit: 'kg/ha',
            status: data.nitrogen >= 280 ? 'optimal' :
                   data.nitrogen >= 200 ? 'good' :
                   data.nitrogen >= 120 ? 'low' : 'very low',
            recommendation: data.nitrogen < 200 ? 'Apply nitrogen fertilizer' : 'Nitrogen level is adequate'
        };
    }
    
    if (data.phosphorus) {
        analysis.nutrients.phosphorus = {
            value: data.phosphorus,
            unit: 'kg/ha',
            status: data.phosphorus >= 25 ? 'optimal' :
                   data.phosphorus >= 15 ? 'good' :
                   data.phosphorus >= 8 ? 'low' : 'very low',
            recommendation: data.phosphorus < 15 ? 'Apply phosphorus fertilizer' : 'Phosphorus level is adequate'
        };
    }
    
    if (data.potassium) {
        analysis.nutrients.potassium = {
            value: data.potassium,
            unit: 'kg/ha',
            status: data.potassium >= 180 ? 'optimal' :
                   data.potassium >= 120 ? 'good' :
                   data.potassium >= 80 ? 'low' : 'very low',
            recommendation: data.potassium < 120 ? 'Apply potassium fertilizer' : 'Potassium level is adequate'
        };
    }
    
    if (data.organicCarbon) {
        analysis.nutrients.organicCarbon = {
            value: data.organicCarbon,
            unit: '%',
            status: data.organicCarbon >= 1.0 ? 'optimal' :
                   data.organicCarbon >= 0.75 ? 'good' :
                   data.organicCarbon >= 0.5 ? 'low' : 'very low',
            recommendation: data.organicCarbon < 0.75 ? 'Add organic matter (compost, manure)' : 'Organic carbon level is good'
        };
    }
    
    const statusScores = Object.values(analysis.nutrients).map(nutrient => {
        switch (nutrient.status) {
            case 'optimal': return 4;
            case 'good': return 3;
            case 'low': return 2;
            default: return 1;
        }
    });
    
    const avgScore = statusScores.length ? statusScores.reduce((a, b) => a + b, 0) / statusScores.length : 0;
    analysis.soilHealth = avgScore >= 3.5 ? 'Excellent' :
                         avgScore >= 3.0 ? 'Good' :
                         avgScore >= 2.5 ? 'Fair' : 'Poor';
    
    return analysis;
}

function displaySoilResults(analysis) {
    const resultsContainer = document.getElementById('soil-results');
    if (!resultsContainer) return;
    
    const resultsHTML = `
        <div class="nutrient-analysis">
            <div class="analysis-summary">
                <h4><i class="fas fa-chart-pie"></i> Soil Health Assessment</h4>
                <div class="health-score ${analysis.soilHealth.toLowerCase()}">
                    <span class="score-label">Overall Health:</span>
                    <span class="score-value">${analysis.soilHealth}</span>
                </div>
            </div>
            
            <div class="nutrient-grid">
                ${Object.entries(analysis.nutrients).map(([key, nutrient]) => `
                    <div class="nutrient-card">
                        <div class="nutrient-icon">
                            <i class="fas fa-${getNutrientIcon(key)}"></i>
                        </div>
                        <div class="nutrient-label">${formatNutrientName(key)}</div>
                        <div class="nutrient-value">${nutrient.value} ${nutrient.unit || ''}</div>
                        <div class="nutrient-status ${nutrient.status}">${nutrient.status}</div>
                        <div class="nutrient-recommendation">${nutrient.recommendation}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="analysis-recommendations">
                <h4><i class="fas fa-lightbulb"></i> Management Recommendations</h4>
                <ul class="recommendation-list">
                    ${Object.values(analysis.nutrients)
                        .filter(nutrient => nutrient.status !== 'optimal')
                        .map(nutrient => `<li>${nutrient.recommendation}</li>`)
                        .join('')}
                </ul>
            </div>
        </div>
    `;
    
    resultsContainer.innerHTML = resultsHTML;
}

function getNutrientIcon(nutrient) {
    const icons = {
        pH: 'balance-scale',
        nitrogen: 'leaf',
        phosphorus: 'seedling',
        potassium: 'tree',
        organicCarbon: 'recycle',
        sulfur: 'fire'
    };
    return icons[nutrient] || 'vial';
}

function formatNutrientName(nutrient) {
    const names = {
        pH: 'pH Level',
        nitrogen: 'Nitrogen (N)',
        phosphorus: 'Phosphorus (P)',
        potassium: 'Potassium (K)',
        organicCarbon: 'Organic Carbon',
        sulfur: 'Sulfur (S)'
    };
    return names[nutrient] || nutrient;
}

function generateCropRecommendations(soilData) {
    const recommendations = [
        {
            name: 'Winter Wheat',
            scientificName: 'Triticum aestivum',
            suitability: calculateCropSuitability(soilData, 'wheat'),
            expectedYield: '4.2-5.8 tonnes/ha',
            growingPeriod: '120-150 days',
            waterRequirement: '450-600 mm',
            soilRequirements: 'pH 6.0-7.5, well-drained loamy soil',
            nutrients: 'High N, moderate P-K',
            marketPrice: '₹18-22/kg',
            profitability: 'High',
            advantages: ['Excellent grain quality', 'Good market demand', 'Suitable for crop rotation'],
            challenges: ['Susceptible to rust diseases', 'Requires timely irrigation']
        },
        {
            name: 'Maize (Corn)',
            scientificName: 'Zea mays',
            suitability: calculateCropSuitability(soilData, 'maize'),
            expectedYield: '6.0-8.5 tonnes/ha',
            growingPeriod: '90-120 days',
            waterRequirement: '500-800 mm',
            soilRequirements: 'pH 5.8-7.0, deep fertile soil',
            nutrients: 'High N-P-K, moderate sulfur',
            marketPrice: '₹15-18/kg',
            profitability: 'Very High',
            advantages: ['High biomass production', 'Multiple uses (feed, food, industrial)', 'Good drought tolerance'],
            challenges: ['Stem borer attacks', 'Storage pest issues']
        },
        {
            name: 'Soybean',
            scientificName: 'Glycine max',
            suitability: calculateCropSuitability(soilData, 'soybean'),
            expectedYield: '2.5-3.5 tonnes/ha',
            growingPeriod: '90-120 days',
            waterRequirement: '400-700 mm',
            soilRequirements: 'pH 6.0-7.0, well-drained soil',
            nutrients: 'Low N (fixes nitrogen), moderate P-K',
            marketPrice: '₹35-45/kg',
            profitability: 'High',
            advantages: ['Nitrogen fixation', 'High protein content', 'Excellent market price'],
            challenges: ['Pod borer attacks', 'Sensitive to waterlogging']
        }
    ];
    
    recommendations.sort((a, b) => b.suitability - a.suitability);
    
    displayCropRecommendations(recommendations);
}

function calculateCropSuitability(soilData, cropType) {
    let score = 70;
    
    const nutrients = soilData.nutrients;
    
    if (nutrients.pH) {
        if (cropType === 'wheat' && nutrients.pH.value >= 6.0 && nutrients.pH.value <= 7.5) score += 15;
        else if (cropType === 'maize' && nutrients.pH.value >= 5.8 && nutrients.pH.value <= 7.0) score += 15;
        else if (cropType === 'soybean' && nutrients.pH.value >= 6.0 && nutrients.pH.value <= 7.0) score += 15;
        else score -= 10;
    }
    
    if (nutrients.nitrogen) {
        if (cropType === 'soybean' && nutrients.nitrogen.status === 'low') score += 10;
        else if ((cropType === 'wheat' || cropType === 'maize') && nutrients.nitrogen.status === 'optimal') score += 10;
    }
    
    if (nutrients.phosphorus && nutrients.phosphorus.status === 'optimal') score += 5;
    if (nutrients.potassium && nutrients.potassium.status === 'optimal') score += 5;
    if (nutrients.organicCarbon && nutrients.organicCarbon.status === 'optimal') score += 5;
    
    return Math.min(95, Math.max(40, score));
}

function displayCropRecommendations(crops) {
    const container = document.getElementById('crop-recommendations-container');
    if (!container) return;
    
    const cropsHTML = `
        <div class="crop-recommendations">
            <h3><i class="fas fa-seedling"></i> Scientific Crop Recommendations</h3>
            <p class="recommendations-subtitle">Based on comprehensive soil analysis and environmental factors</p>
            
            <div class="crop-cards-grid">
                ${crops.map(crop => `
                    <div class="card crop-recommendation-card">
                        <div class="crop-header">
                            <div class="crop-title">
                                <h4>${crop.name}</h4>
                                <p class="scientific-name"><em>${crop.scientificName}</em></p>
                            </div>
                            <div class="suitability-badge ${getSuitabilityClass(crop.suitability)}">
                                ${crop.suitability}% Suitable
                            </div>
                        </div>
                        
                        <div class="crop-metrics">
                            <div class="metric">
                                <i class="fas fa-chart-line"></i>
                                <div>
                                    <span class="metric-label">Expected Yield</span>
                                    <span class="metric-value">${crop.expectedYield}</span>
                                </div>
                            </div>
                            <div class="metric">
                                <i class="fas fa-clock"></i>
                                <div>
                                    <span class="metric-label">Growing Period</span>
                                    <span class="metric-value">${crop.growingPeriod}</span>
                                </div>
                            </div>
                            <div class="metric">
                                <i class="fas fa-tint"></i>
                                <div>
                                    <span class="metric-label">Water Requirement</span>
                                    <span class="metric-value">${crop.waterRequirement}</span>
                                </div>
                            </div>
                            <div class="metric">
                                <i class="fas fa-seedling"></i>
                                <div>
                                    <span class="metric-label">Soil Requirements</span>
                                    <span class="metric-value">${crop.soilRequirements}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="crop-details">
                            <div class="detail-section">
                                <h5><i class="fas fa-vial"></i> Nutrient Requirements</h5>
                                <p>${crop.nutrients}</p>
                            </div>
                            <div class="detail-section">
                                <h5><i class="fas fa-rupee-sign"></i> Market Price</h5>
                                <p>${crop.marketPrice}</p>
                            </div>
                            <div class="detail-section">
                                <h5><i class="fas fa-chart-bar"></i> Profitability</h5>
                                <p>${crop.profitability}</p>
                            </div>
                            <div class="detail-section">
                                <h5><i class="fas fa-check-circle"></i> Advantages</h5>
                                <ul>
                                    ${crop.advantages.map(adv => `<li>${adv}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="detail-section">
                                <h5><i class="fas fa-exclamation-triangle"></i> Challenges</h5>
                                <ul>
                                    ${crop.challenges.map(chal => `<li>${chal}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        
                        <div class="crop-actions">
                            <button class="btn-primary" onclick="viewCropDetails('${crop.name}')">
                                <i class="fas fa-book"></i> View Detailed Guide
                            </button>
                            <button class="btn-secondary" onclick="addToCropPlan('${crop.name}')">
                                <i class="fas fa-plus"></i> Add to Crop Plan
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = cropsHTML;
}

function getSuitabilityClass(suitability) {
    if (suitability >= 85) return 'excellent';
    if (suitability >= 70) return 'good';
    if (suitability >= 50) return 'fair';
    return 'poor';
}

// Weather Data Functions
async function initializeWeather() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            position => fetchWeatherData(position.coords.latitude, position.coords.longitude),
            () => fetchWeatherData() // Fallback to default location
        );
    } else {
        fetchWeatherData();
    }
}

async function fetchWeatherData(lat = 40.7128, lon = -74.0060) {
    try {
        const response = await fetch(`${API_CONFIG.weather.url}?lat=${lat}&lon=${lon}&units=metric&appid=${API_CONFIG.weather.key}`);
        if (!response.ok) throw new Error('Weather API request failed');
        const data = await response.json();
        weatherData = data;
        displayWeatherData(data);
        if (toastContainer) {
            showToast('Weather data loaded successfully! 🌤️', 'success');
        }
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        if (toastContainer) {
            showToast('Unable to load weather data', 'error');
        }
    }
}

function displayWeatherData(data) {
    const temperature = document.querySelector('.temperature');
    const condition = document.querySelector('.condition');
    const location = document.querySelector('.location');
    const weatherIcon = document.querySelector('.weather-icon i');
    
    if (temperature) temperature.textContent = `${Math.round(data.main.temp)}°C`;
    if (condition) condition.textContent = data.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
    if (location) location.textContent = `${data.name}, ${data.sys.country}`;
    
    if (weatherIcon) {
        updateWeatherIcon(weatherIcon, data.weather[0].main);
    }
    
    updateWeatherParameters(data);
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
    
    iconElement.className = 'fas ' + (iconClasses[condition] || 'fa-cloud');
}

function updateWeatherParameters(data) {
    const parameters = [
        {
            selector: '.param-card:nth-child(1) .param-value',
            value: `${data.main.humidity}%`,
            status: getHumidityStatus(data.main.humidity)
        },
        {
            selector: '.param-card:nth-child(2) .param-value',
            value: `${Math.round(data.wind.speed * 3.6)} km/h`,
            status: getWindStatus(data.wind.speed * 3.6)
        },
        {
            selector: '.param-card:nth-child(3) .param-value',
            value: data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : '10 km',
            status: 'excellent'
        },
        {
            selector: '.param-card:nth-child(4) .param-value',
            value: `${data.main.pressure} hPa`,
            status: getPressureStatus(data.main.pressure)
        }
    ];
    
    parameters.forEach(param => {
        const element = document.querySelector(param.selector);
        const statusElement = document.querySelector(param.selector.replace('param-value', 'param-status'));
        
        if (element) element.textContent = param.value;
        if (statusElement) {
            statusElement.textContent = param.status.replace(/([A-Z])/g, ' $1').toLowerCase();
            statusElement.className = `param-status ${param.status.toLowerCase()}`;
        }
    });
}

function getHumidityStatus(humidity) {
    if (humidity >= 40 && humidity <= 70) return 'optimal';
    if (humidity >= 30 && humidity <= 80) return 'good';
    return 'poor';
}

function getWindStatus(windSpeed) {
    if (windSpeed >= 5 && windSpeed <= 15) return 'good';
    if (windSpeed >= 2 && windSpeed <= 20) return 'normal';
    return 'poor';
}

function getPressureStatus(pressure) {
    if (pressure >= 1010 && pressure <= 1020) return 'normal';
    if (pressure >= 1000 && pressure <= 1030) return 'good';
    return 'poor';
}

// Virtual Lab Functions
function startExperiment(experimentType) {
    const experiments = {
        'soil-ph': {
            title: 'Soil pH Testing Simulation',
            content: createSoilPHExperiment()
        },
        'plant-cell': {
            title: 'Plant Cell Analysis',
            content: createPlantCellExperiment()
        },
        'photosynthesis': {
            title: 'Photosynthesis Simulation',
            content: createPhotosynthesisExperiment()
        }
    };
    
    const experiment = experiments[experimentType];
    if (experiment) {
        const titleElement = document.getElementById('experiment-title');
        const contentElement = document.getElementById('experiment-content');
        const modalElement = document.getElementById('experiment-modal');
        
        if (titleElement) titleElement.textContent = experiment.title;
        if (contentElement) contentElement.innerHTML = experiment.content;
        if (modalElement) modalElement.classList.add('active');
    }
}

function closeExperiment() {
    const modalElement = document.getElementById('experiment-modal');
    if (modalElement) modalElement.classList.remove('active');
}

function createSoilPHExperiment() {
    return `
        <div class="virtual-experiment">
            <div class="experiment-intro">
                <h4>Objective</h4>
                <p>Learn to determine soil pH using different methods and understand its importance in agriculture.</p>
            </div>
            
            <div class="experiment-simulation">
                <div class="simulation-controls">
                    <h4>Select Testing Method</h4>
                    <div class="method-buttons">
                        <button class="btn-secondary" onclick="selectMethod('litmus')">Litmus Paper</button>
                        <button class="btn-secondary" onclick="selectMethod('digital')">Digital pH Meter</button>
                        <button class="btn-secondary" onclick="selectMethod('indicator')">Universal Indicator</button>
                    </div>
                </div>
                
                <div class="simulation-area" id="ph-simulation">
                    <p>Select a testing method to begin the experiment.</p>
                </div>
            </div>
            
            <div class="experiment-results" id="ph-results" style="display: none;">
                <h4>Results & Analysis</h4>
                <div class="results-content"></div>
            </div>
        </div>
    `;
}

function createPlantCellExperiment() {
    return `
        <div class="virtual-experiment">
            <div class="experiment-intro">
                <h4>Objective</h4>
                <p>Examine plant cell structures and identify key organelles using virtual microscopy.</p>
            </div>
            
            <div class="microscopy-simulation">
                <div class="microscope-controls">
                    <h4>Microscope Settings</h4>
                    <div class="control-group">
                        <label>Magnification:</label>
                        <select onchange="changeMagnification(this.value)">
                            <option value="100">100x</option>
                            <option value="400" selected>400x</option>
                            <option value="1000">1000x</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label>Focus:</label>
                        <input type="range" min="0" max="100" value="50" onchange="adjustFocus(this.value)">
                    </div>
                </div>
                
                <div class="microscope-view">
                    <div class="cell-image" id="cell-view">
                        <p>Adjusting microscope settings...</p>
                    </div>
                </div>
                
                <div class="organelle-identification">
                    <h4>Identify Organelles</h4>
                    <div class="identification-buttons">
                        <button class="btn-secondary" onclick="identifyOrganelle('nucleus')">Nucleus</button>
                        <button class="btn-secondary" onclick="identifyOrganelle('chloroplast')">Chloroplast</button>
                        <button class="btn-secondary" onclick="identifyOrganelle('vacuole')">Vacuole</button>
                        <button class="btn-secondary" onclick="identifyOrganelle('cell-wall')">Cell Wall</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createPhotosynthesisExperiment() {
    return `
        <div class="virtual-experiment">
            <div class="experiment-intro">
                <h4>Objective</h4>
                <p>Simulate photosynthesis process and observe how environmental factors affect the rate.</p>
            </div>
            
            <div class="photosynthesis-simulation">
                <div class="environmental-controls">
                    <h4>Environmental Factors</h4>
                    <div class="control-group">
                        <label>Light Intensity:</label>
                        <input type="range" min="0" max="100" value="75" onchange="updatePhotosynthesis()">
                        <span id="light-value">75%</span>
                    </div>
                    <div class="control-group">
                        <label>CO₂ Concentration:</label>
                        <input type="range" min="200" max="1000" value="400" onchange="updatePhotosynthesis()">
                        <span id="co2-value">400 ppm</span>
                    </div>
                    <div class="control-group">
                        <label>Temperature:</label>
                        <input type="range" min="10" max="40" value="25" onchange="updatePhotosynthesis()">
                        <span id="temp-value">25°C</span>
                    </div>
                </div>
                
                <div class="process-visualization">
                    <div class="photosynthesis-rate" id="ps-rate">
                        <h4>Photosynthesis Rate</h4>
                        <div class="rate-meter">
                            <div class="rate-bar" style="width: 75%;"></div>
                        </div>
                        <span class="rate-value">75%</span>
                    </div>
                    
                    <div class="equation">
                        <h4>Chemical Equation</h4>
                        <p>6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function selectMethod(method) {
    const simulationArea = document.getElementById('ph-simulation');
    const resultsArea = document.getElementById('ph-results');
    if (!simulationArea || !resultsArea) return;
    
    let resultText = '';
    switch (method) {
        case 'litmus':
            resultText = 'Litmus paper turns red for acidic soil (pH < 7) or blue for alkaline soil (pH > 7).';
            break;
        case 'digital':
            resultText = 'Digital pH meter shows a precise reading of 6.5 pH.';
            break;
        case 'indicator':
            resultText = 'Universal indicator changes color to green, indicating neutral soil (pH ~7).';
            break;
    }
    
    simulationArea.innerHTML = `<p>Testing with ${method} method...</p>`;
    resultsArea.style.display = 'block';
    resultsArea.querySelector('.results-content').innerHTML = resultText;
}

function changeMagnification(value) {
    const cellView = document.getElementById('cell-view');
    if (cellView) {
        cellView.innerHTML = `<p>Viewing plant cell at ${value}x magnification.</p>`;
    }
}

function adjustFocus(value) {
    const cellView = document.getElementById('cell-view');
    if (cellView) {
        cellView.innerHTML = `<p>Adjusting focus to ${value}% clarity.</p>`;
    }
}

function identifyOrganelle(organelle) {
    const cellView = document.getElementById('cell-view');
    if (cellView) {
        cellView.innerHTML = `<p>Identified ${organelle} in the plant cell.</p>`;
    }
}

function updatePhotosynthesis() {
    const lightInput = document.querySelector('.photosynthesis-simulation input[onchange="updatePhotosynthesis()"]:nth-child(1)');
    const co2Input = document.querySelector('.photosynthesis-simulation input[onchange="updatePhotosynthesis()"]:nth-child(2)');
    const tempInput = document.querySelector('.photosynthesis-simulation input[onchange="updatePhotosynthesis()"]:nth-child(3)');
    
    const lightValue = lightInput ? parseInt(lightInput.value) : 75;
    const co2Value = co2Input ? parseInt(co2Input.value) : 400;
    const tempValue = tempInput ? parseInt(tempInput.value) : 25;
    
    const lightSpan = document.getElementById('light-value');
    const co2Span = document.getElementById('co2-value');
    const tempSpan = document.getElementById('temp-value');
    const rateBar = document.querySelector('.rate-bar');
    const rateValue = document.querySelector('.rate-value');
    
    if (lightSpan) lightSpan.textContent = `${lightValue}%`;
    if (co2Span) co2Span.textContent = `${co2Value} ppm`;
    if (tempSpan) tempSpan.textContent = `${tempValue}°C`;
    
    const rate = Math.min(100, Math.round((lightValue * 0.4 + co2Value * 0.001 + tempValue * 1.5)));
    
    if (rateBar) rateBar.style.width = `${rate}%`;
    if (rateValue) rateValue.textContent = `${rate}%`;
}

// Farmers Data Function
function loadFarmersData() {
    const farmers = [
        { name: 'Ramesh Kumar', location: 'Punjab, India', phone: '98765-43210', farmSize: '20 acres', preferredCrops: 'Wheat, Rice' },
        { name: 'Sita Devi', location: 'Uttar Pradesh, India', phone: '87654-32109', farmSize: '15 acres', preferredCrops: 'Sugarcane, Wheat' },
        { name: 'Vijay Singh', location: 'Haryana, India', phone: '76543-21098', farmSize: '25 acres', preferredCrops: 'Rice, Mustard' },
        { name: 'Lakshmi Patel', location: 'Gujarat, India', phone: '65432-10987', farmSize: '30 acres', preferredCrops: 'Cotton, Groundnut' },
        { name: 'Arjun Yadav', location: 'Bihar, India', phone: '54321-09876', farmSize: '10 acres', preferredCrops: 'Maize, Pulses' },
        { name: 'Meena Sharma', location: 'Rajasthan, India', phone: '43210-98765', farmSize: '18 acres', preferredCrops: 'Bajra, Wheat' },
        { name: 'Sanjay Gupta', location: 'Madhya Pradesh, India', phone: '32109-87654', farmSize: '22 acres', preferredCrops: 'Soybean, Wheat' },
        { name: 'Priya Kumari', location: 'Maharashtra, India', phone: '21098-76543', farmSize: '35 acres', preferredCrops: 'Sugarcane, Cotton' },
        { name: 'Rahul Verma', location: 'Andhra Pradesh, India', phone: '10987-65432', farmSize: '12 acres', preferredCrops: 'Rice, Chillies' },
        { name: 'Anita Desai', location: 'Karnataka, India', phone: '09876-54321', farmSize: '28 acres', preferredCrops: 'Ragi, Maize' },
        { name: 'Mohan Lal', location: 'Tamil Nadu, India', phone: '98765-12345', farmSize: '15 acres', preferredCrops: 'Paddy, Banana' },
        { name: 'Sunita Rani', location: 'West Bengal, India', phone: '87654-23456', farmSize: '20 acres', preferredCrops: 'Jute, Rice' },
        { name: 'Kiran Joshi', location: 'Odisha, India', phone: '76543-34567', farmSize: '17 acres', preferredCrops: 'Paddy, Vegetables' },
        { name: 'Amit Patel', location: 'Telangana, India', phone: '65432-45678', farmSize: '25 acres', preferredCrops: 'Cotton, Maize' },
        { name: 'Geeta Thakur', location: 'Chhattisgarh, India', phone: '54321-56789', farmSize: '13 acres', preferredCrops: 'Rice, Pulses' },
        { name: 'Ravi Shankar', location: 'Jharkhand, India', phone: '43210-67890', farmSize: '10 acres', preferredCrops: 'Maize, Vegetables' },
        { name: 'Poonam Devi', location: 'Assam, India', phone: '32109-78901', farmSize: '18 acres', preferredCrops: 'Tea, Rice' },
        { name: 'Vikas Reddy', location: 'Kerala, India', phone: '21098-89012', farmSize: '8 acres', preferredCrops: 'Coconut, Rubber' },
        { name: 'Neha Sharma', location: 'Uttarakhand, India', phone: '10987-90123', farmSize: '15 acres', preferredCrops: 'Wheat, Apples' },
        { name: 'Suresh Meena', location: 'Himachal Pradesh, India', phone: '09876-01234', farmSize: '12 acres', preferredCrops: 'Apples, Potatoes' }
    ];

    const grid = document.getElementById('farmers-grid');
    if (!grid) return;

    grid.innerHTML = farmers.map(farmer => `
        <div class="card farmer-card">
            <div class="farmer-header">
                <i class="fas fa-user"></i>
                <h3>${farmer.name}</h3>
            </div>
            <div class="farmer-details">
                <p><i class="fas fa-map-marker-alt"></i> ${farmer.location}</p>
                <p><i class="fas fa-phone"></i> ${farmer.phone}</p>
                <p><i class="fas fa-ruler-combined"></i> ${farmer.farmSize}</p>
                <p><i class="fas fa-seedling"></i> ${farmer.preferredCrops}</p>
            </div>
        </div>
    `).join('');
}

// Utility Functions
function showToast(message, type = 'info') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 1000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function viewCropDetails(cropName) {
    if (toastContainer) {
        showToast(`Loading detailed guide for ${cropName}...`, 'info');
    }
}

function addToCropPlan(cropName) {
    if (toastContainer) {
        showToast(`${cropName} added to crop planning list`, 'success');
    }
}

// Add CSS for additional animations and styles
const additionalStyles = `
    .typing-dots {
        display: flex;
        gap: 4px;
        padding: 16px;
    }
    
    .typing-dots span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--muted-foreground);
        animation: typing 1.4s infinite;
    }
    
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes typing {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .crop-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: var(--spacing-xl);
        margin-top: var(--spacing-xl);
    }
    
    .crop-recommendation-card {
        border-left: 4px solid var(--primary);
    }
    
    .crop-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-md);
    }
    
    .crop-title h4 {
        font-size: 1.3rem;
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
    }
    
    .scientific-name {
        color: var(--muted-foreground);
        font-size: 0.9rem;
    }
    
    .suitability-badge {
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .suitability-badge.excellent { background: var(--success); color: white; }
    .suitability-badge.good { background: var(--info); color: white; }
    .suitability-badge.fair { background: var(--warning); color: var(--foreground); }
    .suitability-badge.poor { background: var(--error); color: white; }
    
    .crop-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
    }
    
    .metric {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
        background: var(--muted);
        border-radius: var(--radius);
    }
    
    .metric i {
        color: var(--primary);
        width: 20px;
        text-align: center;
    }
    
    .metric-label {
        font-size: 0.8rem;
        color: var(--muted-foreground);
        display: block;
    }
    
    .metric-value {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--foreground);
    }
    
    .crop-details {
        margin-bottom: var(--spacing-lg);
    }
    
    .detail-section {
        margin-bottom: var(--spacing-md);
    }
    
    .detail-section h5 {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--foreground);
        margin-bottom: var(--spacing-xs);
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
    }
    
    .detail-section h5 i {
        color: var(--primary);
        width: 16px;
    }
    
    .detail-section p {
        font-size: 0.9rem;
        color: var(--muted-foreground);
        line-height: 1.4;
    }
    
    .detail-section ul {
        margin: 0;
        padding-left: var(--spacing-md);
    }
    
    .detail-section li {
        font-size: 0.8rem;
        color: var(--muted-foreground);
        margin-bottom: var(--spacing-xs);
    }
    
    .crop-actions {
        display: flex;
        gap: var(--spacing-sm);
    }
    
    .crop-actions .btn-primary,
    .crop-actions .btn-secondary {
        flex: 1;
        padding: var(--spacing-sm) var(--spacing-md);
        font-size: 0.9rem;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);