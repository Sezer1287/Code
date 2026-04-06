import logging

from datetime import date

from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ConversationHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from auth_service import (
    create_user_from_telegram,
    get_user_by_id,
    get_user_by_phone,
    get_user_by_telegram_id,
    link_telegram_id,
    update_user_phone,
)
from report_service import get_net_balance
from transactions_service import add_transaction

from bot_app.constants import (
    TOKEN,
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
    GOAL_AMOUNT,
    GOAL_CATEGORY,
    GOAL_TYPE,
    INCOME_AMOUNT,
    INCOME_CATEGORY,
    LOGIN_PHONE,
    MENU,
    REPORT_END,
    REPORT_PERIOD,
    REPORT_START,
    menu_text,
    report_period_prompt,
)
from bot_app.flows import (
    debt_amount,
    debt_delete_id,
    debt_person,
    debt_update_amount,
    debt_update_id,
    debt_update_person,
    expense_amount,
    expense_category,
    expense_delete_id,
    expense_update_amount,
    expense_update_category,
    expense_update_id,
    income_amount,
    income_category,
    list_debts,
    list_expenses,
)
from bot_app.goals_flow import goal_amount, goal_category, goal_type
from bot_app.reporting import report_choose_period, report_end, report_start, report_start_prompt
from bot_app.utils import (
    expense_categories,
    income_categories,
    parse_int_choice,
    parse_quick_entry,
    normalize_phone,
    require_logged_in,
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return LOGIN_PHONE

    from_user = message.from_user
    if from_user is None:
        return LOGIN_PHONE

    args = context.args if context.args else []
    is_fallback_text = bool(message.text) and not message.text.strip().startswith("/start")
    if args:
        arg = args[0].strip()
        if arg.startswith("ref_"):
            inviter_raw = arg[4:]
            if inviter_raw.isdigit():
                inviter_id = int(inviter_raw)
                if get_user_by_id(inviter_id):
                    existing = get_user_by_telegram_id(from_user.id)
                    if existing:
                        if context.user_data is not None:
                            context.user_data["user_id"] = existing[0]
                    else:
                        username = _build_username(from_user)
                        new_id = _create_user_with_fallback(
                            telegram_id=from_user.id,
                            username=username,
                            invited_by=inviter_id,
                        )
                        if new_id:
                            if context.user_data is not None:
                                context.user_data["user_id"] = new_id
                            await message.reply_text("Account created via invite.")
                        else:
                            await message.reply_text("Failed to create account. Please try again.")
                else:
                    await message.reply_text("Invalid invite link.")
            else:
                await message.reply_text("Invalid invite link.")
        elif arg.isdigit():
            user_id = int(arg)
            if get_user_by_id(user_id):
                link_telegram_id(user_id, from_user.id)
                if context.user_data is not None:
                    context.user_data["user_id"] = user_id
                await message.reply_text("Account linked.")
            else:
                await message.reply_text("User id not found. Please check and try again.")
        else:
            await message.reply_text("Invalid user id. Use /start <app_user_id> to link.")

    user = get_user_by_telegram_id(from_user.id)
    if user and user[2]:
        if context.user_data is None:
            context.user_data = {}
        context.user_data["user_id"] = user[0]
        if is_fallback_text:
            await message.reply_text("Merhaba! Menü aşağıda.")
        await message.reply_text(menu_text())
        return MENU

    if is_fallback_text:
        await message.reply_text("Merhaba! Devam etmek için telefon numaranı yaz.")
    await message.reply_text("Please enter your phone number (e.g., +905551112233).")
    return LOGIN_PHONE


def _build_username(from_user):
    return from_user.username or f"tg_{from_user.id}"


def _create_user_with_fallback(telegram_id, username, invited_by):
    candidate = username
    for suffix in range(3):
        user_id = create_user_from_telegram(
            telegram_id=telegram_id,
            username=candidate,
            invited_by=invited_by,
        )
        if user_id:
            return user_id
        candidate = f"{username}_{suffix + 1}"
    return None


async def login_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return LOGIN_PHONE

    phone = normalize_phone(message.text)
    if not phone:
        await message.reply_text("Please enter a valid phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    from_user = message.from_user
    if from_user is None:
        return LOGIN_PHONE

    user_by_tg = get_user_by_telegram_id(from_user.id)
    if user_by_tg:
        update_user_phone(user_by_tg[0], phone)
        if context.user_data is None:
            context.user_data = {}
        context.user_data["user_id"] = user_by_tg[0]
        await message.reply_text("Signed in.")
        await message.reply_text(menu_text())
        return MENU

    user_by_phone = get_user_by_phone(phone)
    if user_by_phone:
        link_telegram_id(user_by_phone[0], from_user.id)
        if context.user_data is None:
            context.user_data = {}
        context.user_data["user_id"] = user_by_phone[0]
        await message.reply_text("Signed in.")
        await message.reply_text(menu_text())
        return MENU

    username = _build_username(from_user)
    user_id = create_user_from_telegram(
        telegram_id=from_user.id,
        username=username,
        invited_by=None,
        phone=phone,
    )
    if not user_id:
        await message.reply_text("Failed to create account. Please try again.")
        return LOGIN_PHONE

    if context.user_data is None:
        context.user_data = {}
    context.user_data["user_id"] = user_id
    await message.reply_text("Account created. Welcome!")
    await message.reply_text(menu_text())
    return MENU


async def _handle_quick_entry(update: Update, context: ContextTypes.DEFAULT_TYPE, entry):
    message = update.message
    if message is None:
        return MENU

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    amount = entry["amount"]
    entry_type = entry["type"]
    raw = entry["raw"]

    if entry_type == "income":
        categories = income_categories(user_id)
        if not categories:
            await message.reply_text("No income categories found. Add categories in the app first.")
            await message.reply_text(menu_text())
            return MENU
        keyword = _match_category(raw, categories)
        if keyword:
            tx_id = add_transaction(
                user_id=user_id,
                amount=amount,
                category_id=keyword[0],
                transaction_date=date.today().isoformat(),
            )
            await message.reply_text("Income saved." if tx_id else "Failed to save income.")
            await message.reply_text(menu_text())
            return MENU
        if context.user_data is not None:
            context.user_data["income_amount"] = amount
            context.user_data["income_categories"] = categories
        lines = [f"{idx} - {row[1]}" for idx, row in enumerate(categories, start=1)]
        await message.reply_text("\n".join(lines))
        await message.reply_text("Type the category number.")
        return INCOME_CATEGORY

    categories = expense_categories(user_id)
    if not categories:
        await message.reply_text("No expense categories found. Add categories in the app first.")
        await message.reply_text(menu_text())
        return MENU
    keyword = _match_category(raw, categories)
    if keyword:
        tx_id = add_transaction(
            user_id=user_id,
            amount=amount,
            category_id=keyword[0],
            transaction_date=date.today().isoformat(),
        )
        await message.reply_text("Expense saved." if tx_id else "Failed to save expense.")
        await message.reply_text(menu_text())
        return MENU
    if context.user_data is not None:
        context.user_data["expense_amount"] = amount
        context.user_data["expense_categories"] = categories
    lines = [f"{idx} - {row[1]}" for idx, row in enumerate(categories, start=1)]
    await message.reply_text("\n".join(lines))
    await message.reply_text("Type the category number.")
    return EXPENSE_CATEGORY


def _match_category(raw_text, categories):
    if not categories:
        return None
    for row in categories:
        if row[1].lower() in raw_text:
            return row
    return None


async def handle_menu_choice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return MENU

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    choice = parse_int_choice(message.text, 1, 12)
    if choice is None:
        entry = parse_quick_entry(message.text)
        if entry:
            return await _handle_quick_entry(update, context, entry)
        await message.reply_text("Please type a number from 1 to 12, or a quick entry like '120 market'.")
        return MENU

    if choice == 1:
        await message.reply_text("Enter expense amount")
        return EXPENSE_AMOUNT
    if choice == 2:
        await message.reply_text("Enter income amount")
        return INCOME_AMOUNT
    if choice == 3:
        await message.reply_text("Enter person name")
        return DEBT_PERSON
    if choice == 4:
        balance = get_net_balance(user_id)
        await message.reply_text(f"Net balance: {balance:.2f}")
        await message.reply_text(menu_text())
        return MENU
    if choice == 5:
        await message.reply_text(report_period_prompt())
        return REPORT_PERIOD
    if choice == 6:
        return await list_expenses(update, context)
    if choice == 7:
        await message.reply_text("Enter expense id to update")
        return EXPENSE_UPDATE_ID
    if choice == 8:
        await message.reply_text("Enter expense id to delete")
        return EXPENSE_DELETE_ID
    if choice == 9:
        return await list_debts(update, context)
    if choice == 10:
        await message.reply_text("Enter debt id to update")
        return DEBT_UPDATE_ID
    if choice == 11:
        await message.reply_text("Enter debt id to delete")
        return DEBT_DELETE_ID
    if choice == 12:
        await message.reply_text(goal_type_prompt())
        return GOAL_TYPE

    return MENU


def goal_type_prompt():
    from goals_service import GOAL_TYPES

    lines = ["Choose goal type:"]
    for idx, (_, label) in enumerate(GOAL_TYPES.items(), start=1):
        lines.append(f"{idx} - {label}")
    return "\n".join(lines)


async def cancel(update: Update, _: ContextTypes.DEFAULT_TYPE):  # type: ignore
    message = update.message
    if message:
        await message.reply_text("Cancelled.")
        await message.reply_text(menu_text())
    return MENU


async def invite(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        return

    bot_username = context.bot.username if context.bot else None
    if not bot_username:
        await message.reply_text("Bot username not available. Please try again.")
        return

    invite_link = f"https://t.me/{bot_username}?start=ref_{user_id}"
    await message.reply_text(f"Invite link:\n{invite_link}")


def build_application():
    application = ApplicationBuilder().token(TOKEN).build()

    conversation = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            LOGIN_PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, login_phone)],
            MENU: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_menu_choice)],
            EXPENSE_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, expense_amount)],
            EXPENSE_CATEGORY: [MessageHandler(filters.TEXT & ~filters.COMMAND, expense_category)],
            INCOME_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, income_amount)],
            INCOME_CATEGORY: [MessageHandler(filters.TEXT & ~filters.COMMAND, income_category)],
            DEBT_PERSON: [MessageHandler(filters.TEXT & ~filters.COMMAND, debt_person)],
            DEBT_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, debt_amount)],
            EXPENSE_UPDATE_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, expense_update_id)],
            EXPENSE_UPDATE_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, expense_update_amount)],
            EXPENSE_UPDATE_CATEGORY: [MessageHandler(filters.TEXT & ~filters.COMMAND, expense_update_category)],
            EXPENSE_DELETE_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, expense_delete_id)],
            DEBT_UPDATE_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, debt_update_id)],
            DEBT_UPDATE_PERSON: [MessageHandler(filters.TEXT & ~filters.COMMAND, debt_update_person)],
            DEBT_UPDATE_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, debt_update_amount)],
            DEBT_DELETE_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, debt_delete_id)],
            REPORT_PERIOD: [MessageHandler(filters.TEXT & ~filters.COMMAND, report_choose_period)],
            REPORT_START: [MessageHandler(filters.TEXT & ~filters.COMMAND, report_start)],
            REPORT_END: [MessageHandler(filters.TEXT & ~filters.COMMAND, report_end)],
            GOAL_TYPE: [MessageHandler(filters.TEXT & ~filters.COMMAND, goal_type)],
            GOAL_CATEGORY: [MessageHandler(filters.TEXT & ~filters.COMMAND, goal_category)],
            GOAL_AMOUNT: [MessageHandler(filters.TEXT & ~filters.COMMAND, goal_amount)],
        },
        fallbacks=[CommandHandler("cancel", cancel), CommandHandler("start", start)],
    )

    application.add_handler(conversation)
    # If the user deletes the chat history or starts a new chat without /start,
    # fall back to showing the menu or login prompt.
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, start))
    application.add_handler(CommandHandler("report", report_start_prompt))
    application.add_handler(CommandHandler("invite", invite))
    return application


def main():
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=logging.INFO,
    )

    application = build_application()
    application.run_polling()
