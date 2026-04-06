from telegram import Update
from telegram.ext import ContextTypes

from goals_service import GOAL_TYPES, add_goal

from bot_app.constants import GOAL_AMOUNT, GOAL_CATEGORY, GOAL_TYPE, LOGIN_PHONE, MENU, menu_text
from bot_app.utils import expense_categories, parse_amount, parse_int_choice, require_logged_in


def _goal_type_prompt():
    lines = ["Choose goal type:"]
    types = list(GOAL_TYPES.items())
    for idx, (_, label) in enumerate(types, start=1):
        lines.append(f"{idx} - {label}")
    return "\n".join(lines), types


async def goal_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return GOAL_TYPE

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    if context.user_data is None:
        context.user_data = {}

    prompt, types = _goal_type_prompt()
    choice = parse_int_choice(message.text, 1, len(types))
    if choice is None:
        await message.reply_text("Please choose a valid goal type number.")
        await message.reply_text(prompt)
        return GOAL_TYPE

    goal_key = types[choice - 1][0]
    context.user_data["goal_type"] = goal_key

    if goal_key == "category_spending_limit":
        categories = expense_categories(user_id)
        if not categories:
            await message.reply_text("No expense categories found. Add categories in the app first.")
            await message.reply_text(menu_text())
            return MENU
        if context.user_data is None:
            context.user_data = {}
        context.user_data["goal_categories"] = categories
        lines = [f"{idx} - {row[1]}" for idx, row in enumerate(categories, start=1)]
        await message.reply_text("\n".join(lines))
        await message.reply_text("Choose category number for the goal.")
        return GOAL_CATEGORY

    await message.reply_text("Enter target amount")
    return GOAL_AMOUNT


async def goal_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return GOAL_CATEGORY

    if context.user_data is None:
        context.user_data = {}
    categories = context.user_data.get("goal_categories") or []
    if not categories:
        await message.reply_text("Category list expired. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    choice = parse_int_choice(message.text, 1, len(categories))
    if choice is None:
        await message.reply_text("Please enter a valid category number.")
        return GOAL_CATEGORY

    category_id = categories[choice - 1][0]
    if context.user_data is None:
        context.user_data = {}
    context.user_data["goal_category_id"] = category_id
    await message.reply_text("Enter target amount")
    return GOAL_AMOUNT


async def goal_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    if message is None:
        return GOAL_AMOUNT

    user_id = require_logged_in(message, context)
    if not user_id:
        await message.reply_text("Please sign in with your phone number first.")
        await message.reply_text("Please enter your phone number (e.g., +905551112233).")
        return LOGIN_PHONE

    if context.user_data is None:
        context.user_data = {}

    amount = parse_amount(message.text)
    if amount is None:
        await message.reply_text("Please enter a valid positive amount.")
        return GOAL_AMOUNT

    goal_key = context.user_data.get("goal_type")
    if not goal_key:
        await message.reply_text("Goal type missing. Please start again.")
        await message.reply_text(menu_text())
        return MENU

    category_id = context.user_data.get("goal_category_id")
    goal_id = add_goal(
        user_id=user_id,
        goal_type=goal_key,
        target_amount=amount,
        category_id=category_id,
    )

    if goal_id is None:
        await message.reply_text("Failed to create goal. Please try again.")
    else:
        await message.reply_text("Goal created.")

    await message.reply_text(menu_text())
    return MENU
