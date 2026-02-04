import sqlite3

DB_PATH = "coffee.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT country, price_usd, source, last_updated
    FROM cappuccino_prices
    ORDER BY price_usd DESC
""")

rows = cursor.fetchall()

for row in rows:
    print(row)

conn.close()
