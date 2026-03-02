from datetime import date

from category_service import DEBT_PAYMENT_CATEGORY_NAME
from database import connection, cursor
from report_service import parse_iso_date
from transactions_service import get_transactions_for_user

GOAL_TYPES = {
    "total_spending_limit": "Monthly total spending limit",
    "category_spending_limit": "Monthly category spending limit",
    "minimum_debt_payment": "Monthly minimum debt payment",
    "income_target": "Monthly income target",
    "savings_target": "Monthly savings target",
}


def _current_period():
    today = date.today()
    return today.year, today.month


def add_goal(
    user_id,
    goal_type,
    target_amount,
    period_year=None,
    period_month=None,
    category_id=None,
):
    if goal_type not in GOAL_TYPES:
        return None
    if target_amount <= 0:
        return None
    if period_year is None or period_month is None:
        period_year, period_month = _current_period()
    if period_month < 1 or period_month > 12:
        return None

    cursor.execute(
        """
        INSERT INTO goals (
            user_id, goal_type, target_amount, period_year, period_month, category_id, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, 1)
        """,
        (user_id, goal_type, target_amount, period_year, period_month, category_id),
    )
    connection.commit()
    return cursor.lastrowid


def get_goals_for_user(user_id, period_year=None, period_month=None, active_only=False):
    query = """
        SELECT id, user_id, goal_type, target_amount, period_year, period_month, category_id, is_active
        FROM goals
        WHERE user_id = ?
    """
    values = [user_id]

    if period_year is not None:
        query += " AND period_year = ?"
        values.append(period_year)
    if period_month is not None:
        query += " AND period_month = ?"
        values.append(period_month)
    if active_only:
        query += " AND is_active = 1"

    query += " ORDER BY period_year DESC, period_month DESC, id DESC"
    cursor.execute(query, tuple(values))
    return cursor.fetchall()


def update_goal(
    goal_id,
    user_id,
    target_amount=None,
    period_year=None,
    period_month=None,
    category_id=None,
    is_active=None,
):
    updates = []
    values = []

    if target_amount is not None:
        if target_amount <= 0:
            return 0
        updates.append("target_amount = ?")
        values.append(target_amount)
    if period_year is not None:
        updates.append("period_year = ?")
        values.append(period_year)
    if period_month is not None:
        if period_month < 1 or period_month > 12:
            return 0
        updates.append("period_month = ?")
        values.append(period_month)
    if category_id is not None:
        updates.append("category_id = ?")
        values.append(category_id)
    if is_active is not None:
        updates.append("is_active = ?")
        values.append(1 if is_active else 0)

    if not updates:
        return 0

    values.extend([goal_id, user_id])
    cursor.execute(
        f"UPDATE goals SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
        tuple(values),
    )
    connection.commit()
    return cursor.rowcount


def delete_goal(goal_id, user_id):
    cursor.execute(
        "DELETE FROM goals WHERE id = ? AND user_id = ?",
        (goal_id, user_id),
    )
    connection.commit()
    return cursor.rowcount


def _month_transactions(user_id, period_year, period_month):
    rows = []
    for tx_id, amount, category_id, category_name, _, raw_date, is_income in get_transactions_for_user(user_id):
        tx_date = parse_iso_date(raw_date)
        if not tx_date:
            continue
        if tx_date.year == period_year and tx_date.month == period_month:
            rows.append((tx_id, float(amount), category_id, category_name, bool(is_income)))
    return rows


