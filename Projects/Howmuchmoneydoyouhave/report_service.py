from collections import defaultdict
from datetime import date, timedelta

from category_service import DEBT_PAYMENT_CATEGORY_NAME
from debts_service import get_debts_for_user
from transactions_service import get_transactions_for_user


def parse_iso_date(raw_text):
    try:
        return date.fromisoformat(raw_text)
    except (TypeError, ValueError):
        return None


def _in_date_range(tx_date, start_date=None, end_date=None):
    if tx_date is None:
        return False if (start_date or end_date) else True
    if start_date and tx_date < start_date:
        return False
    if end_date and tx_date > end_date:
        return False
    return True


def _split_transactions(user_id, start_date=None, end_date=None):
    income_rows = []
    expense_rows = []

    for tx_id, amount, category_id, category_name, _, raw_date, is_income in get_transactions_for_user(user_id):
        tx_date = parse_iso_date(raw_date)
        if not _in_date_range(tx_date, start_date, end_date):
            continue
        item = {
            "id": tx_id,
            "amount": float(amount),
            "category_id": category_id,
            "category_name": category_name,
            "date": raw_date,
        }
        if is_income:
            income_rows.append(item)
        else:
            expense_rows.append(item)
    return income_rows, expense_rows


def get_all_income(user_id, start_date=None, end_date=None):
    income_rows, _ = _split_transactions(user_id, start_date, end_date)
    return income_rows


def get_all_expenses(user_id, include_debt_payment=True, start_date=None, end_date=None):
    _, expense_rows = _split_transactions(user_id, start_date, end_date)
    if include_debt_payment:
        return expense_rows
    return [
        row for row in expense_rows
        if row["category_name"].lower() != DEBT_PAYMENT_CATEGORY_NAME.lower()
    ]


def get_total_income(user_id, start_date=None, end_date=None):
    return sum(row["amount"] for row in get_all_income(user_id, start_date, end_date))


def get_total_expenses(user_id, include_debt_payment=True, start_date=None, end_date=None):
    return sum(
        row["amount"]
        for row in get_all_expenses(user_id, include_debt_payment, start_date, end_date)
    )


def get_expense_summary_by_category(user_id, include_debt_payment=False, start_date=None, end_date=None):
    expenses = get_all_expenses(user_id, include_debt_payment, start_date, end_date)
    totals = defaultdict(float)
    for row in expenses:
        totals[row["category_name"]] += row["amount"]

    grand_total = sum(totals.values())
    summary = []
    for category_name, amount in sorted(totals.items(), key=lambda item: item[1], reverse=True):
        pct = (amount / grand_total * 100) if grand_total else 0.0
        summary.append((category_name, amount, pct))
    return summary


def get_net_balance(user_id, include_debt_payment=True, start_date=None, end_date=None):
    return get_total_income(user_id, start_date, end_date) - get_total_expenses(
        user_id,
        include_debt_payment,
        start_date,
        end_date,
    )


def get_highest_spending_category(user_id, include_debt_payment=False, start_date=None, end_date=None):
    summary = get_expense_summary_by_category(user_id, include_debt_payment, start_date, end_date)
    if not summary:
        return None
    return summary[0]


def get_monthly_summary(user_id, include_debt_payment=True):
    monthly = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    income_rows, expense_rows = _split_transactions(user_id)

    for row in income_rows:
        tx_date = parse_iso_date(row["date"])
        if not tx_date:
            continue
        key = f"{tx_date.year:04d}-{tx_date.month:02d}"
        monthly[key]["income"] += row["amount"]

    for row in expense_rows:
        if not include_debt_payment and row["category_name"].lower() == DEBT_PAYMENT_CATEGORY_NAME.lower():
            continue
        tx_date = parse_iso_date(row["date"])
        if not tx_date:
            continue
        key = f"{tx_date.year:04d}-{tx_date.month:02d}"
        monthly[key]["expense"] += row["amount"]

    return dict(sorted(monthly.items()))


def get_date_range_report(user_id, start_date, end_date, include_debt_payment=True):
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_income": get_total_income(user_id, start_date, end_date),
        "total_expenses": get_total_expenses(user_id, include_debt_payment, start_date, end_date),
        "net_balance": get_net_balance(user_id, include_debt_payment, start_date, end_date),
    }


def get_all_debts(user_id):
    return get_debts_for_user(user_id)


def get_total_debt_amount(user_id):
    return sum(float(row[2]) for row in get_all_debts(user_id))


def get_total_paid_debt(user_id):
    return sum(float(row[2] - row[3]) for row in get_all_debts(user_id))


def get_total_remaining_debt(user_id):
    return sum(float(row[3]) for row in get_all_debts(user_id))


def get_debt_summary_by_person(user_id):
    rows = get_all_debts(user_id)
    totals = defaultdict(float)
    for _, person_name, _, remaining, _, _, _, _ in rows:
        totals[person_name] += float(remaining)
    return sorted(totals.items(), key=lambda item: item[1], reverse=True)


def get_overdue_debts(user_id):
    today = date.today()
    overdue = []
    for row in get_all_debts(user_id):
        due = parse_iso_date(row[5])
        remaining = float(row[3])
        if due and due < today and remaining > 0:
            overdue.append(row)
    return overdue


def get_upcoming_debts(user_id, within_days=7):
    today = date.today()
    cutoff = today + timedelta(days=within_days)
    upcoming = []
    for row in get_all_debts(user_id):
        due = parse_iso_date(row[5])
        remaining = float(row[3])
        if due and today <= due <= cutoff and remaining > 0:
            upcoming.append(row)
    return upcoming


def get_debts_by_date_range(user_id, start_date, end_date):
    rows = []
    for row in get_all_debts(user_id):
        due = parse_iso_date(row[5])
        if due and start_date <= due <= end_date:
            rows.append(row)
    return rows


def get_largest_debts(user_id, top_n=5):
    rows = list(get_all_debts(user_id))
    rows.sort(key=lambda row: float(row[3]), reverse=True)
    return rows[:top_n]
