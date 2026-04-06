import os

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8454793138:AAEbx-h7Hd81h4lI-zSIOzas5FUGxJM4pjE")

(
    LOGIN_PHONE,
    MENU,
    EXPENSE_AMOUNT,
    EXPENSE_CATEGORY,
    INCOME_AMOUNT,
    INCOME_CATEGORY,
    DEBT_PERSON,
    DEBT_AMOUNT,
    EXPENSE_UPDATE_ID,
    EXPENSE_UPDATE_AMOUNT,
    EXPENSE_UPDATE_CATEGORY,
    EXPENSE_DELETE_ID,
    DEBT_UPDATE_ID,
    DEBT_UPDATE_PERSON,
    DEBT_UPDATE_AMOUNT,
    DEBT_DELETE_ID,
    REPORT_PERIOD,
    REPORT_START,
    REPORT_END,
    GOAL_TYPE,
    GOAL_CATEGORY,
    GOAL_AMOUNT,
) = range(22)


def menu_text():
    return (
        "Choose an action:\n"
        "1 - Add Expense\n"
        "2 - Add Income\n"
        "3 - Add Debt\n"
        "4 - View Balance\n"
        "5 - View Report\n"
        "6 - List Expenses\n"
        "7 - Update Expense\n"
        "8 - Delete Expense\n"
        "9 - List Debts\n"
        "10 - Update Debt\n"
        "11 - Delete Debt\n"
        "12 - Add Goal\n"
        "\nTip: you can also type like '120 market' or 'income 5000 salary'."
    )


def report_period_prompt():
    return (
        "Choose report period:\n"
        "1 - This month\n"
        "2 - Last 30 days\n"
        "3 - Custom range (YYYY-MM-DD to YYYY-MM-DD)\n"
        "4 - This month vs last month"
    )
