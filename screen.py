"""Turns the touchscreen's backlight on and off.

The display's backlight shows up under /sys/class/backlight/<name>/. The name
varies by screen and Pi (rpi_backlight, 10-0045, 11-0045, ...), so we use
whatever is there. Touch keeps working while the backlight is off.

setup.sh installs a rule that lets the display's user write to these files.
On a laptop or an HDMI screen there's no backlight to control, so this does
nothing and the page just goes black instead.
"""
import glob
import logging

log = logging.getLogger("display.screen")

ON, OFF = "0", "4"  # bl_power values: 0 = on, 4 = fully off


def set_backlight(on):
    """Returns True if at least one backlight was switched."""
    switched = False
    for path in glob.glob("/sys/class/backlight/*/bl_power"):
        try:
            with open(path, "w") as f:
                f.write(ON if on else OFF)
            switched = True
        except OSError as e:
            log.warning("Can't switch backlight %s: %s (re-run setup.sh?)", path, e)
    return switched
