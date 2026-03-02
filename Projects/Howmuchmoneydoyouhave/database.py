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

# Lightweight migration for existing databases.
cursor.execute("PRAGMA table_info(categories)")
category_columns = {row[1] for row in cursor.fetchall()}
if "is_income" not in category_columns:
    cursor.execute("ALTER TABLE categories ADD COLUMN is_income INTEGER NOT NULL DEFAULT 0")


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

# Lightweight migration for existing goals table.
cursor.execute("PRAGMA table_info(goals)")
goal_columns = {row[1] for row in cursor.fetchall()}
if "is_active" not in goal_columns and goal_columns:
    cursor.execute("ALTER TABLE goals ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1")


# Lightweight migration for existing debt table.
cursor.execute("PRAGMA table_info(debts)")
debt_columns = {row[1] for row in cursor.fetchall()}
if "remaining_amount" not in debt_columns:
    cursor.execute("ALTER TABLE debts ADD COLUMN remaining_amount REAL NOT NULL DEFAULT 0")
if "status" not in debt_columns:
    cursor.execute("ALTER TABLE debts ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
if "due_date" not in debt_columns:
    cursor.execute("ALTER TABLE debts ADD COLUMN due_date TEXT")
if "last_payment_date" not in debt_columns:
    cursor.execute("ALTER TABLE debts ADD COLUMN last_payment_date TEXT")

# Backfill existing rows safely.
cursor.execute("UPDATE debts SET remaining_amount = amount WHERE remaining_amount <= 0")
cursor.execute(
    """
    UPDATE debts
    SET status = CASE
        WHEN remaining_amount <= 0 THEN 'paid'
        ELSE 'active'
    END
    WHERE status IS NULL OR status = ''
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

# Save table and index creation.
connection.commit()
