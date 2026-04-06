from datetime import date

from telegram import Update
from telegram.ext import ContextTypes

from debts_service import add_debt, delete_debt, get_debts_for_user, update_debt
from transactions_service import (
    add_transaction,
    delete_transaction,
    get_transactions_for_user,
    update_transaction,
)

from bot_app.constants import (
    DEBT_AMOUNT,
    DEBT_DELETE_ID,
    DEBT_PERSON,
    DEBT_UPDATE_AMOUNT,
    DEBT_UPDATE_ID,
    DEBT_UPDATE_PERSON,
    EXPENSE_AMOUNT,
    EXPENSE_CATEGORY,
    EXPENSE_DELETE_ID,
    EXPENSE_UPDATE_AMOUNT,
    EXPENSE_UPDATE_CATEGORY,
    EXPENSE_UPDATE_ID,
    INCOME_AMOUNT,
    INCOME_CATEGORY,
    LOGIN_PHONE,
    MENU,
    menu_text,
)
from bot_app.utils import (
    expense_categories,
    expense_transactions,
    format_debt_list,
    format_expense_list,
    income_categories,
    parse_amount,
    parse_int_choice,
    parse_optional_text,
    require_logged_in,
)


async def expense_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return EXPENSE_AMOUNT

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    amount = parse_amount(message.text)
    if amount is None:
        await message.reply_text("Please enter a valid positive amount.")
        return EXPENSE_AMOUNT

    categories = expense_categories(user_id)
    if not categories:
        await message.reply_text("No expense categories found. Add categories in the app first.")
        await message.reply_text(menu_text())
        return MENU

    if context.user_data is None:
        context.user_data = {}
    context.user_data["expense_amount"] = amount
    context.user_data["expense_categories"] = categories

    lines = [f"{idx} - {row[1]}" for idx, row in enumerate(categories, start=1)]
    await message.reply_text("\n".join(lines))
    await message.reply_text("Type the category number.")
    return EXPENSE_CATEGORY


