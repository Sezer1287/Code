

import sqlite3
from typing import Optional


DB_PATH = "coffee.db"


def _connect():
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cappuccino_prices (
                country TEXT PRIMARY KEY,
                price_usd REAL NOT NULL,
                source TEXT NOT NULL,
                last_updated TEXT NOT NULL
            )
        """)


def get_all_countries() -> list[str]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT country FROM cappuccino_prices ORDER BY country"
        ).fetchall()
    return [r[0] for r in rows]


def get_price(country: str) -> Optional[float]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT price_usd FROM cappuccino_prices WHERE country = ?",
            (country,),
        ).fetchone()
    return float(row[0]) if row else None