def _actual_for_goal(user_id, goal_type, period_year, period_month, category_id):
    rows = _month_transactions(user_id, period_year, period_month)
    income = 0.0
    expense_including_debt = 0.0
    expense_excluding_debt = 0.0
    debt_payment_total = 0.0
    category_expense = 0.0

    for _, amount, tx_category_id, category_name, is_income in rows:
        if is_income:
            income += amount
            continue

        expense_including_debt += amount
        if category_name.lower() != DEBT_PAYMENT_CATEGORY_NAME.lower():
            expense_excluding_debt += amount
        else:
            debt_payment_total += amount

        if category_id is not None and tx_category_id == category_id:
            category_expense += amount

    if goal_type == "total_spending_limit":
        return expense_excluding_debt
    if goal_type == "category_spending_limit":
        return category_expense
    if goal_type == "minimum_debt_payment":
        return debt_payment_total
    if goal_type == "income_target":
        return income
    if goal_type == "savings_target":
        return income - expense_including_debt
    return 0.0


def _status_for_limit(progress_pct):
    if progress_pct <= 60:
        return "On Track"
    if progress_pct <= 85:
        return "Attention"
    if progress_pct <= 100:
        return "Critical"
    return "Exceeded"


def _status_for_target(progress_pct):
    if progress_pct >= 100:
        return "Completed"
    if progress_pct >= 70:
        return "On Track"
    if progress_pct >= 40:
        return "Attention"
    return "Critical"


def calculate_goal_progress(goal_row):
    goal_id, user_id, goal_type, target_amount, period_year, period_month, category_id, is_active = goal_row
    target_amount = float(target_amount)
    actual = _actual_for_goal(user_id, goal_type, period_year, period_month, category_id)

    if target_amount <= 0:
        progress_pct = 0.0
    else:
        progress_pct = (actual / target_amount) * 100

    if goal_type in ("total_spending_limit", "category_spending_limit"):
        remaining_amount = max(target_amount - actual, 0.0)
        remaining_pct = max(100.0 - progress_pct, 0.0)
        status = _status_for_limit(progress_pct)
    else:
        remaining_amount = max(target_amount - actual, 0.0)
        remaining_pct = max(100.0 - progress_pct, 0.0)
        status = _status_for_target(progress_pct)

    return {
        "id": goal_id,
        "goal_type": goal_type,
        "goal_name": GOAL_TYPES.get(goal_type, goal_type),
        "target_amount": target_amount,
        "actual_amount": actual,
        "progress_pct": progress_pct,
        "remaining_amount": remaining_amount,
        "remaining_pct": remaining_pct,
        "status": status,
        "period_year": period_year,
        "period_month": period_month,
        "category_id": category_id,
        "is_active": bool(is_active),
    }


def get_goals_with_progress(user_id, period_year=None, period_month=None, active_only=False):
    goals = get_goals_for_user(
        user_id=user_id,
        period_year=period_year,
        period_month=period_month,
        active_only=active_only,
    )
    return [calculate_goal_progress(goal) for goal in goals]


def build_goal_suggestions(user_id, period_year=None, period_month=None):
    if period_year is None or period_month is None:
        period_year, period_month = _current_period()

    goals = get_goals_with_progress(
        user_id=user_id,
        period_year=period_year,
        period_month=period_month,
        active_only=True,
    )
    suggestions = []

    for goal in goals:
        if goal["goal_type"] in ("total_spending_limit", "category_spending_limit"):
            if goal["progress_pct"] >= 85 and goal["progress_pct"] <= 100:
                suggestions.append(
                    f"{goal['goal_name']}: limit usage is %{goal['progress_pct']:.1f}. Slow down spending."
                )
            elif goal["progress_pct"] > 100:
                suggestions.append(
                    f"{goal['goal_name']}: limit exceeded by {goal['actual_amount'] - goal['target_amount']:.2f}."
                )
        else:
            if goal["progress_pct"] < 70:
                suggestions.append(
                    f"{goal['goal_name']}: you need {goal['remaining_amount']:.2f} more this month."
                )

    completed = sum(1 for goal in goals if goal["status"] == "Completed")
    on_track = sum(1 for goal in goals if goal["status"] == "On Track")
    summary = f"{completed + on_track}/{len(goals)} goals are healthy this month." if goals else "No active goals."
    return summary, suggestions
