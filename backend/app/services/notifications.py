import os
import json
import urllib.request
from typing import Optional


def _webhook_url() -> Optional[str]:
    return os.getenv("SLACK_WEBHOOK_URL") or os.getenv("NOTIFY_WEBHOOK_URL")


def send_webhook(message: str, extra: Optional[dict] = None) -> None:
    url = _webhook_url()
    if not url:
        return
    payload = {"text": message}
    if extra:
        payload["blocks"] = extra.get("blocks")
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"Webhook send failed: {e}")
