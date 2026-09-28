"""Server-side widget loader.

A widget that needs outside data gets a module here, widgets/<name>.py, with:

    CACHE_SECONDS = 600          # optional, how long to reuse data (default 60)

    def get_data(config) -> dict:
        ...

Whatever get_data returns is served at /api/widget/<name> and passed to
the widget's render() function in static/widgets/<name>.js.

Widgets that don't need outside data (like the clock) only need the .js file.
"""
import importlib


def load(name):
    """Return the widget's Python module, or None if it has no server side."""
    try:
        return importlib.import_module(f"widgets.{name}")
    except ModuleNotFoundError as e:
        if e.name == f"widgets.{name}":
            return None
        raise  # the widget exists but imports something missing: show the real error
