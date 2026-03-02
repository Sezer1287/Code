import sqlite3

from utils import prompt_int

from category_service import (
    DEBT_PAYMENT_CATEGORY_NAME,
    add_category,
    get_categories_for_user,
    update_category,
    delete_category,
    )


def prompt_category_type():
    """Ask whether category is income (1) or expense (0)."""
    choice = input("Category type (1=income, 0=expense): ").strip()
    if choice == "1":
        return True
    if choice == "0":
        return False
    return None


def add_category_cli(user_id):

    name = input("Category name: ").strip()
    if not name:
        print("Category name cannot be empty.")
        return
    if name.lower() == DEBT_PAYMENT_CATEGORY_NAME.lower():
        print(f"'{DEBT_PAYMENT_CATEGORY_NAME}' is a system category and cannot be added manually.")
        return

    is_income = prompt_category_type()
    if is_income is None:
        print("Invalid category type.")
        return

    try:
        category_id = add_category(name, user_id, is_income=is_income)
        print(f"Category added. id={category_id}")
    except sqlite3.IntegrityError:
        print("Category already exists for this user.")


def list_categories_cli(user_id):

    rows = get_categories_for_user(user_id)
    if not rows:
        print("No categories found.")
        return
    print("\nYour categories:")

    for category_id, name, _, is_income in rows:
        kind = "income" if is_income else "expense"
        print(f"- id={category_id}, name={name}, type={kind}")


def update_category_cli(user_id):

    category_id = prompt_int("Category id to update: ")
    if category_id is None:
        print("Invalid category id.")
        return

    name_text = input("New category name (empty=skip): ").strip()
    new_name = name_text if name_text else None
    if new_name and new_name.lower() == DEBT_PAYMENT_CATEGORY_NAME.lower():
        print(f"'{DEBT_PAYMENT_CATEGORY_NAME}' is reserved and cannot be set manually.")
        return

    type_text = input("New type (1=income, 0=expense, empty=skip): ").strip()
    if not type_text:
        is_income = None
    elif type_text == "1":
        is_income = True
    elif type_text == "0":
        is_income = False
    else:
        print("Invalid category type.")
        return

    updated = update_category(category_id, user_id, new_name=new_name, is_income=is_income)
    if updated:
        print("Category updated.")
    else:
        print("Category not found for this user, or no values provided.")


def delete_category_cli(user_id):

    category_id = prompt_int("Category id to delete: ")
    if category_id is None:
        print("Invalid category id.")
        return
    rows = get_categories_for_user(user_id)
    system_category_ids = {
        row[0] for row in rows if row[1].lower() == DEBT_PAYMENT_CATEGORY_NAME.lower()
    }
    if category_id in system_category_ids:
        print(f"'{DEBT_PAYMENT_CATEGORY_NAME}' is a system category and cannot be deleted.")
        return

    deleted = delete_category(category_id, user_id)
    if deleted:
        print("Category deleted.")
    else:
        print("Category not found for this user.")
