import re
from datetime import date

from auth_service import get_user_by_telegram_id
from category_service import DEBT_PAYMENT_CATEGORY_NAME, get_categories_for_user
from report_service import parse_iso_date


def parse_int_choice(text, min_value, max_value):
    if text is None:
        return None
    raw = text.strip()
    if not raw.isdigit():
        return None
    value = int(raw)
    if min_value <= value <= max_value:
        return value
    return None


def parse_amount(text):
    if text is None:
        return None
    raw = text.strip().replace(",", ".")
    try:
        value = float(raw)
    except ValueError:
        return None
    if value <= 0:
        return None
    return value


def parse_optional_text(text):
    if text is None:
        return None
    raw = text.strip()
    if not raw or raw == "-":
        return None
    return raw


def parse_date(text):
    return parse_iso_date(text.strip() if text else None)


def get_linked_user_id(telegram_id):
    user = get_user_by_telegram_id(telegram_id)
    return user[0] if user else None


def require_linked_user(message, context):
    if message is None:
        return None
    user_id = context.user_data.get("user_id") or get_linked_user_id(message.from_user.id)
    if not user_id:
        return None
    context.user_data["user_id"] = user_id
    return user_id


def normalize_phone(text):
    if not text:
        return None
    raw = re.sub(r"[^\d+]", "", text.strip())
    if raw.startswith("00"):
        raw = "+" + raw[2:]
    if raw.count("+") > 1 or ("+" in raw and not raw.startswith("+")):
        return None
    digits = raw[1:] if raw.startswith("+") else raw
    if len(digits) < 7:
        return None
    return raw


def get_logged_in_user_id(telegram_id):
    user = get_user_by_telegram_id(telegram_id)
    if not user:
        return None
    return user[0] if user[2] else None


def require_logged_in(message, context):
    if message is None:
        return None
    user_id = context.user_data.get("user_id") if context.user_data else None
    if user_id:
        return user_id
    user_id = get_logged_in_user_id(message.from_user.id)
    if not user_id:
        return None
    if context.user_data is None:
        context.user_data = {}
    context.user_data["user_id"] = user_id
    return user_id


def expense_categories(user_id):
    rows = get_categories_for_user(user_id)
    return [
        row for row in rows
        if not row[3] and row[1].lower() != DEBT_PAYMENT_CATEGORY_NAME.lower()
    ]


def income_categories(user_id):
    rows = get_categories_for_user(user_id)
    return [row for row in rows if row[3]]


def expense_transactions(rows):
    return [
        row for row in rows
        if not row[6] and row[3].lower() != DEBT_PAYMENT_CATEGORY_NAME.lower()
    ]


def format_expense_list(rows, limit=10):
    if not rows:
        return "No expenses found."
    lines = ["Recent expenses:"]
    for tx_id, amount, _, category_name, _, tx_date, _ in rows[:limit]:
        lines.append(f"{tx_id} - {amount:.2f} - {category_name} - {tx_date}")
    return "\n".join(lines)


def format_debt_list(rows, limit=10):
    if not rows:
        return "No debts found."
    lines = ["Recent debts:"]
    for debt_id, person_name, amount, remaining, status, due_date, _, _ in rows[:limit]:
        due_part = f" | due {due_date}" if due_date else ""
        lines.append(
            f"{debt_id} - {person_name} - {amount:.2f} total - {remaining:.2f} remaining - {status}{due_part}"
        )
    return "\n".join(lines)


def parse_quick_entry(text):
    if not text:
        return None
    lower = text.lower()
    match = re.search(r"(\d+(?:[.,]\d+)?)", lower)
    if not match:
        return None
    amount_raw = match.group(1).replace(",", ".")
    try:
        amount = float(amount_raw)
    except ValueError:
        return None
    if amount <= 0:
        return None

    income_keywords = {"income", "gelir", "maas", "maaş", "salary"}
    expense_keywords = {"expense", "gider", "harcama", "spent", "spend"}
    is_income = any(word in lower for word in income_keywords)
    is_expense = any(word in lower for word in expense_keywords)

    if is_income and not is_expense:
        entry_type = "income"
    elif is_expense and not is_income:
        entry_type = "expense"
    else:
        entry_type = "expense"

    return {
        "amount": amount,
        "type": entry_type,
        "raw": lower,
    }


def month_range_for_today():
    today = date.today()
    start = date(today.year, today.month, 1)
    return start, today
