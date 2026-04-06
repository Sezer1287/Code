import sqlite3

DB_PATH = "finance.db"


def show_table(table_name):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        print(f"No rows in {table_name}.")
        return

    print(f"--- {table_name} ---")
    for row in rows:
        print(row)


def main():
    print("Tables:")
    print("1) users")
    print("2) categories")
    print("3) transactions")
    print("4) debts")
    print("5) goals")

    choice = input("Choose table number: ").strip()
    mapping = {
        "1": "users",
        "2": "categories",
        "3": "transactions",
        "4": "debts",
        "5": "goals",
    }
    table = mapping.get(choice)
    if not table:
        print("Invalid choice.")
        return

    show_table(table)


if __name__ == "__main__":
    main()
