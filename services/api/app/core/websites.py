import json
from pathlib import Path

CATALOG = json.loads((Path(__file__).resolve().parents[1] / 'website_catalog.json').read_text())
WEBSITE_TYPES = {item['key']: item for item in CATALOG['types']}


def default_theme(website_type):
    return WEBSITE_TYPES[website_type]['default_theme']


def starter_sections(website_type):
    return CATALOG['starters'].get(website_type, [])
