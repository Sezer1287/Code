import sqlite3

from database import connection, cursor

DEBT_PAYMENT_CATEGORY_NAME = "Debt Payment"
DEFAULT_CATEGORIES = [
    ("Salary", True),
    ("Freelance", True),
    ("Rent", False),
    ("Grocery", False),
    ("Utilities", False),
    ("Transport", False),
]


def add_category(name, user_id, is_income=False):

    cursor.execute(
        "INSERT INTO categories (name, user_id, is_income) VALUES (?, ?, ?)",
        (name, user_id, int(bool(is_income))),
    )

    connection.commit()

    return cursor.lastrowid


def ensure_debt_payment_category(user_id):
    """Create or fetch system category used by debt payments."""
    cursor.execute(
        "SELECT id FROM categories WHERE user_id = ? AND name = ?",
        (user_id, DEBT_PAYMENT_CATEGORY_NAME),
    )
    row = cursor.fetchone()
    if row:
        return row[0]

    cursor.execute(
        "INSERT INTO categories (name, user_id, is_income) VALUES (?, ?, 0)",
        (DEBT_PAYMENT_CATEGORY_NAME, user_id),
    )
    connection.commit()
    return cursor.lastrowid


def ensure_default_categories(user_id):
    for name, is_income in DEFAULT_CATEGORIES:
        try:
            add_category(name, user_id, is_income=is_income)
        except sqlite3.IntegrityError:
            connection.rollback()
    ensure_debt_payment_category(user_id)


def get_categories_for_user(user_id):

    cursor.execute(
        """
        SELECT id, name, user_id, is_income
        FROM categories
        WHERE user_id = ?
        ORDER BY name
        """,
        (user_id,),
    )
    return cursor.fetchall()


def update_category(category_id, user_id, new_name=None, is_income=None):

    updates = []
    values = []

    if new_name is not None:
        updates.append("name = ?")
        values.append(new_name)

    if is_income is not None:
        updates.append("is_income = ?")
        values.append(int(bool(is_income)))

    if not updates:
        return 0

    values.extend([category_id, user_id])

    cursor.execute(
        f"UPDATE categories SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
        tuple(values),
    )

    connection.commit()

    return cursor.rowcount


def delete_category(category_id, user_id):

    cursor.execute(
        "DELETE FROM categories WHERE id = ? AND user_id = ?",
        (category_id, user_id),
    )

    connection.commit()

    return cursor.rowcount
