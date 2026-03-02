from datetime import date

from category_service import get_categories_for_user
from goals_service import (
    GOAL_TYPES,
    add_goal,
    get_goals_with_progress,
    update_goal,
    delete_goal,
    build_goal_suggestions,
)
from utils import prompt_float, prompt_int


GOAL_TYPE_MENU = [
    ("1", "total_spending_limit"),
    ("2", "category_spending_limit"),
    ("3", "minimum_debt_payment"),
    ("4", "income_target"),
    ("5", "savings_target"),
]


def _current_period():
    today = date.today()
    return today.year, today.month


def _prompt_period(default_current=True):
    year_text = input("Year (YYYY, empty=current): ").strip()
    month_text = input("Month (1-12, empty=current): ").strip()

    if not year_text and not month_text and default_current:
        return _current_period()
    if not year_text and not month_text and not default_current:
        return None, None

    try:
        year = int(year_text) if year_text else _current_period()[0]
        month = int(month_text) if month_text else _current_period()[1]
    except ValueError:
        print("Invalid period.")
        return None, None

    if month < 1 or month > 12:
        print("Month must be between 1 and 12.")
        return None, None
    return year, month


def _choose_goal_type():
    print("\nGoal types:")
    for key, goal_type in GOAL_TYPE_MENU:
        print(f"{key}) {GOAL_TYPES[goal_type]}")
    choice = input("Choose goal type: ").strip()
    for key, goal_type in GOAL_TYPE_MENU:
        if choice == key:
            return goal_type
    print("Invalid goal type.")
    return None


def _choose_category_id_if_needed(user_id, goal_type):
    if goal_type != "category_spending_limit":
        return None

    expense_categories = [
        row for row in get_categories_for_user(user_id) if not bool(row[3])
    ]
    if not expense_categories:
        print("No expense categories found.")
        return None

    print("\nExpense categories:")
    for category_id, name, _, _ in expense_categories:
        print(f"- id={category_id}, name={name}")

    category_id = prompt_int("Category id for this goal: ")
    valid_ids = {row[0] for row in expense_categories}
    if category_id not in valid_ids:
        print("Invalid category id.")
        return None
    return category_id


def add_goal_cli(user_id):
    goal_type = _choose_goal_type()
    if goal_type is None:
        return

    target_amount = prompt_float("Target amount: ")
    if target_amount is None or target_amount <= 0:
        print("Invalid target amount.")
        return

    period_year, period_month = _prompt_period(default_current=True)
    if period_year is None:
        return

    category_id = _choose_category_id_if_needed(user_id, goal_type)
    if goal_type == "category_spending_limit" and category_id is None:
        return

    new_id = add_goal(
        user_id=user_id,
        goal_type=goal_type,
        target_amount=target_amount,
        period_year=period_year,
        period_month=period_month,
        category_id=category_id,
    )
    if new_id is None:
        print("Goal could not be created.")
        return
    print(f"Goal created. id={new_id}")


def list_goals_cli(user_id):
    period_year, period_month = _prompt_period(default_current=False)
    if period_year is None and period_month is None:
        period_year = None
        period_month = None

    goals = get_goals_with_progress(
        user_id=user_id,
        period_year=period_year,
        period_month=period_month,
        active_only=False,
    )

    if not goals:
        print("No goals found.")
        return

    print("\nYour goals:")
    for goal in goals:
        print(
            f"- id={goal['id']} | {goal['goal_name']} | period={goal['period_year']}-{goal['period_month']:02d} | "
            f"target={goal['target_amount']:.2f} | actual={goal['actual_amount']:.2f} | "
            f"done=%{goal['progress_pct']:.1f} | left={goal['remaining_amount']:.2f} (%{goal['remaining_pct']:.1f}) | "
            f"status={goal['status']} | active={goal['is_active']}"
        )


def update_goal_cli(user_id):
    goal_id = prompt_int("Goal id to update: ")
    if goal_id is None:
        print("Invalid goal id.")
        return

    target_text = input("New target amount (empty=skip): ").strip()
    target_amount = None
    if target_text:
        try:
            target_amount = float(target_text)
        except ValueError:
            print("Invalid target amount.")
            return

    year_text = input("New year (empty=skip): ").strip()
    month_text = input("New month 1-12 (empty=skip): ").strip()
    period_year = None
    period_month = None
    if year_text:
        try:
            period_year = int(year_text)
        except ValueError:
            print("Invalid year.")
            return
    if month_text:
        try:
            period_month = int(month_text)
        except ValueError:
            print("Invalid month.")
            return

    is_active_text = input("Set active? (1=active, 0=inactive, empty=skip): ").strip()
    if not is_active_text:
        is_active = None
    elif is_active_text == "1":
        is_active = True
    elif is_active_text == "0":
        is_active = False
    else:
        print("Invalid active value.")
        return

    updated = update_goal(
        goal_id=goal_id,
        user_id=user_id,
        target_amount=target_amount,
        period_year=period_year,
        period_month=period_month,
        is_active=is_active,
    )
    if updated:
        print("Goal updated.")
    else:
        print("Goal not found or no valid changes.")


def delete_goal_cli(user_id):
    goal_id = prompt_int("Goal id to delete: ")
    if goal_id is None:
        print("Invalid goal id.")
        return
    deleted = delete_goal(goal_id, user_id)
    if deleted:
        print("Goal deleted.")
    else:
        print("Goal not found.")


def goal_suggestions_cli(user_id):
    period_year, period_month = _prompt_period(default_current=True)
    if period_year is None:
        return

    summary, suggestions = build_goal_suggestions(
        user_id=user_id,
        period_year=period_year,
        period_month=period_month,
    )
    print(f"\n{summary}")
    if not suggestions:
        print("No alerts. Keep going.")
        return
    print("Suggestions:")
    for item in suggestions:
        print(f"- {item}")


def goals_cli(user_id):
    while True:
        print("\n--- Goals Center ---")
        print("1) Add goal")
        print("2) List goals (with progress)")
        print("3) Update goal")
        print("4) Delete goal")
        print("5) Suggestions")
        print("0) Back")

        choice = input("Choose: ").strip()
        if choice == "1":
            add_goal_cli(user_id)
        elif choice == "2":
            list_goals_cli(user_id)
        elif choice == "3":
            update_goal_cli(user_id)
        elif choice == "4":
            delete_goal_cli(user_id)
        elif choice == "5":
            goal_suggestions_cli(user_id)
        elif choice == "0":
            return
        else:
            print("Invalid choice.")
