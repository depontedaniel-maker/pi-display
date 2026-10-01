#!/usr/bin/env bash
# One-time setup on a fresh Raspberry Pi (Raspberry Pi OS with desktop).
#
#   git clone https://github.com/<you>/pi-display.git ~/pi-display
#   cd ~/pi-display
#   ./setup.sh
#
# Run as your normal user (not with sudo); it asks for sudo when needed.
# Safe to run again.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Run this as your normal user, not root: ./setup.sh"
  exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
USER_NAME="$(whoami)"
echo "Setting up Pi Display in $DIR for user $USER_NAME"

echo "==> Installing system packages"
sudo apt-get update
sudo apt-get install -y git curl python3-venv fonts-noto-color-emoji
# Chromium is preinstalled on the desktop image; the package name varies by OS version
command -v chromium >/dev/null || command -v chromium-browser >/dev/null || \
  sudo apt-get install -y chromium || sudo apt-get install -y chromium-browser

echo "==> Creating Python environment"
python3 -m venv "$DIR/.venv"
"$DIR/.venv/bin/pip" install --quiet --upgrade pip
"$DIR/.venv/bin/pip" install --quiet -r "$DIR/requirements.txt"

chmod +x "$DIR/deploy/update.sh" "$DIR/deploy/kiosk.sh"

echo "==> Installing services"
for unit in pi-display.service pi-display-update.service pi-display-update.timer; do
  sed -e "s|__USER__|$USER_NAME|g" -e "s|__DIR__|$DIR|g" \
    "$DIR/deploy/$unit" | sudo tee "/etc/systemd/system/$unit" >/dev/null
done

# Let the updater restart the display without a password prompt (this one command only)
echo "$USER_NAME ALL=(root) NOPASSWD: /usr/bin/systemctl restart pi-display.service" \
  | sudo tee /etc/sudoers.d/pi-display >/dev/null
sudo chmod 440 /etc/sudoers.d/pi-display
sudo visudo -cf /etc/sudoers.d/pi-display >/dev/null

echo "==> Allowing the display to switch the screen's backlight (for night sleep)"
sudo usermod -aG video "$USER_NAME"
echo 'SUBSYSTEM=="backlight", RUN+="/bin/chgrp video /sys/class/backlight/%k/bl_power", RUN+="/bin/chmod g+w /sys/class/backlight/%k/bl_power"' \
  | sudo tee /etc/udev/rules.d/99-pi-display-backlight.rules >/dev/null
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=backlight || true

sudo systemctl daemon-reload
sudo systemctl enable --now pi-display.service
sudo systemctl enable --now pi-display-update.timer
sudo systemctl restart pi-display.service   # pick up any changes when re-run

echo "==> Launching the display full screen at login"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/pi-display.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Pi Display
Exec=$DIR/deploy/kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

if command -v raspi-config >/dev/null; then
  echo "==> Auto-login to desktop, screen blanking off"
  sudo raspi-config nonint do_boot_behaviour B4   # boot to desktop, logged in
  sudo raspi-config nonint do_blanking 1          # 1 = disable blanking
fi

echo
echo "Done. Reboot to start the display:  sudo reboot"
echo "Server status:   systemctl status pi-display"
echo "Update log:      journalctl -u pi-display-update -n 50"
