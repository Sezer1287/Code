from datetime import date, timedelta

from telegram import Update
from telegram.ext import ContextTypes

from goals_service import build_goal_suggestions
from report_service import (
    get_expense_summary_by_category,
    get_net_balance,
    get_total_expenses,
    get_total_income,
)

from bot_app.constants import (
    LOGIN_PHONE,
    MENU,
    REPORT_END,
    REPORT_PERIOD,
    REPORT_START,
    menu_text,
    report_period_prompt,
)
from bot_app.utils import month_range_for_today, parse_date, parse_int_choice, require_logged_in


def _build_report(user_id, start_date=None, end_date=None):
    total_income = get_total_income(user_id, start_date, end_date)
    total_expenses = get_total_expenses(user_id, True, start_date, end_date)
    balance = get_net_balance(user_id, True, start_date, end_date)
    summary = get_expense_summary_by_category(user_id, False, start_date, end_date)

    top_line = "No expenses yet."
    if summary:
        category_name, amount, pct = summary[0]
        top_line = f"Top spending: {category_name} ({amount:.2f}, {pct:.1f}%)"

    goal_summary, goal_suggestions = build_goal_suggestions(user_id)
    goals_block = [f"Goal alerts: {goal_summary}"]
    for item in goal_suggestions:
        goals_block.append(f"- {item}")

    header = "Report summary"
    if start_date and end_date:
        header += f" ({start_date.isoformat()} to {end_date.isoformat()})"

    return (
        f"{header}:\n"
        f"Income: {total_income:.2f}\n"
        f"Expenses: {total_expenses:.2f}\n"
        f"Net: {balance:.2f}\n"
        f"{top_line}\n"
        + "\n".join(goals_block)
    )


def _pct_change(current, previous):
    if previous == 0:
        return None
    return ((current - previous) / previous) * 100.0


def _build_month_compare_report(user_id):
    today = date.today()
    start_this = date(today.year, today.month, 1)
    end_this = today
    period_days = (end_this - start_this).days
    end_last = start_this - timedelta(days=1)
    start_last = end_last - timedelta(days=period_days)

    income_this = get_total_income(user_id, start_this, end_this)
    income_last = get_total_income(user_id, start_last, end_last)
    expenses_this = get_total_expenses(user_id, True, start_this, end_this)
    expenses_last = get_total_expenses(user_id, True, start_last, end_last)
    net_this = get_net_balance(user_id, True, start_this, end_this)
    net_last = get_net_balance(user_id, True, start_last, end_last)

    income_change = _pct_change(income_this, income_last)
    expenses_change = _pct_change(expenses_this, expenses_last)
    net_change = _pct_change(net_this, net_last)

    def _fmt_change(value):
        return "N/A" if value is None else f"{value:+.1f}%"

    return (
        "Month-to-date comparison:\n"
        f"This month: {start_this.isoformat()} to {end_this.isoformat()}\n"
        f"Last month: {start_last.isoformat()} to {end_last.isoformat()}\n"
        f"Income: {income_this:.2f} ({_fmt_change(income_change)})\n"
        f"Expenses: {expenses_this:.2f} ({_fmt_change(expenses_change)})\n"
        f"Net: {net_this:.2f} ({_fmt_change(net_change)})"
    )


async def report_choose_period(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return REPORT_PERIOD

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    choice = parse_int_choice(message.text, 1, 4)
    if choice is None:
        await message.reply_text("Please choose 1, 2, 3, or 4.")
        return REPORT_PERIOD

    if choice == 1:
        start_date, end_date = month_range_for_today()
        await message.reply_text(_build_report(user_id, start_date, end_date))
        await message.reply_text(menu_text())
        return MENU
    if choice == 2:
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        await message.reply_text(_build_report(user_id, start_date, end_date))
        await message.reply_text(menu_text())
        return MENU
    if choice == 4:
        await message.reply_text(_build_month_compare_report(user_id))
        await message.reply_text(menu_text())
        return MENU

    await message.reply_text("Enter start date (YYYY-MM-DD)")
    return REPORT_START


async def report_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return REPORT_START

    start_date = parse_date(message.text)
    if start_date is None:
        await message.reply_text("Please enter a valid start date (YYYY-MM-DD).")
        return REPORT_START

    if context.user_data is None:
        context.user_data = {}
    context.user_data["report_start"] = start_date
    await message.reply_text("Enter end date (YYYY-MM-DD)")
    return REPORT_END


async def report_end(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return REPORT_END

    end_date = parse_date(message.text)
    if end_date is None:
        await message.reply_text("Please enter a valid end date (YYYY-MM-DD).")
        return REPORT_END

    start_date = context.user_data.get("report_start") if context.user_data else None
    if not start_date or end_date < start_date:
        await message.reply_text("End date must be after start date. Try again.")
        return REPORT_END

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    await message.reply_text(_build_report(user_id, start_date, end_date))
    await message.reply_text(menu_text())
    return MENU


async def report_start_prompt(update: Update, _: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return REPORT_PERIOD
    user_id = require_logged_in(message, _)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE
    await message.reply_text(report_period_prompt())
    return REPORT_PERIOD
