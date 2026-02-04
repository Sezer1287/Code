from __future__ import annotations

import asyncio
import os
import random
from typing import Dict, Tuple

import aiohttp

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


async def fetch_cappuccino_async(
    country: str,
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    mock: bool | None = None,
    timeout: float = 10.0,
) -> Tuple[float | None, str | None]:
    if mock is None:
        mock = os.getenv("MOCK") == "1"
    html_path = os.getenv("HTML_PATH")

    if mock:
        await asyncio.sleep(random.uniform(0.2, 1.0))
        if country not in MOCK_PRICES:
            return None, f"Unknown country: {country}"
        return MOCK_PRICES[country], None

    if html_path:
        try:
            html = await asyncio.to_thread(load_html_from_file, html_path)
            price = parse_price_from_html(html, country)
            return price, None
        except Exception as exc:
            return None, f"Parse failed: {exc}"

    headers = {"User-Agent": USER_AGENT}
    async with semaphore:
        await asyncio.sleep(COOLDOWN_SECONDS + random.uniform(0.0, 1.0))
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                req_timeout = aiohttp.ClientTimeout(total=timeout)
                async with session.get(URL, timeout=req_timeout, headers=headers) as resp:
                    if resp.status == 429 and attempt < MAX_RETRIES:
                        retry_after = resp.headers.get("Retry-After")
                        if retry_after and retry_after.isdigit():
                            delay = min(float(retry_after), BACKOFF_CAP)
                        else:
                            delay = min(
                                BACKOFF_BASE * (2 ** (attempt - 1)) + random.uniform(0.0, 0.4),
                                BACKOFF_CAP,
                            )
                        await asyncio.sleep(delay)
                        continue
                    if resp.status != 200:
                        return None, f"HTTP {resp.status}"
                    text = await resp.text()
                    break
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                if attempt < MAX_RETRIES:
                    delay = min(
                        BACKOFF_BASE * (2 ** (attempt - 1)) + random.uniform(0.0, 0.4),
                        BACKOFF_CAP,
                    )
                    await asyncio.sleep(delay)
                    continue
                return None, f"Request failed: {exc}"
        else:
            return None, "Request failed: retries exhausted"

    try:
        price = parse_price_from_html(text, country)
        return price, None
    except Exception as exc:
        return None, f"Parse failed: {exc}"


async def fetch_and_cache(
    country: str,
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    cache: Dict[str, Tuple[float | None, str | None]],
    mock: bool | None = None,
) -> Tuple[float | None, str | None]:
    result = await fetch_cappuccino_async(country, session, semaphore, mock=mock)
    cache[country] = result
    return result
