# Pi Display

A clock and weather display for a Raspberry Pi touchscreen. It updates itself
from GitHub, so adding a feature is: edit on your laptop, `git push`, done.

## How it works

- `app.py` is a small Flask web server on the Pi.
- Chromium shows the page full screen (kiosk mode) on the touchscreen.
- Each feature is a **widget**. The clock and weather are the first two.
- Every 5 minutes the Pi checks GitHub. If there's new code it pulls it,
  restarts the server, and the screen reloads itself.
- If new code fails to start, the Pi rolls back to the last working version
  and waits for you to push a fix.

## Hardware

- Raspberry Pi 4 (2GB+) or Pi 5, or a Pi Zero 2 W for a cheaper, slower build
- A touchscreen: the official Raspberry Pi Touch Display 2 or any HDMI/DSI touch panel
- Power supply and a microSD card (16GB+)

## First-time setup

### 1. Put the code on GitHub (on your laptop)

```bash
cd pi-display
git init
git add .
git commit -m "Initial display"
# Create an empty repo called pi-display on github.com, then:
git remote add origin https://github.com/<your-username>/pi-display.git
git branch -M main
git push -u origin main
```

A **public** repo is simplest: the Pi can pull without a login. If you want it
private, see "Private repo" below.

### 2. Set up the Pi

1. Flash **Raspberry Pi OS (64-bit, with desktop)** with Raspberry Pi Imager.
   In the Imager's settings, set your Wi-Fi, a username, and turn on SSH.
2. Boot the Pi with the touchscreen attached, then SSH in (or use its terminal):

```bash
git clone https://github.com/<your-username>/pi-display.git ~/pi-display
cd ~/pi-display
./setup.sh
sudo reboot
```

The display comes up full screen after reboot.

If the screen is sideways, rotate it once in **Preferences → Screen Configuration**
on the Pi's desktop (the Touch Display 2 is portrait out of the box). The layout
adapts to either orientation.

## Try it on your laptop first

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
DISPLAY_DEBUG=1 python app.py      # Windows PowerShell: $env:DISPLAY_DEBUG=1; python app.py
```

Open http://localhost:5000. Resize the browser to 800×480 or 1280×720 to see
roughly what the touchscreen will look like.

## Settings

Everything you'd normally change is in `config.py`: location, °C/°F,
12/24-hour clock, and which widgets are shown and in what order.

Tapping the clock switches between 12- and 24-hour.

**Screen sleep:** between the `SCREEN_SLEEP` times in `config.py` (default
11 p.m. to 7 a.m.) the screen turns off. Tap it to wake it for a minute; that
first tap only wakes the screen. Set `SCREEN_SLEEP = None` to keep it on.

The **Orion** widget sits in the top-right corner as a small sky map. It shows
Orion's direction and height, or when it next rises. Tap it for a full-screen
view of what you'd see facing that direction. It closes after a minute or on
another tap. It's calculated on the Pi from your `LATITUDE`/`LONGITUDE`, so it
works offline. To hide it, remove `"orion"` from `WIDGETS`.

## Adding a feature (a new widget)

Say you want a "quote of the day" widget called `quote`.

**1. `static/widgets/quote.js`** draws it:

```js
Display.register("quote", {
  needsData: true,          // fetch from widgets/quote.py
  refreshSeconds: 3600,
  render(el, data) {
    el.innerHTML = `<div style="font-size:4vmin;text-align:center">${data.text}</div>`;
  },
});
```

**2. `widgets/quote.py`** gets the data (skip this file if the widget doesn't
need anything from the internet, like the clock):

```python
CACHE_SECONDS = 3600

def get_data(config):
    return {"text": "Hello from the Pi"}
```

**3. `config.py`**: add it to the list:

```python
WIDGETS = ["clock", "weather", "quote"]
```

**4. Ship it:**

```bash
git add .
git commit -m "Add quote widget"
git push
```

Within 5 minutes the Pi picks it up and the screen reloads.

Widgets can also react to taps: add an `onTap(el, data, cfg)` function
(see `static/widgets/clock.js`).

## Useful commands on the Pi

| What | Command |
|---|---|
| Is the server running? | `systemctl status pi-display` |
| Server logs | `journalctl -u pi-display -f` |
| Update log | `journalctl -u pi-display-update -n 50` |
| Update right now | `sudo systemctl start pi-display-update` |
| Restart the server | `sudo systemctl restart pi-display` |

## Troubleshooting

- **Screen shows "weather unavailable"**: the Pi can't reach the internet, or
  Open-Meteo is down. It retries automatically. If it had data before, it keeps
  showing that data, dimmed.
- **An update didn't appear**: check the update log. If it says "failed to
  start, rolling back", check `journalctl -u pi-display -n 50` for the error,
  fix it on your laptop, and push again.
- **Chromium doesn't open at boot**: run `~/pi-display/deploy/kiosk.sh` from the
  Pi's terminal to see the error. On some Raspberry Pi OS versions, desktop
  autostart files are ignored. In that case add this line to
  `~/.config/labwc/autostart`:
  `/home/<your-username>/pi-display/deploy/kiosk.sh &`

## Private repo

The Pi needs read access. Create a deploy key on the Pi:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Paste the key into the repo on GitHub under **Settings → Deploy keys**
(read-only is fine), then clone with the SSH URL:
`git clone git@github.com:<your-username>/pi-display.git ~/pi-display`.
