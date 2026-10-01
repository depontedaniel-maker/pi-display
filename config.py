"""Settings for your display.

Edit these on your laptop, commit, and push. The Pi picks up the change
automatically within a few minutes.
"""

# Location for weather and the sky widgets (default: Toronto)
LATITUDE = 43.6532
LONGITUDE = -79.3832
LOCATION_NAME = "Toronto"

# "metric" (°C, km/h) or "imperial" (°F, mph)
UNITS = "metric"

# True = 1:30 PM, False = 13:30
CLOCK_12_HOUR = True

# Widgets shown on screen, in order.
# Each name needs a static/widgets/<name>.js file, and, if it needs data
# from the internet, a widgets/<name>.py file too.
WIDGETS = ["clock", "weather", "orion"]

# Screen sleep: the screen turns off between these times (24-hour clock).
# Tap it to wake it for SCREEN_WAKE_SECONDS. Use SCREEN_SLEEP = None to never sleep.
SCREEN_SLEEP = ("21:00", "07:00")
SCREEN_WAKE_SECONDS = 60

# Port the local web server runs on
PORT = 5050
