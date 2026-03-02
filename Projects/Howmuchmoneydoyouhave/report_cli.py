from utils import prompt_int

from report_service import (
    parse_iso_date,
    get_all_income,
    get_total_income,
    get_all_expenses,
    get_total_expenses,
    get_expense_summary_by_category,
    get_net_balance,
    get_highest_spending_category,
    get_monthly_summary,
    get_date_range_report,
    get_all_debts,
    get_total_debt_amount,
    get_total_paid_debt,
    get_total_remaining_debt,
    get_debt_summary_by_person,
    get_overdue_debts,
    get_upcoming_debts,
    get_debts_by_date_range,
    get_largest_debts,
)


def _print_transactions(rows, title):
    print(f"\n{title}")
    if not rows:
        print("- No records found.")
        return
    for row in rows:
        print(
            f"- id={row['id']}, amount={row['amount']:.2f}, "
            f"category={row['category_name']}, date={row['date']}"
        )


def _print_debts(rows, title):
    print(f"\n{title}")
    if not rows:
        print("- No records found.")
        return
    for debt_id, person_name, amount, remaining, status, due_date, last_payment_date, _ in rows:
        print(
            f"- id={debt_id}, person={person_name}, amount={amount:.2f}, "
            f"remaining={remaining:.2f}, status={status}, due={due_date or '-'}, "
            f"last_payment={last_payment_date or '-'}"
        )


def _prompt_date_range():
    start_raw = input("Start date (YYYY-MM-DD): ").strip()
    end_raw = input("End date (YYYY-MM-DD): ").strip()
    start_date = parse_iso_date(start_raw)
    end_date = parse_iso_date(end_raw)
    if not start_date or not end_date:
        print("Invalid date format.")
        return None, None
    if end_date < start_date:
        print("End date cannot be before start date.")
        return None, None
    return start_date, end_date


def financial_reports_menu(user_id):
    while True:
        print("\n--- Financial Reports ---")
        print("1) List all income")
        print("2) Total income")
        print("3) List all expenses")
        print("4) Total expenses")
        print("5) Expense summary by category (amount + percentage)")
        print("6) Net balance (Income - Expenses)")
        print("7) Highest spending category")
        print("8) Monthly summary")
        print("9) Report by date range")
        print("0) Back")

        choice = input("Choose: ").strip()

        if choice == "1":
            _print_transactions(get_all_income(user_id), "All income")
        elif choice == "2":
            print(f"\nTotal income: {get_total_income(user_id):.2f}")
        elif choice == "3":
            include_debt_payment = input("Include debt payments? (y/n, default=n): ").strip().lower() == "y"
            _print_transactions(
                get_all_expenses(user_id, include_debt_payment=include_debt_payment),
                "All expenses",
            )
        elif choice == "4":
            include_debt_payment = input("Include debt payments? (y/n, default=n): ").strip().lower() == "y"
            print(
                f"\nTotal expenses: "
                f"{get_total_expenses(user_id, include_debt_payment=include_debt_payment):.2f}"
            )
        elif choice == "5":
            include_debt_payment = input("Include debt payments? (y/n, default=n): ").strip().lower() == "y"
            summary = get_expense_summary_by_category(
                user_id,
                include_debt_payment=include_debt_payment,
            )
            print("\nExpense summary by category")
            if not summary:
                print("- No expense records found.")
            else:
                for name, amount, pct in summary:
                    print(f"- {name}: {amount:.2f} ({pct:.1f}%)")
        elif choice == "6":
            include_debt_payment = input("Include debt payments? (y/n, default=y): ").strip().lower() != "n"
            print(
                f"\nNet balance: "
                f"{get_net_balance(user_id, include_debt_payment=include_debt_payment):.2f}"
            )
        elif choice == "7":
            result = get_highest_spending_category(user_id, include_debt_payment=False)
            if result is None:
                print("\nNo expense records found.")
            else:
                name, amount, pct = result
                print(f"\nHighest spending category: {name} ({amount:.2f}, {pct:.1f}%)")
        elif choice == "8":
            monthly = get_monthly_summary(user_id, include_debt_payment=True)
            print("\nMonthly summary")
            if not monthly:
                print("- No transaction data found.")
            else:
                for month_key, totals in monthly.items():
                    print(
                        f"- {month_key}: income={totals['income']:.2f}, "
                        f"expense={totals['expense']:.2f}, "
                        f"net={totals['income'] - totals['expense']:.2f}"
                    )
        elif choice == "9":
            start_date, end_date = _prompt_date_range()
            if not start_date:
                continue
            include_debt_payment = input("Include debt payments? (y/n, default=y): ").strip().lower() != "n"
            report = get_date_range_report(
                user_id,
                start_date,
                end_date,
                include_debt_payment=include_debt_payment,
            )
            print("\nDate range report")
            print(f"- Range: {report['start_date']} -> {report['end_date']}")
            print(f"- Total income: {report['total_income']:.2f}")
            print(f"- Total expenses: {report['total_expenses']:.2f}")
            print(f"- Net balance: {report['net_balance']:.2f}")
        elif choice == "0":
            return
        else:
            print("Invalid choice.")


def debt_reports_menu(user_id):
    while True:
        print("\n--- Debt Reports ---")
        print("1) List all debts")
        print("2) Total debt amount")
        print("3) Total paid debt")
        print("4) Total remaining debt")
        print("5) Debt summary by person/institution")
        print("6) Overdue debts")
        print("7) Upcoming debts (within 7 days)")
        print("8) Debt report by date range")
        print("9) Largest debt items")
        print("0) Back")

        choice = input("Choose: ").strip()

        if choice == "1":
            _print_debts(get_all_debts(user_id), "All debts")
        elif choice == "2":
            print(f"\nTotal debt amount: {get_total_debt_amount(user_id):.2f}")
        elif choice == "3":
            print(f"\nTotal paid debt: {get_total_paid_debt(user_id):.2f}")
        elif choice == "4":
            print(f"\nTotal remaining debt: {get_total_remaining_debt(user_id):.2f}")
        elif choice == "5":
            rows = get_debt_summary_by_person(user_id)
            print("\nDebt summary by person/institution (remaining)")
            if not rows:
                print("- No records found.")
            else:
                for person_name, remaining in rows:
                    print(f"- {person_name}: {remaining:.2f}")
        elif choice == "6":
            _print_debts(get_overdue_debts(user_id), "Overdue debts")
        elif choice == "7":
            _print_debts(get_upcoming_debts(user_id, within_days=7), "Upcoming debts (7 days)")
        elif choice == "8":
            start_date, end_date = _prompt_date_range()
            if not start_date:
                continue
            rows = get_debts_by_date_range(user_id, start_date, end_date)
            _print_debts(rows, f"Debt report by due date ({start_date} -> {end_date})")
        elif choice == "9":
            top_n = prompt_int("How many items? (default=5): ")
            if top_n is None or top_n <= 0:
                top_n = 5
            _print_debts(get_largest_debts(user_id, top_n=top_n), f"Largest {top_n} debt items")
        elif choice == "0":
            return
        else:
            print("Invalid choice.")


def report_cli(user_id=None):
    if user_id is None:
        user_id = prompt_int("Enter user id: ")
        if user_id is None:
            print("Invalid user id.")
            return

    while True:
        print("\n--- Reports Center ---")
        print("1) Financial reports")
        print("2) Debt reports")
        print("0) Back")
        choice = input("Choose: ").strip()

        if choice == "1":
            financial_reports_menu(user_id)
        elif choice == "2":
            debt_reports_menu(user_id)
        elif choice == "0":
            return
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    report_cli()
