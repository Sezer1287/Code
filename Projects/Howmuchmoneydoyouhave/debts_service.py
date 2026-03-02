from datetime import date

from database import connection, cursor
from category_service import ensure_debt_payment_category
from transactions_service import add_transaction


def add_debt(user_id, person_name, amount, due_date=None):
    if amount <= 0:
        return None

    cursor.execute(
        """
        INSERT INTO debts (
            person_name, amount, remaining_amount, status, due_date, last_payment_date, user_id
        )
        VALUES (?, ?, ?, 'active', ?, NULL, ?)
        """,
        (person_name, amount, amount, due_date, user_id),
    )

    connection.commit()

    return cursor.lastrowid


def get_debts_for_user(user_id):

    cursor.execute(
        """
        SELECT id, person_name, amount, remaining_amount, status, due_date, last_payment_date, user_id
        FROM debts
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (user_id,),
    )

    rows = cursor.fetchall()
    return [normalize_debt_status(row) for row in rows]


def normalize_debt_status(row):
    debt_id, person_name, amount, remaining_amount, status, due_date, last_payment_date, owner_id = row
    safe_remaining = max(0.0, float(remaining_amount))
    if safe_remaining <= 0:
        safe_status = "paid"
    else:
        due = None
        try:
            due = date.fromisoformat(due_date) if due_date else None
        except ValueError:
            due = None
        if due and due < date.today():
            safe_status = "overdue"
        else:
            safe_status = status or "active"
    return (
        debt_id,
        person_name,
        float(amount),
        safe_remaining,
        safe_status,
        due_date,
        last_payment_date,
        owner_id,
    )


def update_debt(debt_id, user_id, person_name=None, amount=None, due_date=None):

    cursor.execute(
        """
        SELECT id, person_name, amount, remaining_amount, status, due_date, last_payment_date, user_id
        FROM debts
        WHERE id = ? AND user_id = ?
        """,
        (debt_id, user_id),
    )
    existing = cursor.fetchone()
    if existing is None:
        return 0

    _, _, current_amount, current_remaining, _, _, _, _ = normalize_debt_status(existing)

    updates = []
    values = []

    if person_name is not None:
        updates.append("person_name = ?")
        values.append(person_name)


    if amount is not None:
        if amount < 0:
            return 0
        paid_so_far = current_amount - current_remaining
        if amount < paid_so_far:
            return 0
        new_remaining = max(0.0, amount - paid_so_far)
        updates.append("amount = ?")
        values.append(amount)
        updates.append("remaining_amount = ?")
        values.append(new_remaining)
        updates.append("status = ?")
        values.append("paid" if new_remaining <= 0 else "active")

    if due_date is not None:
        updates.append("due_date = ?")
        values.append(due_date)


    if not updates:
        return 0


    values.extend([debt_id, user_id])
    cursor.execute(
        f"UPDATE debts SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
        tuple(values),
    )
    
    connection.commit()

    return cursor.rowcount


def get_debt_by_id(user_id, debt_id):
    cursor.execute(
        """
        SELECT id, person_name, amount, remaining_amount, status, due_date, last_payment_date, user_id
        FROM debts
        WHERE id = ? AND user_id = ?
        """,
        (debt_id, user_id),
    )
    row = cursor.fetchone()
    return normalize_debt_status(row) if row else None


def pay_debt(user_id, debt_id, payment_amount, payment_date):
    if payment_amount <= 0:
        return (False, "Payment must be greater than 0.")

    debt = get_debt_by_id(user_id, debt_id)
    if debt is None:
        return (False, "Debt not found for this user.")

    _, _, _, remaining_amount, status, _, _, _ = debt

    if status == "paid" or remaining_amount <= 0:
        return (False, "Debt is already fully paid.")
    if payment_amount > remaining_amount:
        return (False, "Payment cannot exceed remaining debt.")

    new_remaining = remaining_amount - payment_amount
    new_status = "paid" if new_remaining <= 0 else "active"

    cursor.execute(
        """
        UPDATE debts
        SET remaining_amount = ?, status = ?, last_payment_date = ?
        WHERE id = ? AND user_id = ?
        """,
        (new_remaining, new_status, payment_date, debt_id, user_id),
    )

    debt_payment_category_id = ensure_debt_payment_category(user_id)
    transaction_id = add_transaction(
        user_id=user_id,
        amount=payment_amount,
        category_id=debt_payment_category_id,
        transaction_date=payment_date,
        allow_system_category=True,
    )

    if transaction_id is None:
        connection.rollback()
        return (False, "Failed to create debt payment transaction.")

    connection.commit()
    return (True, "Debt payment recorded.")


def delete_debt(debt_id, user_id):

    cursor.execute(
        "DELETE FROM debts WHERE id = ? AND user_id = ?",
        (debt_id, user_id),
    )

    connection.commit()

    return cursor.rowcount
