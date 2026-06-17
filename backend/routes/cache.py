import time
import threading
import logging
from typing import Optional, Any

logger = logging.getLogger("atlas.cache")

_cache: dict[str, dict] = {}
_lock = threading.Lock()
_DEFAULT_TTL = 300  # 5 minutes


def get_cache(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry is None:
        return None
    if time.time() > entry["expires_at"]:
        with _lock:
            del _cache[key]
        return None
    return entry["value"]


def set_cache(key: str, value: Any, ttl: int = _DEFAULT_TTL):
    with _lock:
        _cache[key] = {"value": value, "expires_at": time.time() + ttl}


def clear_cache(pattern: Optional[str] = None):
    with _lock:
        if pattern:
            keys = [k for k in _cache if pattern in k]
            for k in keys:
                del _cache[k]
        else:
            _cache.clear()


def cache_key(*parts: str) -> str:
    return ":".join(parts)
