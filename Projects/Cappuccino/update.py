

import asyncio
import time
from datetime import date

import sqlite3

from db import DB_PATH, init_db
from scrape_numbeo import scrape_cappuccino_prices

SOURCE = "numbeo"


def save_prices(prices: list[tuple[str, float]], source: str, last_updated: str) -> int:
    rows = [(country, price, source, last_updated) for country, price in prices]
    if not rows:
        return 0

    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany("""
            INSERT INTO cappuccino_prices (country, price_usd, source, last_updated)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(country) DO UPDATE SET
                price_usd = excluded.price_usd,
                source = excluded.source,
                last_updated = excluded.last_updated
        """, rows)

    return len(rows)


async def main() -> None:
    init_db()
    today = date.today().isoformat()

    t0 = time.perf_counter()
    prices = await scrape_cappuccino_prices()
    scrape_time = time.perf_counter() - t0

    t1 = time.perf_counter()
    written = save_prices(prices, SOURCE, today)
    write_time = time.perf_counter() - t1

    print("-" * 60)
    print(f"Scrape time : {scrape_time:.4f}s")
    print(f"Write time  : {write_time:.4f}s")
    print(f"Rows        : {written}")
    print("-" * 60)


if __name__ == "__main__":
    asyncio.run(main())
    