import os
import requests
import re
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime
import base64
from io import BytesIO
import json  # Added for JSON loading

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    PDF_LIB_AVAILABLE = True
except ImportError:
    print("Error: reportlab module not found. Please install it using 'pip install reportlab'.")
    PDF_LIB_AVAILABLE = False

# Load environment variables
load_dotenv()

# Load multiple Google API keys
GOOGLE_API_KEYS = [
    os.getenv(f"GOOGLE_API_KEY_{i}") for i in range(1, 7)
    if os.getenv(f"GOOGLE_API_KEY_{i}")
]
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
if not GOOGLE_API_KEYS or not WEATHER_API_KEY:
    raise ValueError("Missing API keys in .env file.")

# Global variable to track current API key index
current_api_key_index = 0

# Configure Gemini API with the current key
def configure_gemini_api():
    global current_api_key_index
    if current_api_key_index >= len(GOOGLE_API_KEYS):
        raise ValueError("All Google API keys have been exhausted.")
    genai.configure(api_key=GOOGLE_API_KEYS[current_api_key_index])
    print(f"Using Google API key {current_api_key_index + 1}")

# Initialize with the first API key
configure_gemini_api()

# Load city to state mapping from JSON
def load_city_to_state():
    try:
        with open('city_to_state.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: city_to_state.json not found. Using empty dict (add the file!) ⚠️")
        return {}
    except json.JSONDecodeError:
        print("Error: Invalid JSON in city_to_state.json ❌")
        return {}

CITY_TO_STATE = load_city_to_state()

# Load soil data from JSON (lowercase filename)
def load_soil_data():
    try:
        with open('soil_data.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: soil_data.json not found. Falling back to hardcoded data. ⚠️")
        # Fallback to original hardcoded data if JSON missing
        return {
            'andhra pradesh': {'ph': 7.2, 'nitrogen': 320, 'phosphorus': 18, 'potassium': 220, 'organic_carbon': 0.55, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'arunachal pradesh': {'ph': 5.8, 'nitrogen': 450, 'phosphorus': 12, 'potassium': 180, 'organic_carbon': 0.85, 'texture': 'Forest and Mountain', 'soil_quality': 'high'},
            'assam': {'ph': 5.5, 'nitrogen': 380, 'phosphorus': 15, 'potassium': 200, 'organic_carbon': 0.75, 'texture': 'Alluvial and Laterite', 'soil_quality': 'medium'},
            'bihar': {'ph': 7.0, 'nitrogen': 280, 'phosphorus': 10, 'potassium': 160, 'organic_carbon': 0.45, 'texture': 'Alluvial', 'soil_quality': 'low'},
            'chhattisgarh': {'ph': 6.5, 'nitrogen': 350, 'phosphorus': 8, 'potassium': 250, 'organic_carbon': 0.60, 'texture': 'Red and Black', 'soil_quality': 'medium'},
            'goa': {'ph': 6.0, 'nitrogen': 400, 'phosphorus': 20, 'potassium': 210, 'organic_carbon': 0.70, 'texture': 'Laterite', 'soil_quality': 'medium'},
            'gujarat': {'ph': 7.9, 'nitrogen': 300, 'phosphorus': 12, 'potassium': 240, 'organic_carbon': 0.40, 'texture': 'Alluvial, Black, Desert', 'soil_quality': 'low'},
            'haryana': {'ph': 8.1, 'nitrogen': 280, 'phosphorus': 15, 'potassium': 220, 'organic_carbon': 0.40, 'texture': 'Alluvial and Arid', 'soil_quality': 'medium'},
            'himachal pradesh': {'ph': 6.2, 'nitrogen': 420, 'phosphorus': 14, 'potassium': 190, 'organic_carbon': 0.80, 'texture': 'Alluvial and Forest', 'soil_quality': 'high'},
            'jharkhand': {'ph': 6.0, 'nitrogen': 320, 'phosphorus': 10, 'potassium': 180, 'organic_carbon': 0.50, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'karnataka': {'ph': 6.8, 'nitrogen': 340, 'phosphorus': 16, 'potassium': 230, 'organic_carbon': 0.50, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'kerala': {'ph': 5.5, 'nitrogen': 360, 'phosphorus': 12, 'potassium': 200, 'organic_carbon': 0.65, 'texture': 'Laterite', 'soil_quality': 'medium'},
            'madhya pradesh': {'ph': 7.2, 'nitrogen': 400, 'phosphorus': 10, 'potassium': 300, 'organic_carbon': 0.55, 'texture': 'Black, Red, Alluvial', 'soil_quality': 'medium'},
            'maharashtra': {'ph': 7.5, 'nitrogen': 320, 'phosphorus': 14, 'potassium': 220, 'organic_carbon': 0.45, 'texture': 'Black and Red', 'soil_quality': 'medium'},
            'manipur': {'ph': 5.9, 'nitrogen': 440, 'phosphorus': 13, 'potassium': 170, 'organic_carbon': 0.75, 'texture': 'Alluvial and Forest', 'soil_quality': 'high'},
            'meghalaya': {'ph': 5.4, 'nitrogen': 460, 'phosphorus': 11, 'potassium': 160, 'organic_carbon': 0.80, 'texture': 'Forest and Red', 'soil_quality': 'high'},
            'mizoram': {'ph': 5.3, 'nitrogen': 480, 'phosphorus': 10, 'potassium': 150, 'organic_carbon': 0.85, 'texture': 'Forest', 'soil_quality': 'high'},
            'nagaland': {'ph': 5.6, 'nitrogen': 470, 'phosphorus': 12, 'potassium': 165, 'organic_carbon': 0.80, 'texture': 'Forest and Alluvial', 'soil_quality': 'high'},
            'odisha': {'ph': 6.3, 'nitrogen': 300, 'phosphorus': 9, 'potassium': 210, 'organic_carbon': 0.50, 'texture': 'Red and Laterite', 'soil_quality': 'low'},
            'punjab': {'ph': 8.2, 'nitrogen': 260, 'phosphorus': 25, 'potassium': 200, 'organic_carbon': 0.40, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'rajasthan': {'ph': 8.0, 'nitrogen': 280, 'phosphorus': 10, 'potassium': 260, 'organic_carbon': 0.35, 'texture': 'Desert and Alluvial', 'soil_quality': 'low'},
            'sikkim': {'ph': 5.7, 'nitrogen': 500, 'phosphorus': 15, 'potassium': 180, 'organic_carbon': 0.90, 'texture': 'Mountain', 'soil_quality': 'high'},
            'tamil nadu': {'ph': 7.0, 'nitrogen': 310, 'phosphorus': 18, 'potassium': 240, 'organic_carbon': 0.45, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'telangana': {'ph': 7.4, 'nitrogen': 330, 'phosphorus': 16, 'potassium': 230, 'organic_carbon': 0.50, 'texture': 'Black and Red', 'soil_quality': 'medium'},
            'tripura': {'ph': 5.8, 'nitrogen': 400, 'phosphorus': 14, 'potassium': 190, 'organic_carbon': 0.70, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'uttar pradesh': {'ph': 7.8, 'nitrogen': 250, 'phosphorus': 8, 'potassium': 180, 'organic_carbon': 0.45, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'uttarakhand': {'ph': 6.8, 'nitrogen': 380, 'phosphorus': 12, 'potassium': 170, 'organic_carbon': 0.65, 'texture': 'Alluvial and Mountain', 'soil_quality': 'medium'},
            'west bengal': {'ph': 6.9, 'nitrogen': 340, 'phosphorus': 25, 'potassium': 200, 'organic_carbon': 0.75, 'texture': 'Alluvial and Deltaic', 'soil_quality': 'high'},
            'andaman and nicobar islands': {'ph': 6.0, 'nitrogen': 420, 'phosphorus': 18, 'potassium': 210, 'organic_carbon': 0.70, 'texture': 'Forest and Coastal', 'soil_quality': 'medium'},
            'chandigarh': {'ph': 7.5, 'nitrogen': 290, 'phosphorus': 16, 'potassium': 220, 'organic_carbon': 0.40, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'dadra and nagar haveli and daman and diu': {'ph': 7.0, 'nitrogen': 350, 'phosphorus': 15, 'potassium': 200, 'organic_carbon': 0.50, 'texture': 'Coastal Alluvial', 'soil_quality': 'medium'},
            'delhi': {'ph': 7.6, 'nitrogen': 270, 'phosphorus': 14, 'potassium': 190, 'organic_carbon': 0.35, 'texture': 'Alluvial', 'soil_quality': 'low'},
            'jammu and kashmir': {'ph': 7.0, 'nitrogen': 360, 'phosphorus': 10, 'potassium': 160, 'organic_carbon': 0.70, 'texture': 'Loamy and Alluvial', 'soil_quality': 'medium'},
            'ladakh': {'ph': 8.5, 'nitrogen': 200, 'phosphorus': 5, 'potassium': 150, 'organic_carbon': 0.30, 'texture': 'Arid and Desert', 'soil_quality': 'low'},
            'lakshadweep': {'ph': 7.2, 'nitrogen': 280, 'phosphorus': 20, 'potassium': 250, 'organic_carbon': 0.40, 'texture': 'Coral Sandy', 'soil_quality': 'low'},
            'puducherry': {'ph': 7.1, 'nitrogen': 300, 'phosphorus': 17, 'potassium': 230, 'organic_carbon': 0.45, 'texture': 'Coastal Alluvial', 'soil_quality': 'medium'},
            'default': {'ph': 7.2, 'nitrogen': 320, 'phosphorus': 15, 'potassium': 220, 'organic_carbon': 0.50, 'texture': 'Loamy', 'soil_quality': 'medium'}
        }
    except json.JSONDecodeError:
        print("Error: Invalid JSON in soil_data.json. Falling back to hardcoded data. ❌")
        # Same fallback as above
        return {
            'andhra pradesh': {'ph': 7.2, 'nitrogen': 320, 'phosphorus': 18, 'potassium': 220, 'organic_carbon': 0.55, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'arunachal pradesh': {'ph': 5.8, 'nitrogen': 450, 'phosphorus': 12, 'potassium': 180, 'organic_carbon': 0.85, 'texture': 'Forest and Mountain', 'soil_quality': 'high'},
            'assam': {'ph': 5.5, 'nitrogen': 380, 'phosphorus': 15, 'potassium': 200, 'organic_carbon': 0.75, 'texture': 'Alluvial and Laterite', 'soil_quality': 'medium'},
            'bihar': {'ph': 7.0, 'nitrogen': 280, 'phosphorus': 10, 'potassium': 160, 'organic_carbon': 0.45, 'texture': 'Alluvial', 'soil_quality': 'low'},
            'chhattisgarh': {'ph': 6.5, 'nitrogen': 350, 'phosphorus': 8, 'potassium': 250, 'organic_carbon': 0.60, 'texture': 'Red and Black', 'soil_quality': 'medium'},
            'goa': {'ph': 6.0, 'nitrogen': 400, 'phosphorus': 20, 'potassium': 210, 'organic_carbon': 0.70, 'texture': 'Laterite', 'soil_quality': 'medium'},
            'gujarat': {'ph': 7.9, 'nitrogen': 300, 'phosphorus': 12, 'potassium': 240, 'organic_carbon': 0.40, 'texture': 'Alluvial, Black, Desert', 'soil_quality': 'low'},
            'haryana': {'ph': 8.1, 'nitrogen': 280, 'phosphorus': 15, 'potassium': 220, 'organic_carbon': 0.40, 'texture': 'Alluvial and Arid', 'soil_quality': 'medium'},
            'himachal pradesh': {'ph': 6.2, 'nitrogen': 420, 'phosphorus': 14, 'potassium': 190, 'organic_carbon': 0.80, 'texture': 'Alluvial and Forest', 'soil_quality': 'high'},
            'jharkhand': {'ph': 6.0, 'nitrogen': 320, 'phosphorus': 10, 'potassium': 180, 'organic_carbon': 0.50, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'karnataka': {'ph': 6.8, 'nitrogen': 340, 'phosphorus': 16, 'potassium': 230, 'organic_carbon': 0.50, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'kerala': {'ph': 5.5, 'nitrogen': 360, 'phosphorus': 12, 'potassium': 200, 'organic_carbon': 0.65, 'texture': 'Laterite', 'soil_quality': 'medium'},
            'madhya pradesh': {'ph': 7.2, 'nitrogen': 400, 'phosphorus': 10, 'potassium': 300, 'organic_carbon': 0.55, 'texture': 'Black, Red, Alluvial', 'soil_quality': 'medium'},
            'maharashtra': {'ph': 7.5, 'nitrogen': 320, 'phosphorus': 14, 'potassium': 220, 'organic_carbon': 0.45, 'texture': 'Black and Red', 'soil_quality': 'medium'},
            'manipur': {'ph': 5.9, 'nitrogen': 440, 'phosphorus': 13, 'potassium': 170, 'organic_carbon': 0.75, 'texture': 'Alluvial and Forest', 'soil_quality': 'high'},
            'meghalaya': {'ph': 5.4, 'nitrogen': 460, 'phosphorus': 11, 'potassium': 160, 'organic_carbon': 0.80, 'texture': 'Forest and Red', 'soil_quality': 'high'},
            'mizoram': {'ph': 5.3, 'nitrogen': 480, 'phosphorus': 10, 'potassium': 150, 'organic_carbon': 0.85, 'texture': 'Forest', 'soil_quality': 'high'},
            'nagaland': {'ph': 5.6, 'nitrogen': 470, 'phosphorus': 12, 'potassium': 165, 'organic_carbon': 0.80, 'texture': 'Forest and Alluvial', 'soil_quality': 'high'},
            'odisha': {'ph': 6.3, 'nitrogen': 300, 'phosphorus': 9, 'potassium': 210, 'organic_carbon': 0.50, 'texture': 'Red and Laterite', 'soil_quality': 'low'},
            'punjab': {'ph': 8.2, 'nitrogen': 260, 'phosphorus': 25, 'potassium': 200, 'organic_carbon': 0.40, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'rajasthan': {'ph': 8.0, 'nitrogen': 280, 'phosphorus': 10, 'potassium': 260, 'organic_carbon': 0.35, 'texture': 'Desert and Alluvial', 'soil_quality': 'low'},
            'sikkim': {'ph': 5.7, 'nitrogen': 500, 'phosphorus': 15, 'potassium': 180, 'organic_carbon': 0.90, 'texture': 'Mountain', 'soil_quality': 'high'},
            'tamil nadu': {'ph': 7.0, 'nitrogen': 310, 'phosphorus': 18, 'potassium': 240, 'organic_carbon': 0.45, 'texture': 'Red and Laterite', 'soil_quality': 'medium'},
            'telangana': {'ph': 7.4, 'nitrogen': 330, 'phosphorus': 16, 'potassium': 230, 'organic_carbon': 0.50, 'texture': 'Black and Red', 'soil_quality': 'medium'},
            'tripura': {'ph': 5.8, 'nitrogen': 400, 'phosphorus': 14, 'potassium': 190, 'organic_carbon': 0.70, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'uttar pradesh': {'ph': 7.8, 'nitrogen': 250, 'phosphorus': 8, 'potassium': 180, 'organic_carbon': 0.45, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'uttarakhand': {'ph': 6.8, 'nitrogen': 380, 'phosphorus': 12, 'potassium': 170, 'organic_carbon': 0.65, 'texture': 'Alluvial and Mountain', 'soil_quality': 'medium'},
            'west bengal': {'ph': 6.9, 'nitrogen': 340, 'phosphorus': 25, 'potassium': 200, 'organic_carbon': 0.75, 'texture': 'Alluvial and Deltaic', 'soil_quality': 'high'},
            'andaman and nicobar islands': {'ph': 6.0, 'nitrogen': 420, 'phosphorus': 18, 'potassium': 210, 'organic_carbon': 0.70, 'texture': 'Forest and Coastal', 'soil_quality': 'medium'},
            'chandigarh': {'ph': 7.5, 'nitrogen': 290, 'phosphorus': 16, 'potassium': 220, 'organic_carbon': 0.40, 'texture': 'Alluvial', 'soil_quality': 'medium'},
            'dadra and nagar haveli and daman and diu': {'ph': 7.0, 'nitrogen': 350, 'phosphorus': 15, 'potassium': 200, 'organic_carbon': 0.50, 'texture': 'Coastal Alluvial', 'soil_quality': 'medium'},
            'delhi': {'ph': 7.6, 'nitrogen': 270, 'phosphorus': 14, 'potassium': 190, 'organic_carbon': 0.35, 'texture': 'Alluvial', 'soil_quality': 'low'},
            'jammu and kashmir': {'ph': 7.0, 'nitrogen': 360, 'phosphorus': 10, 'potassium': 160, 'organic_carbon': 0.70, 'texture': 'Loamy and Alluvial', 'soil_quality': 'medium'},
            'ladakh': {'ph': 8.5, 'nitrogen': 200, 'phosphorus': 5, 'potassium': 150, 'organic_carbon': 0.30, 'texture': 'Arid and Desert', 'soil_quality': 'low'},
            'lakshadweep': {'ph': 7.2, 'nitrogen': 280, 'phosphorus': 20, 'potassium': 250, 'organic_carbon': 0.40, 'texture': 'Coral Sandy', 'soil_quality': 'low'},
            'puducherry': {'ph': 7.1, 'nitrogen': 300, 'phosphorus': 17, 'potassium': 230, 'organic_carbon': 0.45, 'texture': 'Coastal Alluvial', 'soil_quality': 'medium'},
            'default': {'ph': 7.2, 'nitrogen': 320, 'phosphorus': 15, 'potassium': 220, 'organic_carbon': 0.50, 'texture': 'Loamy', 'soil_quality': 'medium'}
        }

SOIL_DATA = load_soil_data()

# Conversion factors to acres
UNIT_CONVERSIONS = {
    "acre": 1.0,
    "bigha": 0.619,  # Approx, may vary by region
    "yard": 0.0002066  # 1 sq yard = 0.0002066 acres
}

# Fallback coordinates for common locations (to handle no-internet scenarios)
FALLBACK_COORDS = {
    'haryana': (29.238, 76.432),
    'mumbai': (19.076, 72.878),
    'delhi': (28.6139, 77.209),
    'bangalore': (12.9716, 77.5946),
    'chandigarh': (30.7333, 76.7794),
    # Add more as needed
    'default': (20.5937, 78.9629)  # Approximate center of India
}

# Geocode city to lat/lon with fallback
def geocode_city(city):
    print(f"Getting coordinates for {city}... 🌍")
    location_lower = city.lower().strip()
    if location_lower in FALLBACK_COORDS:
        lat, lon = FALLBACK_COORDS[location_lower]
        print(f"Using fallback coordinates for {city}: ({lat}, {lon}) 📍")
        return lat, lon
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": city, "format": "json", "limit": 1}
    headers = {"User-Agent": "cropwiseai/1.0"}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            raise ValueError(f"City '{city}' not found")
        lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
        print(f"Geocoded {city} to ({lat}, {lon}) ✅")
        return lat, lon
    except Exception as e:
        print(f"Error geocoding {city}: {e}. Using default coordinates. ❌")
        lat, lon = FALLBACK_COORDS['default']
        return lat, lon

# Fetch soil data using loaded data
def fetch_soil_data(location):
    print(f"Fetching soil data for {location} 🌱")
    state = None
    location_lower = location.lower().strip()
    if location_lower in CITY_TO_STATE:
        state = CITY_TO_STATE[location_lower]
        print(f"Mapped city '{location}' to state '{state.capitalize()}' 📍")
    else:
        for key in SOIL_DATA.keys():
            if key in location_lower or location_lower in key:
                state = key
                break
        if not state:
            state = 'default'
            print(f"Using default soil data for unknown location '{location}' ⚠️")
        else:
            print(f"Using direct state/UT input: {state.capitalize()}")
    
    soil = SOIL_DATA.get(state, SOIL_DATA.get('default', {})).copy()
    if not soil:
        soil = {'ph': 7.2, 'nitrogen': 320, 'phosphorus': 15, 'potassium': 220, 'organic_carbon': 0.50, 'texture': 'Loamy', 'soil_quality': 'medium'}
        print("Fallback to default soil data due to missing entry. ⚠️")
    
    if 'loamy' in soil.get('texture', '').lower() or 'alluvial' in soil.get('texture', '').lower():
        soil['clay'] = 25; soil['sand'] = 45; soil['silt'] = 30
    elif 'clayey' in soil.get('texture', '').lower() or 'black' in soil.get('texture', '').lower():
        soil['clay'] = 40; soil['sand'] = 30; soil['silt'] = 30
    elif 'sandy' in soil.get('texture', '').lower() or 'desert' in soil.get('texture', '').lower():
        soil['clay'] = 10; soil['sand'] = 70; soil['silt'] = 20
    elif 'laterite' in soil.get('texture', '').lower():
        soil['clay'] = 35; soil['sand'] = 40; soil['silt'] = 25
    else:
        soil['clay'] = 20; soil['sand'] = 50; soil['silt'] = 30
    soil['state'] = state
    print(f"Soil data for {state.capitalize()}: {soil} ✅")
    return soil

# Fetch weather data with fallback
def fetch_weather_data(lat, lon):
    print(f"Fetching weather for lat={lat}, lon={lon} ☀️")
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": WEATHER_API_KEY, "units": "metric"}
    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            "temp": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "weather": data["weather"][0]["description"]
        }
    except Exception as e:
        print(f"Error fetching weather: {e}. Using fallback weather data. ❌")
        return {
            "temp": 25.0,  # Default temperate weather
            "humidity": 60,
            "weather": "clear sky"
        }

# Gemini API call with automatic key switching
def gemini_api_call(prompt):
    global current_api_key_index
    print("Sending prompt to Gemini... 🤖")
    while current_api_key_index < len(GOOGLE_API_KEYS):
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")  # Updated to correct model
            safety_settings = [
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            ]
            response = model.generate_content(
                prompt,
                generation_config={"temperature": 0.2, "max_output_tokens": 1600},
                safety_settings=safety_settings
            )
            if not response.candidates:
                print("No candidates in response. Response details:", response)
                raise ValueError("No candidates in response from Gemini.")
            candidate = response.candidates[0]
            print(f"Finish reason: {candidate.finish_reason}")
            response_text = ''.join([part.text for part in candidate.content.parts]).strip()
            if not response_text:
                if candidate.finish_reason == 2:  # MAX_TOKENS
                    print("Response truncated due to max tokens. Partial response:", response_text)
                    raise ValueError("Response truncated due to token limit. Try refining the prompt or increasing max_output_tokens.")
                else:
                    print("Empty response received. Response details:", response)
                    raise ValueError(f"Empty response with finish reason: {candidate.finish_reason}")
            print(f"Gemini response: {response_text[:500]}...")  # Log first 500 chars
            return response_text
        except Exception as e:
            error_str = str(e).lower()
            if ("429" in error_str or "quota exceeded" in error_str or "rate limit" in error_str or
                "401" in error_str or "invalid authentication" in error_str or "api key" in error_str):
                print(f"API key {current_api_key_index + 1} failed (error: {error_str}), switching to next key...")
                current_api_key_index += 1
                if current_api_key_index < len(GOOGLE_API_KEYS):
                    configure_gemini_api()
                    print(f"Switched to API key {current_api_key_index + 1}")
                else:
                    raise ValueError("Please try after sometime.")
            else:
                print(f"Gemini API error: {e} ❌")
                raise
    raise ValueError("No valid Google API keys available.")

# Get user data from terminal input
def get_user_data():
    print("Enter your details for crop recommendation 📝")
    data = {}
    data["city"] = input("Enter your city (e.g., Chandigarh): ").strip()
    if not data["city"]:
        raise ValueError("City cannot be empty")
    
    while True:
        try:
            data["farm_size"] = float(input("Enter farm size (e.g., 5): "))
            if data["farm_size"] <= 0:
                raise ValueError("Farm size must be positive")
            break
        except ValueError:
            print("Please enter a valid number for farm size ❌")
    
    while True:
        unit = input("Enter farm size unit (acre, bigha, yard): ").strip().lower()
        if unit in UNIT_CONVERSIONS:
            data["farm_size_unit"] = unit
            data["farm_size_acres"] = data["farm_size"] * UNIT_CONVERSIONS[unit]
            break
        print("Invalid unit! Choose acre, bigha, or yard ❌")
    
    data["last_crop"] = input("Enter last crop grown (e.g., Rice): ").strip()
    if not data["last_crop"]:
        data["last_crop"] = "None"
    
    print(f"User data: {data} ✅")
    return data

def get_soil_data(city):
    return fetch_soil_data(city)

def get_weather_data(city):
    lat, lon = geocode_city(city)
    return fetch_weather_data(lat, lon)

def get_crop_recommendation(user_data, soil_data, weather_data):
    state = soil_data.get('state', 'default').capitalize()
    print(f"Generating crop recommendation for {user_data['city']} (State: {state}) 🌾")
    prompt = f"""
    Recommend exactly two common and two exotic (high-value, less common, viable) crops for high profit in {state} next season based on:
    - Farm size: {user_data['farm_size_acres']} acres
    - City: {user_data['city']}
    - State: {state}
    - Last crop: {user_data['last_crop']}
    - Soil: pH={soil_data['ph']}, N={soil_data['nitrogen']} kg/ha, P={soil_data['phosphorus']} kg/ha, K={soil_data['potassium']} kg/ha, OC={soil_data['organic_carbon']}%, quality={soil_data['soil_quality']}, texture={soil_data['texture']}
    - Weather: temp={weather_data['temp']}°C, humidity={weather_data['humidity']}%, condition={weather_data['weather']}

    Only recommend exactly 4 crops: Crop 1 and Crop 2 as common, Crop 3 and Crop 4 as exotic. Do not add any more crops. Stop after Crop 4.
    Crops must be viable for {state}'s climate and soil. Exotic crops must have market demand in India.
    Use this exact format for each crop (brief, factual, ₹, 2025 prices):

    Crop 1:
    Name: [Common Crop 1]
    Reason: [Why suitable for {state}]
    Expected Yield: [tons]
    Water Requirements: [mm/season]
    Current Market Price: ₹[price]/kg
    Expected Investment: ₹[cost]
    Expected Revenue: ₹[revenue]
    Expected Diseases/Pests: [List]
    Preventive Measures: [One sentence]

    Crop 2:
    Name: [Common Crop 2]
    Reason: [Why suitable for {state}]
    Expected Yield: [tons]
    Water Requirements: [mm/season]
    Current Market Price: ₹[price]/kg
    Expected Investment: ₹[cost]
    Expected Revenue: ₹[revenue]
    Expected Diseases/Pests: [List]
    Preventive Measures: [One sentence]

    Crop 3:
    Name: [Exotic Crop 1]
    Reason: [Why suitable for {state}]
    Expected Yield: [tons]
    Water Requirements: [mm/season]
    Current Market Price: ₹[price]/kg
    Expected Investment: ₹[cost]
    Expected Revenue: ₹[revenue]
    Expected Diseases/Pests: [List]
    Preventive Measures: [One sentence]

    Crop 4:
    Name: [Exotic Crop 2]
    Reason: [Why suitable for {state}]
    Expected Yield: [tons]
    Water Requirements: [mm/season]
    Current Market Price: ₹[price]/kg
    Expected Investment: ₹[cost]
    Expected Revenue: ₹[revenue]
    Expected Diseases/Pests: [List]
    Preventive Measures: [One sentence]

    Base calculations on {user_data['farm_size_acres']} acres. Use current 2025 data for prices. Output in plain text only, without any markdown formatting such as bold, italics, headers, or code blocks. Use the exact structure specified with plain text and Generate only 4 crops nothing after that.
    """
    return gemini_api_call(prompt)

def parse_recommendation_to_crops(recommendation_text, state):
    print(f"Parsing recommendation text for state: {state} 📜")
    crops = []
    current_crop = {}
    lines = recommendation_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        clean_line = re.sub(r'\*\*?', '', line)
        clean_line = re.sub(r'__', '', clean_line)
        clean_line = re.sub(r'^#+\s*', '', clean_line)
        clean_line = re.sub(r'^[\*\-]\s*', '', clean_line).strip()
        clean_line = clean_line.strip()
        if re.match(r'Crop \d+:', clean_line):
            if current_crop:
                crop_name = current_crop.get('name', '').lower()
                print(f"Parsed crop: {current_crop}")
                crops.append(current_crop)
            current_crop = {}
            if len(crops) >= 4:
                break  # Stop parsing if we have 4 crops
        elif ':' in clean_line:
            key, value = clean_line.split(':', 1)
            key = key.strip().lower().replace(' ', '_')
            value = value.strip()
            value = re.sub(r'[\U0001F000-\U0001FFFF]', '', value).strip()
            if key == 'name':
                current_crop['name'] = value
            elif key == 'reason':
                current_crop['season'] = value
            elif key == 'expected_yield':
                current_crop['expectedYield'] = value
            elif key == 'water_requirements':
                current_crop['waterRequirement'] = value
            elif key == 'current_market_price':
                current_crop['profitMargin'] = value
            current_crop['suitability'] = 85
    if current_crop and len(crops) < 4:
        crop_name = current_crop.get('name', '').lower()
        print(f"Parsed crop: {current_crop}")
        crops.append(current_crop)
    
    while len(crops) < 4:
        print(f"Warning: Only {len(crops)} crops parsed, adding placeholder")
        crops.append({
            'name': f"Placeholder Crop {len(crops) + 1}",
            'season': f"Not available for {state.capitalize()}",
            'expectedYield': "N/A",
            'waterRequirement': "N/A",
            'profitMargin': "N/A",
            'suitability': 50
        })
    
    crops = crops[:4]  # Ensure only 4 crops are returned
    
    print(f"Final parsed crops: {crops}")
    return crops

def generate_pdf_in_memory(recommendation, user_data, soil_data):
    if not PDF_LIB_AVAILABLE:
        print("Skipping PDF generation due to missing reportlab. 📄❌")
        return None
    
    recommendation = re.sub(r'\*\*?', '', recommendation)
    recommendation = re.sub(r'__', '', recommendation)
    recommendation = re.sub(r'^#+\s*', '', recommendation, flags=re.MULTILINE)
    recommendation = re.sub(r'^[\*\-]\s*', '', recommendation, flags=re.MULTILINE)
    
    crop_names = []
    for line in recommendation.split('\n'):
        if line.startswith("Name:"):
            crop_name = re.sub(r'[\U0001F000-\U0001FFFF]', '', line.split(':')[1].strip())
            crop_names.append(re.sub(r'[^a-zA-Z0-9]', '_', crop_name))
    filename = "crop_recommendation.pdf" if not crop_names else f"{'_'.join(crop_names[:2])}.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    width, height = letter
    left_margin = 50
    text_width = 500
    y_position = height - 50
    
    use_dejavu = True
    try:
        pdfmetrics.registerFont(TTFont('DejaVuSans', 'DejaVuSans.ttf'))
        c.setFont('DejaVuSans', 12)
        print("Using DejaVuSans font for PDF generation. 📄✅")
    except:
        print("Warning: DejaVuSans.ttf not found. Falling back to Helvetica (using Rs. instead of ₹). 📄⚠️")
        c.setFont('Helvetica', 12)
        use_dejavu = False
        recommendation = recommendation.replace("₹", "Rs. ")
    
    c.setFont('DejaVuSans' if use_dejavu else 'Helvetica-Bold', 16)
    title = f"Crop Recommendations - {datetime.now().strftime('%Y-%m-%d')}"
    c.drawCentredString(width / 2, y_position, title)
    y_position -= 30
    
    c.setFont('DejaVuSans' if use_dejavu else 'Helvetica-Bold', 12)
    c.drawString(left_margin, y_position, "User Details:")
    y_position -= 15
    c.setFont('DejaVuSans' if use_dejavu else 'Helvetica', 10)
    user_info = [
        f"Location: {user_data['city']}",
        f"State: {soil_data.get('state', 'Unknown').capitalize()}",
        f"Farm Size: {user_data['farm_size']} {user_data['farm_size_unit'].capitalize()} ({user_data['farm_size_acres']:.2f} acres)",
        f"Last Crop: {user_data['last_crop']}"
    ]
    for line in user_info:
        c.drawString(left_margin, y_position, line)
        y_position -= 12
    y_position -= 10
    
    c.setFont('DejaVuSans' if use_dejavu else 'Helvetica-Bold', 12)
    c.drawString(left_margin, y_position, "Soil Data:")
    y_position -= 15
    c.setFont('DejaVuSans' if use_dejavu else 'Helvetica', 10)
    soil_info = [
        f"pH: {soil_data['ph']}",
        f"Nitrogen: {soil_data['nitrogen']} kg/ha",
        f"Phosphorus: {soil_data['phosphorus']} kg/ha",
        f"Potassium: {soil_data['potassium']} kg/ha",
        f"Organic Carbon: {soil_data['organic_carbon']}%",
        f"Soil Texture: {soil_data['texture']} (Clay: {soil_data['clay']}%, Sand: {soil_data['sand']}%, Silt: {soil_data['silt']}%)",
        f"Soil Quality: {soil_data['soil_quality']}"
    ]
    for line in soil_info:
        if y_position < 50:
            c.showPage()
            y_position = height - 50
        c.drawString(left_margin, y_position, line)
        y_position -= 12
    y_position -= 20
    
    c.setFont('DejaVuSans' if use_dejavu else 'Helvetica', 10)
    lines = recommendation.split('\n')
    for line in lines:
        if line.strip():
            if line.startswith("Crop 1:") or line.startswith("Crop 2:") or line.startswith("Crop 3:") or line.startswith("Crop 4:"):
                c.setFont('DejaVuSans' if use_dejavu else 'Helvetica-Bold', 12)
                if y_position < 50:
                    c.showPage()
                    y_position = height - 50
                c.drawString(left_margin, y_position, line)
                y_position -= 20
                c.setFont('DejaVuSans' if use_dejavu else 'Helvetica', 10)
            else:
                words = line.split()
                current_line = ""
                for word in words:
                    if c.stringWidth(current_line + word, 'DejaVuSans' if use_dejavu else 'Helvetica', 10) < text_width:
                        current_line += word + " "
                    else:
                        if y_position < 50:
                            c.showPage()
                            y_position = height - 50
                        c.drawString(left_margin, y_position, current_line.strip())
                        y_position -= 15
                        current_line = word + " "
                if current_line:
                    if y_position < 50:
                        c.showPage()
                        y_position = height - 50
                    c.drawString(left_margin, y_position, current_line.strip())
                    y_position -= 15
                y_position -= 5
            if y_position < 50:
                c.showPage()
                y_position = height - 50
                c.setFont('DejaVuSans' if use_dejavu else 'Helvetica', 10)
    
    c.save()
    packet.seek(0)
    pdf_base64 = base64.b64encode(packet.getvalue()).decode('utf-8')
    print("PDF generated in memory 🎉")
    return pdf_base64

# Main function to run in terminal
def main():
    print("Starting Crop Recommendation System... 🚜")
    try:
        # Get user data from terminal
        user_data = get_user_data()
        soil_data = get_soil_data(user_data["city"])
        weather_data = get_weather_data(user_data["city"])
        recommendation = get_crop_recommendation(user_data, soil_data, weather_data)
        crops = parse_recommendation_to_crops(recommendation, soil_data.get('state', 'default'))
        pdf_base64 = generate_pdf_in_memory(recommendation, user_data, soil_data)

        # Print results
        print(f"\nRecommended Crops:\n{recommendation}\n")
        print(f"PDF Base64 (first 100 chars): {pdf_base64[:100]}...\n")

        # Optionally save PDF to file
        if pdf_base64:
            crop_names = []
            for line in recommendation.split('\n'):
                if line.startswith("Name:"):
                    crop_name = re.sub(r'[\U0001F000-\U0001FFFF]', '', line.split(':')[1].strip())
                    crop_names.append(re.sub(r'[^a-zA-Z0-9]', '_', crop_name))
            filename = "crop_recommendation.pdf" if not crop_names else f"{'_'.join(crop_names[:2])}.pdf"
            os.makedirs("crop_reports", exist_ok=True)
            full_path = os.path.join("crop_reports", filename)
            with open(full_path, "wb") as f:
                f.write(base64.b64decode(pdf_base64))
            print(f"PDF saved to {full_path} 🎉")
    except Exception as e:
        print(f"Error: {e} ❌")

if __name__ == "__main__":
    main()