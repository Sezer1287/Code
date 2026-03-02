from utils import prompt_int,prompt_float

from datetime import date

from debts_service import (
    add_debt,
    get_debts_for_user,
    update_debt,
    delete_debt,
    pay_debt,
    )


def add_debt_cli(user_id):
    
    person_name = input("Person name: ").strip()
    if not person_name:
        print("Person name cannot be empty.")
        return    
    amount = prompt_float("Debt amount: ")
    if amount is None or amount <= 0:
        print("Invalid amount.")
        return
    due_date = input("Due date (YYYY-MM-DD, empty=none): ").strip() or None
    if due_date:
        try:
            date.fromisoformat(due_date)
        except ValueError:
            print("Invalid due date format.")
            return
    new_id = add_debt(user_id, person_name, amount, due_date=due_date)
    if new_id is None:
        print("Debt could not be added.")
    else:
        print(f"Debt added. id={new_id}")


def list_debts_cli(user_id):

    rows = get_debts_for_user(user_id)
    if not rows:
        print("No debts found.")
        return
    print("\nYour debts:")
    for debt_id, person_name, amount, remaining, status, due_date, last_payment_date, _ in rows:
        print(
            f"- id={debt_id}, person={person_name}, amount={amount:.2f}, "
            f"remaining={remaining:.2f}, status={status}, due_date={due_date or '-'}, "
            f"last_payment={last_payment_date or '-'}"
        )


def update_debt_cli(user_id):
    
    debt_id = prompt_int("Debt id to update: ")
    if debt_id is None:
        print("Invalid debt id.")
        return
    
    person_name = input("New person name (empty=skip): ").strip() or None
    amount_text = input("New amount (empty=skip): ").strip()

    if amount_text:
        try:
            amount = float(amount_text)
        except ValueError:
            print("Invalid amount.")
            return
    else:
        amount = None

    due_date_input = input("New due date YYYY-MM-DD (empty=skip): ").strip()
    due_date = due_date_input if due_date_input else None
    if due_date:
        try:
            date.fromisoformat(due_date)
        except ValueError:
            print("Invalid due date format.")
            return

    updated = update_debt(
        debt_id,
        user_id,
        person_name=person_name,
        amount=amount,
        due_date=due_date,
    )
    if updated:
        print("Debt updated.")
    else:
        print("Debt not found for this user, or invalid amount update.")


def delete_debt_cli(user_id):
    
    debt_id = prompt_int("Debt id to delete: ")
    if debt_id is None:
        print("Invalid debt id.")
        return    
    deleted = delete_debt(debt_id, user_id)
    if deleted:
        print("Debt deleted.")
    else:
        print("Debt not found for this user.")


def pay_debt_cli(user_id):
    debt_id = prompt_int("Debt id to pay: ")
    if debt_id is None:
        print("Invalid debt id.")
        return

    payment_amount = prompt_float("Payment amount: ")
    if payment_amount is None:
        print("Invalid payment amount.")
        return

    payment_date = input("Payment date (YYYY-MM-DD, empty=today): ").strip()
    if not payment_date:
        payment_date = date.today().isoformat()
    else:
        try:
            date.fromisoformat(payment_date)
        except ValueError:
            print("Invalid payment date format.")
            return

    success, message = pay_debt(user_id, debt_id, payment_amount, payment_date)
    print(message)
