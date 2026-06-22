import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Configuration
EMAIL_SENDER = "y21590754@gmail.com"      # Replace with your sender email
EMAIL_PASSWORD = "idab gvsb yqbs xnau"    # Replace with your email app password (e.g., Gmail app password)
API_KEY = '2e8a46b11774abaa60902832377a1b5a'  # OpenWeatherMap API Key (from JS)
FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast'
AIRTEL_SMS_GATEWAY = "@airtelmail.com"  # Airtel SMS gateway domain

def get_lat_lon_from_city(city):
    """Get latitude and longitude from city name using Nominatim."""
    try:
        nominatim_url = f'https://nominatim.openstreetmap.org/search?format=json&q={city}&limit=1&addressdetails=1'
        headers = {'User-Agent': 'KrishiMitra/1.0'}  # Nominatim requires User-Agent
        response = requests.get(nominatim_url, headers=headers, timeout=10)
        data = response.json()
        if data and len(data) > 0:
            return float(data[0]['lat']), float(data[0]['lon'])
        else:
            print(f"City '{city}' not found. Please check the spelling.")
            return None, None
    except Exception as e:
        print(f"Error fetching location: {e}")
        return None, None

def fetch_weather_forecast(lat, lon):
    """Fetch 5-day weather forecast using OpenWeatherMap API."""
    try:
        params = {
            'lat': lat,
            'lon': lon,
            'appid': API_KEY,
            'units': 'metric'  # Celsius
        }
        response = requests.get(FORECAST_URL, params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"API Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error fetching forecast: {e}")
        return None

def check_for_calamities(forecast_data):
    """Check forecast for natural calamities that can affect crops (e.g., rain, thunderstorm)."""
    if not forecast_data:
        return []
    
    severe_conditions = [
        'Thunderstorm', 'Storm', 'Heavy Rain', 'Tornado', 'Hurricane'
    ]
    high_precip_threshold = 0.5  # 50% chance of precipitation for rain alerts
    
    alerts = []
    seen_dates = set()  # To avoid duplicate alerts per day
    
    for item in forecast_data['list'][:40]:  # Next ~5 days (8 entries per day)
        timestamp = item['dt']
        date_str = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
        
        if date_str in seen_dates:
            continue
        seen_dates.add(date_str)
        
        weather_main = item['weather'][0]['main']
        weather_desc = item['weather'][0]['description']
        precip_chance = item.get('pop', 0)
        
        is_severe = (
            any(condition in weather_main for condition in severe_conditions) or
            (weather_main == 'Rain' and precip_chance >= high_precip_threshold)
        )
        
        if is_severe:
            temp_min = item['main']['temp_min']
            temp_max = item['main']['temp_max']
            alerts.append({
                'date': date_str,
                'condition': weather_desc.title(),
                'precip_chance': f"{precip_chance * 100:.0f}%",
                'temp_range': f"{temp_min:.0f}°C - {temp_max:.0f}°C",
                'message': f"Heavy {weather_desc} expected on {date_str} with {precip_chance * 100:.0f}% chance. Potential crop damage from flooding/wind. Recommended actions: Secure crops, check drainage, monitor fields."
            })
    
    return alerts

def send_notification(recipient, subject, body, is_sms=False):
    """Send notification using SMTP (email or SMS via gateway)."""
    msg = MIMEMultipart()
    msg['From'] = EMAIL_SENDER
    msg['To'] = recipient
    msg['Subject'] = "" if is_sms else subject  # Empty subject for SMS
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)  # Gmail SMTP
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(EMAIL_SENDER, recipient, text)
        server.quit()
        print(f"{'SMS' if is_sms else 'Email'} sent successfully to {recipient}!")
        return True
    except Exception as e:
        print(f"Error sending {'SMS' if is_sms else 'email'} to {recipient}: {e}")
        return False

def check_and_notify_weather():
    """Prompt user for city, email, and Airtel phone number; check forecast, and send notifications if calamities detected."""
    try:
        city = input("Enter your farm city/region (e.g., Delhi): ").strip()
        if not city:
            print("City is required. Please run again.")
            return
        
        recipient_email = input("Enter recipient email for alerts: ").strip()
        if not recipient_email or '@' not in recipient_email:
            print("Valid email is required. Please run again.")
            return
        
        recipient_phone = input("Enter recipient Airtel phone number (10 digits, e.g., 9871035625): ").strip()
        if not recipient_phone or len(recipient_phone) != 10 or not recipient_phone.isdigit():
            print("Valid 10-digit Airtel phone number is required. Please run again.")
            return
        
        recipient_sms = f"{recipient_phone}{AIRTEL_SMS_GATEWAY}"
        
        print(f"Checking weather forecast for {city}...")
        
        # Get coordinates
        lat, lon = get_lat_lon_from_city(city)
        if not lat or not lon:
            return
        
        # Fetch forecast
        forecast_data = fetch_weather_forecast(lat, lon)
        if not forecast_data:
            return
        
        # Check for calamities
        alerts = check_for_calamities(forecast_data)
        
        if alerts:
            print(f"Calamity alerts found for {len(alerts)} days:")
            alert_body = "Hello Farmer,\n\n"
            alert_body += f"We found bad weather ahead for your farm in {city}. Here's a simple heads-up:\n\n"
            alert_body += "What to expect:\n\n"
            
            for alert in alerts:
                # Clean up condition to avoid redundancy (e.g., remove extra "rain")
                clean_condition = alert['condition'].replace(' rain', '').title()
                alert_body += f"- {alert['date']}: {clean_condition} (chance: {alert['precip_chance']}, temps: {alert['temp_range']})\n"
                # Simplified tip: Focus on key action, no repetition
                simple_tip = "Get ready: Cover sensitive crops and check drainage."
                alert_body += f"  {simple_tip}\n\n"
            
            alert_body += "Stay safe! Check your crops and get ready.\n\n"
            alert_body += "Your friends at KrishiMitra AI"
            
            subject = f"🚨 Quick Weather Alert for {city}"
            
            # Send to email
            email_sent = send_notification(recipient_email, subject, alert_body, is_sms=False)
            
            # Prepare shortened SMS body (SMS limit ~160 chars, keep concise)
            sms_body = f"Weather Alert for {city}:\n"
            for alert in alerts[:2]:  # Limit to top 2 alerts for brevity
                clean_condition = alert['condition'].replace(' rain', '').title()
                sms_body += f"{alert['date']}: {clean_condition} ({alert['precip_chance']} chance).\n"
                sms_body += "Cover crops, check drainage.\n"
            sms_body += "Stay safe! - KrishiMitra"
            sms_body = sms_body[:160]  # Truncate if too long
            
            # Send to SMS
            sms_sent = send_notification(recipient_sms, "", sms_body, is_sms=True)
            
            if email_sent or sms_sent:
                print("Alert notifications sent!")
            else:
                print("Failed to send alert notifications.")
        else:
            print("No severe weather detected in the next 5 days. Your crops are safe!")
    
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    except Exception as e:
        print(f"Unexpected error: {e}")

# Main execution
if __name__ == "__main__":
    print("KrishiMitra Weather Calamity Checker")
    check_and_notify_weather()