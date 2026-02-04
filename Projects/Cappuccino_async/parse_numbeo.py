from __future__ import annotations

import re
from bs4 import BeautifulSoup

NUMBEO_URL = "https://www.numbeo.com/cost-of-living/prices_by_country.jsp?displayCurrency=USD&itemId=114"


def parse_price_from_html(html: str, country: str) -> float:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id="t2") or soup.find("table")
    if table is None:
        return _fallback_parse_from_links_or_text(soup, country)

    body = table.find("tbody")
    rows = body.find_all("tr") if body else table.find_all("tr")

    for row in rows:
        cols = row.find_all(["td", "th"])
        if len(cols) < 3:
            continue
        country_text = cols[1].get_text(" ", strip=True)
        if country_text.lower() != country.lower():
            continue
        price_text = cols[2].get_text(" ", strip=True)
        return _extract_price(price_text)

    return _fallback_parse_from_links_or_text(soup, country)


def load_html_from_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _fallback_parse_from_links_or_text(soup: BeautifulSoup, country: str) -> float:
    target = country.strip().lower()

    for link in soup.find_all("a"):
        if link.get_text(strip=True).lower() != target:
            continue
        sibling_text = "".join(
            s if isinstance(s, str) else s.get_text(" ", strip=True)
            for s in link.next_siblings
        )
        try:
            return _extract_price(sibling_text)
        except ValueError:
            pass

    text = soup.get_text("\n", strip=True)
    pattern = re.compile(rf"\\b{re.escape(country)}\\b[^\\d]*(\\d[\\d,\\.]*)", re.IGNORECASE)
    match = pattern.search(text)
    if match:
        return _extract_price(match.group(1))

    raise ValueError(f"Country not found: {country}")


def _extract_price(text: str) -> float:
    if not text:
        raise ValueError("Price not found")

    match = re.search(r"(\d[\d,\.]*)", text)
    if not match:
        raise ValueError("Price not found")

    num = match.group(1)
    if "," in num and "." not in num:
        num = num.replace(",", ".")
    else:
        num = num.replace(",", "")

    try:
        return float(num)
    except ValueError as exc:
        raise ValueError("Invalid price format") from exc
