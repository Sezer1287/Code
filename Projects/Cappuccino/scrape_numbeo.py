

import re
from typing import Optional

import aiohttp
from bs4 import BeautifulSoup


URL = "https://www.numbeo.com/cost-of-living/prices_by_country.jsp?displayCurrency=USD&itemId=114"
NUMBER_RE = re.compile(r"(\d+(?:\.\d+)?)")


async def fetch_html() -> str:
    headers = {"User-Agent": "Mozilla/5.0 (coffee-project)"}
    timeout = aiohttp.ClientTimeout(total=30)

    async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
        async with session.get(URL) as r:
            r.raise_for_status()
            return await r.text()


def parse_price(text: str) -> Optional[float]:
    text = text.replace(",", ".")
    m = NUMBER_RE.search(text)
    return float(m.group(1)) if m else None


async def scrape_cappuccino_prices() -> list[tuple[str, float]]:
    soup = BeautifulSoup(await fetch_html(), "html.parser")

    table = soup.find("table", id="t2") or soup.find("table")
    if not table:
        return []

    results: list[tuple[str, float]] = []
    for row in table.select("tbody tr"):
        tds = row.find_all("td")
        if len(tds) < 3:
            continue

        country = tds[1].get_text(strip=True)
        raw = tds[2].get_text(" ", strip=True)
        price = parse_price(raw)

        if country and price is not None:
            results.append((country, price))

    return results
