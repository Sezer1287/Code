import sqlite3

connection = sqlite3.connect("finance.db")

connection.execute("PRAGMA foreign_keys = ON")

cursor = connection.cursor()


cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
)

cursor.execute("PRAGMA table_info(users)")
_user_columns = {row[1] for row in cursor.fetchall()}
if "telegram_id" not in _user_columns:
    cursor.execute("ALTER TABLE users ADD COLUMN telegram_id INTEGER")
if "invited_by" not in _user_columns:
    cursor.execute("ALTER TABLE users ADD COLUMN invited_by INTEGER")
if "phone" not in _user_columns:
    cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT")


cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        is_income INTEGER NOT NULL DEFAULT 0,
        UNIQUE(name, user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """
)


cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        transaction_date TEXT NOT NULL DEFAULT (date('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """
)


cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_name TEXT NOT NULL,
        amount REAL NOT NULL,
        remaining_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        due_date TEXT,
        last_payment_date TEXT,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """
)

cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        goal_type TEXT NOT NULL,
        target_amount REAL NOT NULL,
        period_year INTEGER NOT NULL,
        period_month INTEGER NOT NULL,
        category_id INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )
    """
)

# Helpful indexes for faster per-user reads.
#cursor.execute(
#    "CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)"
#)
#cursor.execute(
#    "CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)"
#)
#cursor.execute(
#    "CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id)"
#)
cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)")

# Save table and index creation.
connection.commit()
