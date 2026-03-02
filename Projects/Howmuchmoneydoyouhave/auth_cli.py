import sqlite3

from auth_service import (
    register_user,
    login_user
    ) 

from category_service import add_category
from category_service import ensure_debt_payment_category


def register_flow():

    username = input("Choose username: ").strip()
    password = input("Choose password: ").strip()


    if not username or not password:
        print("Username and password cannot be empty.")
        return None


    user_id = register_user(username, password)
    if user_id is None:
        print("Registration failed. Username may already exist.")
        return None


    default_categories = [
        ("Salary", True),
        ("Freelance", True),
        ("Rent", False),
        ("Grocery", False),
        ("Utilities", False),
        ("Transport", False),
    ]

    for name, is_income in default_categories:
        try:
            add_category(name, user_id, is_income=is_income)
        except sqlite3.IntegrityError:

            pass

    ensure_debt_payment_category(user_id)

    print("Registration successful.")
    return user_id


def login_flow():

    username = input("Username: ").strip()
    password = input("Password: ").strip()


    user_id = login_user(username, password)
    if user_id is None:
        print("Login failed.")
        return None

    print("Login successful.")
    return user_id
