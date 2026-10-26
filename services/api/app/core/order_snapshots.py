import json


def option_snapshot(variant):
    return json.dumps({'_arise_option_snapshot': 1, 'title': variant.title, 'attributes_json': variant.attributes_json}, ensure_ascii=False)


def read_option_snapshot(value):
    try:
        snapshot = json.loads(value) if value else None
    except (ValueError, TypeError):
        return None, value
    if isinstance(snapshot, dict) and snapshot.get('_arise_option_snapshot') == 1 and isinstance(snapshot.get('title'), str):
        attributes = snapshot.get('attributes_json')
        if attributes is None or isinstance(attributes, str):
            return snapshot['title'], attributes
    return None, value
