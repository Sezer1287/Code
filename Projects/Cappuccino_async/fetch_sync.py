from __future__ import annotations

import os
import random
import time
from typing import Tuple

import requests

from parse_numbeo import load_html_from_file, parse_price_from_html

URL = "https://www.numbeo.com/cost-of-living/prices_by_country.jsp?displayCurrency=USD&itemId=114"
USER_AGENT = "CappuccinoAsyncDemo/1.0 (+https://www.numbeo.com/)"
MAX_RETRIES = 6
BACKOFF_BASE = 0.8
BACKOFF_CAP = 8.0
COOLDOWN_SECONDS = 12.0

MOCK_PRICES = {
    "Turkey": 1.95,
    "United Kingdom": 4.05,
    "France": 3.25,
    "Germany": 3.45,
    "Spain": 2.85,
}


def fetch_cappuccino_sync(country: str, mock: bool | None = None, timeout: float = 10.0) -> Tuple[float | None, str | None]:
    if mock is None:
        mock = os.getenv("MOCK") == "1"
    html_path = os.getenv("HTML_PATH")

    if mock:
        time.sleep(random.uniform(0.2, 1.0))
        if country not in MOCK_PRICES:
            return None, f"Unknown country: {country}"
        return MOCK_PRICES[country], None

    if html_path:
        try:
            html = load_html_from_file(html_path)
            price = parse_price_from_html(html, country)
            return price, None
        except Exception as exc:
            return None, f"Parse failed: {exc}"

    headers = {"User-Agent": USER_AGENT}
    if not mock:
        time.sleep(COOLDOWN_SECONDS + random.uniform(0.0, 1.0))
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(URL, timeout=timeout, headers=headers)
            if resp.status_code == 429 and attempt < MAX_RETRIES:
                retry_after = resp.headers.get("Retry-After")
                if retry_after and retry_after.isdigit():
                    delay = min(float(retry_after), BACKOFF_CAP)
                else:
                    delay = min(BACKOFF_BASE * (2 ** (attempt - 1)) + random.uniform(0.0, 0.4), BACKOFF_CAP)
                time.sleep(delay)
                continue
            resp.raise_for_status()
            price = parse_price_from_html(resp.text, country)
            return price, None
        except requests.RequestException as exc:
            if attempt < MAX_RETRIES:
                delay = min(BACKOFF_BASE * (2 ** (attempt - 1)) + random.uniform(0.0, 0.4), BACKOFF_CAP)
                time.sleep(delay)
                continue
            return None, f"Request failed: {exc}"
        except Exception as exc:
            return None, f"Parse failed: {exc}"
