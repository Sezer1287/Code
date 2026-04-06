import hashlib
import sqlite3

from database import connection, cursor
from category_service import ensure_default_categories


def hash_password(password):
    password_bytes = password.encode("utf-8")
    password_hash = hashlib.sha256(password_bytes).hexdigest()
    return password_hash


def verify_password(password, stored_hash):
    entered_hash = hash_password(password)
    return entered_hash == stored_hash


def register_user(username, password):
    password_hash = hash_password(password)
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash),
        )
    except sqlite3.IntegrityError:
        connection.rollback()
        return None
    except sqlite3.Error:
        connection.rollback()
        return None

    connection.commit()
    user_id = cursor.lastrowid
    ensure_default_categories(user_id)
    return user_id


def login_user(username, password):
    cursor.execute(
        "SELECT id, password_hash FROM users WHERE username = ?",
        (username,),
    )
    row = cursor.fetchone()
    if row is None:
        return None
    user_id, stored_hash = row
    if verify_password(password, stored_hash):
        return user_id
    return None


def get_user_by_id(user_id):
    cursor.execute(
        "SELECT id, username, phone, created_at FROM users WHERE id = ?",
        (user_id,),
    )
    return cursor.fetchone()


def get_user_by_telegram_id(telegram_id):
    cursor.execute(
        "SELECT id, username, phone, created_at FROM users WHERE telegram_id = ?",
        (telegram_id,),
    )
    return cursor.fetchone()


def get_user_by_phone(phone):
    cursor.execute(
        "SELECT id, username, phone, created_at FROM users WHERE phone = ?",
        (phone,),
    )
    return cursor.fetchone()


def link_telegram_id(user_id, telegram_id):
    cursor.execute(
        "UPDATE users SET telegram_id = ? WHERE id = ?",
        (telegram_id, user_id),
    )
    connection.commit()
    return cursor.rowcount


def update_user_phone(user_id, phone):
    cursor.execute(
        "UPDATE users SET phone = ? WHERE id = ?",
        (phone, user_id),
    )
    connection.commit()
    return cursor.rowcount


def create_user_from_telegram(telegram_id, username, invited_by=None, phone=None):
    password_hash = hash_password(f"tg:{telegram_id}")
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash, telegram_id, invited_by, phone) VALUES (?, ?, ?, ?, ?)",
            (username, password_hash, telegram_id, invited_by, phone),
        )
    except sqlite3.IntegrityError:
        connection.rollback()
        return None
    except sqlite3.Error:
        connection.rollback()
        return None

    connection.commit()
    user_id = cursor.lastrowid
    ensure_default_categories(user_id)
    return user_id
