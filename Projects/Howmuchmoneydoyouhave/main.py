from auth_cli import (
    register_flow,
    login_flow
)

from category_cli import (
    add_category_cli,
    list_categories_cli,
    update_category_cli,
    delete_category_cli
    )

from transactions_cli import (
    add_transaction_cli,
    list_transactions_cli,
    update_transaction_cli,
    delete_transaction_cli
    )

from debts_cli import (
    add_debt_cli,
    list_debts_cli,
    update_debt_cli,
    delete_debt_cli,
    pay_debt_cli,
    )

from report_cli import report_cli
from goals_cli import goals_cli


def categories_menu(user_id):
    while True:
        print("\n--- Categories ---")
        print("1) Add category")
        print("2) List categories")
        print("3) Update category")
        print("4) Delete category")
        print("0) Back")

        choice = input("Choose: ").strip()

        if choice == "1":
            add_category_cli(user_id)
        elif choice == "2":
            list_categories_cli(user_id)
        elif choice == "3":
            update_category_cli(user_id)
        elif choice == "4":
            delete_category_cli(user_id)
        elif choice == "0":
            return
        else:
            print("Invalid choice.")


def transactions_menu(user_id):
    while True:
        print("\n--- Transactions ---")
        print("1) Add transaction")
        print("2) List transactions")
        print("3) Update transaction")
        print("4) Delete transaction")
        print("0) Back")

        choice = input("Choose: ").strip()

        if choice == "1":
            add_transaction_cli(user_id)
        elif choice == "2":
            list_transactions_cli(user_id)
        elif choice == "3":
            update_transaction_cli(user_id)
        elif choice == "4":
            delete_transaction_cli(user_id)
        elif choice == "0":
            return
        else:
            print("Invalid choice.")


def debts_menu(user_id):
    while True:
        print("\n--- Debts ---")
        print("1) Add debt")
        print("2) List debts")
        print("3) Update debt")
        print("4) Delete debt")
        print("5) Pay debt")
        print("0) Back")

        choice = input("Choose: ").strip()

        if choice == "1":
            add_debt_cli(user_id)
        elif choice == "2":
            list_debts_cli(user_id)
        elif choice == "3":
            update_debt_cli(user_id)
        elif choice == "4":
            delete_debt_cli(user_id)
        elif choice == "5":
            pay_debt_cli(user_id)
        elif choice == "0":
            return
        else:
            print("Invalid choice.")


def post_login_menu(user_id):
    while True:
        print("\n--- Finance Menu ---")
        print("1) Transactions")
        print("2) Debts")
        print("3) Categories")
        print("4) Reports Center")
        print("5) Goals Center")
        print("0) Logout")

        choice = input("Choose: ").strip()

        if choice == "1":
            transactions_menu(user_id)
        elif choice == "2":
            debts_menu(user_id)
        elif choice == "3":
            categories_menu(user_id)
        elif choice == "4":
            report_cli(user_id)
        elif choice == "5":
            goals_cli(user_id)
        elif choice == "0":
            print("Logged out.")
            break
        else:
            print("Invalid choice.")


def main():
    # Ask user to register or login first.
    while True:
        print("\n1) Register")
        print("2) Login")
        print("0) Exit")
        choice = input("Choose: ").strip()

        if choice == "1":
            user_id = register_flow()
            if user_id is not None:
                post_login_menu(user_id)
        elif choice == "2":
            user_id = login_flow()
            if user_id is not None:
                post_login_menu(user_id)
        elif choice == "0":
            print("Goodbye.")
            break
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    main()