async def expense_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return EXPENSE_CATEGORY

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    categories = (context.user_data.get("expense_categories") if context.user_data else None) or []
    if not categories:
        await message.reply_text("Category list expired. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    choice = parse_int_choice(message.text, 1, len(categories))
    if choice is None:
        await message.reply_text("Please enter a valid category number.")
        return EXPENSE_CATEGORY

    amount = (context.user_data.get("expense_amount") if context.user_data else None)
    if amount is None:
        await message.reply_text("Amount missing. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    category_id = categories[choice - 1][0]
    tx_id = add_transaction(
        user_id=user_id,
        amount=amount,
        category_id=category_id,
        transaction_date=date.today().isoformat(),
    )

    if tx_id is None:
        await message.reply_text("Failed to save expense. Please try again.")
    else:
        await message.reply_text("Expense saved.")

    await message.reply_text(menu_text())
    return MENU


async def income_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return INCOME_AMOUNT

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    amount = parse_amount(message.text)
    if amount is None:
        await message.reply_text("Please enter a valid positive amount.")
        return INCOME_AMOUNT

    categories = income_categories(user_id)
    if not categories:
        await message.reply_text("No income categories found. Add categories in the app first.")
        await message.reply_text(menu_text())
        return MENU

    if context.user_data is None:
        context.user_data = {}
    context.user_data["income_amount"] = amount
    context.user_data["income_categories"] = categories

    lines = [f"{idx} - {row[1]}" for idx, row in enumerate(categories, start=1)]
    await message.reply_text("\n".join(lines))
    await message.reply_text("Type the category number.")
    return INCOME_CATEGORY


async def income_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return INCOME_CATEGORY

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    categories = (context.user_data.get("income_categories") if context.user_data else None) or []
    if not categories:
        await message.reply_text("Category list expired. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    choice = parse_int_choice(message.text, 1, len(categories))
    if choice is None:
        await message.reply_text("Please enter a valid category number.")
        return INCOME_CATEGORY

    amount = (context.user_data.get("income_amount") if context.user_data else None)
    if amount is None:
        await message.reply_text("Amount missing. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    category_id = categories[choice - 1][0]
    tx_id = add_transaction(
        user_id=user_id,
        amount=amount,
        category_id=category_id,
        transaction_date=date.today().isoformat(),
    )

    if tx_id is None:
        await message.reply_text("Failed to save income. Please try again.")
    else:
        await message.reply_text("Income saved.")

    await message.reply_text(menu_text())
    return MENU


async def debt_person(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return DEBT_PERSON

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    name = message.text.strip() if message.text else ""
    if not name:
        await message.reply_text("Please enter a valid person name.")
        return DEBT_PERSON

    if context.user_data is None:
        context.user_data = {}
    context.user_data["debt_person"] = name
    await message.reply_text("Enter debt amount")
    return DEBT_AMOUNT


async def debt_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return DEBT_AMOUNT

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    amount = parse_amount(message.text)
    if amount is None:
        await message.reply_text("Please enter a valid positive amount.")
        return DEBT_AMOUNT

    person = (context.user_data.get("debt_person") if context.user_data else None)
    if not person:
        await message.reply_text("Person name missing. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    debt_id = add_debt(user_id=user_id, person_name=person, amount=amount, due_date=None)
    if debt_id is None:
        await message.reply_text("Failed to add debt. Please try again.")
    else:
        await message.reply_text("Debt added.")

    await message.reply_text(menu_text())
    return MENU


async def list_expenses(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return MENU

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    rows = expense_transactions(get_transactions_for_user(user_id))
    await message.reply_text(format_expense_list(rows))
    await message.reply_text(menu_text())
    return MENU


async def expense_update_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return EXPENSE_UPDATE_ID

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    expense_id = parse_int_choice(message.text, 1, 10_000_000)
    if expense_id is None:
        await message.reply_text("Please enter a valid expense id.")
        return EXPENSE_UPDATE_ID

    rows = expense_transactions(get_transactions_for_user(user_id))
    if not any(row[0] == expense_id for row in rows):
        await message.reply_text("Expense not found. Use List Expenses to see ids.")
        await message.reply_text(menu_text())
        return MENU

    if context.user_data is None:
        context.user_data = {}
    context.user_data["expense_update_id"] = expense_id
    await message.reply_text("Enter new amount")
    return EXPENSE_UPDATE_AMOUNT


async def expense_update_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return EXPENSE_UPDATE_AMOUNT

    amount = parse_amount(message.text)
    if amount is None:
        await message.reply_text("Please enter a valid positive amount.")
        return EXPENSE_UPDATE_AMOUNT

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    categories = expense_categories(user_id)
    if not categories:
        await message.reply_text("No expense categories found. Add categories in the app first.")
        await message.reply_text(menu_text())
        return MENU

    if context.user_data is None:
        context.user_data = {}
    context.user_data["expense_update_amount"] = amount
    context.user_data["expense_categories"] = categories

    lines = [f"{idx} - {row[1]}" for idx, row in enumerate(categories, start=1)]
    await message.reply_text("\n".join(lines))
    await message.reply_text("Type the new category number.")
    return EXPENSE_UPDATE_CATEGORY


async def expense_update_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return EXPENSE_UPDATE_CATEGORY

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    categories = (context.user_data.get("expense_categories") if context.user_data else None) or []
    if not categories:
        await message.reply_text("Category list expired. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    choice = parse_int_choice(message.text, 1, len(categories))
    if choice is None:
        await message.reply_text("Please enter a valid category number.")
        return EXPENSE_UPDATE_CATEGORY

    amount = (context.user_data.get("expense_update_amount") if context.user_data else None)
    expense_id = (context.user_data.get("expense_update_id") if context.user_data else None)
    if amount is None or expense_id is None:
        await message.reply_text("Update data missing. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    category_id = categories[choice - 1][0]
    rows_updated = update_transaction(
        transaction_id=expense_id,
        user_id=user_id,
        amount=amount,
        category_id=category_id,
    )

    if rows_updated:
        await message.reply_text("Expense updated.")
    else:
        await message.reply_text("Failed to update expense.")

    await message.reply_text(menu_text())
    return MENU


async def expense_delete_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return EXPENSE_DELETE_ID

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    expense_id = parse_int_choice(message.text, 1, 10_000_000)
    if expense_id is None:
        await message.reply_text("Please enter a valid expense id.")
        return EXPENSE_DELETE_ID

    rows = expense_transactions(get_transactions_for_user(user_id))
    if not any(row[0] == expense_id for row in rows):
        await message.reply_text("Expense not found. Use List Expenses to see ids.")
        await message.reply_text(menu_text())
        return MENU

    deleted = delete_transaction(expense_id, user_id)
    if deleted:
        await message.reply_text("Expense deleted.")
    else:
        await message.reply_text("Failed to delete expense.")
    await message.reply_text(menu_text())
    return MENU


async def list_debts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return MENU

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    rows = get_debts_for_user(user_id)
    await message.reply_text(format_debt_list(rows))
    await message.reply_text(menu_text())
    return MENU


async def debt_update_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return DEBT_UPDATE_ID

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    debt_id = parse_int_choice(message.text, 1, 10_000_000)
    if debt_id is None:
        await message.reply_text("Please enter a valid debt id.")
        return DEBT_UPDATE_ID

    rows = get_debts_for_user(user_id)
    if not any(row[0] == debt_id for row in rows):
        await message.reply_text("Debt not found. Use List Debts to see ids.")
        await message.reply_text(menu_text())
        return MENU

    if context.user_data is None:
        context.user_data = {}
    context.user_data["debt_update_id"] = debt_id
    await message.reply_text("Enter new person name or '-' to keep current")
    return DEBT_UPDATE_PERSON


async def debt_update_person(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return DEBT_UPDATE_PERSON

    name = parse_optional_text(message.text)
    if context.user_data is None:
        context.user_data = {}
    context.user_data["debt_update_person"] = name
    await message.reply_text("Enter new amount or '-' to keep current")
    return DEBT_UPDATE_AMOUNT


async def debt_update_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return DEBT_UPDATE_AMOUNT

    raw = message.text.strip() if message.text else ""
    amount = None
    if raw and raw != "-":
        amount = parse_amount(raw)
        if amount is None:
            await message.reply_text("Please enter a valid positive amount or '-'.")
            return DEBT_UPDATE_AMOUNT

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    debt_id = (context.user_data.get("debt_update_id") if context.user_data else None)
    if debt_id is None:
        await message.reply_text("Debt id missing. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    person = (context.user_data.get("debt_update_person") if context.user_data else None)
    rows_updated = update_debt(
        debt_id=debt_id,
        user_id=user_id,
        person_name=person,
        amount=amount,
        due_date=None,
    )

    if rows_updated:
        await message.reply_text("Debt updated.")
    else:
        await message.reply_text("Failed to update debt.")

    await message.reply_text(menu_text())
    return MENU


async def debt_delete_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return DEBT_DELETE_ID

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    debt_id = parse_int_choice(message.text, 1, 10_000_000)
    if debt_id is None:
        await message.reply_text("Please enter a valid debt id.")
        return DEBT_DELETE_ID

    rows = get_debts_for_user(user_id)
    if not any(row[0] == debt_id for row in rows):
        await message.reply_text("Debt not found. Use List Debts to see ids.")
        await message.reply_text(menu_text())
        return MENU

    deleted = delete_debt(debt_id, user_id)
    if deleted:
        await message.reply_text("Debt deleted.")
    else:
        await message.reply_text("Failed to delete debt.")
    await message.reply_text(menu_text())
    return MENU
