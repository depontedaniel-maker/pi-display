"""Weather widget: current conditions + 5-day forecast from Open-Meteo.

Open-Meteo is free and needs no API key. Docs: https://open-meteo.com/en/docs
"""
import json
import urllib.parse
import urllib.request

CACHE_SECONDS = 600  # 10 minutes

API_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather codes -> (description, day icon, night icon)
WEATHER_CODES = {
    0: ("Clear", "☀️", "🌙"),
    1: ("Mostly clear", "🌤️", "🌙"),
    2: ("Partly cloudy", "⛅", "☁️"),
    3: ("Overcast", "☁️", "☁️"),
    45: ("Fog", "🌫️", "🌫️"),
    48: ("Freezing fog", "🌫️", "🌫️"),
    51: ("Light drizzle", "🌦️", "🌧️"),
    53: ("Drizzle", "🌦️", "🌧️"),
    55: ("Heavy drizzle", "🌧️", "🌧️"),
    56: ("Freezing drizzle", "🌧️", "🌧️"),
    57: ("Freezing drizzle", "🌧️", "🌧️"),
    61: ("Light rain", "🌦️", "🌧️"),
    63: ("Rain", "🌧️", "🌧️"),
    65: ("Heavy rain", "🌧️", "🌧️"),
    66: ("Freezing rain", "🌧️", "🌧️"),
    67: ("Freezing rain", "🌧️", "🌧️"),
    71: ("Light snow", "🌨️", "🌨️"),
    73: ("Snow", "🌨️", "🌨️"),
    75: ("Heavy snow", "❄️", "❄️"),
    77: ("Snow grains", "🌨️", "🌨️"),
    80: ("Showers", "🌦️", "🌧️"),
    81: ("Showers", "🌧️", "🌧️"),
    82: ("Heavy showers", "🌧️", "🌧️"),
    85: ("Snow showers", "🌨️", "🌨️"),
    86: ("Heavy snow showers", "❄️", "❄️"),
    95: ("Thunderstorm", "⛈️", "⛈️"),
    96: ("Thunderstorm, hail", "⛈️", "⛈️"),
    99: ("Thunderstorm, hail", "⛈️", "⛈️"),
}


def describe(code, is_day=True):
    desc, day_icon, night_icon = WEATHER_CODES.get(code, ("Unknown", "❔", "❔"))
    return desc, day_icon if is_day else night_icon


def get_data(config):
    params = {
        "latitude": config.LATITUDE,
        "longitude": config.LONGITUDE,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,"
                   "weather_code,wind_speed_10m,is_day",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,"
                 "precipitation_probability_max",
        "timezone": "auto",
        "forecast_days": 5,
    }
    if config.UNITS == "imperial":
        params["temperature_unit"] = "fahrenheit"
        params["wind_speed_unit"] = "mph"

    url = f"{API_URL}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=10) as resp:
        raw = json.load(resp)

    cur = raw["current"]
    desc, icon = describe(cur["weather_code"], bool(cur.get("is_day", 1)))

    daily = raw["daily"]
    forecast = []
    for i, date in enumerate(daily["time"]):
        d_desc, d_icon = describe(daily["weather_code"][i])
        forecast.append({
            "date": date,  # "2026-09-28"; the browser turns it into a weekday
            "high": round(daily["temperature_2m_max"][i]),
            "low": round(daily["temperature_2m_min"][i]),
            "precip": daily["precipitation_probability_max"][i],
            "description": d_desc,
            "icon": d_icon,
        })

    return {
        "location": config.LOCATION_NAME,
        "temp": round(cur["temperature_2m"]),
        "feels_like": round(cur["apparent_temperature"]),
        "humidity": cur["relative_humidity_2m"],
        "wind": round(cur["wind_speed_10m"]),
        "description": desc,
        "icon": icon,
        "temp_unit": "°F" if config.UNITS == "imperial" else "°C",
        "wind_unit": "mph" if config.UNITS == "imperial" else "km/h",
        "forecast": forecast,
    }
