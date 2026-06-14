import re
from typing import Optional


def sanitize(val: Optional[str], max_len: int = 2000) -> str:
    if not val:
        return ""
    val = val.strip()[:max_len]
    val = re.sub(r"<[^>]*>", "", val)
    return val


def sanitize_object(obj: dict, max_str_len: int = 2000) -> dict:
    cleaned = {}
    for k, v in obj.items():
        if isinstance(v, str):
            cleaned[k] = sanitize(v, max_str_len)
        else:
            cleaned[k] = v
    return cleaned
