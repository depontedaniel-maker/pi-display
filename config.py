"""Settings for your display.

Edit these on your laptop, commit, and push. The Pi picks up the change
automatically within a few minutes.
"""

# Location for weather and the sky widgets (default: Toronto)
LATITUDE = 43.6532
LONGITUDE = -79.3832
LOCATION_NAME = "Home"

# "metric" (°C, km/h) or "imperial" (°F, mph)
UNITS = "metric"

# True = 1:30 PM, False = 13:30
CLOCK_12_HOUR = True

# Widgets shown on screen, in order.
# Each name needs a static/widgets/<name>.js file, and, if it needs data
# from the internet, a widgets/<name>.py file too.
WIDGETS = ["clock", "weather", "orion"]

# Port the local web server runs on
PORT = 5050
