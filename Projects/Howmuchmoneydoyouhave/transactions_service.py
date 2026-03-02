from database import connection, cursor
from category_service import DEBT_PAYMENT_CATEGORY_NAME


def add_transaction(user_id, amount, category_id, transaction_date, allow_system_category=False):

    cursor.execute(
        "SELECT id, name FROM categories WHERE id = ? AND user_id = ?",
        (category_id, user_id),
    )
    category_row = cursor.fetchone()


    if category_row is None:
        return None
    if (
        not allow_system_category
        and category_row[1].lower() == DEBT_PAYMENT_CATEGORY_NAME.lower()
    ):
        return None


    cursor.execute(
        """
        INSERT INTO transactions (amount, category_id, user_id, transaction_date)
        VALUES (?, ?, ?, ?)
        """,
        (amount, category_id, user_id, transaction_date),
    )

    connection.commit()

    return cursor.lastrowid


def get_transactions_for_user(user_id):

    cursor.execute(
        """
        SELECT t.id, t.amount, t.category_id, c.name, t.user_id, t.transaction_date, c.is_income
        FROM transactions AS t
        JOIN categories AS c ON c.id = t.category_id
        WHERE t.user_id = ?
        ORDER BY t.transaction_date DESC, t.id DESC
        """,
        (user_id,),
    )

    return cursor.fetchall()


def update_transaction(
    transaction_id,
    user_id,
    amount=None,
    category_id=None,
    transaction_date=None,
    allow_system_category=False,
):

    updates = []
    values = []

    if amount is not None:
        updates.append("amount = ?")
        values.append(amount)

    if category_id is not None:

        cursor.execute(
            "SELECT id, name FROM categories WHERE id = ? AND user_id = ?",
            (category_id, user_id),
        )
        category_row = cursor.fetchone()
        if category_row is None:
            return 0
        if (
            not allow_system_category
            and category_row[1].lower() == DEBT_PAYMENT_CATEGORY_NAME.lower()
        ):
            return 0
        updates.append("category_id = ?")
        values.append(category_id)


    if transaction_date is not None:
        updates.append("transaction_date = ?")
        values.append(transaction_date)


    if not updates:
        return 0

    values.extend([transaction_id, user_id])

    cursor.execute(
        f"UPDATE transactions SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
        tuple(values),
    )

    connection.commit()

    return cursor.rowcount


def delete_transaction(transaction_id, user_id):

    cursor.execute(
        "DELETE FROM transactions WHERE id = ? AND user_id = ?",
        (transaction_id, user_id),
    )

    connection.commit()

    return cursor.rowcount
