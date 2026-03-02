from utils import prompt_float,prompt_int

from datetime import date

from category_service import get_categories_for_user, DEBT_PAYMENT_CATEGORY_NAME

from transactions_service import (
    add_transaction,
    get_transactions_for_user,
    update_transaction,
    delete_transaction
    )


def add_transaction_cli(user_id):

    amount = prompt_float("Amount: ")
    if amount is None:
        print("Invalid amount.")
        return


    categories = get_categories_for_user(user_id)
    visible_categories = [
        row for row in categories if row[1].lower() != DEBT_PAYMENT_CATEGORY_NAME.lower()
    ]
    if not visible_categories:
        print("No selectable categories found.")
        return
    print("\nYour categories:")
    for category_id, name, _, is_income in visible_categories:
        kind = "income" if is_income else "expense"
        print(f"- id={category_id}, name={name}, type={kind}")
    category_id = prompt_int("Category id: ")
    if category_id is None:
        print("Invalid category id.")
        return


    transaction_date = input("Date (YYYY-MM-DD, empty=today): ").strip()
    if not transaction_date:
        transaction_date = date.today().isoformat()

    new_id = add_transaction(user_id, amount, category_id, transaction_date)
    if new_id is None:
        print("Transaction failed. Category must belong to this user and be manually allowed.")
    else:
        print(f"Transaction added. id={new_id}")


def list_transactions_cli(user_id):

    rows = get_transactions_for_user(user_id)
    if not rows:
        print("No transactions found.")
        return
    print("\nYour transactions:")
    for row in rows:
        category_type = "income" if row[6] else "expense"
        print(
            f"- id={row[0]}, amount={row[1]}, category_id={row[2]}, "
            f"category={row[3]} ({category_type}), date={row[5]}"
        )


def update_transaction_cli(user_id):

    transaction_id = prompt_int("Transaction id to update: ")
    if transaction_id is None:
        print("Invalid transaction id.")
        return


    amount_text = input("New amount (empty=skip): ").strip()
    if amount_text:
        try:
            amount = float(amount_text)
        except ValueError:
            print("Invalid amount.")
            return
    else:
        amount = None

    category_text = input("New category id (empty=skip): ").strip()
    if category_text:
        try:
            category_id = int(category_text)
        except ValueError:
            print("Invalid category id.")
            return
    else:
        category_id = None

    transaction_date = input("New date YYYY-MM-DD (empty=skip): ").strip() or None

    updated = update_transaction(
        transaction_id,
        user_id,
        amount=amount,
        category_id=category_id,
        transaction_date=transaction_date,
    )
    if updated:
        print("Transaction updated.")
    else:
        print("Transaction not found for this user, or invalid category.")


def delete_transaction_cli(user_id):
    # Delete one transaction owned by logged-in user.
    transaction_id = prompt_int("Transaction id to delete: ")
    if transaction_id is None:
        print("Invalid transaction id.")
        return
    deleted = delete_transaction(transaction_id, user_id)
    if deleted:
        print("Transaction deleted.")
    else:
        print("Transaction not found for this user.")
