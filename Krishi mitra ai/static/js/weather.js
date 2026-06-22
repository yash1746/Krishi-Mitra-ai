// weather.js
// Node.js script - Requires Node.js 18+ for fetch, and npm install nodemailer readline-sync
const nodemailer = require('nodemailer');
const readlineSync = require('readline-sync');

// Configuration
const EMAIL_SENDER = "y21590754@gmail.com";      // Replace with your sender email
const EMAIL_PASSWORD = "idab gvsb yqbs xnau";    // Replace with your email app password (e.g., Gmail app password)
const API_KEY = '2e8a46b11774abaa60902832377a1b5a';  // OpenWeatherMap API Key
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

function titleCase(str) {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function getLatLonFromCity(city) {
    // Get latitude and longitude from city name using Nominatim
    try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1&addressdetails=1`;
        const headers = { 'User-Agent': 'KrishiMitra/1.0' };  // Nominatim requires User-Agent
        const response = await fetch(nominatimUrl, { headers });
        const data = await response.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        } else {
            console.log(`City '${city}' not found. Please check the spelling.`);
            return [null, null];
        }
    } catch (e) {
        console.log(`Error fetching location: ${e.message}`);
        return [null, null];
    }
}

async function fetchWeatherForecast(lat, lon) {
    // Fetch 5-day weather forecast using OpenWeatherMap API.
    try {
        const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const response = await fetch(url);
        if (response.ok) {
            return await response.json();
        } else {
            console.log(`API Error: ${response.status} - ${response.statusText}`);
            return null;
        }
    } catch (e) {
        console.log(`Error fetching forecast: ${e.message}`);
        return null;
    }
}

function checkForCalamities(forecastData) {
    // Check forecast for natural calamities that can affect crops (e.g., rain, thunderstorm)
    if (!forecastData) {
        return [];
    }
    
    const severeConditions = [
        'Thunderstorm', 'Storm', 'Heavy Rain', 'Tornado', 'Hurricane'
    ];
    const highPrecipThreshold = 0.5;  // 50% chance of precipitation for rain alerts
    
    const alerts = [];
    const seenDates = new Set();  // To avoid duplicate alerts per day
    
    for (let item of forecastData.list.slice(0, 40)) {  // Next ~5 days (8 entries per day)
        const timestamp = item.dt;
        const date = new Date(timestamp * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        if (seenDates.has(dateStr)) {
            continue;
        }
        seenDates.add(dateStr);
        
        const weatherMain = item.weather[0].main;
        const weatherDesc = item.weather[0].description;
        const precipChance = item.pop || 0;
        
        const isSevere = severeConditions.some(cond => weatherMain.includes(cond)) ||
                         (weatherMain === 'Rain' && precipChance >= highPrecipThreshold);
        
        if (isSevere) {
            const tempMin = item.main.temp_min;
            const tempMax = item.main.temp_max;
            alerts.push({
                date: dateStr,
                condition: titleCase(weatherDesc),
                precip_chance: `${(precipChance * 100).toFixed(0)}%`,
                temp_range: `${Math.round(tempMin)}°C - ${Math.round(tempMax)}°C`,
                message: `Heavy ${weatherDesc} expected on ${dateStr} with ${(precipChance * 100).toFixed(0)}% chance. Potential crop damage from flooding/wind. Recommended actions: Secure crops, check drainage, monitor fields.`
            });
        }
    }
    
    return alerts;
}

async function sendEmailNotification(recipientEmail, subject, body) {
    // Send email notification using SMTP
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_SENDER,
            pass: EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: EMAIL_SENDER,
        to: recipientEmail,
        subject: subject,
        text: body
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
        return true;
    } catch (e) {
        console.log(`Error sending email: ${e.message}`);
        return false;
    }
}

async function checkAndNotifyWeather() {
    // Prompt user for city and email, check forecast, and send notification if calamities detected.
    try {
        const city = readlineSync.question("Enter your farm city/region (e.g., Delhi): ").trim();
        if (!city) {
            console.log("City is required. Please run again.");
            return;
        }
        
        const recipientEmail = readlineSync.question("Enter recipient email for alerts: ").trim();
        if (!recipientEmail || !recipientEmail.includes('@')) {
            console.log("Valid email is required. Please run again.");
            return;
        }
        
        console.log(`Checking weather forecast for ${city}...`);
        
        // Get coordinates
        const [lat, lon] = await getLatLonFromCity(city);
        if (!lat || !lon) {
            return;
        }
        
        // Fetch forecast
        const forecastData = await fetchWeatherForecast(lat, lon);
        if (!forecastData) {
            return;
        }
        
        // Check for calamities
        const alerts = checkForCalamities(forecastData);
        
        if (alerts.length > 0) {
            console.log(`Calamity alerts found for ${alerts.length} days:`);
            let alertBody = "Hello Farmer,\n\n";
            alertBody += `We found bad weather ahead for your farm in ${city}. Here's a simple heads-up:\n\n`;
            alertBody += "What to expect:\n\n";
            for (let alert of alerts) {
                // Clean up condition to avoid redundancy (e.g., remove extra "rain")
                let cleanCondition = alert.condition.replace(/ rain$/i, '');
                cleanCondition = titleCase(cleanCondition);
                alertBody += `- ${alert.date}: ${cleanCondition} (chance: ${alert.precip_chance}, temps: ${alert.temp_range})\n`;
                // Simplified tip: Focus on key action, no repetition
                const simpleTip = "Get ready: Cover sensitive crops and check drainage.";
                alertBody += `  ${simpleTip}\n\n`;
            }
            alertBody += "Stay safe! Check your crops and get ready.\n\n";
            alertBody += "Your friends at KrishiMitra AI";
    
            const subject = `🚨 Quick Weather Alert for ${city}`;
            const sent = await sendEmailNotification(recipientEmail, subject, alertBody);
            if (sent) {
                console.log("Alert email sent!");
            } else {
                console.log("Failed to send alert email.");
            }
        } else {
            console.log("No severe weather detected in the next 5 days. Your crops are safe!");
        }
    
    } catch (e) {
        if (e.code === 'ECONNABORTED' || e.name === 'AbortError') {
            console.log("\nOperation cancelled by user.");
        } else {
            console.log(`Unexpected error: ${e.message}`);
        }
    }
}

// Main execution
console.log("KrishiMitra Weather Calamity Checker");
checkAndNotifyWeather();